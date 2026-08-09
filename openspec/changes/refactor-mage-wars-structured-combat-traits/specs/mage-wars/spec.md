## ADDED Requirements

### Requirement: Structured Card-Level Combat Traits
Mage Wars configured cards SHALL expose card-level combat traits independently from attack display text.

#### Scenario: Bloodthirst uses configured card trait
- **GIVEN** a configured creature declares a bloodthirst trait
- **WHEN** its first melee attack targets a wounded living target
- **THEN** the runtime MUST apply the configured base bloodthirst dice modifier
- **AND** the modifier MUST apply consistently to every eligible melee attack profile of that object

#### Scenario: Same-zone mage bonus uses configured trait
- **GIVEN** the configured bloodthirst trait declares a same-zone mage bonus
- **AND** the controller's mage is in the creature's zone
- **WHEN** the eligible attack is resolved
- **THEN** the runtime MUST add the configured same-zone bonus
- **AND** the bonus MUST be absent when the mage is in another zone

#### Scenario: Display text is not the trait owner
- **GIVEN** a configured object has no attack or rules display text at runtime
- **WHEN** its eligible bloodthirst attack is resolved
- **THEN** the configured trait behavior MUST remain unchanged

### Requirement: Combat Trait Migration Boundary
The change SHALL keep other card-level abilities independently scoped.

#### Scenario: Unrelated trait remains deferred
- **GIVEN** a card also has charge, swift, regeneration, elusive, legendary, or mana-transfer facts
- **WHEN** bloodthirst is migrated
- **THEN** those unrelated abilities MUST NOT be claimed as migrated by this change

