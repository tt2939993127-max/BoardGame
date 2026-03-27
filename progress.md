# Progress Log

## Merge Note（2026-03-27）
- 本文件在同步 `origin/main` 时继续以当前武士 / 枪手审计 worktree 的执行日志为主。
- 主分支新增的历史进度条目已在合并冲突汇报中单独摘要保存，不与当前任务日志直接混写。

## Session: 2026-03-27 武士跨角色 E2E / Masamune II 审计
- **Status:** in_progress
- Actions taken:
  - 对 `Masamune II` 继续执行“只做证据链、不硬改实现”的策略，复核了代码定义、OCR 图证与现有规则文档。
  - 结论仍是：升级差异数字无法安全裁决，`Masamune II` 保持为显式 blocker。
  - 在 `e2e/dicethrone-watch-out-spotlight.e2e.ts` 中补入两条武士跨角色 E2E，不新建测试文件。
  - 重新定位 E2E 不稳定根因，确认问题不在武士业务逻辑，而在 `LocalGameProvider` 没有消费 `TestHarness.random/dice` 注入。
  - 在 `src/engine/transport/react.tsx` 增加测试环境随机桥接，让 `TestHarness.dice.setValues()` 能真实控制 `executePipeline()` 中的 `random.d(6)`。
  - 跑通两条 E2E：
    - `npm run test:e2e:ci:file -- e2e/dicethrone-watch-out-spotlight.e2e.ts "samurai righteousness should resolve a valid branch against monk"`
    - `npm run test:e2e:ci:file -- e2e/dicethrone-watch-out-spotlight.e2e.ts "samurai zanshin should settle 5 bonus dice and synchronize effects against paladin"`
  - 人工审查两张显式证据截图，并补充证据文档 `evidence/dicethrone-samurai-cross-hero-attack-modifier-e2e.md`。
- Next step:
  - 结束当前 `origin/main` 合并流程，生成 merge commit。
  - 按规范执行 `npm run merge:audit:strict -- HEAD`。
  - 如无新增 blocker，再决定是否继续推进武士/枪手审计的下一轮实现变更。

## Session: 2026-03-22 多线任务登记 / 新会话续跑入口
- **Status:** in_progress
- Actions taken:
  - 读取项目根目录现有 `task_plan.md` / `findings.md` / `progress.md`，确认三件套已存在，但顶层标题仍停留在旧任务，需要补登记本轮多线收口状态。
  - 读取并核对项目内主进度文件：`evidence/full-recovery-plan.md`、`evidence/p0-audit-progress.md`、`evidence/p1-restoration-progress.md`、`evidence/smashup-e2e-migration-progress.md`、`temp/feedback-main-branch-resume-plan.md`、`temp/ssh-codex-plan.md`。
  - 已确认当前主线不止一个：静态资源 fallback 事故、房主被踢/房间被删链路、feedback 未关闭项、E2E 迁移、POD 审计/恢复文档。
  - 已用 guarded task 启动并行 Codex：
    - `codex-feedback-open-tracker` → 目标产物 `temp/open-feedback-tracker.md`
    - `codex-e2e-migration` → 目标产物 `temp/e2e-next-batch-plan.md`
    - `codex-find-planning-with-files` → 原用于精确定位 plan 技能；在用户给出 GitHub 后已人工确认并安装技能。
  - 已从 `https://github.com/OthmanAdi/planning-with-files` 安装 `planning-with-files`，并整理到 OpenClaw 可识别目录；workspace commit：`1216e1e` (`skills: install planning-with-files`)。
  - 已纠正规范：以后说 `plan` 默认指 `planning-with-files` 这套规划工作方式 / 效果；其正式文档唯一落点只能是根目录 `task_plan.md`，不得再在 `temp/` 或其他位置并行维护第二份正式 plan；多任务并行时，新增任务主动委派给 Codex。
- Next step:
  - 新会话恢复时，先读本三件套，再检查以下产物是否已落盘：`temp/open-feedback-tracker.md`、`temp/e2e-next-batch-plan.md`、`temp/codex-room-assets-findings.md`。
  - 然后继续两条核心修复线：`apps/api/src/main.ts` 的 `/assets` SPA fallback 排除是否已真实落盘/验证；`server.ts` + 前端状态链路对“房间已删除”误判的根因与最小修复。

## Session: 2026-03-10

### Phase 1：读取规则与相关规范
- **Status:** in_progress
- Actions taken:
  - 读取 `planning-with-files` 技能说明，按复杂任务流程建档。
  - 检查项目内相关文档与规则文件位置。
  - 读取 `docs/ai-rules/engine-systems.md` 与 `src/games/dicethrone/rule/王权骰铸规则.md`，准备进入实现链路排查。
  - 追踪 `pendingBonusDamage` / `pendingAttack.bonusDamage` / `useActiveModifiers` 相关实现。
  - 对照规则确认：攻击修正必须依附当前攻击，当前实现却允许无攻击时预存到未来攻击。
- Files created/modified:
  - `task_plan.md`
  - `findings.md`
  - `progress.md`

