---
name: game-design
description: '游戏设计入口。用于玩法、机制、平衡、关卡、UI/UX、玩家心理、playtest 和模糊游戏创意收敛。'
---

# Game Design

Use this as the single entry point for game-design work.

This skill keeps one trigger surface, then reads only the relevant topic files from `references/topics/` as needed.

## Why One Skill

- Keep triggering simple: the user says "game design", and this skill handles it.
- Keep context controlled: load only the topic files needed for the current request.
- Keep output concrete: synthesize a recommendation instead of bouncing across many sub-skills.

## Workflow

1. Classify the request: planning, core loop, mechanics and balance, level design, narrative, UI and UX, player psychology, testing, or team process.
2. Read only the matching files from `references/topics/`.
3. Give a direct recommendation first.
4. Translate principles into specific mechanics, tradeoffs, risks, and validation steps.

## Topic Routing

- Planning and framing:
  `references/topics/game-development-planning/`
  `references/topics/game-design-methodology/`
  `references/topics/game-design-principles-reference/`
- Mechanics and balance:
  `references/topics/dynamic-difficulty-adjustment/`
  `references/topics/flow-state-design-framework/`
  `references/topics/reinforcement-feedback-systems/`
  `references/topics/character-optimization-design/`
  `references/topics/doubling-halving-balance/`
- Levels, puzzles, and guidance:
  `references/topics/game-competency-puzzle-design/`
  `references/topics/visual-player-guidance/`
  `references/topics/environmental-storytelling-technique/`
  `references/topics/experience-pacing-structure/`
- UI, controls, and failure handling:
  `references/topics/user-centered-design/`
  `references/topics/hicks-law-decision-optimization/`
  `references/topics/fitts-law-ui-aiming/`
  `references/topics/player-error-handling/`
- Player psychology and testing:
  `references/topics/player-psychology-decisions/`
  `references/topics/fundamental-attribution-error-testing/`
  `references/topics/game-prototyping-testing/`
- Team and thematic coherence:
  `references/topics/game-team-management/`
  `references/topics/synergy-thematic-design/`
  `references/topics/golden-ratio-design/`

Use `references/skill-map.md` if you want the full topic map in one place.

## Default Output

- Target player and fantasy
- Core loop or key interaction
- Recommended direction
- Main tradeoffs or abuse cases
- Next prototype or playtest step
