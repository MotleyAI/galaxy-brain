# Resizable answer

## Purpose and context

The answer and its depth control in one: an OpenUI card that always shows the answer at its current depth, in full,
with each panel inline right after the sentence that introduces it, and each depth's first sentence headed by the
question it answers. The reader pulls the handle on the card's bottom edge down to unlock the next depth: the pull
opens room while a brain on the handle charges, and past a threshold the next depth writes itself into the text, word
by word in place, and its charts unfold. Pulling up folds a depth away. The brain grows and glows brighter at each
depth, with rays shining out of it. What the next depth holds stays hidden: the handle only says "Pull to expand",
and its tooltip and accessible value give the depth number, never its name. Near the bottom of the window the page
scrolls, so a pull can go on. Once a new depth unlocks, the page tours it: it first goes to where the depth's first
change lands, then follows the writing down as the new text appears, pauses at its end, then glides back up to the
start of the answer at a readable pace, so the reader sees how much was added and can read the fuller analysis from
the top. The text the depth added stays marked until a few seconds after. Any scrolling of the reader's own ends the
tour.

## Building blocks

See the `typescript` view in `views.c4`.

## Principles

1. The answer reads levels and position from answer state and changes them only through `slide`. [review]
2. Unlocking a depth only ever adds words and panels, and folding it only removes them: the reader never sees the text rewritten. [enforced: test:web/src/slider/stretch.test.ts]
3. Each depth always shows the same complete text, and a press unlocks at most one depth, only past the threshold. [enforced: test:web/src/slider/pull.test.ts]

## Rationale

Each depth should feel like a new, deeper answer, not more of the same text uncovered. Levels are discrete (each is
a set of SLayer queries), so the control is discrete too: a pull is a deliberate ask for the next depth, and the
charge and the brain make the step visible before it happens. Writing the new sentences into the existing text, and
unfolding each chart after the sentence that introduces it, keeps the answer one text that only grows. Keeping the
next depth unnamed makes each pull a small reveal; the question headings show the analysis's structure as it unfolds,
not before. A deeper depth is a fuller analysis, best read from the top: the tour shows its extent first, then brings
the reader back there with what is new marked. One depth per press is a hard cushion against unlocking more than the
reader meant to. Every panel the text never introduces still gets a place, so no data is lost to a missing sentence.