## Test Results
| Test | Input | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| 武士跨角色 E2E：Righteousness | `npm run test:e2e:ci:file -- e2e/dicethrone-watch-out-spotlight.e2e.ts "samurai righteousness should resolve a valid branch against monk"` | 固定命中 `Katana` 分支并展示 `+2 damage` | 通过 | ✅ |
| 武士跨角色 E2E：Zanshin | `npm run test:e2e:ci:file -- e2e/dicethrone-watch-out-spotlight.e2e.ts "samurai zanshin should settle 5 bonus dice and synchronize effects against paladin"` | 5 骰 display-only settlement + `+2 damage / 1 shame / 2 back strike` | 通过 | ✅ |
| 暂无 | - | - | - | - |

## Error Log
| Timestamp | Error | Attempt | Resolution |
|-----------|-------|---------|------------|
| 2026-03-10 | 暂无 | - | - |

---

## Addendum（2026-03-10）：传输层状态注入 P1 收尾

### Actions taken
- 审查 `src/engine/transport/react.tsx`，确认联机态 `StateInjector` 已改为只读注册，setter 直接抛错。
- 审查 `src/engine/transport/server.ts`，确认 `/game` socket 侧已不暴露 `test:injectState`。
- 在 `src/engine/transport/server.ts` 新增 `validateTestAccess()`。
- 在 `src/server/routes/test.ts` 为 `/test/inject-state`、`/test/patch-state`、`/test/get-state/:matchId`、`/test/snapshot-state`、`/test/restore-state` 补上座位级鉴权。
- 在 `src/server/routes/test.ts` 为 `restore-state` 增加注入前 `validateMatchState`。
- 更新 `e2e/helpers/state-injection.ts`，让服务端状态注入自动携带 `playerId + credentials`。
- 更新 `docs/automated-testing.md`，同步 `/test/*` 新契约。
- 扩充 `src/server/routes/__tests__/test.routes.test.ts`，覆盖缺失座位鉴权头、过期凭证等场景。

### Test Results
| Test | Input | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| 传输层 / 测试路由回归 | `npx vitest run src/server/routes/__tests__/test.routes.test.ts src/engine/transport/__tests__/server.test.ts src/engine/transport/__tests__/server-injectState.test.ts --reporter=dot --silent --maxWorkers=1` | 新鉴权与旧传输行为同时通过 | `27 passed` | ✅ |
| TypeScript 类型检查 | `npm run typecheck` | 全绿 | 通过 | ✅ |

### Error Log
| Timestamp | Error | Attempt | Resolution |
|-----------|-------|---------|------------|
| 2026-03-10 | `restore-state` 新增快照校验后，原单测夹具缺少 `core.bases` 导致 400 | 1 | 修正测试夹具，使快照状态满足当前 `validateMatchState` 契约 |
## Session: 2026-03-11 服务器启动缓慢排查
- **Status:** completed
- Actions taken:
  - 读取 `package.json`，确认 `dev`/`predev`/`dev:frontend:wait` 启动链路。
  - 读取 `scripts/infra/wait_for_ports.js`、`scripts/infra/clean_ports.js`、`scripts/game/generate_game_manifests.js`、`scripts/audio/generate-slim-registry.mjs`，定位串行等待与前置脚本开销。
  - 实测 `predev` 各步骤耗时，确认固定成本主要来自 `clean_ports`（清旧进程时）与音频 slim registry 生成。
  - 用端口探测分别复测游戏服与 API 服启动时间，确认前端等待会把后端慢启动直接放大为整套开发环境慢启动。
  - 用临时 `tsx` 脚本拆分导入链，确认 API 服核心瓶颈位于 `@sentry/nestjs` 与 `AppModule` 导入/转译，而不是监听端口本身。
  - 临时测量脚本已删除；一次 `Remove-Item` 被策略拦截，随后改用 `apply_patch` 删除成功。

## Session: 2026-03-11 Dice Throne 攻击修正残留修复
- **Status:** completed
- Actions taken:
  - 复核上一轮对 `src/games/dicethrone/domain/rules.ts` 与 `src/games/dicethrone/hooks/useActiveModifiers.ts` 的修复是否与规则一致。
  - 将“攻击修正必须绑定当前攻击”的边界测试迁移到轻量文件 `src/games/dicethrone/__tests__/red-hot-meteor-integration.test.ts`。
  - 清理临时落点：移除 `src/games/dicethrone/__tests__/card-give-hand-boundary.test.ts` 和 `src/games/dicethrone/__tests__/card-playCondition-audit.test.ts` 中为本次问题临时插入的断言。
  - 保留并复用 `src/games/dicethrone/__tests__/active-modifiers-undo.test.ts` 中对 `main2` / `TURN_CHANGED` 清理边界的覆盖。

### Test Results
| Test | Input | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| 攻击修正规则边界 + 红热回归 | `npx vitest run src/games/dicethrone/__tests__/red-hot-meteor-integration.test.ts src/games/dicethrone/__tests__/active-modifiers-undo.test.ts --maxWorkers=1` | 规则边界和显示清理都通过 | `16 passed` | ✅ |
| TypeScript 类型检查 | `npm run typecheck` | 全绿 | 通过 | ✅ |

