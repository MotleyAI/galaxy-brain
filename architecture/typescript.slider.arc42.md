# Resizable answer

## Purpose and context

The answer and its depth control in one: an OpenUI card whose answer keeps growing for as long as the reader holds the
handle on its bottom edge pulled down. The answer starts as depth 1 in full: one sentence and its number. While the
handle is held below where it was pressed, the answer writes itself on, word by word, and draws its charts row by
row: the further the pull, the faster, up to human speed (about eleven words a second). Letting go stops the writing;
pulling up unwrites from the end at the same pace. Everything is added below what is already there: each depth is a
paragraph after the one before, opening with the question it answers, with each panel right after the sentence that
introduces it. As the answer grows, the page scrolls by as much, so the handle stays under the finger and the answer
seems to unroll out of it; a caret marks the writing point. Panels draw as part of the same stream: a single number
rises into focus, bar charts and tables unroll a row at a time, and a line chart opens its frame, then draws left to
right through time. A brain on the handle grows and glows brighter with the depth being written, with rays shining
out of it, and its ring fills as that depth is written. Before a pull the handle only says "Pull to expand"; while the
reader writes, a slim band between the answer and the handle shows the agent's reasoning for the depth being written,
in up to two lines, changing as each new depth starts. The tooltip and accessible value give the depth number. Holding the arrow keys on the
handle writes or unwrites; Home and End jump to depth 1 or to everything.

## Building blocks

See the `typescript` view in `views.c4`.

## Principles

1. The answer reads levels, narration and digests from answer state and never changes them; how much of the answer is written is its own state. [review]
2. Writing only ever adds below: words and panels are appended after what is written, in the narration's order, and unwriting only removes from the end. [enforced: test:web/src/slider/stream.test.ts]
3. Never faster than human speed: however hard the pull, the answer writes at most about eleven words a second, and charts and tables cost a share of that like words do. [enforced: test:web/src/slider/stream.test.ts]

## Rationale

The answer should feel like one continuous expansion: the reader decides how far the analysis goes, and sees it
being written rather than revealed. A held pull, not a press, keeps the reader in control of the pace, and the speed
cap keeps the writing at a pace a person can follow, so more content never arrives faster than it can be read.
Appending only, depth after depth, means nothing the reader has read ever moves. Drawing each chart a row at a time,
at the same steady pace as the words, makes charts part of the writing rather than interruptions; each animation
follows the data's own shape (rows arrive one by one, time runs left to right), and only clips or fades what is
there, so no number is ever shown that SLayer did not return. Showing a depth's reasoning only once it is being written
keeps each depth a small surprise while telling the reader why the analysis is going there; the question headings
show its structure as it is written, not before. Every panel the
text never introduces still gets a place, so no data is lost to a missing sentence.
