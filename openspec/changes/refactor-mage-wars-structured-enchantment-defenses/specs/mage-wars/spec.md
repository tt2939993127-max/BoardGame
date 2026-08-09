## ADDED Requirements

### Requirement: Structured Enchantment Defense Profiles
Mage Wars configured visible enchantments SHALL expose granted defense profiles independently from display text.

#### Scenario: Serpent Reflection grants a normal defense
- **GIVEN** `1809` 灵蛇反射 is attached to a legal living creature
- **WHEN** that creature is attacked by a defendable object attack
- **THEN** the defense choice MUST include profile `defense-0`
- **AND** the profile MUST require `7+` on the effect die
- **AND** the profile MUST be usable once per round

#### Scenario: Force Blade grants status-ignoring defense
- **GIVEN** `1818` 原力法剑 is attached to a legal corporeal creature
- **AND** the creature has a status that normally disables defense
- **WHEN** that creature is attacked by a defendable object attack
- **THEN** the defense choice MUST still include the configured profile
- **AND** the profile MUST require `8+` and be usable once per round

#### Scenario: Status penalties remain separate from defense availability
- **GIVEN** a configured defense profile has `ignoresStatus=true`
- **AND** the defender has a status that modifies defense dice
- **WHEN** the defense is rolled
- **THEN** the existing defense die modifier MUST still be applied
- **AND** `ignoresStatus` MUST only bypass the defense-disabled check

#### Scenario: Display text is not the defense owner
- **GIVEN** a configured visible enchantment object has missing or altered display text
- **WHEN** its defense profiles are queried
- **THEN** the configured defense profile MUST remain unchanged

### Requirement: Migration Boundary
This change SHALL keep equipment defense, sanctuary, area enchantments, and reveal/counter windows deferred.

#### Scenario: Equipment defense remains deferred
- **GIVEN** `3715` 偏移护腕 has a defense icon
- **WHEN** the enchantment defense migration is complete
- **THEN** `3715` MUST NOT be claimed as implemented by this change
