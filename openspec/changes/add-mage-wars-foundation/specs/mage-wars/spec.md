## ADDED Requirements

### Requirement: Mage Wars Foundation Intake

The system SHALL treat Mage Wars as a new game whose implementation is gated by rule, asset, and layout intake before runtime code is added.

#### Scenario: Intake exists before runtime implementation
- **GIVEN** the Mage Wars rulebook, FAQ/errata, and local asset directory are available
- **WHEN** work begins on `mage-wars`
- **THEN** the repository MUST contain a source index, rule intake summary, rule-object asset matrix, asset candidate audit, and layout truth-source contract
- **AND** runtime files under `src/games/mage-wars/` MUST NOT be implemented before this foundation change is approved

#### Scenario: Required object remains blocked until resource chain is complete
- **GIVEN** a base-game required object has candidate images in the Workshop asset pack
- **WHEN** the image has not been semantically named, placed in the official resource tree, compressed, indexed, and referenced by runtime
- **THEN** that object MUST remain `blocked` or equivalent `in_progress`
- **AND** tests or screenshots MUST NOT be used to claim the asset is complete

### Requirement: Mage Wars First Scope

The Mage Wars first implementation scope SHALL prioritize a two-player apprentice/basic rules loop with preset spellbooks, standard arena play, and core action resolution.

#### Scenario: First scope excludes full catalog completion
- **GIVEN** the physical game contains 322 spell cards and many mage/variant assets
- **WHEN** the foundation scope is evaluated
- **THEN** the system MUST NOT require all 322 spells, free spellbook construction, four-player mode, deluxe arena, or all expansion mages to be completed in this first foundation scope
- **AND** those items MUST be tracked as later changes if they become implementation targets

#### Scenario: Apprentice mode can be used as first playable contract
- **GIVEN** the rulebook defines apprentice mode with preset spellbooks and a 2x3 arena
- **WHEN** the first playable target is selected
- **THEN** apprentice/basic mode MAY be selected as the first runtime contract
- **AND** the proposal/tasks MUST record which standard-mode abilities are intentionally deferred

### Requirement: Mage Wars Spell FX Contract

The Mage Wars runtime SHALL provide visible spell-casting effects for visible spell resolution.

#### Scenario: Spell cast shows source target path and impact
- **GIVEN** a visible spell command is valid and produces domain events
- **WHEN** the client presents the resolution
- **THEN** the spell effect MUST show the casting source
- **AND** it MUST identify the target zone, creature, wall, equipment host, enchantment host, or object
- **AND** it MUST show either travel, spread, reveal, summon, push, heal, or impact feedback appropriate to the spell effect

#### Scenario: Failed command does not play success FX
- **GIVEN** a player attempts to cast a spell
- **WHEN** command validation fails or the spell is cancelled before settlement
- **THEN** the runtime MUST NOT play the final successful settlement effect
- **AND** any feedback MUST be an invalid/cancelled feedback state rather than a hit or success state

### Requirement: Mage Wars Architecture Boundary

The Mage Wars first implementation SHALL use the existing self-built game engine and React board architecture, with Phaser reserved only as a later specialized FX-layer candidate.

#### Scenario: React remains the main game UI
- **GIVEN** Mage Wars requires card zones, private spellbooks, arena regions, attachments, markers, and player prompts
- **WHEN** the board architecture is selected
- **THEN** React components MUST remain responsible for the main board and UI state presentation
- **AND** engine systems MUST remain responsible for validated commands, events, interactions, response windows, undo snapshots, and player views

#### Scenario: Phaser is not introduced for the first foundation
- **GIVEN** spell effects are required
- **WHEN** the first foundation implementation is planned
- **THEN** Phaser MUST NOT be introduced as the primary board renderer by default
- **AND** any later Phaser adoption MUST be scoped to a separate decision for complex particle timelines, multi-target chains, camera shake, or similar FX-heavy needs

### Requirement: Mage Wars Foundation Hidden Information and Timing Boundaries

The Mage Wars foundation runtime SHALL preserve the hidden-information boundary it currently implements, and SHALL explicitly defer full hidden enchantment reveal and timing-sensitive pending-settlement cancellation semantics until those runtime systems exist.

#### Scenario: Prepared spells remain hidden from the opponent
- **GIVEN** the foundation runtime renders player spell planning or prepared spell zones
- **WHEN** the opponent views the board before those cards are legally revealed
- **THEN** the opponent MUST NOT see the hidden card identity or effect text
- **AND** the owning player MUST still see enough information to use their own prepared spells

#### Scenario: Full hidden enchantment and pending-settlement timing stay deferred
- **GIVEN** full hidden enchantment attachments, reveal costs, response windows, or delayed spell/attack settlement are not implemented in this foundation scope
- **WHEN** the foundation scope is evaluated
- **THEN** those systems MUST be tracked as deferred rule boundaries rather than claimed as complete
- **AND** tests, screenshots, or Open Design artifacts MUST NOT be used to claim full hidden enchantment reveal or movement-cancels-settlement behavior is complete
