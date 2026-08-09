## ADDED Requirements

### Requirement: Structured Vampiric Enchantment

`1910` 鲜血贪噬 SHALL expose its granted vampiric behavior through visible-object-enchantment semantics rather than display text.

#### Scenario: Configured enchantment grants melee vampiric healing

- **GIVEN** a configured `1910` enchantment is revealed and attached to a living creature
- **AND** the enchantment display text may be empty or rewritten
- **WHEN** that creature resolves a melee attack that deals actual damage
- **THEN** the runtime MUST emit one healing event for the attacker's controller
- **AND** the healing amount MUST equal actual damage after armor and other modifiers

#### Scenario: Ranged attacks do not use the enchantment

- **GIVEN** a configured `1910` enchantment is attached to a creature with melee and ranged profiles
- **WHEN** the creature resolves a ranged attack
- **THEN** the runtime MUST NOT emit a vampiric healing event

#### Scenario: Multi-strike damage heals once from accumulated actual damage

- **GIVEN** a configured `1910` enchantment is attached to a creature with a multi-strike melee profile
- **WHEN** multiple strikes resolve
- **THEN** the runtime MUST emit at most one vampiric healing event for that attack
- **AND** its amount MUST equal the accumulated actual damage

#### Scenario: Persistent enchantment remains after attack

- **GIVEN** a creature has a configured `1910` enchantment
- **WHEN** its melee attack completes
- **THEN** the attached enchantment MUST remain in play

### Requirement: Vampiric Migration Boundary

The change SHALL preserve the existing temporary `3404` behavior.

#### Scenario: Bloodstrike remains temporary and does not double-heal

- **GIVEN** a creature has the `3404` temporary vampiric marker, with or without a `1910` enchantment
- **WHEN** it resolves one melee attack
- **THEN** the runtime MUST emit no duplicate healing event for the two sources
- **AND** the `3404` temporary marker MUST retain its existing cleanup behavior.
