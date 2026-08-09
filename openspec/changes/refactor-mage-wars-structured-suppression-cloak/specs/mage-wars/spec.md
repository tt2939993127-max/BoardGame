## MODIFIED Requirements

### Requirement: Apprentice card effects must be owned by structured configuration and domain events

The apprentice card package MUST express implemented card effects with stable internal identifiers and structured values. A visible equipment card that taxes an incoming creature melee attack MUST evaluate that tax from the defending mage's attached equipment, record per-round attacker usage, and keep payment and attack cancellation in the domain event pipeline.

#### Scenario: Suppression Cloak charges a first melee attack

- **GIVEN** a revealed Suppression Cloak is attached to the defending mage
- **AND** a creature declares a melee attack against that mage for the first time this round
- **WHEN** the creature's controller has at least 2 mana
- **THEN** the domain spends 2 mana before the existing defense window or attack resolution
- **AND** records the cloak source as triggered for that creature and round

#### Scenario: Suppression Cloak cancels an unaffordable attack

- **GIVEN** a revealed Suppression Cloak is attached to the defending mage
- **AND** a creature declares a melee attack against that mage
- **WHEN** the creature's controller has less than the required total mana
- **THEN** the attack produces no attack dice or damage
- **AND** the attack action is consumed using the existing attack-declared / attack-missed event semantics

#### Scenario: Suppression Cloak does not tax excluded attacks

- **GIVEN** a Suppression Cloak is attached to a mage
- **WHEN** the incoming attack is ranged, comes from a non-creature source, or is a counterstrike
- **THEN** the cloak produces no mana payment and no cloak trigger record
