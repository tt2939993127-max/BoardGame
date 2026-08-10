## ADDED Requirements

### Requirement: DiceThrone SHALL Maintain Exactly One Current Roll Slot
DiceThrone SHALL expose at most one current roll context as a single current roll slot. Any later roll SHALL overwrite the previous current dice; overwritten dice SHALL NOT remain independently modifiable.

#### Scenario: Only one roll slot is current
- **GIVEN** a main roll, targeting roll, bonus roll, evasion roll, effect roll, compare roll, or duel roll is awaiting rules interaction
- **WHEN** UI, validation, execution, AI, response windows, or passive abilities need the current dice
- **THEN** they MUST read the same current roll context
- **AND** MUST NOT independently treat `core.dice`, bonus settlement data, or display-only events as additional current dice sources

#### Scenario: Later independent roll overwrites previous current dice
- **GIVEN** the current roll slot contains a previous roll result
- **WHEN** an independent later card, token, passive ability, status effect, or game step produces another roll
- **THEN** the later roll MUST overwrite the current roll slot
- **AND** the previous roll MUST stop being a legal target for normal dice modification commands
- **AND** any previous roll value needed by later settlement MUST have been committed as settlement input before overwrite

#### Scenario: Temporary child dice restore the parent roll automatically
- **GIVEN** an unresolved attack or effect roll is current
- **AND** its existing flow produces a temporary bonus die or extra effect die
- **WHEN** the player confirms the temporary die's final result
- **THEN** the temporary die MUST settle from its final accepted face
- **AND** the suspended parent roll MUST become the sole current roll context again
- **AND** the phase and roller MUST continue from that restored parent context instead of advancing to another player or AI

#### Scenario: Internal parent restoration does not create a player recovery action
- **GIVEN** a previous roll has been overwritten by a later roll
- **WHEN** the UI, command registry, or internal state handles the overwritten roll
- **THEN** it MUST NOT expose a player recovery button, command, or new settlement action without an independent rule source
- **AND** MUST NOT keep both the previous roll and later roll as simultaneous current dice

### Requirement: DiceThrone SHALL Model Every Rules-Modifiable Roll Through the Current Roll Context
DiceThrone SHALL model main roll dice, targeting roll dice, rules-modifiable extra ability dice, bonus dice groups, evasion dice, compare rolls, and duel rolls as typed current roll contexts whenever those rolls can still be modified, rerolled, or otherwise interfered with by game rules.

#### Scenario: Targeting roll enters the current roll context
- **GIVEN** a 2v2 attack has entered `targetingRoll`
- **WHEN** the attacker rolls the targeting die
- **THEN** the result MUST be represented as the current roll context instead of a display-only recap
- **AND** any rule-legal dice modification window MUST use that same context

#### Scenario: Ability extra roll remains interactive regardless of source flags
- **GIVEN** an ability, card, token, or status effect triggers an extra die roll during attack or damage resolution
- **AND** the result has not been settled
- **WHEN** the roll result appears
- **THEN** the system MUST keep it in the current roll context
- **AND** MUST NOT immediately collapse it into display-only settlement

#### Scenario: Temporary die always awaits confirmation before settlement
- **GIVEN** an ability, card, token, or status effect produces a temporary die
- **WHEN** its result is shown to the player
- **THEN** the system MUST show a confirmation path before final settlement
- **AND** MUST NOT auto-settle solely because the die has no legal reroll or modification

#### Scenario: Evasion roll can be modified before damage is finalized
- **GIVEN** a player spends an evasion token and rolls to negate incoming damage
- **AND** that evasion roll is still inside its legal interference window
- **WHEN** a legal dice modification or reroll effect targets the current roll
- **THEN** the system MUST apply it to the evasion roll context
- **AND** final damage prevention MUST use the accepted final die value

### Requirement: DiceThrone Dice Modification SHALL Target the Current Roll Context
DiceThrone SHALL make every generic dice modification, reroll, passive reroll, and roll-card interference target the current roll context rather than a storage-specific dice array.

#### Scenario: Generic dice card can modify non-main dice
- **GIVEN** the current roll context comes from an extra ability roll, evasion roll, bonus roll, targeting roll, compare roll, or duel roll
- **AND** that context policy allows modification
- **WHEN** a player plays a legal roll-phase dice card
- **THEN** the resulting dice interaction MUST bind to the current roll context
- **AND** MUST NOT reject the action only because the die is not stored in `core.dice`

#### Scenario: Passive reroll uses the current roll context
- **GIVEN** a player has a legal passive ability that rerolls dice at the current timing
- **AND** the current roll context policy allows that player to reroll at least one die
- **WHEN** the player uses that passive ability
- **THEN** the reroll MUST apply to the selected die in the current roll context
- **AND** policy MUST decide legality rather than hard-coding offensive or defensive main-roll phases

### Requirement: DiceThrone SHALL Apply a Single Roll Context Policy Matrix
DiceThrone SHALL resolve who may modify, reroll, pass, or settle a roll from a single policy source that accounts for roll kind, owner, target, teams, current phase, and response window. Historical presentation or Ultimate-source flags MUST NOT remove the normal modification path for an unsettled roll.

#### Scenario: Multiplayer ownership is explicit
- **GIVEN** a temporary roll occurs in a multiplayer or 2v2 context
- **WHEN** UI, validation, execution, and AI evaluate legal dice actions
- **THEN** they MUST all read owner, target, allies, opponents, and legal actors from the current roll context policy
- **AND** MUST NOT each infer different legal actors from local heuristics

