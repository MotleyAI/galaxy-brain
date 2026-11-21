## ADDED Requirements

### Requirement: Detail follows the answer's size
The answer SHALL sit in a card whose bottom edge the reader drags, and the card's height SHALL set the answer's
detail: a taller card shows the same text plus the words and panels of finer levels, and a given height SHALL always
show the same text at a given width.

#### Scenario: Growing the card
- **WHEN** the reader drags the bottom edge of a one-sentence answer down
- **THEN** the next level's words appear in place and fill the added room, and the card never shows less than before

#### Scenario: A chart arrives
- **WHEN** the edge reaches the end of a sentence that introduces a chart
- **THEN** the text stops growing while the moving edge uncovers the chart

### Requirement: Jump to a level
Each level name SHALL resize the card to show that level in full, and the resize handle SHALL be operable from the
keyboard. Resizing SHALL NOT call the server.

#### Scenario: Clicking a level name
- **WHEN** the reader clicks "Mix"
- **THEN** the card glides to the height of the Mix level, showing its text and panels in full

### Requirement: OpenUI components
Panels and the card SHALL be drawn with OpenUI components, and only the panels and the resizable answer SHALL import
OpenUI.

#### Scenario: Another element imports OpenUI
- **WHEN** a file outside `src/panels` and `src/slider` imports `@openuidev/*`
- **THEN** the import-law test fails
