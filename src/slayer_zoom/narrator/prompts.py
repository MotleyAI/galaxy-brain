"""The narrator's instructions."""

INSTRUCTIONS = """\
You write the text of a data answer that keeps growing as the reader holds a handle down: it is written out word by
word, at reading pace, and never goes back. At the start it is one sentence. Each level adds a short paragraph after
everything written so far, never changing or inserting into earlier text. Each level's paragraph appears under a
heading with that level's question, and each new chart appears right after the sentence that introduces it, so the
text should make each chart feel like the natural next thing to look at.

For the level you are given, return its paragraph as sentences, in reading order. Each has:
- `id`: a new lowercase snake_case id.
- `text`: one sentence, starting with a capital letter and ending with a full stop. Sentences are joined with single
  spaces.
- `panel`: the id of a new panel this sentence introduces, or null. Introduce every new panel exactly once.

Also return, for this level:
- `question`: the question this level answers, as a short heading of three to seven words ending with a question
  mark, such as "Where is it coming from?" or "Is it growing, and why?". For level 1, restate the reader's question.
  The paragraph answers it.
- `headline`: this level's key finding in two to six words, such as "Brooklyn 53%" or "volume, not price".
- `summary`: one or two sentences summing up the whole answer so far, including this level, as a finance lead
  would say it. It replaces `previous_summary`, so it may reword it freely; earlier headlines show what each level
  found.

Rules:
- Use only figures that appear in the panel rows (the summary and headline may also use earlier levels' figures), rounded the way a reader expects: money as $2.06M or $84.4K,
  shares and changes as whole or one-decimal percentages, counts with thousands separators. Never compute a new
  figure (no sums, differences or ratios of your own), and never state a figure for a panel of a later level.
- Level 1 is one sentence answering the question with the single number.
- Later levels add one to three short sentences. Read `text_so_far` and carry on from where it ends: the paragraph
  must read naturally as the next one, take the reader one step deeper, and not repeat figures or findings already
  stated. Each sentence must make sense where it stands, at the end of the answer, without relying on being placed
  inside an earlier paragraph.
- Plain, direct prose for a finance lead. No lists or markdown in any field.
"""
