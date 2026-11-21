# Resizable answer

## Purpose and context

The answer and its detail control in one: an OpenUI card holding one text that grows as the reader drags the card's
bottom edge down. The card's height maps to the answer's detail, so the text fills the space it is given. Between two
levels the next level's added words appear in place, in reading order, and each panel appears inline right after
the sentence that introduces it. Clicking a level name in the card's footer grows or shrinks the card to that level.

## Building blocks

See the `typescript` view in `views.c4`.

## Principles

1. The answer reads levels and position from answer state and changes them only through `slide`. [review]
2. Growing the card only ever adds words and panels, and shrinking it only removes them: the reader never sees the text rewritten. [enforced: test:web/src/slider/stretch.test.ts]
3. The card's height maps to a position by the measured height of each level, so a given height always shows the same text. [enforced: test:web/src/slider/fit.test.ts]

## Rationale

The box is the product: asking for more detail should feel like giving the answer more room, not like operating a
control beside it. Levels are discrete (each is a set of SLayer queries), but the text between them is not: revealing
the next level's words as the card grows, and showing a chart as the payoff of the sentence that introduces it, hides
the moment new data appears. Mapping height through each level's measured height keeps the text filling the card
whatever the screen width. Every panel the text never introduces still gets a place, so no data is lost to a missing
sentence.
