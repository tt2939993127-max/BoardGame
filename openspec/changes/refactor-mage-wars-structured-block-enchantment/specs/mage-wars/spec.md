## ADDED Requirements

### Requirement: Structured Block Enchantment

`1806` 格挡 SHALL expose its one-shot automatic evasion through structured attached defense semantics rather than display text.

#### Scenario: Block forcibly evades a avoidable attack

- **GIVEN** a configured `1806` enchantment is revealed and attached to a creature
- **AND** an avoidable object attack targets that creature
- **WHEN** the defense response is resolved
- **THEN** the attack MUST be marked missed without rolling a defense die
- **AND** the `1806` source MUST be destroyed
- **AND** the defender MUST NOT be allowed to pass instead of revealing `1806`

#### Scenario: Block is destroyed by an unavoidable attack

- **GIVEN** a configured `1806` enchantment is revealed and attached to a creature
- **AND** an unavoidable object attack targets that creature
- **WHEN** the attack resolves
- **THEN** the `1806` source MUST be destroyed
- **AND** the incoming attack MUST continue without an evasion result

#### Scenario: Display text is not required

- **GIVEN** a revealed `1806` enchantment has empty or rewritten display text
- **WHEN** an avoidable object attack targets its host
- **THEN** the structured defense profile MUST still force the automatic evasion and source destruction

### Requirement: Block Migration Boundary

The change SHALL preserve unrelated defense and response boundaries.

#### Scenario: Other defenses remain available only when block is absent

- **GIVEN** a target has an ordinary defense profile but no configured `1806` source
- **WHEN** an avoidable attack targets the object
- **THEN** the existing roll-or-pass defense flow MUST remain unchanged

#### Scenario: Unrelated response cards remain deferred

- **GIVEN** `1904` 攻击逆转 or `1912` 心灵安抚 is not part of this change
- **WHEN** the ability catalog and configuration are inspected
- **THEN** this change MUST NOT mark those cards implemented or alter their executor boundary
