# slayer-zoom: the granularity slider (prototype plan)

Working name `slayer-zoom`. It will be a public repo, `MotleyAI/slayer-zoom`, under the MIT license.

## The idea in one paragraph

You ask a data question once. The answer comes with a slider. All the way left, it is one number. Each step to the
right adds detail: the total and the split by store, then by product, then by segment, then the trends, comparisons
and drivers. The answer is the same at every step, only finer. An **agent builds the ladder**. It explores the
semantic layer and the business context to decide which steps are worth showing for this question on this data.
SLayer makes each step cheap: each one is a small variation on the same query (another dimension, a `time_shift`, a
`change_pct`, a `rank`), so the system writes no new SQL for any step, and every number reconciles with the step
before it.

## Worked example (Jaffle Shop demo database, built into SLayer)

Question: **"What is our revenue year to date?"** One ladder the agent might build:

| Level | Name | What appears | SLayer delta vs previous level |
|---|---|---|---|
| 0 | Number | `$X` revenue YTD | `orders.order_total:sum`, filter `ordered_at` in YTD |
| 1 | Split | Total + bar by store | `+ dimensions: [stores.name]` |
| 2 | Mix | + store × product type, top products | `+ items.products.type`, `+ products.name` with `rank()` |
| 3 | Segments | + new vs returning customers, monthly trend | `+ customer segment`, `+ time_dimensions month` |
| 4 | Analysis | + YoY (`time_shift(-1,'year')`), MoM `change_pct`, share of total, biggest movers | formulas on the same measures |

The agent adapts this per question. If the data does not reach back a year, it skips YoY. If a store opened mid-year,
it notes that. If "shop" means `stores` in the business glossary, it uses `stores`. It leaves out a level that would
add nothing, for example a split where one value is 98% of the total.

There are two invariants. **Reconcile**: every split sums to its parent number. **Monotonic**: level n+1 keeps
everything from level n and refines it, and it never contradicts it.

## How it works

```
question + context ──► Ladder agent (Claude, tool loop)
                         tools: list_models · describe_model · profile_dimension · probe_query
                                validate_query · read_context · submit_level · finish
                         │  each submit_level(n, panels) is validated (catalog + core invariants),
                         │  then executed immediately
                         ▼
                   Executor runs the level's SLayer queries ──► results cache ──► UI unlocks level n
                         ▼
                   Narrator writes 1–3 sentences per level, grounded only in that level's rows
                         ▼
                   Web UI: the slider moves between computed levels, with no LLM or DB call on slide
```

### The ladder agent

- **What it sees (context)**
  - The question.
  - The SLayer catalog: models, measures, dimensions, joins and their descriptions.
  - A business context file, `context/<dataset>.md`. It holds the glossary ("shop" = store), the fiscal calendar,
    the audience ("CFO wants the number first"), and known caveats.
  - Optionally, the previous questions in the session.
  - Later, the same context can come from Motley memories.
- **What it does (tools)**, all thin wrappers over the SLayer Python client, with no SQL anywhere:
  - `list_models`, `describe_model(name)`: the semantic layer itself.
  - `profile_dimension(model, dim)`: cardinality, top values, share of the top value, null share, and the date
    range for time dimensions.
  - `probe_query(query, limit)`: runs a small SLayer query to check that a step is viable, for example "is there
    last-year data for YoY?"
  - `validate_query(query)`: SLayer validation without execution.
  - `read_context()`: the business context file.
  - `submit_level(n, title, panels, rationale)`: proposes level n. The server validates it against the catalog and
    the monotonic rule. On error, it returns the errors so the agent can fix them. On success, the executor runs it
    right away.
  - `finish(summary)`: ends the ladder. The agent chooses 2–6 levels.
- **Progressive unlock**: level 0 usually arrives in a few seconds. The slider extends as each later level lands,
  so you never wait for the whole agent run. The UI streams the agent's progress notes ("checking whether last-year
  data exists…").
