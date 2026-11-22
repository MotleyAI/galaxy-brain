# Ladder agent

## Purpose and context

Builds the ladder for a question: Claude (`claude-opus-5-5`, adaptive thinking) in the Anthropic SDK Tool Runner,
with tools over the catalog, the business context and the executor. The ladder follows an arc of three to six
levels: the number that answers the question, then where it comes from and what is changing, then a Why level whose
panels isolate the drivers the agent confirmed with probes, and last an Actions level whose panels size the levers a
decision maker can pull. Each level may quote, word for word, the facts from the business context that shaped it.
Each level the agent submits is validated, run and streamed to the reader at once, and the run is kept as a trace
of notes, tool calls and levels.

## Building blocks

See the `python` view in `views.c4`.

## Principles

1. Plans, never answers: the agent's only outputs are SLayer queries inside panels, with short titles, rationales and context quotes. It has no SQL tool and no tool that puts a number in front of the reader. [enforced: test:tests/test_agent_loop.py]
2. A submitted level is shown only after it passes the monotonic rule, SLayer validation of every query, and a run that returns rows for every panel. [enforced: test:tests/test_agent_session.py]
3. Bounded run: one run makes at most a fixed number of tool calls and builds at most six levels; when a cap is hit, the levels already submitted stand. [enforced: test:tests/test_agent_session.py]
4. Context quotes are the business context's own words: a level whose quote does not appear in the context file is rejected. [enforced: test:tests/test_agent_session.py]
5. Explore before proposing: each split dimension is profiled or probed before the level that splits by it. `submit_level` reports dimensions nobody explored. [review]
6. The agent and, from #3, the narrator are the only elements that import the Anthropic SDK. [enforced: test:tests/test_import_law.py]

## Rationale

Every tool is a local call into the embedded SLayer, and the run is interactive, so the loop runs in-process with
the Tool Runner rather than as a Managed Agent. The system prompt (instructions, a worked ladder, the business
context and the model list) is stable per dataset and cached. Server-side refusal fallbacks are on. Progressive
submission lets the reader see level 1 while the agent still explores the next levels. The arc ends in Why and
Actions because the reader has a decision to make: description alone leaves them to find the drivers and the
levers themselves, while panels that isolate drivers and size levers keep every recommendation tied to rows SLayer
returned. Context quotes show where what the business knows steered the analysis, and checking them word for word
keeps the agent from inventing that context.
