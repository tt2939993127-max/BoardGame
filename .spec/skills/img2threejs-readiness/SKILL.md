---
name: img2threejs-readiness
description: Global readiness guard for reference-image-to-Three.js model generation. Use whenever the user asks for img2threejs, image-to-3D, reference-image reconstruction, procedural Three.js assets, game-ready 3D props, or asks why generated model code differs from official img2threejs/showcase examples. Enforces official tool/pipeline availability checks and prevents silently substituting hand-written Three.js prototypes when required inputs or tools are missing.
---

# Img2threejs Readiness

This skill is a global gate before generating code-only Three.js models from reference images. It does not replace the official `img2threejs` skill or forge pipeline; it prevents starting work when that official workflow or required inputs are missing.

## Mandatory Gate

Before writing or modifying model code, lock these facts:

- **Target object**: the exact asset to reconstruct, such as a book, prop, vehicle, board, token, or card holder.
- **Truth source**: the reference image or source asset that proves the target object's shape, parts, colors, and materials.
- **Official workflow**: the official `img2threejs` skill or pipeline is available locally, readable, and suitable for this task.
- **Output site**: temporary prototype, project asset candidate, or final runtime integration.
- **Acceptance evidence**: generated factory, browser render, reference/result comparison, and pass/fail review.

If any item is missing, stop before implementation and tell the user exactly what is missing. Do not start a manual Three.js substitute unless the user explicitly authorizes a fallback prototype after seeing the blocker.

## Official Assets

Use these project locations and official external sources:

- Official skill/pipeline: `.spec/skills/img2threejs/SKILL.md`
- Official repository source: `https://github.com/img2threejs/img2threejs`
- Official showcase reference: `D:\codex-home\references\img2threejs-showcase`
- Official showcase source: `https://github.com/img2threejs/img2threejs-showcase`

When the official skill is not installed, attempt to download or update it from the official repository. If GitHub, git, zip download, authentication, proxy, or filesystem access fails, report the failed command and stop. Do not fake the official skill by writing a local approximation with the same name.

When the showcase examples are needed but unavailable, attempt to download or update the official showcase repository. If this fails, report the blocker and avoid claiming that a model is case-aligned.

## Required Workflow

Follow the official `img2threejs` instructions when available. A valid run normally includes:

- Probe or inspect the reference image.
- Create a pre-spec assessment.
- Create a sculpt/object specification.
- Run strict quality validation on the specification.
- Generate the Three.js factory from the locked specification.
- Render in browser and capture evidence.
- Compare reference image and render before calling it acceptable.

Do not skip directly to hand-written `new THREE.Mesh(...)` code for tasks that ask for official img2threejs quality or official-example parity.

## Official Showcase Parity Gate

When the user asks why local output differs from official showcase examples, or asks to reproduce an official example, treat showcase parity as its own gate before touching the user's target asset.

- Use a real showcase case that has a reference image and source factory; prefer cases that also include `object-sculpt-spec.json`, `cs2-intake.json`, traced geometry, generated maps, or review evidence.
- First run the official spec through `next.py`, `validate_sculpt_spec.py --strict-quality`, and `generate_threejs_factory.py`; then place the generated factory in a temporary copy of the showcase project and run the showcase's own build command.
- Compare three layers separately: public reference image, locked sculpt/spec evidence, and final showcase factory source. Do not assume the public `public/references/<id>.png` alone contains the hidden source views, classification record, PBR maps, traced geometry, or hand-authored refinements used by the final demo.
- If a public showcase image cannot regenerate a strict-quality spec, say that the public image is not a complete reconstruction source for parity. Do not proceed by manually filling gaps unless the user explicitly wants an authored reconstruction pass.
- If the official spec regenerates a factory that differs from or fails to compile in the showcase project, report the exact diff/build blocker. Do not claim official parity until the regenerated factory renders in the same showcase viewer and comparison evidence has been produced.

## No Silent Fallback

Treat these as blockers, not implementation details:

- Missing official `img2threejs` skill or forge scripts.
- Missing reference image for the target object's actual body.
- Only having card art, decals, icons, or texture sheets when the target is a larger 3D object.
- Failed strict-quality validation.
- Failed render/screenshot loop.
- Inability to compare against official examples when the user explicitly asks for official-case parity.

Allowed fallback language:

- "官方 img2threejs skill/pipeline 当前不可用，所以不能按官方流程生成。"
- "当前只有风格贴图，没有书本主体参考图；可以做概念白模，但不能叫参考图重建。"
- "下载官方仓库失败，命令和错误如下；我先停在这里，不手写替代。"

Forbidden fallback language:

- "我先照着感觉做一个。"
- "差不多就是官方流程。"
- "之后再补 spec / 截图 / 对比。"
- "虽然没有官方 skill，但我手写一个等价结果。"

## Reporting

When blocked, include:

- What was requested.
- Which required input/tool is missing.
- What command or file check proved it.
- The smallest next action to unblock.

When successful, include:

- Official skill/pipeline path used.
- Reference image path used.
- Spec and generated factory paths.
- Render evidence path.
- Whether the result passed visual comparison, or what remains below threshold.
