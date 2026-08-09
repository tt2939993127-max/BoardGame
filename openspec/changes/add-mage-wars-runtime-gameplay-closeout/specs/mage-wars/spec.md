## ADDED Requirements

### Requirement: Mage Wars Apprentice Runtime Gameplay
The Mage Wars apprentice runtime SHALL expose a real player-driven gameplay loop from the formal entry, including spell planning, legal source/target selection, spell resolution, creature action, attack settlement, and phase advancement.

#### Scenario: Player drives the core loop from the formal entry
- **GIVEN** a two-player apprentice match is created through the formal Mage Wars entry
- **WHEN** the player selects a configured spellbook card, plans it, selects a legal source and target, and advances through the action phase
- **THEN** the client MUST dispatch the corresponding Mage Wars domain commands
- **AND** the resulting state MUST reflect the validated mana, prepared cards, discard cards, arena objects, damage, status tokens, and current phase

### Requirement: Mage Wars Gameplay E2E Evidence
The Mage Wars core gameplay E2E SHALL use real page interactions and SHALL keep injected saturated layout tests separate from gameplay evidence.

#### Scenario: Real interaction E2E does not patch core state
- **GIVEN** the Mage Wars formal entry is available
- **WHEN** the core gameplay E2E runs
- **THEN** it MUST begin from the formal setup state and drive the page controls or board selection targets
- **AND** it MUST NOT patch `core`, `players`, `objects`, `arena`, or phase state through the test harness
- **AND** it MUST assert real state changes after planning, casting/targeting, attack settlement, and phase advancement

### Requirement: Mage Wars Gameplay Completion Boundary
The gameplay closeout SHALL report the apprentice runtime as a scoped deliverable and SHALL not claim the complete physical Mage Wars catalog or deferred product systems.

#### Scenario: Closeout reports deferred scope
- **WHEN** the apprentice gameplay loop passes its runtime and E2E gates
- **THEN** the closeout MUST still list full catalog, free construction, four-player mode, deluxe arena, expansion mages, full AI, tutorial, action-log UI, and undo UI as deferred unless separately implemented and verified
