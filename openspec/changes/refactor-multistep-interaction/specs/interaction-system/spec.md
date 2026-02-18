## ADDED Requirements

### Requirement: Multistep Choice Interaction
InteractionSystem SHALL support a `multistep-choice` kind that allows multiple intermediate steps before final confirmation. Intermediate steps SHALL execute purely on the client side via a `localReducer` function, without going through the engine pipeline or sending network requests. Confirmation SHALL convert the accumulated result into engine commands via a `toCommands` function.

#### Scenario: Dice modification with local preview
- **WHEN** a `multistep-choice` interaction is active with `maxSteps: 2`
- **AND** the player performs 2 intermediate steps via `localReducer`
- **THEN** the UI reflects the accumulated result locally
- **AND** on confirmation, `toCommands` generates the corresponding `MODIFY_DIE` commands
- **AND** those commands are dispatched to the engine

#### Scenario: Cancel restores initial state
- **WHEN** a `multistep-choice` interaction is active
- **AND** the player has performed intermediate steps
- **AND** the player cancels the interaction
- **THEN** the interaction is resolved (popped from queue) via existing `SYS_INTERACTION_CANCEL`
- **AND** no engine commands from intermediate steps are dispatched

#### Scenario: Auto-confirm on maxSteps reached
- **WHEN** a `multistep-choice` interaction has `maxSteps: N`
- **AND** the player performs the Nth intermediate step
- **THEN** the interaction automatically confirms
- **AND** `toCommands` generates commands from the accumulated result

#### Scenario: Blocking non-system commands
- **WHEN** a `multistep-choice` interaction is active for a player
- **THEN** that player's non-system commands (except intermediate steps) SHALL be blocked
- **AND** `ADVANCE_PHASE` SHALL be blocked (via existing InteractionSystem logic)

### Requirement: useMultistepInteraction React Hook
The engine SHALL provide a `useMultistepInteraction` React Hook that manages local state for multistep interactions. The Hook SHALL expose `result`, `stepCount`, `canConfirm`, `step()`, `confirm()`, and `cancel()` methods.

#### Scenario: Hook lifecycle
- **WHEN** a `multistep-choice` interaction becomes active
- **THEN** the Hook initializes with `initialResult` and `stepCount: 0`
- **AND** `step(payload)` calls `localReducer` and increments `stepCount`
- **AND** `confirm()` calls `toCommands(result)` and dispatches each command
- **AND** `cancel()` dispatches `SYS_INTERACTION_CANCEL`
- **AND** when interaction ID changes, local state resets
