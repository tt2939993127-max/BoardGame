# review-backend Specification

## Purpose
TBD - created by archiving change add-game-review. Update Purpose after archive.
## Requirements
### Requirement: Review Backend API
The system SHALL provide a set of authenticated API endpoints for creating, reading, updating, and deleting game reviews, along with cached statistics for each game.

#### Scenario: Create a game review
- **WHEN** an authenticated user submits a review with gameId, isPositive, and optional content
- **THEN** the system saves the review and invalidates relevant stats cache

#### Scenario: Fetch review statistics
- **WHEN** a request is made for game review stats
- **THEN** the system returns positive/negative counts and an overall approval rate, utilizing Redis caching for performance

