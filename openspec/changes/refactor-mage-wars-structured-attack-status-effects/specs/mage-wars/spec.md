## ADDED Requirements

### Requirement: Structured Object Attack Status Effects
Mage Wars configured object attack profiles SHALL expose effect-die status token rules through the configuration package.

#### Scenario: Status effect threshold is consumed from configuration
- **GIVEN** a configured attack profile declares a status effect interval
- **WHEN** the attack effect die is resolved
- **THEN** the runtime MUST place the configured status token amount when the result is inside the inclusive interval
- **AND** changing or removing the display attack text MUST NOT change the result

#### Scenario: Multiple intervals remain distinct
- **GIVEN** an attack profile declares different intervals for different status tokens or amounts
- **WHEN** the effect die is resolved
- **THEN** each matching configured interval MUST contribute its declared status effect
- **AND** an out-of-range result MUST contribute no effect from that interval

#### Scenario: Invalid status effect configuration is rejected
- **GIVEN** an attack profile declares an unknown status token, invalid interval, or non-positive amount
- **WHEN** the Mage Wars config package is materialized
- **THEN** configuration loading MUST fail

### Requirement: Attack Status Effect Migration Boundary
The status effect migration SHALL keep unrelated attack special effects independent.

#### Scenario: Deferred attack effect remains deferred
- **GIVEN** an attack line also contains push, mana drain, bloodthirst, charge, or another non-status effect
- **WHEN** status effects are migrated
- **THEN** the migration MUST NOT claim the unrelated effect is configuration-backed or fully implemented

