## ADDED Requirements

### Requirement: Structured Force Grip Enchantment

`1908` 原力之握 SHALL expose its restraint behavior through visible-object-enchantment semantics and the existing attached-source relationship, rather than display text.

#### Scenario: Configured enchantment restrains a legal creature

- **GIVEN** a configured `1908` enchantment is revealed and attached to a creature without the `不羁` trait
- **WHEN** the spell is legally cast on that creature
- **THEN** the runtime MUST create the existing visible attached enchantment object
- **AND** the runtime MUST record that enchantment instance as the creature's restraint source

#### Scenario: Display text is not required for restraint

- **GIVEN** a revealed `1908` enchantment and its host creature have empty or rewritten display text
- **WHEN** movement, push, or teleport legality is evaluated for the host creature
- **THEN** the runtime MUST continue to treat the host as restrained from the structured source relationship

#### Scenario: Uncontainable creatures are rejected

- **GIVEN** the target creature has the `不羁` trait
- **WHEN** a player attempts to cast `1908` on that creature
- **THEN** command validation MUST reject the target
- **AND** no attached enchantment or restraint event may be produced

#### Scenario: Existing movement and displacement owners are reused

- **GIVEN** a creature is restrained by an attached `1908` instance
- **WHEN** ordinary movement, force push, or teleport legality is evaluated
- **THEN** the runtime MUST reuse the existing unmovable / restrained validation path
- **AND** this change MUST NOT add a second movement or displacement state model

#### Scenario: Removing the source clears restraint

- **GIVEN** a creature is restrained by an attached `1908` instance
- **WHEN** that enchantment is removed through the existing arena-object removal path
- **THEN** the creature MUST no longer retain that restraint source

### Requirement: Force Grip Migration Boundary

The change SHALL preserve existing `2224` 缠绕藤蔓 restraint behavior and defer unrelated enchantment triggers.

#### Scenario: Tanglevine remains compatible

- **GIVEN** a `2224` 缠绕藤蔓 object is attached to a legal creature
- **WHEN** its existing movement, push, ranged-attack, and cleanup rules are evaluated
- **THEN** those existing rules MUST remain available
- **AND** `1908` migration MUST NOT change `2224` semantics

#### Scenario: Other deferred enchantments remain deferred

- **GIVEN** a card such as `1904` 攻击逆转 or `1912` 心灵安抚 is not part of this change
- **WHEN** the ability catalog and configuration are inspected
- **THEN** this change MUST NOT mark that card implemented or alter its executor boundary
