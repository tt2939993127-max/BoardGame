## ADDED Requirements

### Requirement: Structured Area Aegis Enchantment

`1913` 圣佑领地 SHALL expose Aegis 1 through a revealed zone-anchored enchantment semantic and SHALL not rely on display text for its effect.

#### Scenario: Area enchantment is revealed and anchored to a zone

- **GIVEN** a legal `1913` cast targets an in-range arena zone
- **WHEN** the cast resolves
- **THEN** the runtime MUST create a revealed enchantment object anchored to that zone
- **AND** the object MUST preserve the source card identity and owner

#### Scenario: Friendly living creatures in the zone receive Aegis

- **GIVEN** a revealed `1913` is anchored to a zone
- **AND** a living creature controlled by the enchantment owner is in that zone
- **WHEN** the creature is targeted by an object attack or attack spell
- **THEN** the attack MUST reduce its dice by the area's Aegis value before rolling

#### Scenario: Area Aegis excludes enemies and mages

- **GIVEN** a revealed `1913` is anchored to a zone
- **WHEN** an enemy creature or either mage in that zone is targeted
- **THEN** the `1913` area source MUST NOT reduce that target's attack dice

#### Scenario: Moving out of the area removes the source

- **GIVEN** a friendly living creature is protected by a zone-anchored `1913`
- **WHEN** the creature moves to another zone
- **THEN** the creature MUST no longer receive that `1913` source

#### Scenario: Area and attached Aegis sources use the highest value

- **GIVEN** a living creature has a zone-anchored `1913` and an attached Aegis source
- **WHEN** it is attacked
- **THEN** the sources MUST NOT stack
- **AND** only the highest value MUST reduce attack dice

#### Scenario: Display text is not required

- **GIVEN** a revealed `1913` has empty or rewritten display text
- **WHEN** a protected friendly living creature is attacked
- **THEN** the structured area source MUST still reduce the attack dice

### Requirement: Area Aegis Migration Boundary

The change SHALL defer unrelated area, response, mage, wall, and presentation rules.

#### Scenario: Mage and wall systems remain deferred

- **GIVEN** the apprentice arena has no standard 12-zone wall model
- **WHEN** `1913` is migrated
- **THEN** the migration MUST NOT invent wall traversal or line-of-sight rules
- **AND** it MUST NOT grant Aegis to mages or add a mage-basic-creature attack command