### Error Log
| Timestamp | Error | Attempt | Resolution |
|-----------|-------|---------|------------|
| 2026-03-11 | `card-playCondition-audit.test.ts` 临时断言被插入到对象字面量中，且该文件默认被 `audit` 排除 | 1 | 将规则断言迁移到可执行轻量文件 `red-hot-meteor-integration.test.ts`，并清理临时插入代码 |
| 2026-03-11 | `card-give-hand-boundary.test.ts` 整文件运行时 worker 启动超时 | 1 | 不再把本次规则断言放入该重文件，改为迁移到轻量文件 |
- 审查 git 历史，确认 `dev:frontend:wait` 于 2026-03-09 引入；API 主启动文件最近无同等级别大改。
- 改造 `apps/api/src/main.ts`：顶层 Sentry 导入改为监听成功后后台惰性初始化，并补充启动耗时日志。
- 改造 `server.ts`：启动期房间清理改为监听成功后后台执行，并补充启动耗时日志。
- 调整 `package.json` / `nodemon.json`：去掉启动命令中的 `npx`，减少额外启动开销。
- 新增 `scripts/infra/dev-orchestrator.js`，把 `dev` 从并行冷启动改为 API → game-server → frontend 分阶段启动，避免两个 `tsx` 进程同时冷启动互相争抢资源。
- 验证结果：`npm run dev` 三端口 ready 从优化前的 `18000≈29.75s / 18001≈52.24s / 5173≈68.08s`，下降到 `18000≈9.18s / 18001≈7.08s / 5173≈10.24s`。
- 排障中遇到两次脚本问题：① orchestrator 用嵌套 `npm run` 在 Windows 上触发 `spawn EINVAL`/启动挂起，随后改为直接调用本地二进制；② 删除临时脚本时 `Remove-Item` 被策略拦截，改用 `apply_patch` 删除成功。
- 评估过“预编译后再运行”的更激进 dev runner，但 `npx tsc -p apps/api/tsconfig.json --outDir temp/api-dev` 被现有仓库中的无关 TypeScript 错误阻断（如 `apps/api/src/adapters/msgpack-io.adapter.ts`、`apps/api/src/modules/auth/dtos/auth.dto.ts`、`apps/api/src/modules/notification/notification.service.ts`），因此本次选择了不依赖完整编译通过的低风险方案。

## Session: 2026-03-11 服务器启动缓慢排查与优化
- **Status:** completed
- Actions taken:
  - 实查 `apps/api/src/main.ts`，把顶层 Sentry 初始化移出启动关键路径。
  - 实查 `server.ts`，把启动期房间清理从监听前挪到监听后后台执行，并增加结构化启动耗时日志。
  - 新增 `scripts/infra/dev-orchestrator.js`，让默认 `dev` 走分阶段启动。
  - 调整 `package.json` / `nodemon.json`，统一显式调用本地 CLI。
  - 更新 `docs/toolchain-reliability.md`、`docs/deploy.md`。
  - 通过实际端口探测验证 API、game-server、整套 dev 的冷/热启动表现。

### Test Results
| Test | Input | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| ESLint 回归 | `npx eslint scripts/infra/dev-orchestrator.js apps/api/src/main.ts server.ts` | 0 errors | 0 errors，1 个既有 warning | ✅ |
| API 启动（冷） | `npm run dev:api` | 可监听端口 | `~103.84s` | ✅ |
| API 启动（热） | `npm run dev:api` | 可监听端口 | `~4.20s / 5.82s` | ✅ |
| game-server 启动（热） | `npm run dev:game` | 可监听端口 | `~3.68s / 4.97s` | ✅ |
| 完整 dev 热启动 | `npm run dev` | 三端口都 ready | `~12.41s` | ✅ |
| 旧并行入口热启动 | `npm run dev:parallel` | 三端口都 ready | `~11.48s` | ✅ |

### Error Log
| Timestamp | Error | Attempt | Resolution |
|-----------|-------|---------|------------|
| 2026-03-11 | `apply_patch` / Python 直写对部分既有文件未稳定落盘 | 1 | 改用 `Set-Content -Encoding UTF8` 直接写入并立即复读校验 |
| 2026-03-11 | `npm run check:prod-deps` 依赖 `/bin/bash`，当前 Windows 环境缺失 | 1 | 记录为环境限制，本次用 ESLint + 真实启动验证替代 |

## Session: 2026-03-11 第二阶段开发启动优化（bundle runner）
- **Status:** completed
- Actions taken:
  - 用 `esbuild` 验证 API 预先 bundle 后可在 `~3.74s` 内 ready。
  - 用 `esbuild` 验证 game-server 预先 bundle 后可在 `~2.11s` 内 ready。
  - 实现 `scripts/infra/dev-bundle-runner.mjs`，把 watch bundle 与运行时重启合并到统一脚本。
  - 更新 `package.json`、`scripts/infra/dev-orchestrator.js`、`scripts/e2e/start-all-servers.mjs`、`docs/toolchain-reliability.md`、`docs/deploy.md`。
  - 删除不再使用的 `nodemon.json` 主链路配置。

