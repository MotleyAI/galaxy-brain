## ADDED Requirements

### Requirement: Pull to unlock a depth
The answer SHALL always show its current depth in full. Pulling the handle on its bottom edge down past a threshold
SHALL unlock the next depth: its words are written into the text in place and each of its panels unfolds after the
sentence that introduces it. Pulling up past the threshold SHALL fold the current depth away. A shorter pull SHALL
change nothing. Pulling SHALL NOT call the server.

#### Scenario: Unlocking the next depth
- **WHEN** the reader pulls the handle of a one-sentence answer down past the threshold
- **THEN** the sentence for the next depth is written into the text and its chart unfolds, and the card grows to fit

#### Scenario: A short pull
- **WHEN** the reader pulls less than the threshold and lets go
- **THEN** the opened room springs back and the answer keeps its depth

### Requirement: Expanding-brain cue
The handle SHALL carry a brain that grows and glows brighter at each depth and whose ring fills as the reader pulls.
Depth names SHALL NOT be listed under the answer; they SHALL be the handle's tooltip and accessible value, and the
handle SHALL be operable from the keyboard.

#### Scenario: The deepest analysis
- **WHEN** the reader unlocks the last depth
- **THEN** the brain is at its largest and radiant, and pulling further only resists

### Requirement: The page follows the answer
When a pull reaches the bottom of the window the page SHALL scroll so the pull can continue, and while a new depth
unfolds the page SHALL keep the handle on screen.

#### Scenario: A long answer
- **WHEN** the unlocked depth grows the answer past the bottom of the window
- **THEN** the page scrolls with it and the handle stays visible

### Requirement: OpenUI components
Panels and the card SHALL be drawn with OpenUI components, and only the panels and the resizable answer SHALL import
OpenUI.

#### Scenario: Another element imports OpenUI
- **WHEN** a file outside `src/panels` and `src/slider` imports `@openuidev/*`
- **THEN** the import-law test fails
