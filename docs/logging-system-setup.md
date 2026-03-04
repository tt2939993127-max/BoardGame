# 日志系统安装指南

## 快速安装

```bash
# 安装依赖
npm install winston winston-daily-rotate-file
npm install -D @types/winston

# 创建日志目录（可选，首次运行时会自动创建）
mkdir logs
```

## 验证安装

启动服务器后，检查日志文件是否生成：

```bash
# 启动服务器
npm run dev

# 检查日志目录
ls logs/

# 应该看到类似以下文件：
# app-2025-02-17.log
# error-2025-02-17.log
```

## 环境变量配置（可选）

在 `.env` 文件中添加以下配置：

```bash
# 日志目录（默认：./logs）
LOG_DIR=./logs

# 日志级别（默认：info）
# 可选值：error, warn, info, debug
LOG_LEVEL=info

# 环境（影响日志格式）
NODE_ENV=development
```

## 测试日志系统

创建测试脚本 `scripts/test-logging.mjs`：

```javascript
import logger, { gameLogger } from '../server/logger.js';

// 测试基础日志
logger.info('日志系统测试', { timestamp: Date.now() });
logger.warn('这是一个警告', { level: 'warn' });
logger.error('这是一个错误', { error: 'test error' });

// 测试游戏日志
gameLogger.matchCreated('test-match-123', 'dicethrone', ['player1', 'player2']);
gameLogger.commandExecuted('test-match-123', 'ROLL_DICE', 'player1', 45);
gameLogger.matchEnded('test-match-123', 'dicethrone', 'player1', 1200);

console.log('✅ 日志测试完成，请检查 logs/ 目录');
```

运行测试：

```bash
node scripts/test-logging.mjs
```

检查日志文件：

```bash
# 查看所有日志
cat logs/app-$(date +%Y-%m-%d).log

# 查看错误日志
cat logs/error-$(date +%Y-%m-%d).log
```

## 常见问题

### 1. 日志文件未生成

**原因**：日志目录权限不足或路径错误

**解决**：
```bash
# 检查目录权限
ls -la logs/

# 手动创建目录
mkdir -p logs
chmod 755 logs
```

### 2. 日志格式不正确

**原因**：`NODE_ENV` 环境变量未设置

**解决**：
```bash
# 开发环境
export NODE_ENV=development

# 生产环境
export NODE_ENV=production
```

### 3. 日志文件过大

**原因**：日志级别设置为 `debug`，产生大量日志

**解决**：
```bash
# 修改 .env 文件
LOG_LEVEL=info

# 或临时设置
export LOG_LEVEL=info
```

### 4. TypeScript 类型错误

**原因**：`@types/winston` 未安装

**解决**：
```bash
npm install -D @types/winston
```

## 生产环境部署

### Docker 部署

在 `docker-compose.yml` 中添加日志卷挂载：

```yaml
services:
  game-server:
    volumes:
      - ./logs:/app/logs
    environment:
      - LOG_DIR=/app/logs
      - LOG_LEVEL=info
      - NODE_ENV=production
```

### 日志轮转验证

等待 24 小时后，检查日志是否自动轮转：

```bash
ls -lh logs/

# 应该看到多个日期的日志文件：
# app-2025-02-17.log
# app-2025-02-18.log
# error-2025-02-17.log
# error-2025-02-18.log
```

### 日志清理验证

等待 30 天后，检查旧日志是否自动删除：

```bash
# 检查日志文件数量
ls logs/ | wc -l

# 普通日志应该只保留最近 30 天
# 错误日志应该只保留最近 90 天
```

## 集成到 CI/CD

在 GitHub Actions 中添加日志系统测试：

```yaml
# .github/workflows/test.yml
- name: Test Logging System
  run: |
    npm install
    node scripts/test-logging.mjs
    test -f logs/app-$(date +%Y-%m-%d).log
    test -f logs/error-$(date +%Y-%m-%d).log
```

## 下一步

- 阅读 [日志系统文档](./logging-system.md) 了解详细使用方法
- 查看 [AGENTS.md](../AGENTS.md) 了解日志规范
- 配置日志收集工具（可选）：Filebeat、Fluentd、CloudWatch Logs
