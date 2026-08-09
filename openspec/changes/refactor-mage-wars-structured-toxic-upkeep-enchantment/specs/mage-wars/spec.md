## ADDED Requirements

### Requirement: Structured Toxic Upkeep Enchantment

`1820` 尸鬼腐化 SHALL expose its upkeep direct-damage behavior through visible-object-enchantment semantics rather than display text.

#### Scenario: Configured enchantment deals toxic upkeep damage

- **GIVEN** a configured `1820` enchantment is revealed and attached to a living creature
- **WHEN** the game enters the upkeep phase
- **THEN** the runtime MUST deal the configured 2 points of direct toxic damage to the anchored creature

#### Scenario: Display text is not required for upkeep damage

- **GIVEN** a revealed `1820` enchantment and its host creature have empty or rewritten display text
- **WHEN** the game enters the upkeep phase
- **THEN** the runtime MUST still resolve the configured direct damage from the attached source

#### Scenario: Toxic immunity prevents the damage

- **GIVEN** the anchored creature has the configured or printed toxic immunity
- **WHEN** the game enters the upkeep phase
- **THEN** the runtime MUST NOT emit direct damage for that `1820` source

#### Scenario: Removing the source stops future upkeep damage

- **GIVEN** a creature is attached to a configured `1820` enchantment
- **WHEN** that enchantment is removed before a later upkeep phase
- **THEN** the removed source MUST NOT produce a later upkeep damage event

### Requirement: Toxic Upkeep Migration Boundary

The change SHALL preserve unrelated enchantment triggers and defer magebind payment.

#### Scenario: Magebind remains deferred

- **GIVEN** `1820` has the printed `法师绑定+2` text
- **WHEN** the configuration and runtime ability boundary are inspected
- **THEN** this change MUST NOT claim to implement a magebind payment or maintenance system

#### Scenario: Unrelated enchantments remain deferred

- **GIVEN** a card such as `1904` 攻击逆转 or `1912` 心灵安抚 is not part of this change
- **WHEN** the ability catalog and configuration are inspected
- **THEN** this change MUST NOT mark that card implemented or alter its executor boundary
