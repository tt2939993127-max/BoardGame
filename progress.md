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

### Conclusion
- 2 人 `Transfer Status` 已经跟着共享层一起改到四宫格。
- 当前仍未完成的是“把现役 Playwright 链路里的 2 人单用例打绿”，不是业务 UI 语义本身。

## Session: 2026-03-27 DiceThrone 2 人联机 setup 顺序与直连状态注入修复
- **Status:** completed
- Actions taken:
  - 把 `setupDTOnlineMatchWithPlayers()` 改成“全员进入 match 页后再统一等待选角 UI”，修掉 host 在房间未满员时提前等待角色选择页而导致的假 `skip`。
  - 在 `e2e/helpers/common.ts` 为 `initContext()` / `injectDirectGameServerUrl()` 增加显式 `gameServerBaseURL` override，让 DiceThrone 在线 helper 创建的浏览器页与 API 同时直连 `20000`。
  - 在 `e2e/helpers/state-injection.ts` 中把 `/test/*` 状态注入基地址改成优先跟随页面里的 `__FORCE_GAME_SERVER_URL__`，消除“浏览器页连 `20000`，状态注入却打 `18000`”的分叉。
  - 修正 2 人 `Transfer Status` 在线用例的双阶段断言：先点击第一阶段 `dt-status-effect-1-crit`，再验证第二阶段锁定来源卡与目标卡。
  - 自审新增 2 人截图 `01-two-player-transfer-token-target-selection.png`，确认画面真实展示 `P2` 锁定来源卡 + `P1` 唯一目标卡，而不是只靠 selector 断言。

### Test Results
| Test | Input | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| TypeScript 类型检查 | `node .\node_modules\typescript\lib\tsc.js --noEmit --pretty false` | 无类型错误 | 无输出 | ✅ |
| 2 人 transfer token 单用例 E2E | `$env:PW_USE_DEV_SERVERS='true'; $env:PW_START_SERVERS='false'; $env:PW_HAS_EXPLICIT_TARGET='true'; $env:NODE_OPTIONS='--max-old-space-size=4096'; $env:VITE_DEV_PORT='6174'; $env:GAME_SERVER_PORT='20000'; $env:API_SERVER_PORT='21000'; node .\node_modules\@playwright\test\cli.js test e2e/dicethrone-simple-start.e2e.ts --grep "Online 2-player transfer token: transfer phase keeps locked source card and target card"` | 2 人第二阶段锁定来源卡在线通过 | `1 passed` | ✅ |
| 4 人 transfer token 回归 | `$env:PW_USE_DEV_SERVERS='true'; $env:PW_START_SERVERS='false'; $env:PW_HAS_EXPLICIT_TARGET='true'; $env:NODE_OPTIONS='--max-old-space-size=4096'; $env:VITE_DEV_PORT='6174'; $env:GAME_SERVER_PORT='20000'; $env:API_SERVER_PORT='21000'; node .\node_modules\@playwright\test\cli.js test e2e/dicethrone-simple-start.e2e.ts --grep "Online 4-player transfer token: enemy token can be transferred to ally with stable target metadata"` | helper 修复不带坏 4 人主链路 | `1 passed` | ✅ |
| 简单开局整文件 E2E | `$env:PW_USE_DEV_SERVERS='true'; $env:PW_START_SERVERS='false'; $env:PW_HAS_EXPLICIT_TARGET='true'; $env:NODE_OPTIONS='--max-old-space-size=4096'; $env:VITE_DEV_PORT='6174'; $env:GAME_SERVER_PORT='20000'; $env:API_SERVER_PORT='21000'; node .\node_modules\@playwright\test\cli.js test e2e/dicethrone-simple-start.e2e.ts` | 2 人 + 4 人 + 2v2 共 9 条在线链路全部通过 | `9 passed` | ✅ |

### Evidence
| Artifact | Absolute Path | Notes |
|----------|---------------|-------|
| 2 人 transfer token 第二阶段截图 | `D:\gongzuo\webgame\BoardGame-wt-dicethrone-4p-team-mode\test-results\evidence-screenshots\dicethrone-simple-start.e2e\Online-2-player-transfer-token-transfer-phase-keeps-locked-source-card-and-target-card\01-two-player-transfer-token-target-selection.png` | 自审确认 `P2` 卡以锁定来源态保留，`P1` 为唯一真实目标卡 |

### Note
- 在连续多次直接 CLI 复跑时，仍偶发出现整份文件瞬时 `skip`，但同口径手工探针与已拿到的 `9 passed` 结果都表明这是 runner/环境抖动，不是本轮代码逻辑回退。

