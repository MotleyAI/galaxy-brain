## Why

The slider sat beside the answer: the reader operated a control to change a text somewhere else. Each depth of
analysis should feel like unlocking a new, deeper answer: a deliberate pull on the answer itself, with a visible cue
for how deep the reader has gone.

## What Changes

- web `slider`: the range input is gone. The answer sits in an OpenUI card that always shows its current depth in
  full. Pulling the handle on its bottom edge opens room while a brain on the handle charges; past a threshold the
  next depth writes itself into the text and its charts unfold, and pulling up folds a depth. The brain grows and
  glows brighter per depth and carries the depth names as tooltip and accessible value. Near the window's bottom the
  page scrolls so the pull continues, and it follows the answer while a depth unfolds. Keyboard: arrows, Page
  Up/Down, Home, End.
- web `panels`: KPI, bar, line and table panels render with OpenUI components (`MetricIndicatorInline`,
  `HorizontalBarChart`, `LineChartCondensed`, `Table`). Values are formatted the same way; charts get the rows as
  SLayer returned them.
- New dependency: `@openuidev/react-ui` 0.18.9 (MIT) with its peers. The app imports OpenUI's components file by file
  (alias `@openuidev/react-ui/parts/*`) and only the stylesheets it uses: the package entry re-exports the whole
  library, which put 2.1 MB of JS on first load; file by file it is 355 KB (115 KB gzipped).
- Charts name each series by its column label and unit ("Revenue ($)") and plot shares in percent points, since
  OpenUI charts print bare compact numbers.

## Impact

- Architecture: the `slider` element is now "Resizable answer" (same id and package); its arc42 file describes
  pull to unlock and a new enforced principle (each depth shows the same complete text; a pull moves one step past
  its threshold); the panels arc42 names OpenUI; a new
  system principle 7 limits OpenUI imports to the panels and the resizable answer, enforced by a test.
- No backend change: the same events drive the card.
