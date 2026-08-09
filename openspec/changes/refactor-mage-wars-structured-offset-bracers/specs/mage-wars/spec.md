## ADDED Requirements

### Requirement: Structured Mage Defense From Offset Bracers

`3715` 偏移护腕 SHALL expose a structured 7+ defense profile attached to its mage, with one use per round, and the runtime SHALL keep the rule in configuration and domain state rather than display text.

#### Scenario: Equipped bracers provide one defense

- **GIVEN** a revealed `3715` equipment object is attached to a mage
- **WHEN** that mage is attacked by an eligible attack
- **THEN** the existing defense opportunity MUST include the `3715` defense profile
- **AND** the profile MUST require an effect die result of 7 or higher

#### Scenario: Successful mage defense avoids the attack

- **GIVEN** a mage has an unused `3715` defense profile
- **WHEN** the defending player chooses that profile and the modified defense result is at least 7
- **THEN** the runtime MUST emit a mage defense roll with success
- **AND** the incoming attack MUST emit `ATTACK_MISSED`
- **AND** the attack MUST NOT emit damage or attack status effects

#### Scenario: Failed mage defense resumes the original attack

- **GIVEN** a mage has an unused `3715` defense profile
- **WHEN** the defending player chooses that profile and the modified defense result is below 7
- **THEN** the runtime MUST record the defense use
- **AND** the original attack MUST resume exactly once
- **AND** a spell mana payment or attack action cost MUST NOT be repeated

#### Scenario: One defense use per round

- **GIVEN** the `3715` defense profile has been used in the current round
- **WHEN** the same mage is attacked again in that round
- **THEN** the `3715` profile MUST NOT be offered again
- **WHEN** the next round's action readiness reset occurs
- **THEN** the profile MUST be available again

#### Scenario: All current attack sources share the defense window

- **GIVEN** a mage has an unused `3715` defense profile
- **WHEN** the mage is attacked by a mage basic attack, an arena object attack, or an attack spell
- **THEN** the runtime MUST use the same defense interaction source
- **AND** the defender MUST be the attacked mage rather than a proxy arena object

#### Scenario: Display text is not the rule owner

- **GIVEN** the `3715` display fields are empty or rewritten
- **WHEN** the mage is attacked
- **THEN** the configured 7+ defense behavior MUST remain unchanged

### Requirement: Existing Object Defense Compatibility

The change SHALL preserve the current arena-object defense behavior while sharing the defense interaction owner with mage defense.

#### Scenario: Object defense remains available

- **GIVEN** an arena object has an existing defense profile and no mage defense target is involved
- **WHEN** it is attacked
- **THEN** the existing object defense opportunity, roll, source consumption, and counterstrike behavior MUST remain unchanged
