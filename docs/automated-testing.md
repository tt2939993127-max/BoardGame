# 自动化测试

> 本文档是项目唯一的测试规范文档。引擎层审计工具的详细规范见 `docs/ai-rules/engine-systems.md`「引擎测试工具总览」节。

## 目录

- [快速开始](#快速开始)
- [测试隔离与性能](#测试隔离与性能)
- [测试框架与工具](#测试框架与工具)
- [测试策略](#测试策略)
- [E2E 测试](#e2e-测试)
- [API 测试](#api-测试)
- [GameTestRunner](#gametestrunner)
- [调试工具](#调试工具)
- [持续集成](#持续集成)

---

## 快速开始

```bash
# 运行所有测试
npm test

# 运行特定游戏的测试（推荐开发时使用）
npm run test:summonerwars    # Summoner Wars
npm run test:smashup         # Smash Up
npm run test:dicethrone      # Dice Throne
npm run test:tictactoe       # Tic Tac Toe

# 运行核心框架测试
npm run test:core            # 引擎、组件、工具库

# 运行其他模块测试
npm run test:server          # 服务端测试
npm run test:ugc             # UGC 系统测试
npm run test:games           # 所有游戏测试
npm run test:api             # API 测试

# 监听模式（开发时使用）
npm run test:watch

# E2E 测试
npm run test:e2e
```

### 过滤运行 Vitest 测试

```bash
npm test -- audio.config                        # 匹配文件名/路径
npm test -- src/ugc/builder                     # 匹配目录
npm test -- src/games/tictactoe/__tests__       # 游戏测试目录
npm test -- src/games/tictactoe/__tests__/flow.test.ts  # 单文件
```

### 开发工作流建议

1. **开发特定游戏时**：只运行该游戏的测试（6-12秒）
2. **修改核心框架时**：先运行核心测试，再运行游戏测试
3. **提交前**：运行所有测试
4. **调试单个测试文件**：`npx vitest run <文件路径>`

---

## 测试隔离与性能

项目采用测试隔离策略，将测试分为多个独立模块，支持选择性运行和并行测试。

### 测试模块划分

| 模块 | 命令 |
|------|------|
| Summoner Wars | `npm run test:summonerwars` |
| Smash Up | `npm run test:smashup` |
| Dice Throne | `npm run test:dicethrone` |
| Tic Tac Toe | `npm run test:tictactoe` |
| 核心框架 | `npm run test:core` |
| 服务端 | `npm run test:server` |
| UGC 系统 | `npm run test:ugc` |
| API | `npm run test:api` |
| 全量 | `npm test` |

### 何时运行全量测试

满足任一条件就扩大范围：
- 修改 `src/engine/`（含 `primitives/` 与 `systems/`）、`src/core/`、`src/components/game/framework/`
- 涉及多人联机、状态同步、Undo/Rematch/Prompt 等系统性行为
- 涉及公共类型/协议
- 提交前/合并前

---

## 测试框架与工具

### 测试框架

| 框架 | 用途 |
|------|------|
| Vitest | 游戏领域层测试 + API 集成测试 |
| Playwright | 端到端 UI 测试 |
| GameTestRunner | 游戏领域层专用测试运行器（命令序列 → pipeline → 状态断言） |

### 引擎层审计工具（`src/engine/testing/`）

> **GameTestRunner 行为测试是最优先、最可靠的测试手段**。审计工具是补充，用于批量覆盖 GameTestRunner 无法高效覆盖的注册表引用完整性和交互链完整性。
> 详细规范见 `docs/ai-rules/engine-systems.md`「引擎测试工具总览」节。

| 工具 | 文件 | 用途 |
|------|------|------|
| GameTestRunner | `index.ts` | 命令序列执行 + 状态断言，所有游戏首选 |
| entityIntegritySuite | `entityIntegritySuite.ts` | 数据定义契约验证（注册表完整性/引用链/触发路径/效果契约） |
| referenceValidator | `referenceValidator.ts` | 实体引用链提取与验证 |
| interactionChainAudit | `interactionChainAudit.ts` | UI 状态机 payload 覆盖审计（模式 A） |
| interactionCompletenessAudit | `interactionCompletenessAudit.ts` | Interaction handler 注册覆盖审计（模式 B） |

新增游戏时根据游戏特征选择需要的审计工具：
- 所有游戏（必选）→ GameTestRunner
- 有注册表 + 数据定义（≥20 个实体）→ entityIntegritySuite
- 有多步 UI 交互 → interactionChainAudit
- 有 InteractionSystem → interactionCompletenessAudit

### 目录结构

```
/
├── e2e/                          # Playwright E2E 测试
├── apps/api/test/                # API 集成测试
├── src/engine/testing/           # 引擎层测试工具
└── src/games/<gameId>/__tests__/ # 游戏领域测试
```

---

## 测试策略

### 测试覆盖要求

| 类别 | 覆盖点 |
|------|--------|
| 基础流程 | 初始状态、状态流转、正常结束 |
| 核心机制 | 触发条件、实际效果（与描述一致）、状态变更、资源获取/消耗 |
| 数据驱动 | 效果与描述完全一致、状态变化、副作用正确性 |
| 升级系统 | 逐级升级、跳级拒绝、费用计算、最高级处理 |
| 错误处理 | 非法操作拒绝、前置条件拒绝、错误码正确性 |
| 边界条件 | 数值上下限、特殊触发、并发/竞态 |
| 静态审计 | 注册表完整性、交互链覆盖（使用引擎层审计工厂） |
| **集成链路** | **每个需要 Interaction 的能力至少 1 条 execute() 完整链路测试** |
| E2E | 入口 → 关键交互 → 完成/退出；教程需验证 AI 回合 |

### 集成链路测试规范（强制）

> 教训：单元测试直接调用能力函数（如 `triggerBaseAbility`）时会自动注入 `matchState`，
> 但 reducer 层可能漏传参数导致 Interaction 类能力静默失败。单元测试全绿不代表完整链路正确。

**规则**：每个通过 `matchState` / `queueInteraction` 创建交互的能力，必须至少有 1 条通过 `execute()` 走完整链路的集成测试，验证：
1. `execute()` 返回的事件列表正确
2. `sys.interaction` 中有对应的 Interaction（sourceId 匹配）

**参考**：`src/games/smashup/__tests__/baseAbilityIntegrationE2E.test.ts`

### 精简策略（同类覆盖保留）

目标：减少低价值用例数量，保持每个"交互类别/能力类别"至少 1 条代表性用例。

**为什么需要精简**：
- **运行成本**：用例越多，CI/本地运行时间越长，反馈变慢
- **稳定性成本**：同类用例越多，受到波动/偶发失败影响的概率越高
- **维护成本**：UI/文案/流程调整会同时破坏大量重复用例
- **噪声成本**：大量相似失败会掩盖真正的高价值回归

**例外（必须保持多样化覆盖的场景）**：
- 素材/配置差异高（例如角色选择、资源加载、图片缺失）：需要按数据维度保留或改为数据驱动的完整性检查

**低价值用例判定（可删除/合并）**：
- 只验证"出现/可见"的静态用例，且在其它测试中已有同一路径的功能性操作
- 与"创建/更新/删除/保存"同类行为重复，仅验证列表/计数/标题等弱断言
- 同一个交互链条被拆成多个短用例，但没有新增失败分支或独立状态变化
- 仅为截图存在的用例（无断言或无状态变化）

**必须保留的同类覆盖（最少 1 条）**：
- 入口可达 + 关键操作 + 结果验证（例如：创建→保存→刷新恢复）
- 关键交互面（Modal/Tab/表单校验/多步骤选择）每类至少 1 条
- 负向或边界至少 1 条（如未登录/非法操作被拒绝）

### 测试命名规范

- 正向测试：描述预期行为（`"成功创建用户"`）
- 错误测试：标注错误码（`"无权限操作 - unauthorized"`）

### 测试最佳实践

1. 测试文件命名：`*.test.ts` 或 `*.test.tsx`
2. 测试文件位置：`__tests__` 目录下
3. 测试描述：使用中文描述测试用例
4. 测试隔离：每个测试应该独立，不依赖其他测试的状态
5. 快照测试：谨慎使用，优先使用断言
6. 异步测试：使用 `async/await`，设置合理的超时时间

---

## E2E 测试

测试文件位于 `e2e/` 目录。

### 覆盖原则

**硬性要求**：E2E 必须覆盖"交互面"而不只是"完整流程"。

- **交互覆盖**：对用户可见且可操作的关键交互点，逐一验证：
  - 能否触达（入口/按钮/快捷入口/菜单/路由）
  - 能否操作（点击/输入/拖拽/切换 Tab/确认取消/关闭弹窗）
  - 操作后的 UI 反馈（状态变化、禁用态、提示文案、Loading、错误提示）
  - 数据/状态副作用（如加入房间、发送消息、发起重赛投票、退出房间）
- **流程覆盖**：对"从入口到结束/返回"的主路径至少保留 1 条 happy path 作为回归基线

### 所有游戏 E2E 覆盖范围（通用规范）

1. **完整流程基线（Happy Path）**：入口 → 创建房间 → 阵营选择 → 开始对局 → 回合推进 → 结束/结算
2. **核心交互面**：关键 UI 面板（阶段、手牌、地图、行动按钮）、地图缩放/拖拽、阶段推进
3. **特殊交互面**：攻击后技能选择、事件卡多目标/多步骤选择、弃牌堆选择
4. **负面与边界**：非当前玩家操作被拒绝、阶段自动跳过边界

### 本地模式 vs 在线对局

| 场景 | 做法 |
|------|------|
| 真实多人流程 | 使用 host/guest 两个浏览器上下文：创建房间 → guest `?join=true` 加入 |
| 交互回归 | 按"交互覆盖清单"逐条验证 |
| 冒烟测试 | 验证页面加载 + 关键元素出现 |
| 调试/静态渲染 | 可用 `/play/<gameId>/local`，但不能替代多人流程 |

### 截图与附件管理（强制）

1. 使用 `testInfo.outputPath('filename.png')` 生成存放路径
2. 禁止硬编码路径（如 `e2e/screenshots/...`）
3. `test-results/` 目录已被 git 忽略，测试产物不应提交
4. 按需截图，默认配置已开启 `screenshot: 'only-on-failure'`

```typescript
test('Match started', async ({ page }, testInfo) => {
    await page.screenshot({ path: testInfo.outputPath('game-started.png') });
});
```

### 多客户端测试（Multi-Player E2E）

适用于需要模拟真实多玩家交互的测试。

```typescript
import { createMultiPlayerTest } from './helpers/multiPlayer';

test('多玩家游戏流程', async ({ browser }, testInfo) => {
  const multiPlayer = await createMultiPlayerTest({
    browser,
    baseURL: testInfo.project.use.baseURL,
    gameId: 'my-game',
    matchId: 'test-match-id',
    numPlayers: 3,
    disableAudio: true,
    disableTutorial: true,
  });

  try {
    const player1 = multiPlayer.getPlayer('0');
    await multiPlayer.waitForAllPlayersReady();
    // 执行测试逻辑...
  } finally {
    await multiPlayer.cleanup();
  }
});
```

关键要点：
1. 每个玩家必须使用独立的 `BrowserContext`
2. 每个玩家需要独立获取和存储 credentials
3. 根据游戏状态动态选择对应的客户端发送命令
4. 测试结束后必须关闭所有上下文

参考：`e2e/helpers/multiPlayer.ts`、`e2e/ugc-preview.e2e.ts`

### Mock API 响应

```typescript
test.beforeEach(async ({ page }) => {
    await page.route('**/auth/me', async route => {
        await route.fulfill({ json: { user: mockUser } });
    });
});
```

### 关键功能覆盖

- `e2e/social.test.ts` - Global HUD 入口、模态框、标签页、好友列表
- `e2e/navbar.test.ts` - 顶部导航、登录状态、游戏分类
- `e2e/tictactoe-tutorial.e2e.ts` - 井字棋教程完整流程
- `e2e/dicethrone.e2e.ts` - 线上房间手牌校验 + 教程完整流程 + 僧侣莲花掌选择 + 雷霆万钧奖励骰重掷
- `e2e/dicethrone-moon-elf.e2e.ts` - 月精灵基础攻击 + Targeted 伤害结算
- `e2e/dicethrone-shadow-thief.e2e.ts` - 暗影刺客基础攻击 + Sneak 免伤 + 双防御技能选择

---

## API 测试

可设置 `MONGO_URI` 复用 Docker MongoDB，避免下载内存 MongoDB 二进制：

```bash
# PowerShell
$env:MONGO_URI="mongodb://localhost:27017/boardgame_test"
npm run test:api
```

> 未设置时使用 `mongodb-memory-server` 自动启动临时 MongoDB。

---

## GameTestRunner

游戏领域层专用测试运行器，输入命令序列 → 执行 pipeline → 断言最终状态。

### 1. 定义断言类型

```typescript
interface MyGameExpectation extends StateExpectation {
    winner?: string;
    score?: number;
}
```

### 2. 实现断言函数

```typescript
function assertMyGame(state: MyGameCore, expect: MyGameExpectation): string[] {
    const errors: string[] = [];
    if (expect.winner !== undefined && state.winner !== expect.winner) {
        errors.push(`获胜者不匹配: 预期 ${expect.winner}, 实际 ${state.winner}`);
    }
    return errors;
}
```

### 3. 编写测试用例

```typescript
const testCases: TestCase<MyGameExpectation>[] = [
    {
        name: '正常流程 - 玩家获胜',
        commands: [
            { type: 'MOVE', playerId: '0', payload: { ... } },
        ],
        expect: { winner: '0' },
    },
    {
        name: '错误测试 - 非法操作',
        commands: [{ type: 'INVALID_MOVE', playerId: '0', payload: {} }],
        expect: { expectError: { command: 'INVALID_MOVE', error: 'invalidMove' } },
    },
];
```

### 4. 运行测试

```typescript
const runner = new GameTestRunner({
    domain: MyGameDomain,
    playerIds: ['0', '1'],
    assertFn: assertMyGame,
});

runner.runAll(testCases);
```

### API 参考

| 配置项 | 类型 | 说明 |
|--------|------|------|
| `domain` | `DomainCore` | 游戏领域内核 |
| `playerIds` | `string[]` | 玩家列表 |
| `setup` | `(playerIds, random) => state` | 可选，自定义初始化 |
| `assertFn` | `(state, expect) => string[]` | 断言函数 |
| `visualizeFn` | `(state) => void` | 可选，状态可视化 |
| `random` | `RandomFn` | 可选，自定义随机数 |
| `silent` | `boolean` | 可选，静默模式 |

| TestCase 字段 | 类型 | 说明 |
|------|------|------|
| `name` | `string` | 测试名称 |
| `commands` | `Command[]` | 命令序列 |
| `expect` | `StateExpectation` | 预期结果 |
| `setup` | `(playerIds, random) => state` | 可选，单测自定义初始化 |
| `skip` | `boolean` | 可选，跳过 |

---

## 调试工具

### 测试模式（调试面板）

测试模式用于快速联机测试：执行一次行动后自动切换到另一位玩家视角。

- **入口**：调试面板（右下角工具按钮）→ `⚙️ 系统` 标签页
- **开启**：执行任意 move 后自动切换视角（P0 ⇄ P1）
- **状态**：持久化到本地存储（键：`debug_testMode`）
- **限制**：仅面向开发调试，主要适用于 2 人对局

### 调试测试

```bash
# 详细输出
npx vitest run <文件路径> --reporter=verbose

# 监听模式
npx vitest <文件路径>

# VS Code 调试器：在测试文件中设置断点，使用 "JavaScript Debug Terminal" 运行
```

---

## 持续集成

在 CI 环境中，建议：
1. 并行运行不同模块的测试
2. 缓存 node_modules 和测试结果
3. 失败时显示详细的错误信息

```yaml
# GitHub Actions 示例
- name: Run Core Tests
  run: npm run test:core
- name: Run Game Tests
  run: npm run test:games
- name: Run Server Tests
  run: npm run test:server
```

---

## 添加新游戏测试

游戏测试会自动包含在 `npm run test:games` 中。如需单独运行：

```json
{
  "scripts": {
    "test:newgame": "vitest run src/games/newgame"
  }
}
```

---

## 构建排除

测试文件不打包到生产环境：

```typescript
// vite.config.ts
build: {
  rollupOptions: {
    external: [/__tests__/]
  }
}
```
