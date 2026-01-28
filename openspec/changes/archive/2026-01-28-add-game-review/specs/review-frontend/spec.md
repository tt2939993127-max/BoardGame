## ADDED Requirements

### Requirement: Review Component Integration
The system SHALL provide a game review UI section integrated into the game card/details, allowing users to view community consensus and aggregate ratings.

#### Scenario: Display review statistics
- **WHEN** the user views the review section for a game with sufficient ratings
- **THEN** the system shows an approval bar with the percentage of positive reviews and total review count

### Requirement: User Review Submission
The system SHALL allow authenticated users to submit a binary (positive/negative) rating and an optional text review for any supported game.

#### Scenario: Submit a new review
- **WHEN** a logged-in user selects a rating and clicks submit
- **THEN** the review is saved and the UI updates to show the user's review and revised stats

#### Scenario: Edit an existing review
- **WHEN** a user who has already reviewed a game submits a new rating or text
- **THEN** the system updates the existing review instead of creating a duplicate
