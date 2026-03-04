# 工具链可靠性规范

> 确保项目在任何开发环境下都能正常工作

## 问题背景

在多人协作的项目中，不同开发者的环境配置可能不同：
- 有些开发者全局安装了 `tsx`、`vite` 等工具
- 有些开发者没有全局安装，只依赖 `node_modules/.bin`
- Windows 和 macOS/Linux 的 PATH 环境变量配置方式不同

如果 npm 脚本直接使用 `tsx server.ts`，会导致：
- ❌ 在没有全局安装 tsx 的环境下无法运行
- ❌ 在 PATH 未正确配置的环境下无法运行
- ❌ "在我机器上能跑"的问题

## 解决方案

### 核心原则

**所有 npm 脚本必须使用 `npx` 前缀调用 node_modules 中的工具**

```json
{
  "scripts": {
    "dev:api": "npx tsx apps/api/src/main.ts",     // ✅ 正确
    "dev:game": "nodemon",                          // ✅ 正确（nodemon.json 中使用 npx tsx）
    "i18n:check": "npx tsx scripts/verify/i18n-check.ts"  // ✅ 正确
  }
}
```

### 为什么使用 npx？

1. **环境无关**：`npx` 会自动查找 `node_modules/.bin` 中的工具，不依赖全局安装
2. **跨平台**：在 Windows、macOS、Linux 上行为一致
3. **版本一致**：使用项目锁定的版本，而非全局安装的版本
4. **商业化标准**：符合现代 Node.js 项目的最佳实践

## 已修复的文件

### 1. package.json

修改前：
```json
{
  "scripts": {
    "dev:api": "tsx apps/api/src/main.ts",           // ❌ 依赖全局安装
    "dev:un": "concurrently \"tsx server.ts\" ...",  // ❌ 依赖全局安装
    "i18n:check": "tsx scripts/verify/i18n-check.ts" // ❌ 依赖全局安装
  }
}
```

修改后：
```json
{
  "scripts": {
    "dev:api": "npx tsx apps/api/src/main.ts",           // ✅ 环境无关
    "dev:un": "concurrently \"npx tsx server.ts\" ...",  // ✅ 环境无关
    "i18n:check": "npx tsx scripts/verify/i18n-check.ts" // ✅ 环境无关
  }
}
```

### 2. nodemon.json

修改前：
```json
{
  "exec": "tsx server.ts"  // ❌ 依赖全局安装或 PATH
}
```

修改后：
```json
{
  "exec": "npx tsx server.ts"  // ✅ 环境无关
}
```

## 验证工具

运行以下命令验证工具链配置：

```bash
node .tmp/verify-toolchain-reliability.mjs
```

预期输出：
```
✅ 工具链配置符合商业化标准
✅ 所有脚本都能在任何环境下正常工作
✅ 不依赖全局安装或 PATH 环境变量
```

## 测试启动

运行以下命令测试 `npm run dev` 是否能正常启动：

```bash
node .tmp/test-dev-startup.mjs
```

预期输出：
```
✅ 游戏服务器启动成功 (18000)
✅ API 服务器启动成功 (18001)
✅ 前端服务器启动成功 (3000)
✅ 所有服务都成功启动！
```

## 规范要求

### 强制规范（AGENTS.md）

> **npm 脚本可靠性（强制）**：所有 `package.json` 中的脚本必须使用 `npx` 前缀调用 node_modules 中的工具（如 `npx tsx`、`npx vite`），确保在任何环境下都能正常工作。禁止依赖全局安装或 PATH 环境变量。

### 检查清单

新增或修改 npm 脚本时，必须检查：

- [ ] 是否使用了 `npx` 前缀？
- [ ] 是否依赖全局安装的工具？
- [ ] 是否依赖 PATH 环境变量？
- [ ] 在干净的环境下能否正常运行？

## 常见问题

### Q: 为什么不直接全局安装工具？

A: 全局安装会导致：
- 版本不一致（不同开发者可能安装了不同版本）
- 环境依赖（新加入的开发者需要手动安装）
- 难以维护（无法通过 package.json 锁定版本）

### Q: npx 会影响性能吗？

A: 不会。`npx` 只是一个查找工具的包装器，实际执行速度与直接调用相同。

### Q: 如果 node_modules 中没有工具怎么办？

A: `npx` 会自动提示安装。但正常情况下，运行 `npm install` 后所有工具都会安装到 `node_modules/.bin`。

## 相关文档

- [AGENTS.md](../AGENTS.md) - 工具链规范
- [automated-testing.md](./automated-testing.md) - 测试环境配置
- [e2e-safety-guide.md](./e2e-safety-guide.md) - E2E 测试安全指南

## 总结

通过统一使用 `npx` 前缀，我们确保了：

✅ 项目在任何环境下都能正常工作  
✅ 新加入的开发者无需额外配置  
✅ CI/CD 环境无需特殊处理  
✅ 符合现代 Node.js 项目的商业化标准  

这是一个简单但重要的改进，能够避免大量的"环境问题"和"在我机器上能跑"的困扰。
