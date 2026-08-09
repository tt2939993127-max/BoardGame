## ADDED Requirements

### Requirement: Structured Aegis Enchantment

`1813` 神力加护 and its `1911` same-art alternate SHALL expose Aegis 1 through visible-object-enchantment semantics rather than display text.

#### Scenario: Aegis reduces object attack dice

- **GIVEN** a configured `1813` or `1911` enchantment is revealed and attached to a creature
- **WHEN** an object attack targets that creature
- **THEN** the final attack dice MUST be reduced by the highest attached Aegis value
- **AND** the final attack dice MUST remain at least one unless the target is immune to the attack damage type

#### Scenario: Aegis reduces spell attack dice

- **GIVEN** a configured Aegis enchantment is revealed and attached to a creature
- **WHEN** an attack spell targets that creature
- **THEN** the spell attack MUST consume the same highest Aegis modifier before rolling attack dice

#### Scenario: Multiple Aegis sources use the highest value only

- **GIVEN** a creature has multiple configured Aegis sources
- **WHEN** it is attacked
- **THEN** the sources MUST NOT stack
- **AND** only the highest value MUST reduce attack dice

#### Scenario: Display text is not required

- **GIVEN** a revealed Aegis enchantment has empty or rewritten display text
- **WHEN** its host creature is attacked
- **THEN** the structured Aegis source MUST still reduce the attack dice

### Requirement: Aegis Migration Boundary

The change SHALL defer area Aegis, mage basic attacks against creatures, and unrelated attachment rules.

#### Scenario: Area Aegis remains deferred

- **GIVEN** `1913` 圣佑领地 is an area-target enchantment
- **WHEN** the ability catalog and configuration are inspected
- **THEN** this change MUST NOT mark `1913` implemented or apply an area aura

#### Scenario: Magebind remains deferred

- **GIVEN** `1813` or `1911` has printed magebind text
- **WHEN** the card is cast
- **THEN** this change MUST NOT claim to implement magebind payment

#### Scenario: Mage basic creature attack remains deferred

- **GIVEN** the current `DECLARE_ATTACK` command only accepts a mage player target
- **WHEN** the Aegis migration is implemented
- **THEN** this change MUST NOT add a new mage-basic-creature attack command solely for Aegis
- **AND** Aegis MUST be consumed by the existing creature attack and attack-spell paths only
