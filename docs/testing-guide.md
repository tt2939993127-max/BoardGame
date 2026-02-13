# 测试指南

## 测试隔离与性能优化

项目采用测试隔离策略，将测试分为多个独立的模块，支持选择性运行和并行测试。

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

### 常用测试命令

```bash
# 运行所有测试（~46秒）
npm test

# 运行特定游戏的测试
npm run test:summonerwars    # Summoner Wars 测试
npm run test:smashup         # Smash Up 测试
npm run test:dicethrone      # Dice Throne 测试
npm run test:tictactoe       # Tic Tac Toe 测试

# 运行所有游戏测试
npm run test:games

# 运行核心框架测试
npm run test:core

# 运行服务端测试
npm run test:server
npm run test:api

# 运行 UGC 系统测试
npm run test:ugc

# 运行 E2E 测试
npm run test:e2e

# 监听模式（开发时使用）
npm run test:watch
```

### 开发工作流建议

1. **开发特定游戏时**：只运行该游戏的测试
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

### 性能优化建议

- **并行运行**：可以在不同终端窗口同时运行不同模块的测试
- **增量测试**：开发时只运行相关模块的测试，提交前再运行全量测试
- **CI/CD 优化**：在 CI 中可以并行运行不同模块的测试，缩短总时间

### 测试覆盖率

当前测试覆盖情况：
- ✅ Summoner Wars: 35 个测试文件，717 个测试用例，100% 通过
- ⚠️ Smash Up: 48 个测试文件，817 个测试用例，17 个失败（Prompt 系统迁移待完成）
- ✅ Dice Throne: 31 个测试文件，471 个测试用例，100% 通过
- ✅ Tic Tac Toe: 2 个测试文件，10 个测试用例，100% 通过

总体通过率：**99.4%** (2499/2513)

### 已知问题

1. **Smash Up Prompt 系统**：17 个测试失败，需要迁移到 InteractionSystem（技术债务）
2. **测试运行时间**：随着游戏数量增加，全量测试时间会继续增长，建议使用模块化测试

### 添加新游戏测试

当添加新游戏时，测试会自动包含在 `npm run test:games` 中。如需单独运行，可以添加新的脚本：

```json
{
  "scripts": {
    "test:newgame": "vitest run src/games/newgame"
  }
}
```

### 测试最佳实践

1. **测试文件命名**：`*.test.ts` 或 `*.test.tsx`
2. **测试文件位置**：`__tests__` 目录下
3. **测试描述**：使用中文描述测试用例
4. **测试隔离**：每个测试应该独立，不依赖其他测试的状态
5. **快照测试**：谨慎使用，优先使用断言
6. **异步测试**：使用 `async/await`，设置合理的超时时间

### 调试测试

```bash
# 运行单个测试文件并显示详细输出
npx vitest run src/games/summonerwars/__tests__/abilities.test.ts --reporter=verbose

# 监听模式下运行特定测试
npx vitest src/games/summonerwars/__tests__/abilities.test.ts

# 使用 VS Code 调试器
# 在测试文件中设置断点，然后使用 "JavaScript Debug Terminal" 运行测试
```

### 持续集成

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
