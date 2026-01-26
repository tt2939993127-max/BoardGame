# 自动化测试

项目使用三种测试框架：
- **Vitest** - 游戏领域层测试 + API 集成测试
- **Playwright** - 端到端 UI 测试
- **GameTestRunner** - 游戏领域层专用测试运行器

## 快速开始

```bash
# 运行所有 Vitest 测试（游戏 + API）
npm test

# 运行游戏测试
npm run test:game

# 运行井字棋测试
npm run test:tictactoe

# 运行王权骰铸测试
npm run test:dicethrone

# 运行 API 测试
npm run test:api

# Watch 模式（开发时推荐）
npm run test:watch

# 运行 E2E 测试（Playwright）
npm run test:e2e
```

## API 测试（NestJS）

### 使用 Docker / 本地 MongoDB

当你已经启动 MongoDB（例如 Docker）时，可以设置 `MONGO_URI` 让测试复用现有数据库，**避免下载内存 MongoDB 二进制**：

```bash
# PowerShell
$env:MONGO_URI="mongodb://localhost:27017/boardgame"
npm run test:api
```

> 说明：若未设置 `MONGO_URI`，测试会使用 `mongodb-memory-server` 自动下载并启动临时 MongoDB。

## E2E 测试（Playwright）

端到端测试使用 Playwright，测试文件位于 `e2e/` 目录。

```bash
# 运行 E2E 测试
npm run test:e2e
```

### 编写 E2E 测试

```typescript
import { test, expect } from '@playwright/test';

test('Homepage Check', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Board Game' })).toBeVisible();
});
```

### Mock API 响应

```typescript
test.beforeEach(async ({ page }) => {
    await page.route('**/auth/me', async route => {
        await route.fulfill({ json: { user: mockUser } });
    });
});
```

## 目录结构

```
/
├── e2e/                          # Playwright E2E 测试
│   ├── navbar.test.ts           # 导航栏测试
│   └── social.test.ts           # 社交功能测试
├── apps/
│   └── api/
│       └── test/                 # API 集成测试
│           ├── vitest.setup.ts  # Vitest 启动配置
│           ├── auth.e2e-spec.ts # 认证 API 测试
│           └── social.e2e-spec.ts # 社交 API 测试
├── src/
│   ├── engine/
│   │   └── testing/
│   │       └── index.ts         # GameTestRunner 通用测试运行器
│   └── games/
│       ├── tictactoe/
│       │   └── __tests__/
│       │       └── flow.test.ts # 井字棋流程测试
│       └── dicethrone/
│           └── __tests__/
│               └── flow.test.ts # 王权骰铸流程测试
└── vitest.config.ts              # Vitest 全局配置
```

测试文件放在游戏目录的 `__tests__` 文件夹下，便于：
- 游戏自包含
- UGC 作者可为自己的游戏编写测试
- 导入路径简短

## 编写测试

### 王权骰铸测试注意事项

#### 骰面映射
僧侣骰子的值与符号映射（定义在 `monk/diceConfig.ts`）：
- 1, 2 → fist（拳）
- 3 → palm（掌）
- 4, 5 → taiji（太极）
- 6 → lotus（莲花）

编写骰子序列时务必参照此映射。

#### 初始手牌
使用 `fixedRandom`（无洗牌）时，初始手牌为 `MONK_CARDS` 的前 4 张：
- index 0: `card-enlightenment`（main，0 CP）
- index 1: `card-inner-peace`（instant，0 CP）
- index 2: `card-deep-thought`（instant，3 CP）
- index 3: `card-buddha-light`（main，3 CP）

需要其他卡牌时，使用 `DRAW_CARD` 命令从牌库抽取。

#### 响应窗口
`GameTestRunner` 为纯领域层测试，不处理系统层的响应窗口钩子。当玩家持有 CP 足够的 instant 卡时，攻击结算会触发 `RESPONSE_WINDOW_OPENED` 事件。

若测试需要避免响应窗口干扰，可在攻击前卖掉所有 instant 卡。

### 1. 定义断言类型

```typescript
interface MyGameExpectation extends StateExpectation {
    winner?: string;
    score?: number;
    // ... 游戏特定字段
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
        expect: {
            winner: '0',
        },
    },
    {
        name: '错误测试 - 非法操作',
        commands: [
            { type: 'INVALID_MOVE', playerId: '0', payload: {} },
        ],
        expect: {
            errorAtStep: { step: 1, error: 'invalidMove' },
        },
    },
];
```

### 4. 运行测试

```typescript
const runner = new GameTestRunner({
    domain: MyGameDomain,
    playerIds: ['0', '1'],
    // 如果 Domain.setup 需要 RandomFn，可传入 setup
    setup: (playerIds, random) => MyGameDomain.setup(playerIds, random),
    assertFn: assertMyGame,
    visualizeFn: (state) => console.log(state), // 可选
});

runner.runAll(testCases);
```

## API 参考

### GameTestRunner

| 配置项 | 类型 | 说明 |
|--------|------|------|
| `domain` | `DomainCore` | 游戏领域内核 |
| `playerIds` | `string[]` | 玩家列表 |
| `setup` | `(playerIds, random) => state` | 可选，自定义初始化（用于需要 RandomFn 的 setup） |
| `assertFn` | `(state, expect) => string[]` | 断言函数，返回错误列表 |
| `visualizeFn` | `(state) => void` | 可选，状态可视化 |
| `random` | `RandomFn` | 可选，自定义随机数生成器 |
| `silent` | `boolean` | 可选，静默模式 |

### TestCase

| 字段 | 类型 | 说明 |
|------|------|------|
| `name` | `string` | 测试名称 |
| `commands` | `Command[]` | 命令序列 |
| `expect` | `StateExpectation` | 预期结果 |
| `skip` | `boolean` | 可选，跳过此测试 |

### StateExpectation

| 字段 | 类型 | 说明 |
|------|------|------|
| `errorAtStep` | `{ step, error }` | 预期某步出现的错误 |

## 构建排除

测试文件不应打包到生产环境，在 vite.config.ts 中配置：

```typescript
build: {
  rollupOptions: {
    external: [/__tests__/]
  }
}
```