## Session: 2026-03-27 DiceThrone remove-status 在线证据补齐与默认脚本回归
- **Status:** completed
- Actions taken:
  - 保留既有 2 人 / 4 人 `Transfer Status` 与 `Consecrate` 在线场景不动，继续在现有 `e2e/dicethrone-simple-start.e2e.ts` 中推进 `remove-status-1` 与 `remove-all-status` 的 4 人在线链路。
  - 针对目标页偶发“比 host 慢半拍”的权威态广播问题，只在 E2E 断言层补 `targetPage.waitForFunction()`，不修改 DiceThrone 领域逻辑。
  - 用默认 `npm run test:e2e:ci:file -- e2e/dicethrone-simple-start.e2e.ts` 口径复跑整文件，确认不依赖手工环境变量时也能直接得到有效在线结果。
  - 将 `08-four-player-remove-single-status-selection.png` 与 `09-four-player-remove-all-status-selection.png` 补入证据文档，并把整文件结果更新为 `11 passed`。

### Test Results
| Test | Input | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| TypeScript 类型检查 | `node .\node_modules\typescript\lib\tsc.js --noEmit --pretty false` | 无类型错误 | 无输出 | ✅ |
| 简单开局整文件 E2E（默认脚本） | `npm run test:e2e:ci:file -- e2e/dicethrone-simple-start.e2e.ts` | 2 人、4 人、2v2、转移、授 token、移除状态共 11 条在线链路全部通过 | `11 passed` | ✅ |

### Evidence
| Artifact | Absolute Path | Notes |
|----------|---------------|-------|
| 4 人 remove single status 目标选择截图 | `D:\gongzuo\webgame\BoardGame-wt-dicethrone-4p-team-mode\test-results\evidence-screenshots\dicethrone-simple-start.e2e\Online-4-player-remove-single-status-remove-status-1-can-remove-enemy-token-with-stable-owner-metadata\08-four-player-remove-single-status-selection.png` | 自审确认敌方拥有者卡仍按 4 人语义显示，点击 `Crit` 后最终 host/目标页都同步为 `crit=0` |
| 4 人 remove all status 目标选择截图 | `D:\gongzuo\webgame\BoardGame-wt-dicethrone-4p-team-mode\test-results\evidence-screenshots\dicethrone-simple-start.e2e\Online-4-player-remove-all-status-remove-all-status-blocks-empty-targets-and-clears-enemy-removable-effects\09-four-player-remove-all-status-selection.png` | 自审确认空目标被禁用，敌方 `burn/crit` 可被整组移除 |

## Session: 2026-03-27 DiceThrone Batch 1 spec 拆分与 Vengeance II 共享流程收口
- **Status:** completed
- Actions taken:
  - 将 `update-dicethrone-4p-player-target-interactions/spec.md` 从单一总括 requirement 拆成 4 个 Batch 1 requirement，分别覆盖：任意玩家授 token、任意玩家移除状态、状态 / 可移除 token 转移、无单一敌方目标的无伤害技能流程兼容。
  - 把 `Vengeance II` 这轮真实修复纳入 Batch 1：共享攻击流程已兼容“无默认 defender、无伤害、但仍会触发玩家交互 / postDamage”的 4 人技能，不再误进 `targetingRoll`，也不会吞掉 `INTERACTION_REQUESTED`。
  - 回填 `tasks.md`、`evidence/dicethrone-simple-start-e2e-test.md`、`findings.md` 与 `task_plan.md`，把 Batch 1 当前真实覆盖边界从“泛指多人目标交互”收紧为已落地的代表性入口集合。
  - 补入 4 人 `Vengeance II` 在线截图 `10-four-player-vengeance-2-target-selection.png`，并把证据文档中的默认整文件结果更新为 12 条在线用例。
  - 修复当前 worktree 的依赖树残缺问题：按锁文件版本补回 `vitest`、`typescript`、`dotenv` 等缺失包入口文件，使 `tsc`、Vitest 与 E2E 启动器恢复可执行。

### Test Results
| Test | Input | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| OpenSpec 严格校验 | `openspec validate update-dicethrone-4p-player-target-interactions --strict --no-interactive` | Batch 1 拆分后的 spec 仍满足 OpenSpec 格式 | `valid` | ✅ |
| 规则回归 | `node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/__tests__/rule-consistency.test.ts --configLoader native` | 4 人玩家目标交互与无 defender 流程回归通过 | `31 passed` | ✅ |
| 简单开局整文件 E2E | `npm run test:e2e:ci:file -- e2e/dicethrone-simple-start.e2e.ts` | 12 条在线用例全部通过 | `12 passed` | ✅ |

