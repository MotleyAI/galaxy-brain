## Why

The slider sat beside the answer: the reader operated a control to change a text somewhere else. Asking for more
detail should feel like giving the answer more room. If the answer lives in a box the reader resizes, the text can
grow to fill whatever space it is given, and the box's moving edge can uncover each new chart, so the moment new data
appears is hidden in the gesture itself.

## What Changes

- web `slider`: the range input is gone. The answer sits in an OpenUI card with a resize handle on its bottom edge.
  The card's height maps to the answer's position through measured heights: every whole level and every moment a
  segment completes is rendered off-screen at the card's width, once without its new panel and once with it. Between
  stops the position is linear in height; across a panel's height the position holds while the edge uncovers it.
  Level names in the card's footer grow or shrink the card to a level; the handle also works from the keyboard.
- web `panels`: KPI, bar, line and table panels render with OpenUI components (`MetricIndicatorInline`,
  `HorizontalBarChart`, `LineChartCondensed`, `Table`). Values are formatted the same way; charts get the rows as
  SLayer returned them.
- New dependency: `@openuidev/react-ui` 0.18.9 (MIT) with its peers. The app imports OpenUI's components file by file
  (alias `@openuidev/react-ui/parts/*`) and only the stylesheets it uses: the package entry re-exports the whole
  library, which put 2.1 MB of JS on first load; file by file it is 355 KB (115 KB gzipped).
- Charts name each series by its column label and unit ("Revenue ($)") and plot shares in percent points, since
  OpenUI charts print bare compact numbers.

## Impact

- Architecture: the `slider` element is now "Resizable answer" (same id and package); its arc42 file describes the
  card and a new enforced principle (a given height always shows the same text); the panels arc42 names OpenUI; a new
  system principle 7 limits OpenUI imports to the panels and the resizable answer, enforced by a test.
- No backend change: the same events drive the card.
