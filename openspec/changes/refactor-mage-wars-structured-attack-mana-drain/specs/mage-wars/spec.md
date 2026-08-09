## ADDED Requirements

### Requirement: Structured Attack Mana Drain
Mage Wars configured attack profiles SHALL expose mana-drain values through the configuration package.

#### Scenario: Configured mana drain is consumed after actual damage
- **GIVEN** a configured attack profile declares `manaDrain`
- **WHEN** its first strike deals actual damage to an opposing target
- **THEN** the target controller MUST lose the configured amount of mana, capped at current mana
- **AND** the value MUST come from the configuration package rather than display text

#### Scenario: Multi-strike attack drains only once
- **GIVEN** a configured multi-strike attack declares mana drain
- **WHEN** multiple strikes deal damage
- **THEN** mana drain MUST resolve only for the first strike

#### Scenario: No actual damage causes no drain
- **GIVEN** a configured attack declares mana drain
- **WHEN** the attack deals zero actual damage
- **THEN** the target controller MUST lose no mana

### Requirement: Mana Drain Migration Boundary
The change SHALL keep mana transfer and unrelated equipment abilities separate from attack mana drain.

#### Scenario: Mana transfer remains deferred
- **GIVEN** a card has a separate mana-transfer or attacker-mana ability
- **WHEN** attack mana drain is migrated
- **THEN** the card MUST NOT be marked complete for mana transfer merely because `manaDrain` is configured