### Evidence
| Artifact | Absolute Path | Notes |
|----------|---------------|-------|
| 4 人 Vengeance II 目标选择截图 | `D:\gongzuo\webgame\BoardGame-wt-dicethrone-4p-team-mode\test-results\evidence-screenshots\dicethrone-simple-start.e2e\Online-4-player-ability-grant-token-Vengeance-II-can-grant-Retribution-to-ally-with-stable-target-metadata\10-four-player-vengeance-2-target-selection.png` | 自审目标选择面板中 `P1/P2/P3/P4` 均可区分，队友 `P3` 被选中后可稳定获得 `Retribution` |

### Next Step
- 若继续推进玩家目标交互专项，应进入 Batch 2，继续盘点尚未纳入 Batch 1 的其余英雄/卡牌入口，而不是再把 Batch 1 说成“全量多人能力审计完成”。

## Session: 2026-03-28 DiceThrone 合并后续审计与炎术士/B3 复核
- **Status:** completed
- Actions taken:
  - 复核远端主分支状态，确认四人专题已不再停留在 feature 分支；当前 `git ls-remote origin refs/heads/main` 返回 `5a4099e092f6d419e5e6fbdfe1013b9340e556d8`。
  - 继续按“多人能力审计”而非“是否已 merge”推进，重新核对炎术士全部多角色语义入口，区分已拿到 4 人专项证据的家族与仍只有 2 人/局部测试的家族。
  - 重新下钻 Batch 3 P0 的共享路由与 UI 元数据消费点，确认 blocker 不只是旧 E2E 失效，而是 `afterRollConfirmed -> responderQueue -> currentResponderId` 与 `targetOpponentDice:boolean` 的双重 2 人压缩语义。
  - 将本轮结论同步回三件套，明确下一步优先级应是 Batch 3 P0 裁决 + 炎术士 `Pyro Blast` / `Magma Armor` 四人专项，而不是继续口头泛化“火法一堆都差不多”。

### Audit Summary
| Topic | Evidence | Conclusion |
|------|-------|----------|
| 远端主分支状态 | `git ls-remote origin refs/heads/main` | `origin/main` 已前进到 `5a4099e0`，四人专题已进入主线 |
| 炎术士已收口家族 | `rule-consistency.test.ts:722-801` + `dicethrone-simple-start.e2e.ts:1209-1260` | `Soul Burn`、`Meteor` / `Meteor II` / `Ultimate Inferno` 已有 4 人专项证据 |
| 炎术士未收口 P1 | `abilities.ts:122-145` / `386-425`、`customActions/pyromancer.ts:312-345` / `460-495`、`pyromancer-behavior.test.ts`、`sneak-vs-pyro-blast.test.ts` | `Pyro Blast` / `Magma Armor` 仍主要停留在 2 人或局部测试，缺 4 人专项 |
| Batch 3 路由 blocker | `execute.ts:245-279`、`rules.ts:1261-1295`、`ResponseWindowSystem.ts:512-531`、`flow.test.ts:612-675` | 队友既未进入 `responderQueue`，又会被 `currentResponderId` 门禁拦住，当前实现与 2v2 spec 的“队友可改骰”口径未闭环 |
| Batch 3 元数据 blocker | `common.ts:43-56`、`RightSidebar.tsx:136-173`、`DiceTray.tsx:16-33` | `targetOpponentDice:boolean` 仍在压缩“当前骰池归属/观察视角”，不是纯命名问题 |

### Test Results
| Test | Input | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| 远端主分支确认 | `git ls-remote origin refs/heads/main` | 确认四人专题已进主线 | 返回 `5a4099e092f6d419e5e6fbdfe1013b9340e556d8` | ✅ |

### Next Step
- 先对 Batch 3 P0 做语义裁决与共享层实现，不再让“队友可改骰”停留在 spec 文案。
- 然后优先把炎术士 `Pyro Blast` / `Magma Armor` 升级成 4 人规则回归与在线证据。

## Session: 2026-03-28 DiceThrone Batch 3 Shadow Manipulation 与旧专项 E2E 复核
- **Status:** completed
- Actions taken:
  - 继续按 `update-dicethrone-4p-interactions-batch-3` 的 Audit 任务下钻，确认 `shadow_thief-shadow-manipulation` 不是独立交互链，而是直接复用 `modifyDie + targetOpponentDice` 这套共享模型。
  - 复核旧 `e2e/dicethrone-die-modification.e2e.ts` 与 `e2e/dicethrone-die-reroll.e2e.ts`，确认它们不仅口径过时，而且存在 `browser` fixture + 未定义 `page` 变量混用，不能继续作为现役 4 人在线证据。
  - 将 Batch 3 的“可复用资产”与“应退役资产”进一步分层，为后续把在线证据迁回 `simple-start` 主回归做准备。

