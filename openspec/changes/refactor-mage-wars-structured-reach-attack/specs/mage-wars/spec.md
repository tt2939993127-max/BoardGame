## ADDED Requirements

### Requirement: Structured Reach Attack Profile
Mage Wars configured attack profiles SHALL declare `reach=true` when they represent the rules term “远触”.

#### Scenario: Reach is still a melee attack
- **GIVEN** `3701` 狱火长鞭 is configured with `rangeKind=melee` and `reach=true`
- **WHEN** its attack profile is resolved
- **THEN** the profile MUST remain a quick melee attack
- **AND** it MUST NOT gain a ranged distance or ranged minimum range

#### Scenario: Reach can attack a same-zone flying creature
- **GIVEN** a non-flying attacker uses a melee profile with `reach=true`
- **AND** the target is a flying creature in the same zone
- **WHEN** the attack command is validated
- **THEN** the target MUST be legal

#### Scenario: Ordinary melee cannot attack a flying creature
- **GIVEN** a non-flying attacker uses a melee profile without `reach=true`
- **AND** the target is a flying creature in the same zone
- **WHEN** the attack command is validated
- **THEN** the target MUST be rejected

#### Scenario: Reach does not change melee interaction rules
- **GIVEN** a melee profile has `reach=true`
- **WHEN** it attacks a legal target
- **THEN** it MUST continue to use the melee attack path
- **AND** it MUST not be treated as a ranged attack that ignores guard, counterstrike, or damage shield rules

### Requirement: Inferno Whip Configuration
`3701` 狱火长鞭 SHALL be implemented from structured combat configuration.

#### Scenario: Inferno Whip has configured attack and burn thresholds
- **GIVEN** the `3701` equipment object is created with display attack text missing or altered
- **WHEN** its attack profile is queried and its effect die is resolved
- **THEN** the profile MUST be quick melee, fire damage, four dice, and reach
- **AND** effect die 7-10 MUST place one burn token
- **AND** effect die 11+ MUST place two burn tokens

### Requirement: Migration Boundary
This change SHALL not claim completion for frost-clearing, mana transfer, equipment slots, profession restrictions, damage shields, or other equipment abilities.

#### Scenario: Deferred equipment abilities remain deferred
- **GIVEN** the `3701` reach attack slice is implemented
- **WHEN** the ability catalog and configuration summary are inspected
- **THEN** frost-clearing, mana transfer, equipment slots, profession restrictions, damage shields, `3710` 特殊能力, and other equipment abilities MUST remain outside this change's implemented scope