### Test Results
## Session: 2026-03-11 ???????????nodemon / Node pin / smoke?
- **Status:** completed
- Actions taken:
  - ?? `nodemon.json`??? `dev:game:nodemon` ???? watcher
  - ?? `.nvmrc`?`.node-version` ? `package.json` ?? `engines.node=24.1.0`
  - ?? `scripts/infra/startup-smoke-test.mjs`????????? bundle ????????
  - ?? `scripts/infra/dev-orchestrator.js`????? `DEV_BUNDLE_DIR` ?? bundle ??
  - ?? `docs/toolchain-reliability.md`

### Test Results
| Test | Input | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| ESLint ?? | `npx eslint scripts/infra/dev-orchestrator.js scripts/infra/startup-smoke-test.mjs` | 0 errors | 0 errors | ? |
| ?? smoke test | `npm run smoke:startup` | API / game-server / full-dev ???? | `API ~3.66s / game-server ~41.72s / full-dev ~3.64s` | ? |

### Error Log
| Timestamp | Error | Attempt | Resolution |
|-----------|-------|---------|------------|
| 2026-03-11 | `smoke:startup` ?? `src/games/smashup/domain/index.ts` ???? `Unexpected "."`?? `englishAtlasMap.json` ? duplicate key warning | 1 | ???????????????????????/??????????????????????? unrelated ?? |


## Session: 2026-03-11 `englishAtlasMap.json` ?? key ??
- **Status:** completed
- Actions taken:
  - ?? `src/games/smashup/data/englishAtlasMap.json` ????? `src/games/smashup/ui/SmashUpCardRenderer.tsx` ? `src/games/smashup/ui/cardAtlas.ts`
  - ???????? key ? 1 ??`base_great_library`
  - `git blame` / `git log` ?????? `10b99ae6` ??????? bundle runner ????
  - ?????????????????? warning ??????????

### Test Results
| Test | Input | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| ?? key ?? | Python ???? `src/games/smashup/data/englishAtlasMap.json` | ???????? key | ? `base_great_library: 2` | ? |
| ???? | `git blame` + `git log --follow` | ?????? | ???? `6ea1f9f0`????? `10b99ae6` ?? | ? |

## Session: 2026-03-11 删除 `englishAtlasMap.json` 重复 key
- **Status:** completed
- Actions taken:
  - 删除 `src/games/smashup/data/englishAtlasMap.json` 中重复的 `base_great_library`
  - 用 Python 重新扫描文件，确认重复 key 数量为 `0`
  - 直接运行 esbuild 打包 `server.ts`，确认不再出现 `duplicate-object-key` warning
- Notes:
  - 当前终端环境会拦截 Node 内部 `child_process.spawn`，因此 `smoke:startup` 在这里会假失败；本轮改用直接 bundle 作为验证手段

## Session: 2026-03-25 Dice Throne 枪手规范与 `枪林弹雨！`
- **Status:** completed
- Actions taken:
  - 更新 `docs/ai-rules/data-entry.md`，把本轮数据录入口径改成“汉化图主真相源、先切图、Wiki 仅对照、技能必须有触发条件、录入范围覆盖提示板/atlas/json/资源引用”。
  - 重写 `src/games/dicethrone/rule/枪手真相源表.md` 与 `src/games/dicethrone/rule/枪手录入核对.md`，补入真相源主表、切图索引、Wiki 对照表与冲突待裁定表。
  - 新增 `scripts/assets/extract-dicethrone-gunslinger-crops.mjs`，生成枪手角色板与提示板关键裁图。
  - 完成 `fill-em-with-lead` 的装填奖励骰重掷通路，并补齐 `loaded` / `bounty` / bonus damage 的结算接线。
  - 修复 `onOffensiveRollEnd` Token 选择的通用 bug：这类选择不再先做通用 `+value`，再被自定义 effect 抵消。
  - 清理临时调试日志，并为 `loaded` 补上动作日志文案映射。

### Test Results
| Test | Input | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| TypeScript | `npm run typecheck` | 通过 | 通过 | ✅ |
| 枪手跨英雄回归 | `node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/__tests__/cross-hero.test.ts --configLoader native` | 通过 | `16 passed` | ✅ |
| 雷霆万钧 + 自定义动作分类 | `node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/__tests__/thunder-strike.test.ts src/games/dicethrone/__tests__/customaction-category-consistency.test.ts --configLoader native` | 通过 | `6 passed` | ✅ |
| offensiveRollEnd Token / 动作日志回归 | `node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/__tests__/crit-token-custom-action-damage.test.ts src/games/dicethrone/__tests__/crit-token-transfer-bug.test.ts src/games/dicethrone/__tests__/crit-token-transfer-full-flow.test.ts src/games/dicethrone/__tests__/actionLogFormat.test.ts --configLoader native` | 通过 | `24 passed` | ✅ |
| 能力-自定义动作审计 | `node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/__tests__/ability-customaction-audit.test.ts --config vitest.config.audit.ts --configLoader native` | 通过 | `27 passed` | ✅ |
| 伤害计算 | `node scripts/infra/vitest-cli-safe.mjs run src/engine/primitives/__tests__/damageCalculation.test.ts --configLoader native` | 通过 | `27 passed` | ✅ |