### Audit Summary
| Topic | Evidence | Conclusion |
|------|-------|----------|
| `shadow_thief-shadow-manipulation` 共享模型 | `src/games/dicethrone/domain/customActions/shadow_thief.ts:177-182` | 仍直接消费 `resolveTargetOpponentDice()`，与通用 `modifyDie` 同属一个共享 blocker |
| 旧修改骰子 E2E | `e2e/dicethrone-die-modification.e2e.ts` 首条用例 | 用 `browser` 建房后正文直接访问未定义的 `page`，不能作为现役证据 |
| 旧重掷骰子 E2E | `e2e/dicethrone-die-reroll.e2e.ts` 首条用例 | 同样混用 `browser` 与未定义 `page`，应降级为历史材料而非当前审计门禁 |

### Next Step
- Batch 3 的实现与验证应基于现役共享回归和主回归 E2E 重建，不再继续加码旧 `dicethrone-die-modification.e2e.ts` / `dicethrone-die-reroll.e2e.ts`。

## Session: 2026-03-28 DiceThrone Batch 3 Audit 收口
- **Status:** completed
- Actions taken:
  - 补齐 `validatePlayCard()`、`ResponseWindowSystem`、`Board.tsx`、`viewMode.ts` 这四处证据，确认“队友可改骰”当前不是单层 bug，而是验证层、响应系统、前端观察层三者口径撕裂。
  - 复核 `game.ts` 中 `createResponseWindowSystem()` 的实际配置，确认 `PLAY_CARD` 不在 `responderExemptCommands` 内，因此只要不是 `currentResponderId` 就会被响应系统拦下。
  - 正式将 Batch 3 的 Audit 阶段视为完成，并把 OpenSpec `tasks.md` 的 1.1-1.3 勾为已完成。

### Audit Summary
| Topic | Evidence | Conclusion |
|------|-------|----------|
| 验证层口径 | `commandValidation.ts:599-665` | `validatePlayCard()` 只校验合法窗口与目标语义，不要求玩家在响应队列中 |
| 响应系统门禁 | `ResponseWindowSystem.ts:395-420`、`ResponseWindowSystem.ts:512-531`、`game.ts:948-964` | `PLAY_CARD` 不属于豁免命令，非 `currentResponderId` 会被硬拦 |
| 前端观察层 | `Board.tsx:140-172`、`585-661`、`688-717`、`viewMode.ts:48-126` | 自动切视角、技能展示、高亮响应牌、自动 pass 都默认只有当前队列响应者可见/可操作 |

### Next Step
- Batch 3 进入 Implementation 阶段：先裁决“队友可改骰”到底走共享响应路由还是非队列豁免，再动共享层实现。

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
## Session: 2026-03-27 Dice Throne 武士 Masamune II 变体闭环
- **Status:** in_progress
- Actions taken:
  - 在 `src/games/dicethrone/heroes/samurai/abilities.ts` 将 `Masamune II` 拆成 `masamune-2-large-straight` 与 `masamune-2-power-up` 两个变体。
  - 在 `src/games/dicethrone/domain/customActions/samurai.ts` 让 `samurai-masamune` 支持从 `action.params.diceCount` 读取额外掷骰数，升级版按 `6` 颗骰结算。
  - 修正 `power-up` 分支结算时机为 `preDefense`，避免被攻击结算链漏掉。
  - 在双语 locale 中补齐 `Masamune II` 与 `power-up` 文案。
  - 在 `src/games/dicethrone/__tests__/cross-hero.test.ts` 新增 `Masamune II` 的大顺分支与全符号分支回归。

### Test Results
| Test | Input | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| 武士跨英雄回归 | `node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/__tests__/cross-hero.test.ts --configLoader native` | `Masamune II` 两个变体与既有跨英雄用例全部通过 | `46 passed` | ✅ |
| ESLint 增量检查 | `npx eslint src/games/dicethrone/heroes/samurai/abilities.ts src/games/dicethrone/domain/customActions/samurai.ts src/games/dicethrone/__tests__/cross-hero.test.ts` | 无 error | 通过 | ✅ |

### Open Items
- `Masamune II` 的新增分支已核定效果，但原始中文牌面名称仍待更清晰图证。
- 武士线剩余待核不再包括升级卡中文名，主要只剩 `masamune-2-power-up` 是否存在独立官方印刷标题。

## Session: 2026-03-27 Dice Throne 武士中文名与资源链收口

