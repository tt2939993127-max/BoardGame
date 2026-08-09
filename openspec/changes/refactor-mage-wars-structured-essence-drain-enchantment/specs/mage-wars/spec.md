## ADDED Requirements

### Requirement: Structured Essence Drain Upkeep Cost

`1815` 精华汲取 SHALL expose its upkeep `+2` behavior through visible-object-enchantment semantics rather than display text.

#### Scenario: A controller may pay the upkeep cost

- **GIVEN** a configured `1815` enchantment is revealed and attached to a creature
- **AND** the creature controller has at least 2 mana
- **WHEN** the game enters upkeep
- **THEN** the runtime MUST offer payment or destruction for that source
- **WHEN** the controller chooses payment
- **THEN** the runtime MUST emit `MANA_SPENT` for 2 mana
- **AND** the enchantment MUST remain attached

#### Scenario: Insufficient mana forces destruction

- **GIVEN** a configured `1815` source is due for upkeep
- **AND** the creature controller has less than 2 mana
- **WHEN** the upkeep choice is created
- **THEN** payment MUST NOT be an available option
- **WHEN** the source is resolved
- **THEN** the runtime MUST destroy the `1815` enchantment without reducing mana below zero

#### Scenario: Display text is not the rule owner

- **GIVEN** a revealed `1815` source and its host creature have empty or rewritten display text
- **WHEN** upkeep is entered
- **THEN** the runtime MUST still derive the 2-mana upkeep choice from structured configuration

#### Scenario: Removed source cannot be paid twice

- **GIVEN** a `1815` source is removed before its queued upkeep choice resolves
- **WHEN** the controller responds to that stale choice
- **THEN** the runtime MUST NOT emit a second payment or destroy a nonexistent source

### Requirement: Essence Drain Migration Boundary

The change SHALL preserve existing mana and enchantment lifecycle owners.

#### Scenario: Upkeep payment uses the existing mana reducer

- **GIVEN** the controller chooses to pay `1815`
- **WHEN** the response is resolved
- **THEN** the runtime MUST use `MANA_SPENT`
- **AND** it MUST NOT use attack mana-drain `MANA_DRAINED`

#### Scenario: Other deferred cards remain deferred

- **GIVEN** cards such as `1804` or `1904` are outside this change
- **WHEN** the ability catalog is inspected
- **THEN** this change MUST NOT mark them implemented or alter their executor boundary