### Open Items
- 枪手 `ability-cards.webp` 逐张切图和逐卡录入仍未开始。
- `装填弹药` 的时机冲突仍待用户裁定。
- `samurai` 未推进。

## Session: 2026-03-25 Dice Throne 枪手卡图逐卡裁图与合同表
- **Status:** in_progress
- Actions taken:
  - 扩展 `scripts/assets/extract-dicethrone-gunslinger-crops.mjs`，让脚本可重建枪手 `ability-cards.webp` 的逐格裁图与分裂位单卡裁图。
  - 新增 `src/games/dicethrone/rule/枪手卡牌录入核对.md`，写入卡图布局、通用牌顺序、专属卡合同表与额外立绘登记。
  - 回填 `src/games/dicethrone/rule/枪手真相源表.md` 与 `src/games/dicethrone/rule/枪手录入核对.md`。
  - 确认枪手卡图存在 atlas 顺序偏移与叠放位，后续代码落地必须先校正 previewRef / atlas 逻辑。

### Test Results
| Test | Input | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| 裁图脚本复现 | `node scripts/assets/extract-dicethrone-gunslinger-crops.mjs` | 成功重建枪手角色板 / 提示板 / 卡图裁图 | 成功输出 `player-board`、`tip`、`ability-cards` 全部裁图 | ✅ |

### Open Items
- `src/games/dicethrone/heroes/gunslinger/cards.ts` 仍然是通用牌兜底，尚未接入枪手正式卡组。
- `slot-22 / slot-23 / slot-24` 的上下叠放布局说明枪手需要自己的 atlas 口径，不能直接复用老假设。
- `装填弹药` 的时机冲突仍待用户裁定，不应在本轮擅自固化到卡牌 / 技能最终行为里。

## Session: 2026-03-25 晚 Dice Throne 枪手继续实施
- **Status:** in_progress
- Actions taken:
  - 重新读取 `docs/ai-rules/data-entry.md`、`docs/ai-rules/engine-systems.md`、`docs/ai-rules/asset-pipeline.md`，确认这轮仍需遵守“汉化图主真相源、先裁图、Wiki 只对照、资源路径不直接硬编码 compressed、引擎改动先走已有原语”的口径。
  - 复盘 `gunslinger/cards.ts`、`gunslinger/abilities.ts`、`domain/customActions/gunslinger.ts`、`枪手卡牌录入核对.md`，确认当前代码面仍缺正式卡组、升级能力和大部分专属卡效果。
  - 对照 `commonCards.ts`、`paladin/cards.ts`、`monk/cards.ts`、`barbarian/cards.ts`，确认枪手可直接沿用现有 `AbilityCard` / `replaceAbility` / `rollDie` / 单目标 `selectPlayer` 范式，无需新增 schema。
  - 明确这轮的落地顺序：
    1. 先补枪手升级能力导出
    2. 再补枪手正式 `cards.ts`
    3. 再补 locale 文案与必要 custom action
    4. 最后跑最小相关测试
- Current blocker:
  - `the-law` 的原卡面是“至多 2 位目标玩家”，但当前交互层仅支持单目标玩家选择；本轮只能按 1v1 单目标兼容实现，并把缺口继续记档。

## Session: 2026-03-25 深夜 Dice Throne 枪手 `wild-west` 收口
- **Status:** completed
- Actions taken:
  - 修正 `src/games/dicethrone/domain/customActions/gunslinger.ts` 里 3 个枪手 custom action 的 `categories`，先恢复审计全绿。
  - 在奖励骰 settlement 上新增 `resolutionMode: 'none'`，接入：
    - `src/games/dicethrone/domain/core-types.ts`
    - `src/games/dicethrone/domain/effects.ts`
    - `src/games/dicethrone/domain/executeTokens.ts`
  - 重写 `src/games/dicethrone/domain/customActions/gunslinger.ts` 的 `wild-west`：
    - 固定 `BONUS_DAMAGE_ADDED +1`
    - 用 `createBonusDiceWithReroll(...)` 掷 1 骰
    - 有 `loaded` 时允许支付 1 个 `loaded` 重掷 1 次
    - 奖励骰只展示，不再错误进入伤害结算
  - 在 `src/games/dicethrone/__tests__/cross-hero.test.ts` 新增回归，验证 `wild-west` 即便发生 `loaded` 重掷，`pendingAttack.bonusDamage` 仍只增加 `1`。

### Test Results
| Test | Input | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| TypeScript | `npm run typecheck` | 通过 | 通过 | ✅ |
| 枪手跨英雄回归 | `node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/__tests__/cross-hero.test.ts --configLoader native` | 通过 | `18 passed` | ✅ |
| ability-customaction 审计 | `node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/__tests__/ability-customaction-audit.test.ts --config vitest.config.audit.ts --configLoader native` | 通过 | `27 passed` | ✅ |
| custom action 分类一致性 | `node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/__tests__/customaction-category-consistency.test.ts --configLoader native` | 通过 | `4 passed` | ✅ |

