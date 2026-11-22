# Resizable answer

## Purpose and context

The answer and its depth control in one: an OpenUI card that deepens an analysis one depth at a time. Its head stays
in view while the reader scrolls. It shows the answer so far, the narrator's summary of the last depth written in
full, which fades to the new summary as each depth completes. Under it, a rail names the depths the agent planned
(for example Number, Split, Trend, Why, Actions) and marks those done, the one being written, and the next; under each
written step it shows what that depth found, in the narrator's few words ("Brooklyn $318.1K"), so the rail reads as
the argument in brief. Clicking a step writes on to it or goes back to it. The answer starts as depth 1 in full: one sentence and its number. Under the
answer sits one bar with a single line that says what a tap or a pull does now: the next step's question ("Why is
revenue moving? ↓"), "Tap to finish this depth" while one writes, "Release to go deeper" or "Release to go back"
once a pull has gone far enough, and "That's the full analysis" at the end. A tap on the bar, a short pull down on
it, or Down, Enter or Space asks for the next depth. The pull opens a slim, empty band above the bar, which closes on
release, and holding the bar stops the page following so it stays under the finger. The depth then writes itself below what is there, word by word at about eleven
words a second (half as fast again from depth 3 on), and a caret marks the writing point. Each depth is a paragraph
after the one before, opening with its question, with its first new
chart right after the sentence that introduces it; its further charts fold into one-line "Evidence" links that open
in place. Charts draw as part of the same stream: a single number rises into focus, bar charts and tables unroll a
row at a time, and a line chart opens its frame, then draws left to right through time. On the question's line sit
small titles that open as an overlay on a tap and close on a tap elsewhere or Escape: "Context", the business-context
facts that shaped the depth, and on the Why depth "How the agent got here", how many exploratory queries and profiles
it ran, on which measures and splits. The page follows
the writing point: whenever the bar under it leaves the middle of the screen, the page eases toward it a little
each frame, until the reader scrolls; the writing carries on either way. While a depth writes, a tap skips to its
end; pulling up, or Up, goes back a depth, unwriting from the end at three times the pace. A depth asked for
before the agent has built it starts writing when it arrives. A small brain on the bar fills its ring as the depth is
written. Home and End jump to depth 1 or to everything.

## Building blocks

See the `typescript` view in `views.c4`.

## Principles

1. The answer reads levels, narration, digests and what the agent explored from answer state and never changes them; how much of the answer is written is its own state. [review]
2. Writing only ever adds below: words and panels are appended after what is written, in the narration's order, and unwriting only removes from the end. [enforced: test:web/src/slider/stream.test.ts]
3. Never faster than a reader can follow: a depth writes itself at about eleven words a second, half as fast again from depth 3 on, and charts cost a share of that like words do. [enforced: test:web/src/slider/stream.test.ts]
4. What the head, the rail and its findings, the bar's next question and the exploration note say comes from the agent and the narrator: digests, level titles and the recorded probes, never text the answer makes up. [review]

## Rationale

The reader has a decision to make, and the impression that should stay is research visibly deepening toward it, not
the animation. The answer so far makes that visible in one place: the conclusion sharpens as each depth lands,
without the reader reconstructing it from paragraphs further down. A named rail gives depth a shape: how deep the
analysis goes, where the reader is, and what comes next, in sober words rather than in the brain's mood; the finding
under each written step lets a reader who only scans the head take away the argument. Naming the
next step by its question is more intuitive than an anonymous handle, and tells a finance reader this is research,
not a reveal. One control that is both the button and the handle, with one line of text that changes with what it
will do, keeps the bottom of the answer quiet and leaves no second thing to aim at; the pull stays as a shortcut on
the same bar. One gesture per depth matches what a reader asks for, the next idea
rather than the next few words, and leaves their hands free to read. The speed keeps the writing at a pace a person
can follow; later depths, where the reader is invested and wants the point, run faster, and skipping gives a fast
reader the whole depth at once. Following the writing point replaces a guided tour: the reader sees the new depth
arrive without the page being taken from them, and scrolling hands control straight back. Appending only means
nothing the reader has read ever moves. One main chart per depth keeps each depth readable; the rest of the evidence
is one tap away, so nothing is hidden and nothing crowds the point. Drawing each chart a row at a time makes charts
part of the writing; each animation follows the data's own shape and only clips or fades what is there, so no number
is ever shown that SLayer did not return. The exploration note shows that the agent searched before it concluded,
while saying only what it queried, never what it found. Context and exploration fold to titles on the question's
line because they explain the analysis rather than carry it: one tap away for the reader who asks, never in the way
of the one who reads on. Every panel the text never introduces still gets a place,
so no data is lost to a missing sentence.
