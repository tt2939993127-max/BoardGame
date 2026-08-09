## ADDED Requirements

### Requirement: 群兽法杖特殊能力必须由结构化配置和领域事件执行

`3710` 群兽法杖 MUST use stable internal configuration to express its Beastmaster restriction, quick action, cost, range, once-per-round limit, melee bonus and healing dice. Its activation MUST reuse the existing arena-object ability command and domain event pipeline.

#### Scenario: 兽王使用群兽法杖强化己方动物

- **GIVEN** a revealed `3710` is attached to the current Beastmaster apprentice
- **AND** a friendly living animal creature is within 1 zone
- **WHEN** the player uses mode `melee-bonus` during a legal quick action window and pays 2 mana
- **THEN** the domain records the equipment ability resolution
- **AND** the target gains melee +2 until the current round ends
- **AND** the equipment cannot be used again during the same round

#### Scenario: 兽王使用群兽法杖治疗己方动物

- **GIVEN** a revealed `3710` is attached to the current Beastmaster apprentice
- **AND** a friendly living animal creature within 1 zone has damage
- **WHEN** the player uses mode `heal` and pays 2 mana
- **THEN** the domain rolls exactly 2 attack dice
- **AND** the healing event applies no more healing than the target's current damage

#### Scenario: 群兽法杖拒绝非法来源、目标或重复使用

- **WHEN** the current mage is not the Beastmaster, the equipment is not attached to that mage, the target is not a friendly living animal creature, the target is beyond 1 zone, the equipment was used this round, or the action / mana requirement is missing
- **THEN** validation rejects the command
- **AND** no ability resolution, mana spend, action spend, or effect event is emitted

### Requirement: 回合有效的临时近战修正必须跨越生物行动阶段

Temporary melee-dice modifiers marked as round-scoped MUST remain active through the owning player's creature-action exit and final quickcast, and MUST be cleared when the next round begins. Action-scoped movement and charge facts MUST retain their existing cleanup boundary.

#### Scenario: 荒野呼唤和群兽法杖的近战修正在阶段切换后仍有效

- **GIVEN** a friendly animal has a round-scoped melee-dice modifier
- **WHEN** the creature-action phase ends but the round has not ended
- **THEN** the modifier remains available to the object's melee attack resolver
- **WHEN** the next round begins
- **THEN** the modifier is removed from the object state

