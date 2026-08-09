## ADDED Requirements

### Requirement: Structured Death Mark Enchantment

`1826` 死亡印记 SHALL expose its first-creature-attack-per-round bonus through visible-object-enchantment semantics and structured source usage state rather than display text.

#### Scenario: First creature attack gains one die

- **GIVEN** a configured `1826` enchantment is revealed and attached to a creature
- **AND** an enemy creature attacks that host creature for the first time in the current turn
- **WHEN** the object attack rolls its attack dice
- **THEN** the attacker MUST roll one additional attack die from that `1826` source

#### Scenario: Later attack by the same creature does not gain the source again

- **GIVEN** a creature has already attacked a `1826` host during the current turn
- **WHEN** that same creature attacks the host again during the current turn
- **THEN** that source MUST NOT add another attack die

#### Scenario: Different creatures each receive their first attack bonus

- **GIVEN** two creatures attack the same `1826` host during the current turn
- **WHEN** each creature performs its first attack against the host
- **THEN** each creature MUST receive the source's one-die bonus independently

#### Scenario: Multi-strike attack shares one first-attack bonus

- **GIVEN** a creature with a multi-strike profile attacks a `1826` host for the first time
- **WHEN** the attack resolves
- **THEN** every strike MUST use the attack profile plus one die
- **AND** the source MUST be consumed once for that attacker and turn

#### Scenario: Display text is not required

- **GIVEN** a revealed `1826` enchantment has empty or rewritten display text
- **WHEN** an eligible creature attacks its host
- **THEN** the structured source MUST still provide the first-attack bonus

### Requirement: Death Mark Migration Boundary

The change SHALL defer unrelated attack and enchantment triggers.

#### Scenario: Non-creature attacks do not use death mark

- **GIVEN** a non-creature source or a mage attacks a `1826` host
- **WHEN** the attack resolves
- **THEN** the death mark creature first-attack bonus MUST NOT be applied

#### Scenario: Unrelated response enchantments remain deferred

- **GIVEN** a card such as `1904` 攻击逆转 or `1912` 心灵安抚 is not part of this change
- **WHEN** the ability catalog and configuration are inspected
- **THEN** this change MUST NOT mark that card implemented or alter its executor boundary
