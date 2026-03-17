## ADDED Requirements

### Requirement: AI PR Review Workflow
The system SHALL provide an automated AI review workflow for GitHub pull requests.

#### Scenario: Pull request triggers AI review
- **WHEN** a pull request is opened, synchronized, reopened, or marked ready for review
- **THEN** the system starts an AI review flow against that original pull request
- **AND** the review flow reads the repository `AGENTS.md` and relevant project rules before producing conclusions

### Requirement: Structured Review Output
The system SHALL produce review results in a stable structure that distinguishes blocking findings from non-blocking uncertainty.

#### Scenario: AI review reports findings
- **WHEN** the AI review completes
- **THEN** the result includes `Findings`, `Open Questions / Assumptions`, and `Summary`
- **AND** each finding includes a concrete file reference

### Requirement: Original PR as Single Merge Unit
The system MUST treat the original pull request as the only review and merge unit.

#### Scenario: Review flow reaches merge stage
- **WHEN** the repository decides whether the pull request can be merged
- **THEN** the system evaluates and merges the original pull request directly
- **AND** the system MUST NOT require an intermediate `merge/pr-*` pull request to complete the flow

### Requirement: Bounded Auto-fix
The system SHALL limit automatic code changes to bounded low-risk fixes.

#### Scenario: Auto-fix is enabled
- **WHEN** the AI review identifies a low-risk issue that falls inside the configured auto-fix boundary
- **THEN** the system may push a fix commit back to the original pull request head branch
- **AND** the system reruns the required verification before allowing merge

### Requirement: Merge Gating
The system SHALL block automatic merge until all required review and verification gates pass.

#### Scenario: Merge gates are incomplete
- **WHEN** quality checks fail, AI review reports blocking findings, or repository policy requirements are unmet
- **THEN** the system does not auto-merge the pull request

#### Scenario: Merge gates pass
- **WHEN** quality checks pass, AI review reports no blocking findings, and repository policy requirements are met
- **THEN** the system may automatically merge the original pull request