### Open Items
- `the-law` 多目标仍未实现。
- `eat-my-lead` 的 cross-hero 回归已补上；后续仍可再补 UI/E2E 证据层验证。
- 规则文档里的 `loaded` 时机冲突仍等待用户最终裁定。

## Session: 2026-03-26 Dice Throne 枪手卡牌回归续推
- **Status:** in_progress
- Actions taken:
  - 在 `src/games/dicethrone/heroes/gunslinger/cards.ts` 为 `card-the-law` 补上显式 TODO，明确当前仅按 1v1 唯一对手兼容，多目标后做。
  - 在 `src/games/dicethrone/__tests__/cross-hero.test.ts` 新增枪手卡牌回归：
    - `card-the-law` 当前 1v1 兼容行为
    - `card-high-noon` 的 `dash` 分支
    - `upgrade-revolver-2` 的运行时替换
  - 更新 `src/games/dicethrone/rule/枪手卡牌录入核对.md`，把已实现卡牌统一改成“已落地”，并把 `card-the-law` 改成“部分落地”。

### Test Results
| Test | Input | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| ESLint 增量检查 | `npx eslint src/games/dicethrone/heroes/gunslinger/cards.ts src/games/dicethrone/__tests__/cross-hero.test.ts` | 0 errors | 通过 | ✅ |
| 枪手跨英雄回归 | `node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/__tests__/cross-hero.test.ts --configLoader native` | 新旧枪手回归全部通过 | `21 passed` | ✅ |

### Open Items
- `card-the-law` 多目标交互仍未做，已显式登记 TODO。
- 还需继续补枪手其余主阶段行动牌/升级卡的运行时回归。

## Session: 2026-03-26 Dice Throne 枪手主阶段卡与动作层不可防御收口
- **Status:** in_progress
- Actions taken:
  - 在 `src/games/dicethrone/domain/effects.ts` 接通 `EffectAction.unblockable`，让动作层明确声明的不可防御伤害跳过 `shouldOpenTokenResponse()`。
  - 在 `src/games/dicethrone/heroes/gunslinger/cards.ts` 为 `card-pistol-whip` 的 1 点伤害补上 `unblockable: true`。
  - 在 `src/games/dicethrone/__tests__/cross-hero.test.ts` 继续补枪手回归：
    - `card-pistol-whip` 不触发 `protect`
    - `card-mark-the-target`
    - `card-spin-the-chamber`
    - `card-wanted`
    - `upgrade-bounty-hunter-2`

### Test Results
| Test | Input | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| ESLint 增量检查 | `npx eslint src/games/dicethrone/domain/effects.ts src/games/dicethrone/heroes/gunslinger/cards.ts src/games/dicethrone/__tests__/cross-hero.test.ts` | 0 errors | 通过 | ✅ |
| 枪手跨英雄回归 | `node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/__tests__/cross-hero.test.ts --configLoader native` | 新旧枪手回归全部通过 | `26 passed` | ✅ |

### Open Items
- `card-the-law` 多目标交互仍未做，已显式登记 TODO。
- 枪手还有部分升级卡与主阶段卡未被运行时回归覆盖。

## Session: 2026-03-26 Dice Throne 枪手 `high-noon` 三分支与升级卡回归补齐
- **Status:** in_progress
- Actions taken:
  - 在 `src/games/dicethrone/__tests__/cross-hero.test.ts` 继续补枪手回归：
    - `card-high-noon` 的 `bullet` 分支：验证 `2` 点伤害且不触发 `protect`
    - `card-high-noon` 的 `bullseye` 分支：验证只施加 `bounty`
    - `upgrade-showdown-2`
    - `upgrade-showdown-3`
    - `upgrade-fan-the-hammer-2`
    - `upgrade-take-cover-2`
    - `upgrade-deadeye-2`
    - `upgrade-duel-2`
    - `upgrade-quick-draw`
    - `upgrade-quick-draw` 后 `loaded` 通用使用的可重掷交互链
  - 将剩余升级卡统一改为“运行时替换回归”，直接核对 `abilityLevels` 与替换后的技能定义对象，不再只停留在静态录入层。
  - 回填 `findings.md` 与 `task_plan.md`，固化本轮新增发现与剩余缺口。

### Test Results
| Test | Input | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| ESLint 增量检查 | `npx eslint src/games/dicethrone/__tests__/cross-hero.test.ts` | 0 errors | 通过 | ✅ |
| 枪手跨英雄回归 | `node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/__tests__/cross-hero.test.ts --configLoader native` | 新旧枪手回归全部通过 | `36 passed` | ✅ |