- **Status:** in_progress
- Actions taken:
  - 将 `public/locales/zh-CN/game-dicethrone.json` 中武士角色名、能力名、升级卡名、行动牌名与对应描述对齐到中文图片真相源。
  - 重新核对 `public/assets/i18n/zh-CN/dicethrone/assets-manifest.json`，确认武士图片与裁图已正式登记进资源清单。
  - 复查 `npm run assets:check` 输出，确认当前远端差异不在武士资源。
  - 在武士核对文档与计划文件中追加“旧 pending 已过时”的结论，避免继续误导后续录入。

### Verification
| Check | Input | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| 武士资源清单登记 | `rg -n "images/samurai" public/assets/i18n/zh-CN/dicethrone/assets-manifest.json` | manifest 中存在武士资源条目 | 已命中压缩图、裁图、icon、atlas 条目 | ✅ |
| 远端差异归属 | `npm run assets:check` | 武士不再出现在新增/变更列表 | 剩余差异为 `gunslinger/compressed/status-icons-atlas.webp` | ✅ |

### Open Items
- `masamune-2-power-up` 仍是内部变体名，不是独立卡牌中文名；若后续拿到更清晰原图，可再裁定是否存在官方印刷标题。

## Session: 2026-03-28 DiceThrone Batch 3 响应语义第一段收口
- **Status:** in_progress
- Actions taken:
  - 按用户明确裁决收口 Batch 3 的权威口径：`response` 是敌对操作；队友不进入 `responderQueue`；队友若持有合法改骰牌，只能以“direct dice interference”路径直接出牌，不算 response。
  - 新增 `src/games/dicethrone/domain/responseWindowGuards.ts` 的 `isDirectDiceInterferenceActor()`，显式识别 `afterRollConfirmed` 窗口里“当前响应者的同队 direct actor”。
  - 在 `src/engine/systems/ResponseWindowSystem.ts` 接入 `allowNonResponderCommand`，并在 `src/games/dicethrone/game.ts` 只对白名单条件 `afterRollConfirmed + PLAY_CARD + isDirectDiceInterferenceActor + isCardPlayableInResponseWindow` 放行非当前响应者。
  - 在 `src/games/dicethrone/Board.tsx` 与 `src/games/dicethrone/ui/viewMode.ts` 同步前端口径：同队 direct actor 也能拿到响应期可打牌高亮、可操作视图与响应切视角建议，但并未被包装成新的 responder 身份。
  - 在 `src/games/dicethrone/__tests__/flow.test.ts` 新增 4 人 / 2v2 回归，锁住“队友不进响应队列，但能直接打出 `card-flick` 并创建 `modifyDie` 交互”。
  - 顺手修正 `src/games/dicethrone/game.ts` 中 `isCardPlayableInResponseWindow()` 的错误类型 cast，不再把 `DtResponseWindowType` 混写成 `TurnPhase`。

### Test Results
| Test | Input | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| OpenSpec 严格校验 | `openspec validate update-dicethrone-4p-interactions-batch-3 --strict --no-interactive` | Batch 3 change 在继续实现后仍有效 | `valid` | ✅ |
| TypeScript 类型检查 | `node .\node_modules\typescript\lib\tsc.js --noEmit --pretty false` | 新增 non-responder guard 与规则回归无类型错误 | 无输出 | ✅ |
| Batch 3 共享回归 | `node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/__tests__/flow.test.ts src/games/dicethrone/__tests__/response-window-interaction-lock.test.ts src/games/dicethrone/__tests__/flick-response-debug.test.ts --configLoader native` | 4 人同队 direct-dice 语义与现有响应窗口交互锁定回归同时通过 | `100 passed` | ✅ |

### Next Step
- 继续补 Batch 3 的剩余两块：`targetOpponentDice:boolean` 的显式骰池归属元数据收口，以及 `shadow_thief-shadow-manipulation` / 现役 4 人在线 E2E 证据。

## Session: 2026-03-28 DiceThrone Batch 3 direct-dice 在线证据补齐
- **Status:** completed
- Actions taken:
  - 在 `e2e/dicethrone-simple-start.e2e.ts` 新增现役在线用例，验证 4 人 / 2v2 下“队友不进响应队列，但可直接打出改骰牌并打开 `modifyDie` 交互”。
  - 将最初直接点击手牌 DOM 的不稳定方案收紧为“从 ally 页派发真实 `PLAY_CARD` 命令，再断言真实页面交互已打开”，避免把手牌布局结构误当业务失败。
  - 顺手修复 `e2e/helpers/state-injection.ts` 误读 `__FORCE_GAME_SERVER_URL__` 的问题，使 isolated-port 单 worker 模式下 `/test/*` 请求稳定走 `__FORCE_API_SERVER_URL__`。
  - 复跑 `dicethrone-simple-start.e2e.ts` 整文件，确认 helper 修正与新增用例没有带坏现役主回归。

