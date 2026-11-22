# Level narrator

## Purpose and context

Writes the answer's text, which only grows below. When a level lands, the narrator (Claude Sonnet 5.5, effort low,
with structured output) adds a paragraph of one to three short sentences after the text so far, carrying on from where
it ends, and introduces each of the level's new panels with exactly one of them. For each level it also writes a
digest: the question the level answers (shown as a heading above its paragraph), its finding in a few words, and a
summary of the whole answer so far, which replaces the previous one (stored, not shown in the web app today). Text and
digests are stored with the trace and replay without an API key.

## Building blocks

See the `python` view in `views.c4`.

## Principles

1. Grounded: every number in the text appears, as rounded, in the result rows of its level, and every number in a digest appears in the rows of its level or an earlier one. A draft with an ungrounded figure gets one retry with the problems listed; what still fails is dropped (a digest part falls back to the level title or the previous summary). [enforced: test:tests/test_narrator.py]
2. Expands, never rewrites: a level only adds sentences after the previous text; earlier segments stay unchanged and in order. The summary is the one part rewritten at each level. [enforced: test:tests/test_narrator.py]
3. Every new panel gets a place: a panel the draft does not introduce is introduced by its title. [enforced: test:tests/test_narrator.py]
4. The narrator and the agent are the only elements that import the Anthropic SDK. [enforced: test:tests/test_import_law.py]

## Rationale

The reader holds a pull and watches the answer being written, so the text must grow only at its end: a paragraph per
level, appended, means nothing already read ever moves, and each paragraph has to read as the natural next one.
Writing per level, as the agent's levels land, keeps the text grounded in exactly the rows the reader can see at that
point. Sonnet is fast enough to keep up with the agent. Each level's question heading shows the analysis's structure
as it is written. The rewritten summary and the headline are kept with the trace for other views of the answer; the
web app does not show them, since they repeated the text.
