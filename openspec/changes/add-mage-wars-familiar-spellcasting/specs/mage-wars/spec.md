## ADDED Requirements

### Requirement: Familiar And Spawn Point Spellcasting

The Mage Wars runtime SHALL model a familiar or spawn point as an explicit spell caster only when its configuration declares the corresponding source type, preparation rule, action phase, and mana rule.

#### Scenario: Familiar prepares and casts its own spell

- **GIVEN** a controlled familiar has one legal prepared spell and enough combined familiar / mage mana
- **WHEN** the familiar casts during its creature action
- **THEN** the spell uses the familiar as the caster, calculates range from the familiar, consumes familiar mana before mage mana, and emits a resolved event with the familiar reference

#### Scenario: Spawn point casts during deployment

- **GIVEN** a controlled spawn point has one legal prepared spell
- **WHEN** the owner casts it during deployment
- **THEN** the spell uses the spawn point as the caster and cannot be submitted through the familiar creature-action path

#### Scenario: Invalid source cannot cast

- **GIVEN** an ordinary creature, an unowned source, a missing object, or an object without an object-specific prepared spell
- **WHEN** a cast command names that object as caster
- **THEN** validation rejects the command without spending mana or consuming a plan

#### Scenario: Countered or cancelled object spell

- **GIVEN** an object spell enters a mandatory response window and is countered or cancelled before resolution
- **WHEN** the response resolves
- **THEN** no successful cast event or `1804` damage is emitted, and resource / plan return follows the rule-specific lifecycle

#### Scenario: Object curse triggers after successful object cast

- **GIVEN** a configured creature caster has one or more attached `1804 法师祸咒`
- **WHEN** its spell reaches successful resolution
- **THEN** each attached curse produces one point of direct damage to that creature

#### Scenario: Hidden object plan stays hidden

- **GIVEN** an opponent has prepared a spell for a familiar or spawn point
- **WHEN** the opponent receives a player view
- **THEN** the view reveals only the existence / count and card back, not the spell identity
