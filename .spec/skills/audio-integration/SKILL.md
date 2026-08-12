---
name: audio-integration
description: '音频接入入口。用于挑选、接入、审计 SFX/BGM、音量、循环、触发、资源路径和播放验证。'
---

# Audio Integration

## Goal

Use this skill to keep audio work auditable instead of “just changed a key”.

The output must let reviewers answer four questions quickly:

1. What sounds were added or changed
2. Which sounds are generic pools versus object-specific bindings
3. What each sound means in human language
4. Which exact id/key should be copied into preview tools for auditioning

## Workflow

### 1. Classify the work

Put the task into one or more of these buckets before editing:

- `generic-pool`
  Sounds shared by a faction, character, enemy family, skill family, UI family, or BGM group
- `object-specific`
  Sounds bound to a concrete card, skill, weapon, animation, status, or other single object
- `new-asset`
  New audio files entering the repository
- `runtime-fix`
  Existing ids are correct but playback, loading, or routing is broken

Do not mix these labels in the final report. Reviewers must see which rows are generic and which rows are object-specific.

### 2. Discover candidate sounds

Prefer the repository’s semantic discovery tools in this order:

1. Semantic catalog or grouped sound index
2. Slim or AI-friendly registry
3. Full registry or raw asset listing
4. Preview browser or audition tool

If the repository has named files for these layers, use them. If not, use the closest equivalents.

Do not jump straight to a full registry when a semantic catalog exists.

If a local asset tree exists, verify that the final candidate also exists in the repository's real audio source. Do not trust a stale registry entry by itself.

### 3. Record matching evidence

For every selected sound, keep enough evidence to justify the choice:

- Search keywords
- Matched semantic group or category
- Candidate ids that were considered
- Final chosen id
- At least one rejected candidate or rejected semantic group
- Short reason for the final choice

For hand-play, card-play, summon, attach, or other frequent gameplay triggers, also record one duration judgment:

- `short-transient`
  Preferred. Short, one-shot, low-tail sound suitable for repeated card plays
- `medium`
  Accept only when the semantic match is clearly better and repeated triggering still feels clean
- `long-tail / loop-like`
  Reject by default for card-play sounds unless the user explicitly wants a dramatic cue

Default threshold:

- `4 seconds` is the practical upper bound for normal gameplay SFX selection
- Sounds longer than `4 seconds` should generally be rejected
- If a sound longer than `4 seconds` is kept, the report must explain why it is an exception

If the work only reuses existing library sounds, state that explicitly:

- `本次未新增音频素材，仅复用现有音效库 key/id`

### 4. Integrate the sound

Check the repository’s actual integration points, for example:

- source registry or shared registry generated from audio assets
- runtime or source-controlled registry snapshot consumed by app code
- audio config
- event resolver
- preload list
- BGM groups/rules
- card or skill level sound binding
- FX or animation level sound hook

Do not stop at “found a sound”. The final report must say where the binding was applied.

### 4.1 Treat registry generation and gameplay config as different layers

Many repositories have both:

1. A shared or generated audio registry
2. A gameplay-facing config that actually uses those ids

Do not treat them as the same thing.

Typical split:

- `shared/generated registry`
  The full sound catalog built from assets
- `runtime/static registry snapshot`
  The file the application imports at build or runtime
- `gameplay config`
  Event mappings, sound pools, BGM groups, preload lists, or object-level bindings

If the task changes the sound library itself, the workflow must state whether each of these layers was updated.

If the task only remaps existing ids, state that the registry layer was unchanged and only gameplay config changed.

### 5. Distinguish generic versus object-specific

This is mandatory.

#### Generic sound

A generic sound is reused by a pool or category and is not owned by a single object.

Examples:

- faction minion pool
- faction action pool
- weapon family pool
- shared UI click set
- shared denied sound
- battle BGM pool

For generic gameplay pools that fire often, especially card-play pools, prefer short transient sounds over ambiences, loops, long roars, or long design cues.

#### Object-specific sound

An object-specific sound is explicitly bound to a concrete target.

Examples:

- one card’s `soundKey`
- one boss skill
- one named spell
- one named animation impact

If a sound is object-specific, the report must include the target object’s Chinese name.

### 6. Prepare Chinese-friendly names

Always provide a human-readable Chinese sound name in the report.

Preferred sources:

1. Existing friendly-name / phrase-mapping file
2. Preview tool display name
3. Manual translation derived from the original phrase

If the repository lacks a friendly Chinese name for a chosen id, provide a manual readable Chinese label and explicitly mark it as:

- `中文友好名待补`

Do not make reviewers inspect English ids alone.

### 7. Offer auditioning

If the repository has a preview page, dev tool, sound browser, or equivalent audition surface, ask whether to launch it after integration.

If no preview tool exists, state that clearly instead of silently skipping auditioning.

## Mandatory report format

The final delivery must contain two tables when both kinds of sounds exist.

For Chinese users, keep audio review lists compact and scannable. Each table row must include:

- A readable Chinese object or usage name first
- A readable Chinese sound name before the raw id/key
- The raw id/key only as evidence and copy target

Do not provide an id-only list. If a prior compact summary table is useful, it must still keep the same order:

| 对象/用途 | 音效中文名 | 音效 id/key | 备注 |
| --- | --- | --- | --- |

Rules:

- `对象/用途` must use Chinese by default, such as `咒缚海盗 - 炸药桶` or `工匠 - 电击技能`
- `音效中文名` is mandatory even when the id is self-explanatory
- If no official Chinese name exists, write a manual friendly name and mark `中文友好名待补`
- Avoid making reviewers infer meaning from English ids, enum names, or file names
- For long final reports, prefer the full Generic/Object-specific split below; for short follow-up fixes, the compact table above is acceptable only if it preserves Chinese names

### Table A: Generic sounds

Use this exact idea even if the column names are adjusted for the repo:

| 用途/池子 | 音效中文名 | 音效 id/key | 配置位置 | 备注 |
| --- | --- | --- | --- | --- |

Rules:

- Do not attach a target card name here
- Use one row per id
- `用途/池子` must explain what pool or shared use this sound belongs to

### Table B: Object-specific sounds

Use this exact idea even if the column names are adjusted for the repo:

| 目标对象中文名 | 对象类型 | 音效中文名 | 音效 id/key | 配置位置 | 备注 |
| --- | --- | --- | --- | --- | --- |

Rules:

- `目标对象中文名` is mandatory
- `对象类型` should be concrete, such as `卡牌`、`技能`、`状态`、`动画`
- One row per bound object

## Mandatory close-out statements

The final report must also state:

- Whether the work reused existing sounds or introduced new assets
- Whether the shared/generated registry changed
- Whether the runtime/static registry snapshot changed
- Which files or configs were changed
- Whether an audition tool was already used
- Whether the user wants the preview tool or server launched now

## Do not do this

- Do not report only ids without Chinese names
- Do not merge generic and object-specific bindings into one ambiguous list
- Do not call a generic pool “specific” or vice versa
- Do not hide the target object when a sound is object-specific
- Do not say “audio integrated” without a reviewable table
- Do not use loop-like, ambient, or obviously long-tail sounds as default card-play sounds unless the user explicitly asks for that style
- Do not trust a registry-only candidate when the repository's local asset tree shows the file is absent