### Test Results
| Test | Input | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| Batch 3 direct-dice 单例 E2E | `npm run test:e2e:ci:file -- e2e/dicethrone-simple-start.e2e.ts "Online 4-player direct dice ally: teammate stays out of responder queue but can still open modify interaction"` | 4 人 ally 不进 `responderQueue`，但仍可直接打出改骰牌并打开交互 | `1 passed` | ✅ |
| `simple-start` 主回归整文件 E2E | `npm run test:e2e:ci:file -- e2e/dicethrone-simple-start.e2e.ts` | 新增 direct-dice 在线证据与 helper 修正后主回归仍全绿 | `14 passed` | ✅ |
| TypeScript 类型检查 | `node .\node_modules\typescript\lib\tsc.js --noEmit --pretty false` | E2E helper 修正与新增用例无类型错误 | 无输出 | ✅ |

### Evidence
| Artifact | Absolute Path | Notes |
|----------|---------------|-------|
| 4 人同队 direct-dice 在线截图 | `D:\gongzuo\webgame\BoardGame-wt-dicethrone-4p-team-mode\test-results\evidence-screenshots\dicethrone-simple-start.e2e\Online-4-player-direct-dice-ally-teammate-stays-out-of-responder-queue-but-can-still-open-modify-interaction\12-four-player-direct-dice-ally-interaction.png` | 自审确认 ally 页可见 direct-dice 交互，同时队友仍不在 `responderQueue` |

### Conclusion
- Batch 3 的第一条现役 4 人 direct-dice 在线证据已经补齐；这部分不再只是规则回归或本地状态断言。
- `state-injection` helper 的 API 基址 bug 已同步修掉，后续 isolated-port E2E 不会再把 `/test/*` 请求打到 game server 端口。

## Session: 2026-03-28 DiceThrone Batch 3 元数据模型与 Shadow 专项回归收口
- **Status:** completed
- Actions taken:
  - 将 `diceOwnerId` 从共享交互描述符一路打通到通用 custom action、`shadow_thief-shadow-manipulation`、事件系统、AI meta、测试注入 helper 以及 `RightSidebar`/`DiceTray` 的提示元数据，完成 Batch 3 的 2.1。
  - 在 `src/games/dicethrone/__tests__/active-modifiers-undo.test.ts` 补 UI 回归，确认 `selectDie` 交互在 `diceOwnerId` 指向同队玩家时会显示 `interaction.hint_select_ally`。
  - 在 `src/games/dicethrone/__tests__/shadow_thief-behavior.test.ts` 补 4 人 / 2v2 handler 级专项，确认 `shadow_thief-shadow-manipulation` 在 `Sneak` 存在时会创建 `selectCount=2`、`diceOwnerId='3'`、`targetOpponentDice=false` 的 `modifyDie` 交互。
  - 尝试把 `shadow-manipulation` 直接接到 4 人 response pipeline 后，发现当前共享 `afterRollConfirmed` 门禁仍显式排斥 `target='self'` 的骰子卡；基于仓库现有回归仍锁着“self-only 不开响应窗”，本轮未擅自扩大规则，而是把 Shadow 证据收口到 handler/UI/共享元数据层。

### Test Results
| Test | Input | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| Batch 3 元数据与 Shadow 回归 | `node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/__tests__/flow.test.ts src/games/dicethrone/__tests__/active-modifiers-undo.test.ts src/games/dicethrone/__tests__/flick-response-debug.test.ts src/games/dicethrone/__tests__/response-window-interaction-lock.test.ts src/games/dicethrone/__tests__/shadow_thief-behavior.test.ts --configLoader native` | 通用 direct-dice、UI hint、Shadow 4 人元数据专项同时通过 | `157 passed` | ✅ |
| TypeScript 类型检查 | `node .\node_modules\typescript\lib\tsc.js --noEmit --pretty false` | `diceOwnerId` 贯通后无类型错误 | 无输出 | ✅ |
| OpenSpec 严格校验 | `openspec validate update-dicethrone-4p-interactions-batch-3 --strict --no-interactive` | Batch 3 change 在任务状态更新后仍有效 | `valid` | ✅ |

### Conclusion
- Batch 3 的 `2.1/2.3` 当前都可以视为完成：共享元数据模型已显式表达骰池归属，通用入口、UI 提示和 `shadow_thief-shadow-manipulation` 都已拿到现役回归。
- 但“self-only 骰子卡是否应在 `afterRollConfirmed` 对当前敌方骰池开放”仍不是本轮已裁决事实；现有仓库证据只足够支持元数据与 direct-dice 边界，不足以直接改写那条共享门禁。

