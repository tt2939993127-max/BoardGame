## ADDED Requirements

### Requirement: Structured Mage Wars Combat Profiles
Mage Wars configured creature and weapon cards SHALL expose machine-readable base attack and defense profiles through the game configuration package.

#### Scenario: Configured attack profile is complete
- **GIVEN** an implemented creature or weapon card has a combat profile
- **WHEN** the Mage Wars config package is materialized
- **THEN** every attack profile MUST expose a stable ID, action speed, range kind, dice count, strike count, pierce value, and damage type list
- **AND** a ranged profile MUST expose a finite minimum and maximum range

#### Scenario: Configured defense profile is complete
- **GIVEN** a configured card has a defense icon
- **WHEN** the Mage Wars config package is materialized
- **THEN** the defense profile MUST expose a stable ID, minimum success roll, and uses-per-round value
- **AND** the values MUST be consumed as numeric rule facts rather than parsed from player-visible text

#### Scenario: Runtime uses config profile for configured cards
- **GIVEN** an arena object was created from a configured card with combat profiles
- **WHEN** the runtime resolves that object's attack or defense choice
- **THEN** action speed, range, dice, pierce, strike count, damage types, defense threshold, and defense uses MUST come from the configuration package
- **AND** changing or removing the display-only attack text MUST NOT change those base combat facts

#### Scenario: Missing configured profile is rejected
- **GIVEN** a card is marked implemented and declares a combat-bearing card type
- **WHEN** its combat profile is missing or malformed
- **THEN** configuration validation MUST fail
- **AND** the runtime MUST NOT silently recover by parsing the display text

### Requirement: Combat Profile Migration Boundary
The structured combat profile change SHALL keep special attack effects independently scoped.

#### Scenario: Deferred special effect stays explicit
- **GIVEN** an attack line contains a special effect such as mana drain, status threshold, charge, or bloodthirst
- **WHEN** the base combat profile is migrated
- **THEN** the effect MUST remain marked as a separate deferred or separately implemented ability
- **AND** the profile migration MUST NOT claim that the special effect is implemented merely because the base profile is structured

