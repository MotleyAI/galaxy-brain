# Resizable answer

## Purpose and context

The answer and its depth control in one: an OpenUI card with a handle on its bottom edge. The answer starts as depth 1
in full: one sentence and its number. A short pull down on the handle, a tap, or Down, Enter or Space on it asks for
the next depth; once the pull is far enough, the band above the handle says which depth a release will write. The
depth then writes itself below what is there, word by word at about eleven words a second, and draws its charts row
by row; a caret marks the writing point. Each depth is a paragraph after the one before, opening with the question it
answers, with each panel right after the sentence that introduces it. Panels draw as part of the same stream: a single
number rises into focus, bar charts and tables unroll a row at a time, and a line chart opens its frame, then draws
left to right through time. While a depth writes, a slim band between the answer and the handle shows the agent's
reasoning for it, in up to two lines. The page follows the writing point, keeping the end of the answer where it was
on screen, until the reader scrolls; the writing carries on either way. Pulling or tapping again while a depth writes
skips to its end; pulling up, or Up, goes back a depth, unwriting from the end at three times the pace. A depth asked
for before the agent has built it starts writing when it arrives. A brain on the handle grows and glows brighter with
the depth being written, with rays shining out of it; its ring charges with the pull and fills as the depth is
written. The tooltip and accessible value give the depth number; Home and End jump to depth 1 or to everything.

## Building blocks

See the `typescript` view in `views.c4`.

## Principles

1. The answer reads levels, narration and digests from answer state and never changes them; how much of the answer is written is its own state. [review]
2. Writing only ever adds below: words and panels are appended after what is written, in the narration's order, and unwriting only removes from the end. [enforced: test:web/src/slider/stream.test.ts]
3. Never faster than human speed: a depth writes itself at most about eleven words a second, and charts and tables cost a share of that like words do. [enforced: test:web/src/slider/stream.test.ts]

## Rationale

The answer should feel like one continuous expansion that the reader steers: they decide how far the analysis goes,
and see each depth being written rather than revealed. One gesture per depth matches what a reader asks for, the next
idea rather than the next few words, and leaves their hands free to read; an earlier version made the reader hold the
pull for the writing to go on, which tied reading to effort and could stop mid-sentence. The speed cap keeps the
writing at a pace a person can follow, and skipping lets a fast reader have the whole depth at once. Following the
writing point replaces a guided tour: the reader sees the new depth arrive without the page being taken from them,
and scrolling hands control straight back. Appending only, depth after depth, means nothing the reader has read ever
moves. Drawing each chart a row at a time, at the same steady pace as the words, makes charts part of the writing
rather than interruptions; each animation follows the data's own shape (rows arrive one by one, time runs left to
right), and only clips or fades what is there, so no number is ever shown that SLayer did not return. Showing a
depth's reasoning only once it is being written keeps each depth a small surprise while telling the reader why the
analysis is going there; the question headings show its structure as it is written, not before. Every panel the text
never introduces still gets a place, so no data is lost to a missing sentence.
