# 法师战争 Step 1 Open Design 候选 Prompt

> 使用状态：`historical-media-prompt / rule-ui-semantics-failed / media-route-not-current / human-review-blocked`。本文件是历史文件名含 `imagegen` 的 media / prompt 输入，不是当前有效设计稿。用户已明确“使用 Open Design，不要生图”，当前没有有效人工验收候选；只有用户重新明确要求图片模型生图时，才允许恢复使用本 prompt，且必须先按 v8 牌区白名单重写。

Use case: ui-mockup
Asset type: Step 1 bitmap design draft for the Mage Wars apprentice mode runtime board UI.
Input image: `refs/mage-wars-step1/step1-runtime-board-reference-sheet.png` is a reference sheet made from real project assets. Use visible-subject assets as source language: official arena, mage cards, apprentice spell cards, spell card backs, action and quickcast markers, status/damage/channeling tokens, and attack die texture. Treat the mage status board as `reference-only`: it may inform setup rules, colors and track semantics, but it must not appear as a visible runtime player panel in the output.
Important: the reference sheet is only an asset input, not the layout to copy. Do not reproduce its title text, explanatory captions, asset labels, right-side asset catalog, two-column inventory layout, contact-sheet composition, or the mage status board sample area in the output.

Primary request:
Create one 16:9, 1920x1080 2D printed board game runtime UI concept for Mage Wars apprentice mode. The result must look like a usable front-end design mockup driven by the real board game assets, not like a dashboard, wireframe, contact sheet, or generic fantasy UI.

Rules that must shape the layout:
- Apprentice mode uses a 2x3 half arena from the standard arena. Show the official 4x3 arena as the main canvas, and express the usable apprentice half with a very light overlay or target highlight only. Do not redraw the board as CSS cells.
- Apprentice mages have 10 channeling, 24 life, and 3 basic melee attack dice. Show life, damage, mana and channeling as custom runtime HUD attached to each mage card: compact health bar, mana blue bar, channeling short readout, damage number and cost preview. Do not place the official mage status board or its crop as the runtime player panel.
- Each player uses a mage card, action marker, quickcast marker, spell cards, card backs, attack dice, effect die, damage/channeling/status tokens. The mage status board is reference-only and must not be a visible main UI subject.
- Adjacent zones are horizontal/vertical only, not diagonal. Any selectable zone highlight must follow shared-edge adjacency.
- Opponent hidden information must stay face-down or visually filtered with spell card backs. Do not show opponent private card names, fronts, or effects.

Required visual subjects:
- The official arena dominates the center and remains readable.
- Mage cards from the reference sheet represent the two apprentice mages; they should be visible as real cards, not circular avatars.
- Each mage card has a compact custom status HUD attached to it: health, damage, mana, channeling, action marker, quickcast marker, equipment/enchantment attachment summary.
- Spellbook, prepared spell slots, discard pile, hidden enchantments, and public spell cards use real card fronts and spell card backs from the reference sheet. Do not introduce a hand zone.
- Action and quickcast markers are physical tokens near the mage card/status HUD area.
- Damage, guard, ready and channeling tokens appear only where relevant and stay close to affected objects.
- The attack die visual comes from `attack-die-texture.png`. Follow the DiceThrone layering invariant: physics / random result / transparent click target may be programmatic, but the visible die face must be skinned from Mage Wars attack die texture or an equivalent derived face canvas. Do not render it as an ordinary D6, default numeric die, black box, or text formula.

Layout direction:
- Central official arena: largest visual area, about 60% of the composition.
- Player-side state and cards: placed around the board edge, close to their mage positions.
- Current action entry: minimal short-label buttons only, such as "移动", "施法", "守卫", "结束".
- Spellbook / prepared spell / discard controls: readable enough to show card-driven decisions, with at most two prepared spell slots, but not a full wall of cards.
- Hidden opponent cards: face-down backs only.

Visual restrictions:
- No heavy borders, no nested cards inside cards, no thick frames, no black glass panels, no generic side dashboard.
- No CSS placeholder board, no placeholder spell list, no generic fantasy avatars, no icon-only fake tokens.
- Do not turn the reference sheet into a contact sheet. Create a cohesive UI layout using those assets.
- Do not copy any reference-sheet labels such as "Mage Wars Step1 reference input", "mage status board", or "hidden information face-down" into the design. Only keep real runtime UI text: object names, short state labels, button labels, and numbers.
- Do not place the mage status board, mage cards, spells, tokens, and dice as a separate sample tray. Mage cards, spells, tokens and dice must be integrated around the official arena as game objects in play; the mage status board must not appear in the runtime main UI.
- Do not add permanent rule explanation paragraphs. Text may only be object names, short state labels, button labels, and small numbers.
- The visual hierarchy must be: arena, mage cards / spell cards / physical tokens / dice, then custom runtime HUD and minimal controls.
- If a border is needed, it must be a thin object-attached highlight or a necessary button background, not a container wall.

Front-end replication boundary:
- Hard structure to preserve later: arena dominance, mage-card/status-HUD/token relationship, spellbook/prepared/discard placement, hidden-card treatment, Mage Wars skinned dice layering, and light target highlight.
- Soft atmosphere: table texture, small shadows, subtle glow, and decorative aging may be simplified in implementation.
- The output is a bitmap design draft, not a real page screenshot.