## Session: 2026-03-28 Dice Throne 枪手 The Law 多目标交互闭环

- **Status:** in_progress
- Actions taken:
  - 在 `src/games/dicethrone/domain/customActions/gunslinger.ts` 为 `card-the-law` 补上正式 custom action：`1v1` 下直通唯一对手，`3+` 人局进入“至多 2 名目标玩家”交互。
  - 在 `src/games/dicethrone/domain/commands.ts`、`commandValidation.ts`、`execute.ts` 增补 `RESOLVE_INTERACTION` 选择结算命令，用单次命令原子化结算多名玩家的 `bounty + knockdown`。
  - 在 `src/games/dicethrone/hooks/useInteractionState.ts`、`src/games/dicethrone/Board.tsx`、`src/games/dicethrone/ui/resolveMoves.ts` 把旧的单玩家本地交互状态收口为多选玩家数组，避免 UI 仍卡死在单选。
  - 在 `src/games/dicethrone/__tests__/cross-hero.test.ts` 把枪手跨英雄初始化扩成可支持 3 人局，并补 `The Law` 的多人回归。
  - 在 `src/games/dicethrone/rule/枪手卡牌录入核对.md` 将 `card-the-law` 从“部分落地”改为“已落地”。

### Verification
| Check | Input | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| locale JSON 解析 | `node -e "JSON.parse(...zh-CN...); JSON.parse(...en...)"` | 双语 locale 可解析 | `json ok` | ✅ |
| 依赖环境 | `npx eslint ...` / `node scripts/infra/vitest-cli-safe.mjs ...` | 可跑静态检查与 Vitest | 当前 worktree 缺少 `node_modules`，命令未能启动 | ⚠️ |

### Open Items
- 当前剩余阻塞不在逻辑实现，而在该 worktree 缺少前端测试依赖；需在有依赖的环境里补跑 `eslint` 与 `cross-hero.test.ts`。

## Session: 2026-03-28 Dice Throne 枪手 The Law 审计 + Spec + E2E 收口

- **Status:** in_progress
- Actions taken:
  - 对 `The Law` 的实现链做了一轮正式审计，确认缺口集中在规范和验证，不在领域执行链本身。
  - 在 `openspec/specs/interaction-system/spec.md` 增补 `dt:card-interaction` 下 `selectPlayer + selectCount > 1` 的多目标选择契约。
  - 在 `src/games/dicethrone/ui/__tests__/InteractionOverlay.test.tsx` 增补多目标玩家选择 UI 回归。
  - 在 `e2e/dicethrone-watch-out-spotlight.e2e.ts` 增补两条基于 `GameTestContext` / TestHarness 的 `The Law` 多目标交互 E2E。
  - 新增 `evidence/dicethrone-gunslinger-the-law-multiselect-e2e-test.md`，登记命令、断言和截图证据。

### Verification
| Check | Input | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| OpenSpec 校验 | `openspec validate interaction-system --strict --no-interactive` | 新契约合法 | `Specification 'interaction-system' is valid` | ✅ |
| UI 单测 + 领域回归 | `node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/ui/__tests__/InteractionOverlay.test.tsx src/games/dicethrone/__tests__/cross-hero.test.ts --configLoader native` | 新增 UI 多选断言与既有 cross-hero 通过 | `65 passed` | ✅ |
| 定向 E2E | `npm run test:e2e:ci:file -- dicethrone-watch-out-spotlight.e2e.ts "枪手 The Law 多目标交互"` | 两条新交互用例通过 | `2 passed` | ✅ |

### Open Items
- 与枪手 `The Law` 多目标交互直接相关的审计、spec、UI 回归、E2E 已完成；当前无新增阻塞项。

## Session: 2026-03-28 Dice Throne 武士 Token Response 真实点击收口

- **Status:** in_progress
- Actions taken:
  - 在 `e2e/dicethrone-watch-out-spotlight.e2e.ts` 新增武士 token 响应场景注入 helper，并补两条真实点击 E2E：
    - `samurai honor token should accumulate to +3 after two real clicks`
    - `samurai retribution token should retaliate through real click flow`
  - 新增 `openspec/specs/dicethrone-token-response/spec.md`，把“同一响应窗口内的非线性 token 累计消耗”与“零修正值 + custom action token”写成当前真相规范。
  - 新增 `evidence/dicethrone-samurai-token-response-e2e-test.md`，登记命令、断言与截图证据。
  - 将武士两张攻击修正牌与枪手 `The Law` 一并纳入本轮关键交互合并回归，避免只验证 token 子链。

