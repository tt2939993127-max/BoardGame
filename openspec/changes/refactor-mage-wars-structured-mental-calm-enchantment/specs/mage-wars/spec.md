## ADDED Requirements

### Requirement: Structured Mental Calm Enchantment

`1912` 心灵安抚 SHALL expose its per-round attack payment through visible-object-enchantment semantics rather than display text.

#### Scenario: Configured source charges before a defense window

- **GIVEN** a revealed `1912` enchantment is attached to a non-mage creature
- **AND** the creature declares a melee or ranged object attack
- **AND** its controller has at least 2 mana per untriggered `1912` source
- **WHEN** the attack enters the existing defense opportunity
- **THEN** the runtime MUST emit `MANA_SPENT` before `DEFENSE_AVAILABLE`
- **AND** the runtime MUST emit `MENTAL_CALM_TRIGGERED` before `DEFENSE_AVAILABLE`
- **AND** the source MUST be marked for that attacker and current round

#### Scenario: Insufficient mana cancels the attack

- **GIVEN** a creature with an untriggered `1912` source declares a melee or ranged object attack
- **AND** its controller has less than the required mana
- **WHEN** the attack is resolved
- **THEN** the runtime MUST NOT emit a defense opportunity or attack dice
- **AND** the runtime MUST mark the source as triggered for the current round
- **AND** the runtime MUST emit an empty attack declaration and `ATTACK_MISSED`
- **AND** the attack action MUST be consumed through the existing attack declaration reducer

#### Scenario: One trigger per source per round

- **GIVEN** a `1912` source has triggered for an attacker in the current round
- **WHEN** the same attacker performs another melee or ranged object attack
- **THEN** that source MUST NOT charge or trigger again
- **WHEN** a later round begins
- **THEN** that source MUST be eligible again

#### Scenario: Multiple sources charge independently

- **GIVEN** two untriggered `1912` sources are attached to the same attacker
- **WHEN** the attacker declares its first object attack in the round
- **THEN** the runtime MUST require and charge 4 mana
- **AND** both source instances MUST be marked as triggered for that attacker and round

#### Scenario: Counterstrike is excluded

- **GIVEN** an object attack is being resolved through the existing counterstrike response
- **AND** the counterstriking creature has an untriggered `1912` source
- **WHEN** the counterstrike attack resolves
- **THEN** the runtime MUST NOT emit `MANA_SPENT` or `MENTAL_CALM_TRIGGERED` for that source

#### Scenario: Display text is not the rule owner

- **GIVEN** a configured `1912` enchantment or its target creature has empty or rewritten display text
- **WHEN** the target creature declares its first eligible object attack
- **THEN** the configured payment and per-round trigger behavior MUST remain unchanged

### Requirement: Mental Calm Migration Boundary

The change SHALL preserve existing object attack, defense, counterstrike, and attack mana-drain behavior outside `1912`.

#### Scenario: Unconfigured attack fixtures remain compatible

- **GIVEN** an object attack has no configured `mental-calm` source
- **WHEN** it resolves through the existing attack path
- **THEN** no mental-calm event or payment MUST be emitted
- **AND** its existing defense, damage, status, and mana-drain behavior MUST remain available