#### Scenario: Teammate dice interference follows policy
- **GIVEN** a teammate may legally interfere with dice to protect or strengthen an ally
- **WHEN** the teammate attempts a dice action during the current roll context
- **THEN** the system MUST allow or reject the action based on the context policy
- **AND** MUST NOT require a separate teammate-only bypass outside the policy matrix

### Requirement: Dice Targeting SHALL Not Expand Card Timing
DiceThrone SHALL use the current roll context policy only to decide whether a dice effect may target the current dice. Card timing SHALL remain independently constrained by the card's own timing and the active response window.

#### Scenario: Main phase bonus die does not authorize a roll-phase card
- **GIVEN** an unresolved bonus die is the current roll context
- **AND** its policy allows a dice card to target that die
- **WHEN** a player attempts to play a roll-phase dice card during `main1` or `main2`
- **THEN** the command MUST be rejected for the invalid roll phase
- **AND** the card, current die, and interaction state MUST remain unchanged

#### Scenario: Legal roll phase can target an allowed bonus die
- **GIVEN** an unresolved bonus die is the current roll context
- **AND** its policy allows a dice card to target that die
- **WHEN** a player plays a legal roll-phase dice card during `offensiveRoll`, `defensiveRoll`, or `targetingRoll`
- **THEN** the resulting dice interaction MUST bind to that current roll context

#### Scenario: Context target policy still rejects the card effect
- **GIVEN** a legal roll phase is active
- **AND** the current roll context disallows dice-card targeting
- **WHEN** a player attempts to play a dice-targeting card
- **THEN** the command MUST be rejected without creating a dice interaction

### Requirement: DiceThrone SHALL Settle Rolls From Final Accepted Dice
DiceThrone SHALL base all follow-up damage, attack bonus, target selection, threshold effects, token negate results, compare outcomes, and status effects on the final accepted dice in the current roll context.

#### Scenario: Extra roll is modified before settlement
- **GIVEN** an extra roll will later create damage, attack bonus, or threshold effects
- **WHEN** all legal modification, reroll, passive, and response opportunities finish
- **THEN** the system MUST settle the effect from the final accepted dice
- **AND** intermediate dice values MUST NOT write final damage, status, or attack bonus before the context closes

#### Scenario: Later step uses committed previous roll input
- **GIVEN** a later roll overwrote the current roll slot
- **AND** the previous roll result is still needed by the original settlement
- **WHEN** the original settlement continues
- **THEN** it MUST use the committed settlement input from before overwrite
- **AND** MUST NOT read the overwritten previous dice as a second current roll context

### Requirement: DiceThrone SHALL Block and Resume Flow Around Unresolved Current Roll Contexts
DiceThrone SHALL halt phase progression and dependent follow-up effects while the current roll context remains unresolved, and SHALL resume only when that context is settled, skipped, locked, or otherwise legally closed.

#### Scenario: Temporary roll confirmation halts the phase
- **GIVEN** an attack effect creates a temporary roll whose final result has not been confirmed
- **WHEN** the roll result is produced, whether or not that roll still permits a reroll or dice modification
- **THEN** phase flow MUST halt before any damage, status, or follow-up that depends on the final roll result
- **AND** the game MUST resume only after that current roll context resolves

#### Scenario: Temporary roll resumes its parent before phase progression
- **GIVEN** an attack or effect flow is halted for a temporary bonus die or extra effect die
- **WHEN** that temporary die is confirmed and settles
- **THEN** the system MUST restore the suspended parent roll before evaluating phase progression
- **AND** AI MUST NOT receive a turn merely because the temporary die settlement cleared

#### Scenario: Resolved recap does not halt the phase
- **GIVEN** a roll is already fully resolved and shown only as a recap
- **WHEN** the UI displays its display-only summary
- **THEN** phase flow MAY continue
- **AND** that recap MUST NOT create a false interactive blocker

### Requirement: Display-Only Dice Presentation SHALL Not Carry Gameplay-Critical Rolls
DiceThrone SHALL reserve display-only dice presentation for outcomes that are already fully resolved, explicitly unmodifiable by rules, or purely informational summaries.

#### Scenario: Rules-modifiable roll may not skip into display-only mode
- **GIVEN** a temporary roll still has a legal modify, reroll, passive, or interference window
- **WHEN** the system prepares its UI and flow state
- **THEN** it MUST NOT mark that roll as display-only
- **AND** it MUST block resolution until the current roll context is resolved or skipped according to rules

#### Scenario: Resolved recap may use display-only presentation
- **GIVEN** a temporary roll has completed all rule interactions and no further dice modification is legal
- **WHEN** the UI replays or summarizes that result
- **THEN** the system MAY use display-only presentation
- **AND** that presentation SHALL NOT be the only carrier of unresolved game logic

### Requirement: DiceThrone SHALL Allow Modification of Every Unsettled Current Die
DiceThrone SHALL allow every unsettled current die to enter the normal modification, reroll, passive, and response-card checks. Presentation flags, lack of a free reroll, and Ultimate source metadata MUST NOT auto-settle or lock that die.

#### Scenario: Legacy display and Ultimate flags do not lock a current die
- **GIVEN** a pending temporary settlement carries `displayOnly` or historical `ultimateLocked` metadata
- **WHEN** the settlement is converted into the current roll context
- **THEN** the context MUST be open with the normal owner modification policy
- **AND** tactical passive reroll and legal roll-card checks MUST target that die normally

#### Scenario: No free reroll still requires confirmation
- **GIVEN** an unsettled temporary roll has no remaining free reroll
- **WHEN** its result is shown
- **THEN** the UI and engine MUST expose confirmation
- **AND** settlement MUST wait for that confirmation and read the final accepted die face
