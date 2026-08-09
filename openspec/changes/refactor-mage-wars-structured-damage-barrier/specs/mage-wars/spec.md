## MODIFIED Requirements

### Requirement: Apprentice card effects must be owned by structured configuration and domain events

The apprentice card package MUST express implemented card effects with stable internal identifiers and structured values. A visible equipment card that grants a damage barrier MUST evaluate that barrier from the defending mage's attached equipment, record per-round attacker usage, and resolve the barrier attack through the domain event pipeline.

#### Scenario: Demon Cuirass triggers after a successful mage melee attack

- **GIVEN** a revealed Demon Cuirass is attached to the defending mage
- **AND** an enemy mage makes a melee attack and rolls at least one attack die
- **WHEN** the defending mage survives that attack
- **THEN** the domain records one `DAMAGE_BARRIER_TRIGGERED` event
- **AND** the barrier produces one unavoidable, lethal, 1-die `DAMAGE_DEALT` event against the attacking mage

#### Scenario: Demon Cuirass triggers after an arena object melee attack

- **GIVEN** a revealed Demon Cuirass is attached to the defending mage
- **AND** an enemy arena object makes a melee attack and the defending mage survives
- **WHEN** the attack is not fully evaded or otherwise missed
- **THEN** the same barrier source produces one independent damage event against the attacking object
- **AND** lethal damage ignores that object's armor

#### Scenario: Demon Cuirass does not trigger for invalid or repeated attacks

- **GIVEN** a revealed Demon Cuirass is attached to a mage
- **WHEN** the incoming attack is ranged, an attack spell, direct damage, fully missed, or already handled for that attacker in the current round
- **THEN** no new barrier trigger or barrier damage event is produced

#### Scenario: A damage barrier does not create a response chain

- **GIVEN** a damage barrier has triggered
- **WHEN** its unavoidable attack is resolved
- **THEN** no defense choice, counterstrike, or second damage barrier is created from that barrier attack
