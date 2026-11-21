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

#### Scenario: Holding the pull at the window's edge
- **WHEN** the reader pulls to the bottom of the window and holds while the page scrolls and a depth unfolds
- **THEN** exactly one depth unlocks; the page following the answer does not count as pulling, and the next depth
  takes another full pull once this one has settled

#### Scenario: A long answer
- **WHEN** the unlocked depth grows the answer past the bottom of the window
- **THEN** the page scrolls with it and brings the handle back to about the middle of the window, leaving room for
  the next pull

### Requirement: Overview of the analysis
The card SHALL open with a summary of the answer so far and an outline of every depth. The narrator SHALL write, per
depth, the question it answers, a headline of a few words and a summary of the whole answer so far, every figure of
which appears in the rows of that depth or an earlier one. The summary SHALL be rewritten at each depth; the body
text SHALL only grow. Each depth's first sentence SHALL carry its question as a heading.

#### Scenario: Unlocking a depth
- **WHEN** the reader unlocks the Split depth of "What is our revenue year to date?"
- **THEN** the summary is rewritten to cover revenue and its split by store, the outline marks Split as current with
  its headline, and the store sentence appears under the heading "Which cafés bring in the revenue?"

#### Scenario: Depths still to come
- **WHEN** the reader is at depth 2 of 5
- **THEN** the outline shows the headlines of depths 1 and 2 and the titles of depths 3 to 5, and clicking an
  unlocked depth goes there

#### Scenario: A made-up figure in a summary
- **WHEN** a drafted summary states a figure that no row up to its depth rounds to
- **THEN** the narrator asks once more, and if it still fails the previous summary is kept

### Requirement: OpenUI components
Panels and the card SHALL be drawn with OpenUI components, and only the panels and the resizable answer SHALL import
OpenUI.

#### Scenario: Another element imports OpenUI
- **WHEN** a file outside `src/panels` and `src/slider` imports `@openuidev/*`
- **THEN** the import-law test fails