- **Implementation**: the Anthropic Python SDK **Tool Runner** (`client.beta.messages.tool_runner` with
  `@beta_tool` functions), in-process with the embedded SLayer client.
  - Model `claude-opus-5-5`, adaptive thinking, effort `medium` to start; tune it on the eval.
  - Strict tool schemas, with `submit_level` validated with Pydantic.
  - Server-side refusal fallbacks are on (`fallbacks: "default"`).
  - Prompt caching on the stable prefix (system prompt, tools, catalog).
  - **Why not Managed Agents?** Every tool is a local call into the embedded SLayer, and the run is interactive and
    latency-sensitive. A hosted sandbox would add a round trip and session-runtime cost without giving the agent
    anything it needs. Managed Agents remains an option if this moves to a hosted multi-tenant service.
- **API key**: needs `ANTHROPIC_API_KEY`, or a profile from `ant auth login`. CI does not need one (see
  "Replayable" below).

### Key choices

- **The agent plans; it never answers.** It emits only SLayer queries, never SQL or numbers. Numbers come from
  SLayer, and words come from the narrator, grounded in rows.
- **The ladder is data.** `LadderSpec` → `Level` → `Panel` (kind: kpi | bar | table | line | delta;
  `slayer_query`; `parent_panel` for the refinement link) are typed Pydantic models in `core`, and they double as
  the `submit_level` tool schema.
- **Slide is free.** Moving the slider never calls the LLM or the database.
- **Replayable.** Every ladder is stored with its agent trace (tool calls and results). Tests and the demo can
  replay stored ladders without an API key.

## Stack

- Backend: Python 3.12, `uv`, FastAPI with server-sent events for progressive levels, the `motley-slayer` local
  client with the Jaffle Shop demo preloaded, and the `anthropic` SDK.
- Frontend: TypeScript, Vite and React. Charts use the dataviz skill's palette, with animated transitions so a KPI
  "unfolds" into its bars.
- Both languages are first-class in living-architecture: one LikeC4 model covers both, and `la-arch-check` enforces
  imports in each.

## Living architecture as the foundation

Run `/la:init` then `/la:arch-init` on day one, so the model and principles exist before any feature code.

### LikeC4 model (target)

```
backend (python, package slayer_zoom)
  core       'Ladder domain'      — LadderSpec/Level/Panel types, reconcile + monotonic invariants. Imports nothing.
  catalog    'SLayer catalog'     — models, measures, dimensions, profiles, via the SLayer client
  context    'Business context'   — loads context/<dataset>.md (later: Motley memories)
  agent      'Ladder agent'
    tools    'Agent tools'        — @beta_tool wrappers over catalog/executor; submit_level validation
    loop     'Agent loop'         — Tool Runner, prompts, streaming progress, trace recording
  executor   'Query executor'     — runs panels through SLayer, caches by query hash
  narrator   'Level narrator'     — grounded text per level + number-grounding check
  traces     'Ladder store'       — persisted ladders + agent traces for replay
  api        'HTTP API'           — FastAPI: POST /answer (SSE stream of levels), GET /answer/{id}
web (typescript, web/src)
  state      'Answer state'       — SSE client, levels as they arrive, slider position
  panels     'Panel renderers'    — kpi, bar, table, line, delta
  slider     'Granularity slider' — control + transitions + progress notes

arrows: api→agent.loop, api→executor, api→narrator, api→traces
        agent.loop→agent.tools, agent.loop→context, agent.loop→traces
        agent.tools→catalog, agent.tools→executor, agent.tools→core
        executor→core, narrator→core, catalog→core, traces→core
        slider→state, slider→panels, panels→state
```

The only element that imports `anthropic` is `agent.loop`, plus `narrator`. The only elements that import `slayer`
are `catalog` and `executor`.

### Principles, in arc42 files with enforcement tags

- **core: Reconcile** (enforced: property test). Every split panel's values sum to its parent panel's value,
  within rounding.
- **core: Monotonic disclosure** (enforced: test, plus a check in `submit_level`). The panel set of level n+1
  contains level n's panels or refinements of them.
- **agent: Plans, never answers** (enforced by the import law and tool schemas). The agent's only outputs are
  `SlayerQuery` objects and short rationales. It has no SQL tool and no way to emit a number into the UI.
- **agent: Explore before proposing** (review, then an eval metric). Each panel that splits by a dimension must be
  backed by a `profile_dimension` or `probe_query` call in the trace.
- **agent: Bounded run** (enforced). Caps on tool calls and tokens (a task budget) for each question. On a cap, the
  levels already submitted stand.