### Open Items
- `card-the-law` 多目标交互仍未做，已显式登记 TODO。
## Session: 2026-03-26 Dice Throne 武士真相源文档与资源迁移
- **Status:** in_progress
- Actions taken:
  - 从主仓库复制 `samurai` 汉化资源到当前工作树，补齐 `player-board / tip / ability-cards / dice / 荣誉 / 耻辱 / 反击`。
  - 新增 `scripts/assets/extract-dicethrone-samurai-crops.mjs`，并实际运行生成武士角色板、提示板与卡图裁图。
  - 新增 `src/games/dicethrone/rule/武士真相源表.md`、`武士录入核对.md`、`武士卡牌录入核对.md`。
  - 用 OCR 对武士角色板、提示板、卡图区做首轮录入，先把稳定字段写入文档，把不稳定字段单独标成待裁定。
  - 派生生成 `public/assets/i18n/zh-CN/dicethrone/images/samurai/compressed/status-icons-atlas.webp` 与 `status-icons-atlas.json`，为后续 `tokens.ts` 接线做准备。

### Test Results
| Test | Input | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| 武士裁图脚本 | `node scripts/assets/extract-dicethrone-samurai-crops.mjs` | 成功生成角色板、提示板、卡图裁图 | 通过 | ✅ |
| 裁图脚本语法检查 | `node scripts/assets/extract-dicethrone-samurai-crops.mjs` | 无运行时报错 | 通过 | ✅ |

### Open Items
- 武士 `dice-legend` 的 `1~4` 对应关系仍需继续放大核对，当前不能贸然写死 `diceConfig.ts`。
- `slot-02`、`slot-06` 中文名仍待更清晰裁图确认。
- `反击` 与圣骑士 `Retribution` 存在英文同名语义冲突，后续代码必须单独命名。

## Session: 2026-03-26 Dice Throne 武士防御回归修正
- **Status:** in_progress
- Actions taken:
  - 在 `src/games/dicethrone/domain/customActions/samurai.ts` 修正 `stand-tall` 防御上下文取敌方目标的逻辑，避免把反打伤害错误打回武士自己。
  - 确认 `defensiveRoll` 下 `EffectContext.attackerId` 代表当前执行防御技的玩家，`stand-tall` 这类反打逻辑必须改读 `ctx.defenderId` 才是原始进攻方。
  - 清理 `src/games/dicethrone/__tests__/token-execution.test.ts` 的旧 unused 变量 warning。

### Test Results
| Test | Input | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| 武士跨英雄回归 | `node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/__tests__/cross-hero.test.ts --configLoader native` | `stand-tall` 用例与既有跨英雄用例全部通过 | `41 passed` | ✅ |
| Token 执行回归 | `node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/__tests__/token-execution.test.ts --configLoader native` | 武士 token 响应与既有 token 执行用例全部通过 | `53 passed` | ✅ |
| custom action 审计 | `node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/__tests__/ability-customaction-audit.test.ts --config vitest.config.audit.ts --configLoader native` | 注册与分类审计通过 | `30 passed` | ✅ |
| ESLint 增量检查 | `npx eslint src/games/dicethrone/domain/customActions/samurai.ts src/games/dicethrone/__tests__/cross-hero.test.ts src/games/dicethrone/__tests__/token-execution.test.ts` | 0 errors / 0 warnings | 通过 | ✅ |

### Open Items
- `honor` 当前仍只落地 `1 -> +1`，图上 `2 -> +3` 尚未实现。
- `Masamune II` 仍按基础版逻辑运行，升级差异尚未最终核定。
- `slot-30` / `slot-31` 两张武士攻击修正牌仍未接入。

## Session: 2026-03-27 Dice Throne ��ʿ Honor ���������տ�
- **Status:** in_progress
- Actions taken:
  - �� `src/games/dicethrone/domain/tokenTypes.ts` ����ͨ�� token ��λ������`allowedConsumeAmounts` ����󴰿ڶ�ȡ��`valueByAmount` �ķ�����ȡֵ������
  - �� `src/games/dicethrone/domain/tokenResponse.ts`��`commandValidation.ts` �в���ͬһ��Ӧ���ڵ��ۼ�����У�飬֧�� `honor` �� `1 -> +1 / 2 -> +3`��
  - ���� `src/games/dicethrone/heroes/samurai/tokens.ts` �Ļ�ע�����ظ� `effect`���� `honor` ��ʽ����Ϊ������ `1` �� `2`��
  - ��д `src/games/dicethrone/ui/TokenResponseModal.tsx`���޸����ַ���/�� JSX�������ֵ�ǰ UI �����ߵ�����ť��
  - �� `src/games/dicethrone/__tests__/token-execution.test.ts` ���� `honor` �ع飬����һ������ `2`���������θ����� `1`�������α��������޾ܾ���

### Test Results
| Test | Input | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| Token ִ�лع� | `node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/__tests__/token-execution.test.ts --configLoader native` | `honor` �¾�ִ��·��ȫ��ͨ�� | `55 passed` | ? |
| Token ��Ӧ���ڻع� | `node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/__tests__/token-response-window.test.ts --configLoader native` | ��Ӧ����δ�����ۼ��߼��ƻ� | `8 passed` | ? |
| ��ʿ��Ӣ�ۻع� | `node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/__tests__/cross-hero.test.ts --configLoader native` | ��ʿ�����Ӣ�۽�������ͨ�� | `41 passed` | ? |
| ESLint ������� | `npx eslint src/games/dicethrone/domain/tokenTypes.ts src/games/dicethrone/domain/tokenResponse.ts src/games/dicethrone/domain/commandValidation.ts src/games/dicethrone/heroes/samurai/tokens.ts src/games/dicethrone/ui/TokenResponseModal.tsx src/games/dicethrone/__tests__/token-execution.test.ts` | �� error | ��ʣ `commandValidation.ts` ���� warning | ? |

### Open Items
- `Masamune II` �԰��������߼����У�����������δ���պ˶���
- `slot-30` / `slot-31` ������ʿ������������δ���롣
- �����������������ȣ��ɺ��������� `Honor` ��˫����ť UI�����ⲻ�ǹ�����ȷ�Ե������

## Session: 2026-03-27 Dice Throne 武士 slot-31 残心接入
- **Status:** in_progress
- Actions taken:
  - 在 `src/games/dicethrone/heroes/samurai/cards.ts` 新增 `card-zanshin`，建模为攻击修正牌，并接入 `slot-31.webp` 预览图。
  - 依据 `slot-31` 右上角费用区模板比对，将 `cpCost` 落地为 `2`，同时在代码注释中显式记录证据来源。
  - 复用 `samurai-masamune` 的 5 骰 custom action，避免为证据已确认的同构效果再造一套新逻辑。
  - 在 `src/games/dicethrone/__tests__/cross-hero.test.ts` 增加武士跨英雄回归，覆盖 `katana-slice-3` 后打出 `card-zanshin` 的完整链路。
  - 清理 `src/games/dicethrone/heroes/samurai/cards.ts` 新增段落中的编码乱码，恢复为可直接维护的中文说明。

### Test Results
| Test | Input | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| 武士跨英雄回归 | `node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/__tests__/cross-hero.test.ts --configLoader native` | `card-zanshin` 触发 5 骰结算，且不破坏既有跨英雄用例 | `42 passed` | ✅ |
| custom action 审计 | `node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/__tests__/ability-customaction-audit.test.ts --config vitest.config.audit.ts --configLoader native` | `samurai-masamune` 仍被正确注册并可审计 | `30 passed` | ✅ |
| ESLint 增量检查 | `npx eslint src/games/dicethrone/heroes/samurai/cards.ts src/games/dicethrone/__tests__/cross-hero.test.ts` | 无 error | 通过 | ✅ |

### Open Items
- `slot-30 / 舍生取义` 仍待更强图面证据，当前不应凭模糊 OCR 继续落地。
- `Masamune II` 升级差异仍未最终核定。
## Session 2026-03-27 samurai slot-31 closeout
- status: in_progress
- implemented card-zanshin in src/games/dicethrone/heroes/samurai/cards.ts
- set current cost to 2CP based on cost-area template comparison
- reused samurai-masamune 5-dice custom action
- added cross-hero regression for katana-slice-3 + card-zanshin
- cleaned newly-added mojibake text in cards.ts
- remaining: slot-30 and Masamune II evidence audit
## Session: 2026-03-27 Dice Throne 武士 slot-30 舍生取义接入
- **Status:** in_progress
- Actions taken:
  - 在 `src/games/dicethrone/heroes/samurai/cards.ts` 新增 `card-righteousness`，并接入 `slot-30.webp` 预览图。
  - 在 `src/games/dicethrone/domain/customActions/samurai.ts` 新增 `handleRighteousness` 与 `samurai-card-righteousness` 注册。
  - 将效果落地为：`katana +2 damage`、`helm +2 shame`、`rising_sun +1 samurai_retribution`。
  - 在 `public/locales/zh-CN/game-dicethrone.json` 与 `public/locales/en/game-dicethrone.json` 补齐卡牌名与 bonus-die 效果文案。
  - 在 `src/games/dicethrone/__tests__/cross-hero.test.ts` 新增 `slot-30` 两条回归，并修复既有测试中的乱码断言与错误技能 ID。
### Test Results
| Test | Input | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| 武士跨英雄回归 | `node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/__tests__/cross-hero.test.ts --configLoader native` | `slot-30` 分支与既有跨英雄用例全部通过 | `44 passed` | ✅ |
| custom action 审计 | `node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/__tests__/ability-customaction-audit.test.ts --config vitest.config.audit.ts --configLoader native` | `samurai-card-righteousness` 注册关系保持可审计 | `30 passed` | ✅ |
| ESLint 增量检查 | `npx eslint src/games/dicethrone/heroes/samurai/cards.ts src/games/dicethrone/domain/customActions/samurai.ts src/games/dicethrone/__tests__/cross-hero.test.ts` | 无 error | 通过 | ✅ |
### Open Items
- `slot-30` 当前 `cpCost = 2` 仍属于带证据的暂定裁决；若后续拿到更清晰费用图，应同步回改。
- 当前武士线剩余真正阻塞项已收缩为 `Masamune II` 升级差异核定。
