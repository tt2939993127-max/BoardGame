## ADDED Requirements

### Requirement: Negotiated Undo Process
The system MUST implement a negotiated undo process where the opponent must approve the undo request.

#### Scenario: Request Undo
- **Given** Player A is in their turn or just finished a move
- **When** Player A triggers "Request Undo"
- **Then** The system records an undo request from Player A
- **And** Player A sees "Waiting for approval..."
- **And** Player B sees "Opponent requests undo" with Accept/Reject options

#### Scenario: Approve Undo
- **Given** Player A has requested an undo
- **When** Player B clicks "Accept"
- **Then** The game state reverts to the snapshot before Player A's last move
- **And** The undo request status is cleared
- **And** Control returns to Player A

#### Scenario: Reject Undo
- **Given** Player A has requested an undo
- **When** Player B clicks "Reject"
- **Then** The undo request status is cleared
- **And** The game state remains unchanged
- **And** Player A sees a rejection notification

### Requirement: Custom History Management
The system MUST maintain a custom history of game states in `G.sys.history` to support precise logical rollbacks.

#### Scenario: State Snapshot
- **Given** The game is in an idle state
- **When** A player executes a valid move (e.g., Click Cell)
- **Then** A deep copy of the current `G` state is pushed to `G.sys.history`
- **And** The history does not contain infrastructure state like `undoRequest` to avoid circular dependencies