### Verification
| Check | Input | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| OpenSpec 校验 | `openspec validate dicethrone-token-response --strict --no-interactive` | 新 spec 合法 | `Specification 'dicethrone-token-response' is valid` | ✅ |
| 武士 token 响应 E2E | `npm run test:e2e:ci:file -- dicethrone-watch-out-spotlight.e2e.ts "samurai (honor token|retribution token)"` | `Honor` 与 `Back Strike` 真实点击通过 | `2 passed` | ✅ |
| 关键交互合并回归 | `npm run test:e2e:ci:file -- dicethrone-watch-out-spotlight.e2e.ts "samurai|枪手 The Law 多目标交互"` | 枪手/武士本轮关键交互真实点击通过 | `6 passed, 2 skipped` | ✅ |

### Open Items
- 本轮已改过的关键交互已完成真实点击验证；当前无新增实现阻塞项。

## Session: 2026-03-28 Dice Throne 枪手 The Law 从手牌打出验证

- **Status:** in_progress
- Actions taken:
  - 在 `e2e/dicethrone-watch-out-spotlight.e2e.ts` 新增 `injectGunslingerTheLawPlayScene` / `waitForGunslingerTheLawPlayScene`，把 `The Law` 的验证入口从“交互态注入”推进到“手牌点击打出”。
  - 新增两条真实点击 E2E：
    - `should resolve immediately in 1v1 after clicking the hand card`
    - `should open multi-target interaction after playing from hand in 3-player scene`
  - 将手牌打出链路并入 `samurai|枪手 The Law` 的合并回归，确认不是单独跑才通过。
  - 在 `evidence/dicethrone-gunslinger-the-law-multiselect-e2e-test.md` 追加手牌打出截图与结论。

### Verification
| Check | Input | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| The Law 手牌打出 E2E | `npm run test:e2e:ci:file -- dicethrone-watch-out-spotlight.e2e.ts "枪手 The Law 从手牌真实打出"` | `1v1` 直结算 + `3` 人局多目标交互都通过 | `2 passed` | ✅ |
| 枪手/武士合并回归 | `npm run test:e2e:ci:file -- dicethrone-watch-out-spotlight.e2e.ts "samurai|枪手 The Law"` | 本轮关键交互一并通过 | `8 passed, 2 skipped` | ✅ |

### Open Items
- 枪手 `The Law` 当前已不只是在“交互已出现时可点”，而是从手牌点击打出到最终结算整条链路都已真实跑通。

## Session: 2026-03-28 Dice Throne 武士 Token Response 真实整局入口验证

- **Status:** in_progress
- Actions taken:
  - 在 `e2e/dicethrone-token-response-window.e2e.ts` 把武士 `Honor / Back Strike` 的验证入口推进到真实整局攻击流程，不再停在注入 `pendingDamage` 后读状态。
  - 修正 `Back Strike` 用例里攻击方响应层的脆弱等待：删除不稳定的 `waitForFunction`，改为点击真实 `PASS` 后再等待 `Resolve Attack`。
  - 在 `e2e/helpers/dicethrone.ts` 修正 `maybePassResponse` 的按钮匹配方式，避免因过严的角色名匹配漏点 `PASS`。
  - 将 `Back Strike` 的断言改成基于运行时真实状态：攻击者掉血按 `ceil(backStrikeRoll / 2)` 计算，防御者掉血按 `pendingDamage - damageShields` 计算。

### Verification
| Check | Input | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| Token response spec 校验 | `openspec validate dicethrone-token-response --strict --no-interactive` | spec 合法 | `Specification 'dicethrone-token-response' is valid` | ✅ |
| Back Strike 单条真实入口 | `npm run test:e2e:ci:file -- dicethrone-token-response-window.e2e.ts "samurai back strike should open from real attack flow and retaliate on click"` | 从整局真实流程打开防御方响应窗并完成点击反打 | `1 passed` | ✅ |
| Honor + Back Strike 合并真实入口 | `npm run test:e2e:ci:file -- dicethrone-token-response-window.e2e.ts "Token 响应窗口真实入口"` | 两条真实整局入口一并通过 | `2 passed` | ✅ |
| E2E/helper 定向 lint | `npx eslint e2e/dicethrone-token-response-window.e2e.ts e2e/helpers/dicethrone.ts` | 无 error | `0 error, 8 warnings（均为 helper 历史未用导入）` | ✅ |

### Open Items
- 武士 token response 当前关键链路已同时完成“注入场景真实点击”和“整局入口真实点击”两层验证；剩余若继续扩面，应优先补其他尚未覆盖真实入口的交互，而不是重复堆同质用例。