- **narrator: Grounded** (enforced: check). Every number in the narration appears in that level's result rows.
- **traces: Replayable** (enforced: test). Every ladder can be re-rendered from its stored trace with no API key.
  CI runs only on recorded traces.
- **api: Slide is free** (target). Changing levels never triggers an LLM or database call.
- **web: Dumb renderers** (review). Panels render a `Panel` and its rows. They never compute numbers.

### Workflow

Each milestone below is one `/la:pr` run. It produces a Codex-reviewed plan, failing tests, the implementation,
and review gates, and its OpenSpec change is archived as the ADR.

## Milestones

**M0: Repo and architecture (half a day)**
- Create `MotleyAI/slayer-zoom` (public, MIT) with a README that states the idea plus the example above.
- Add the `uv` backend skeleton and the Vite web skeleton.
- Run `/la:init` (tracker, `openspec: true`, `architecture: true`, Codex reviewer), then `/la:arch-init` with the
  model and principles above.
- Set up CI: tests, lint, `la-arch-check`, `likec4 validate`, `dr-typecheck`. CI has no API key.

**M1: Walking skeleton with a hand-written ladder (1–2 days).** OpenSpec: `walking-skeleton`
- `core` types and invariants.
- `executor` on the SLayer demo database.
- A hand-written 5-level ladder for revenue YTD, stored as a trace in `traces`.
- `POST /answer` streams the levels.
- The web slider renders KPI, bar and table panels.
- **Demo-able**: this proves the UX before any agent exists.

**M2: Ladder agent (3 days).** OpenSpec: `ladder-agent`
- `catalog` with `profile_dimension`, and `context` with `context/jaffle_shop.md`.
- The agent tools and the Tool Runner loop.
- `submit_level` validation and progressive execution.
- Trace recording and replay.
- A stream of progress notes to the UI.

**M3: Narration and trust (1 day).** OpenSpec: `level-narration`
- The narrator writes text for each level, and the number-grounding check runs.
- The reconcile check runs live; when a level fails to reconcile, the UI shows a badge.
- A "show query" drawer on each panel exposes the SLayer query, and a "why this level" drawer shows the agent's
  rationale and the probes behind it.

**M4: Feel and demo (1–2 days).** OpenSpec: `slider-polish`
- Animated level transitions.
- Keyboard and scroll control.
- URL state (`?q=…&level=3`).
- Deploy: a single container on Render or Fly, with the API key as a secret, a per-IP rate limit, and a set of
  pre-recorded questions that replay with no API cost.
- Record a 30-second demo video with the social-animations pipeline.

**Stretch: inside Claude.** Expose `answer_with_granularity` as an MCP tool or MCP App over the same API, so the
slider shows up in claude.ai on top of Motley. This connects directly to the Motley product.

## Eval and success criteria

The eval set is about 15 Jaffle questions: revenue, orders, AOV, items sold, per store, per product type, plus a few
that need the context file ("shops", "this fiscal year"). It is run manually or nightly, with an API key.

- Validity: 100% of submitted levels pass validation (after the agent's own retries), and 100% reconcile.
- Grounding: at least 95% of narration numbers grounded.
- Exploration: at least 90% of split panels are backed by a probe in the trace.
- Usefulness: a judge using `claude-opus-5-5` with a rubric, plus a human spot check, rates the ladder "useful at
  every level" for at least 12 of 15 questions.
- Latency: level 0 in 5 s or less, the full ladder in 30 s or less, and a slider move in under 100 ms.
- Cost: tokens per question are tracked in each trace. The eval reports the median and p90.

## Open decisions

1. **Name**: `slayer-zoom` (proposed), `granular`, or `answer-dial`.
2. **Tracker for `/la:init`**: GitHub Issues (fits a public repo, outside contributors) or Linear DEV, as SLayer
   uses.
3. **Context source**: a markdown file per dataset for the prototype (proposed), or reading Motley memories from
   the start.
4. **Data beyond the demo**: Jaffle Shop only for the prototype, or also a bigger dataset (for example the TPC-H
   model from semantic-layer-bench) to show deeper ladders, where the agent's judgment matters more.
5. **Public demo cost**: replay-only for recorded questions plus live questions behind a key or rate limit
   (proposed), or fully live.
