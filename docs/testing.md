# 测试文档

## 目录

- [快速开始](#快速开始)
- [测试隔离与性能](#测试隔离与性能)
- [测试框架](#测试框架)
- [E2E 测试](#e2e-测试)
- [GameTestRunner](#gametestrunner)
- [测试策略](#测试策略)
- [调试工具](#调试工具)

---

## 快速开始

### 常用命令

```bash
# 运行所有测试（~46秒）
npm test

# 运行特定游戏的测试（推荐开发时使用）
npm run test:summonerwars    # Summoner Wars (~6秒)
npm run test:smashup         # Smash Up (~8秒)
npm run test:dicethrone      # Dice Throne (~12秒)
npm run test:tictactoe       # Tic Tac Toe (<1秒)

# 运行核心框架测试
npm run test:core            # 引擎、组件、工具库 (~5秒)

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

### 开发工作流建议

1. **开发特定游戏时**：只运行该游戏的测试（6-12秒）
   ```bash
   npm run test:summonerwars
   ```

2. **修改核心框架时**：先运行核心测试，再运行游戏测试
   ```bash
   npm run test:core
   npm run test:games
   ```

3. **提交前**：运行所有测试
   ```bash
   npm test
   ```

4. **调试单个测试文件**：
   ```bash
   npx vitest run src/games/summonerwars/__tests__/abilities.test.ts
   ```

---

## 测试隔离与性能

项目采用**测试隔离策略**，将测试分为多个独立模块，支持选择性运行和并行测试。

### 测试模块划分

| 模块 | 测试文件数 | 测试用例数 | 运行时间 | 命令 |
|------|-----------|-----------|---------|------|
| Summoner Wars | 35 | ~717 | ~6s | `npm run test:summonerwars` |
| Smash Up | 48 | ~817 | ~8s | `npm run test:smashup` |
| Dice Throne | 31 | ~471 | ~12s | `npm run test:dicethrone` |
| Tic Tac Toe | 2 | ~10 | <1s | `npm run test:tictactoe` |
| 核心框架 | ~30 | ~300 | ~5s | `npm run test:core` |
| 服务端 | ~10 | ~50 | ~3s | `npm run test:server` |
| UGC 系统 | ~15 | ~100 | ~3s | `npm run test:ugc` |
| **总计** | **193** | **2513** | **~46s** | `npm test` |

### 性能优化

- **增量测试**：开发时只运行相关模块的测试，提交前再运行全量测试
- **并行运行**：可以在不同终端窗口同时运行不同模块的测试
- **CI/CD 优化**：在 CI 中可以并行运行不同模块的测试，缩短总时间

### 测试覆盖率

当前测试覆盖情况：
- ✅ Summoner Wars: 35 个测试文件，717 个测试用例，100% 通过
- ⚠️ Smash Up: 48 个测试文件，817 个测试用例，17 个失败（Prompt 系统迁移待完成）
- ✅ Dice Throne: 31 个测试文件，471 个测试用例，100% 通过
- ✅ Tic Tac Toe: 2 个测试文件，10 个测试用例，100% 通过

**总体通过率：99.4%** (2499/2513)

### 何时运行全量测试

满足任一条件就扩大范围：
- 修改 `src/engine/`（含 `primitives/` 与 `systems/`）、`src/core/`、`src/components/game/framework/`
- 涉及多人联机、状态同步、Undo/Rematch/Prompt 等系统性行为
- 涉及公共类型/协议
- 提交前/合并前

---

## 测试框架

项目使用三种测试框架：

### 1. Vitest - 单元测试与集成测试

用于游戏领域层测试、引擎系统测试、API 集成测试。

**目录结构**：
```
src/
├── engine/testing/           # GameTestRunner
├── games/<gameId>/__tests__/ # 游戏领域测试
├── core/**/__tests__/        # 核心框架测试
├── components/**/__tests__/  # 组件测试
└── lib/**/__tests__/         # 工具库测试
```

**过滤运行**：
```bash
npm test -- audio.config                        # 匹配文件名/路径
npm test -- src/ugc/builder                     # 匹配目录
npm test -- src/games/tictactoe/__tests__       # 游戏测试目录
npm test -- src/games/tictactoe/__tests__/flow.test.ts  # 单文件
```

### 2. Playwright - E2E 测试

用于端到端 UI 测试，测试文件位于 `e2e/` 目录。

### 3. GameTestRunner - 游戏领域专用测试

游戏领域层专用测试运行器，输入命令序列 → 执行 pipeline → 断言最终状态。

---

## E2E 测试

### 测试覆盖原则

**硬性要求**：E2E 必须覆盖"交互面"而不只是"完整流程"。

- **交互覆盖**：对用户可见且可操作的关键交互点，逐一验证：
  - 能否触达（入口/按钮/快捷入口/菜单/路由）
  - 能否操作（点击/输入/拖拽/切换 Tab/确认取消/关闭弹窗）
  - 操作后的 UI 反馈（状态变化、禁用态、提示文案、Loading、错误提示）
  - 数据/状态副作用（如加入房间、发送消息、发起重赛投票、退出房间）
- **流程覆盖**：对"从入口到结束/返回"的主路径至少保留 1 条 happy path 作为回归基线。

### 本地模式 vs 在线对局

**大多数游戏不支持本地同屏**。`/play/<gameId>/local` 仅用于调试，不代表真实多人流程。

| 场景 | 做法 |
|------|------|
| 真实多人流程 | 使用 host/guest 两个浏览器上下文：创建房间 → guest `?join=true` 加入 → 覆盖关键交互点 |
| 交互回归 | 按"交互覆盖清单"逐条验证（按钮/弹窗/Tab/关键面板） |
| 冒烟测试 | 验证页面加载 + 关键元素出现 |
| 调试/静态渲染 | 可用 `/play/<gameId>/local`，但不能替代多人流程 |

### 编写 E2E 测试

```typescript
import { test, expect } from '@playwright/test';

test('Homepage Check', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Board Game' })).toBeVisible();
});
```

### 截图与附件管理（强制）

所有手动触发的截图必须使用 `testInfo.outputPath()`：

```typescript
test('Match started', async ({ page }, testInfo) => {
    // ... 操作
    await page.screenshot({ path: testInfo.outputPath('game-started.png') });
});
```

**规范**：
1. 使用 `testInfo.outputPath('filename.png')` 生成存放路径
2. 禁止硬编码路径（如 `e2e/screenshots/...`）
3. `test-results/` 目录已被 git 忽略，测试产物不应提交
4. 按需截图，默认配置已开启 `screenshot: 'only-on-failure'`

### 多客户端测试（Multi-Player E2E）

**适用场景**：需要模拟真实多玩家交互的测试。

**使用通用辅助工具**：

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
    const player2 = multiPlayer.getPlayer('1');
    const player3 = multiPlayer.getPlayer('2');

    await multiPlayer.waitForAllPlayersReady();

    // 执行测试逻辑...
  } finally {
    await multiPlayer.cleanup();
  }
});
```

**关键要点**：
1. 每个玩家必须使用独立的 `BrowserContext`
2. 每个玩家需要独立获取和存储 credentials
3. 根据游戏状态动态选择对应的客户端发送命令
4. 测试结束后必须关闭所有上下文

**示例参考**：
- `e2e/ugc-preview.e2e.ts` - UGC 斗地主多客户端测试
- `e2e/helpers/multiPlayer.ts` - 通用多客户端测试辅助工具

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
- `e2e/dicethrone.e2e.ts` - 线上房间手牌校验 + 教程完整流程
- `e2e/dicethrone-moon-elf.e2e.ts` - 月精灵基础攻击 + Targeted 伤害结算
- `e2e/dicethrone-shadow-thief.e2e.ts` - 暗影刺客基础攻击 + Sneak 免伤

---

## GameTestRunner

游戏领域层专用测试运行器，用于测试游戏逻辑。

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
            { type: 'ATTACK', playerId: '1', payload: { ... } },
        ],
        expect: { winner: '0' },
    },
    {
        name: '错误测试 - 非法操作',
        commands: [{ type: 'INVALID_MOVE', playerId: '0', payload: {} }],
        expect: { errorAtStep: { step: 1, error: 'invalidMove' } },
    },
];
```

### 4. 运行测试

```typescript
const runner = new GameTestRunner({
    domain: MyGameDomain,
    playerIds: ['0', '1'],
    setup: (playerIds, random) => MyGameDomain.setup(playerIds, random),
    assertFn: assertMyGame,
    visualizeFn: (state) => console.log(state),
});

runner.runAll(testCases);
```

### API 参考

**GameTestRunner 配置**：

| 配置项 | 类型 | 说明 |
|--------|------|------|
| `domain` | `DomainCore` | 游戏领域内核 |
| `playerIds` | `string[]` | 玩家列表 |
| `setup` | `(playerIds, random) => state` | 可选，自定义初始化 |
| `assertFn` | `(state, expect) => string[]` | 断言函数 |
| `visualizeFn` | `(state) => void` | 可选，状态可视化 |
| `random` | `RandomFn` | 可选，自定义随机数 |
| `silent` | `boolean` | 可选，静默模式 |

**TestCase**：

| 字段 | 类型 | 说明 |
|------|------|------|
| `name` | `string` | 测试名称 |
| `commands` | `Command[]` | 命令序列 |
| `expect` | `StateExpectation` | 预期结果 |
| `skip` | `boolean` | 可选，跳过 |

---

## 测试策略

### 测试覆盖要求

**集成测试必须覆盖所有情况**：

| 类别 | 覆盖点 |
|------|--------|
| 基础流程 | 初始状态、状态流转、正常结束 |
| 核心机制 | 触发条件、实际效果、状态变更、资源获取/消耗 |
| 数据驱动 | 效果与描述完全一致、状态变化、副作用正确性 |
| 升级系统 | 逐级升级、跳级拒绝、费用计算、最高级处理 |
| 错误处理 | 非法操作拒绝、前置条件拒绝、错误码正确性 |
| 边界条件 | 数值上下限、特殊触发、并发/竞态 |
| E2E | 入口 → 关键交互 → 完成/退出；教程需验证 AI 回合 |

### 精简策略（同类覆盖保留）

目标：减少低价值用例数量，保持每个"交互类别/能力类别"至少 1 条代表性用例。

**为什么需要精简**：
- **运行成本**：用例越多，CI/本地运行时间越长，反馈变慢
- **稳定性成本**：同类用例越多，受到波动/偶发失败影响的概率越高
- **维护成本**：UI/文案/流程调整会同时破坏大量重复用例
- **噪声成本**：大量相似失败会掩盖真正的高价值回归

**低价值用例判定（可删除/合并）**：
- 只验证"出现/可见"的静态用例，且在其它测试中已有同一路径的功能性操作
- 与"创建/更新/删除/保存"同类行为重复，仅验证列表/计数/标题等弱断言
- 同一个交互链条被拆成多个短用例，但没有新增失败分支或独立状态变化
- 仅为截图存在的用例（无断言或无状态变化）

**必须保留的同类覆盖（最少 1 条）**：
- 入口可达 + 关键操作 + 结果验证（例如：创建→保存→刷新恢复）
- 关键交互面（Modal/Tab/表单校验/多步骤选择）每类至少 1 条
- 负向或边界至少 1 条（如未登录/非法操作被拒绝）

**精简建议做法**：
1. 将同类的"打开/可见"断言并入功能性用例的前置步骤
2. 对同一功能域，保留"功能链闭环"的单条用例（含核心断言）
3. UI 交互链条尽量在一条用例内完成，避免重复 setup

### 测试命名规范

- 正向测试：描述预期行为（`"成功创建用户"`）
- 错误测试：标注错误码（`"无权限操作 - unauthorized"`）

### 测试最佳实践

1. **测试文件命名**：`*.test.ts` 或 `*.test.tsx`
2. **测试文件位置**：`__tests__` 目录下
3. **测试描述**：使用中文描述测试用例
4. **测试隔离**：每个测试应该独立，不依赖其他测试的状态
5. **快照测试**：谨慎使用，优先使用断言
6. **异步测试**：使用 `async/await`，设置合理的超时时间

---

## 调试工具

### 测试模式（调试面板）

测试模式用于**快速联机测试**：执行一次行动后自动切换到另一位玩家视角。

**入口**：
- 调试面板（右下角工具按钮）
- `⚙️ 系统` 标签页中的测试模式开关

**行为**：
- **开启**：执行任意 move 后自动切换视角（P0 ⇄ P1）
- **关闭**：视角保持不变，可手动切换

**状态**：
- 开关状态会持久化到本地存储（键：`debug_testMode`）

**限制**：
- 仅面向开发调试使用
- 主要适用于 2 人对局

### 调试测试

```bash
# 运行单个测试文件并显示详细输出
npx vitest run src/games/summonerwars/__tests__/abilities.test.ts --reporter=verbose

# 监听模式下运行特定测试
npx vitest src/games/summonerwars/__tests__/abilities.test.ts

# 使用 VS Code 调试器
# 在测试文件中设置断点，然后使用 "JavaScript Debug Terminal" 运行测试
```

---

## API 测试

### NestJS API 测试

可设置 `MONGO_URI` 复用 Docker MongoDB，避免下载内存 MongoDB 二进制：

```bash
# PowerShell
$env:MONGO_URI="mongodb://localhost:27017/boardgame_test"
npm run test:api
```

> 未设置时使用 `mongodb-memory-server` 自动启动临时 MongoDB。

---

## 持续集成

在 CI 环境中，建议：
1. 并行运行不同模块的测试
2. 缓存 node_modules 和测试结果
3. 失败时显示详细的错误信息
4. 生成测试覆盖率报告

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

当添加新游戏时，测试会自动包含在 `npm run test:games` 中。如需单独运行，可以添加新的脚本：

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
