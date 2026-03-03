#!/usr/bin/env node
/**
 * Kiro 自动恢复脚本
 * 
 * 功能：
 * - 监控 Kiro 执行状态（通过日志文件）
 * - 检测网络中断或执行停滞
 * - 自动创建恢复标记，触发 Hook 继续任务
 * - 支持多窗口/多会话
 * 
 * 使用方法：
 *   node scripts/kiro-auto-resume.mjs
 *   node scripts/kiro-auto-resume.mjs --interval 30 --timeout 120
 */

import { readFileSync, existsSync, statSync, writeFileSync, readdirSync, unlinkSync } from 'fs';
import { join } from 'path';

// ==================== 配置 ====================
const CONFIG = {
  // 检查间隔（秒）
  checkInterval: parseInt(process.argv.find(arg => arg.startsWith('--interval='))?.split('=')[1]) || 30,
  // 无活动超时时间（秒）
  inactivityTimeout: parseInt(process.argv.find(arg => arg.startsWith('--timeout='))?.split('=')[1]) || 120,
  // 日志目录
  logDir: 'logs',
  // 恢复标记文件前缀
  resumeFlagPrefix: '.kiro-resume-',
  // 恢复计数文件前缀
  resumeCountPrefix: '.kiro-resume-count-',
  // 是否启用调试日志
  debug: process.argv.includes('--debug'),
  // 是否自动同意命令（跳过确认）
  autoApprove: process.argv.includes('--auto-approve'),
  // 最大自动恢复次数（0 = 无限制）
  maxRetries: parseInt(process.argv.find(arg => arg.startsWith('--max-retries='))?.split('=')[1]) || 0,
};

// ==================== 会话状态管理 ====================
class SessionMonitor {
  constructor(sessionId, logFile) {
    this.sessionId = sessionId;
    this.logFile = logFile;
    this.lastLogSize = 0;
    this.lastActivityTime = Date.now();
    this.isSpecRunning = false;
    this.lastCheckTime = Date.now();
    this.resumeCount = this.loadResumeCount();
  }

  /**
   * 加载恢复计数
   */
  loadResumeCount() {
    const countFile = `${CONFIG.resumeCountPrefix}${this.sessionId}`;
    if (!existsSync(countFile)) {
      return 0;
    }
    
    try {
      const data = JSON.parse(readFileSync(countFile, 'utf-8'));
      return data.count || 0;
    } catch (err) {
      console.error(`❌ 读取恢复计数失败 [${this.sessionId}]:`, err.message);
      return 0;
    }
  }

  /**
   * 保存恢复计数
   */
  saveResumeCount(count) {
    const countFile = `${CONFIG.resumeCountPrefix}${this.sessionId}`;
    try {
      writeFileSync(countFile, JSON.stringify({
        count,
        lastResumeTime: Date.now(),
        sessionId: this.sessionId,
      }, null, 2));
      this.resumeCount = count;
    } catch (err) {
      console.error(`❌ 保存恢复计数失败 [${this.sessionId}]:`, err.message);
    }
  }

  /**
   * 重置恢复计数
   */
  resetResumeCount() {
    const countFile = `${CONFIG.resumeCountPrefix}${this.sessionId}`;
    try {
      if (existsSync(countFile)) {
        unlinkSync(countFile);
      }
      this.resumeCount = 0;
      this.debug('恢复计数已重置');
    } catch (err) {
      console.error(`❌ 重置恢复计数失败 [${this.sessionId}]:`, err.message);
    }
  }

  /**
   * 检查日志文件是否有新内容
   */
  checkActivity() {
    if (!existsSync(this.logFile)) {
      this.debug(`日志文件不存在: ${this.logFile}`);
      return false;
    }

    try {
      const stats = statSync(this.logFile);
      const currentSize = stats.size;

      if (currentSize > this.lastLogSize) {
        this.lastLogSize = currentSize;
        this.lastActivityTime = Date.now();
        
        // 检测到活动后，检查是否应该重置计数
        // 如果距离上次恢复超过 5 分钟，说明任务可能已经正常完成
        const timeSinceLastResume = Date.now() - (this.lastResumeTime || 0);
        if (this.resumeCount > 0 && timeSinceLastResume > 5 * 60 * 1000) {
          this.debug('检测到持续活动，重置恢复计数');
          this.saveResumeCount(0);
        }
        
        this.debug(`检测到活动 (大小: ${currentSize} bytes)`);
        return true;
      }

      return false;
    } catch (err) {
      console.error(`❌ 读取日志文件失败 [${this.sessionId}]:`, err.message);
      return false;
    }
  }

  /**
   * 检查是否有 Spec 正在执行
   */
  checkSpecStatus() {
    if (!existsSync(this.logFile)) return false;

    try {
      const logContent = readFileSync(this.logFile, 'utf-8');
      const lines = logContent.split('\n').slice(-100); // 最后100行

      // 查找 Spec 执行标记
      const specKeywords = [
        'spec',
        'task',
        'executing',
        'started',
        'in progress',
        'processing',
      ];

      const endKeywords = [
        'completed',
        'finished',
        'done',
        'success',
        'failed',
        'error',
      ];

      let hasSpecActivity = false;
      let hasSpecEnd = false;

      for (const line of lines) {
        const lowerLine = line.toLowerCase();
        
        if (specKeywords.some(kw => lowerLine.includes(kw))) {
          hasSpecActivity = true;
        }
        
        if (endKeywords.some(kw => lowerLine.includes(kw))) {
          hasSpecEnd = true;
        }
      }

      const wasRunning = this.isSpecRunning;
      this.isSpecRunning = hasSpecActivity && !hasSpecEnd;

      if (this.isSpecRunning !== wasRunning) {
        console.log(`📝 [${this.sessionId}] Spec 状态变化: ${this.isSpecRunning ? '执行中' : '已停止'}`);
      }

      return this.isSpecRunning;
    } catch (err) {
      console.error(`❌ 检查 Spec 状态失败 [${this.sessionId}]:`, err.message);
      return false;
    }
  }

  /**
   * 检测是否需要恢复
   */
  shouldResume() {
    const now = Date.now();
    const inactiveTime = now - this.lastActivityTime;
    const isInactive = inactiveTime > CONFIG.inactivityTimeout * 1000;

    if (this.isSpecRunning && isInactive) {
      // 检查是否超过最大重试次数
      if (CONFIG.maxRetries > 0 && this.resumeCount >= CONFIG.maxRetries) {
        console.log(`⛔ [${this.sessionId}] 已达到最大恢复次数 (${CONFIG.maxRetries})，停止自动恢复`);
        this.isSpecRunning = false; // 停止监控此会话
        return false;
      }
      
      const inactiveSec = Math.floor(inactiveTime / 1000);
      console.log(`⚠️  [${this.sessionId}] 检测到执行中断（无活动 ${inactiveSec}秒）`);
      
      if (CONFIG.maxRetries > 0) {
        console.log(`🔢 [${this.sessionId}] 恢复次数: ${this.resumeCount + 1}/${CONFIG.maxRetries}`);
      } else {
        console.log(`🔢 [${this.sessionId}] 恢复次数: ${this.resumeCount + 1} (无限制)`);
      }
      
      return true;
    }

    return false;
  }

  /**
   * 发送恢复指令
   */
  sendResumeCommand() {
    const flagFile = `${CONFIG.resumeFlagPrefix}${this.sessionId}`;
    const timestamp = Date.now();
    
    try {
      // 增加恢复计数
      const newCount = this.resumeCount + 1;
      this.saveResumeCount(newCount);
      this.lastResumeTime = timestamp;
      
      writeFileSync(flagFile, JSON.stringify({
        timestamp,
        sessionId: this.sessionId,
        reason: 'inactivity_timeout',
        inactiveSeconds: Math.floor((timestamp - this.lastActivityTime) / 1000),
        autoApprove: CONFIG.autoApprove,
        resumeCount: newCount,
        maxRetries: CONFIG.maxRetries,
      }, null, 2));
      
      console.log(`🔄 [${this.sessionId}] 已创建恢复标记: ${flagFile}`);
      if (CONFIG.autoApprove) {
        console.log(`✅ [${this.sessionId}] 自动同意模式已启用`);
      }
      if (CONFIG.maxRetries > 0) {
        console.log(`📊 [${this.sessionId}] 剩余恢复次数: ${CONFIG.maxRetries - newCount}`);
      }
      
      // 重置状态，避免重复触发
      this.lastActivityTime = Date.now();
      this.isSpecRunning = false;
      
      return true;
    } catch (err) {
      console.error(`❌ 创建恢复标记失败 [${this.sessionId}]:`, err.message);
      return false;
    }
  }

  /**
   * 调试日志
   */
  debug(message) {
    if (CONFIG.debug) {
      console.log(`🐛 [${this.sessionId}] ${message}`);
    }
  }

  /**
   * 执行一次检查
   */
  check() {
    this.lastCheckTime = Date.now();
    
    const hasActivity = this.checkActivity();
    const isRunning = this.checkSpecStatus();

    if (hasActivity && CONFIG.debug) {
      console.log(`✓ [${this.sessionId}] 活动检测 (${new Date().toLocaleTimeString()})`);
    }

    if (this.shouldResume()) {
      this.sendResumeCommand();
    }
  }
}

// ==================== 多会话管理器 ====================
class MultiSessionManager {
  constructor() {
    this.sessions = new Map();
  }

  /**
   * 扫描日志目录，发现所有会话
   */
  discoverSessions() {
    if (!existsSync(CONFIG.logDir)) {
      console.log(`⚠️  日志目录不存在: ${CONFIG.logDir}`);
      return;
    }

    try {
      const files = readdirSync(CONFIG.logDir);
      const logFiles = files.filter(f => f.startsWith('app-') && f.endsWith('.log'));

      for (const logFile of logFiles) {
        const fullPath = join(CONFIG.logDir, logFile);
        const sessionId = logFile.replace('app-', '').replace('.log', '');

        if (!this.sessions.has(sessionId)) {
          console.log(`🆕 发现新会话: ${sessionId}`);
          this.sessions.set(sessionId, new SessionMonitor(sessionId, fullPath));
        }
      }

      // 清理不存在的会话
      for (const [sessionId, monitor] of this.sessions.entries()) {
        if (!existsSync(monitor.logFile)) {
          console.log(`🗑️  移除已关闭的会话: ${sessionId}`);
          this.sessions.delete(sessionId);
        }
      }
    } catch (err) {
      console.error('❌ 扫描日志目录失败:', err.message);
    }
  }

  /**
   * 检查所有会话
   */
  checkAll() {
    if (this.sessions.size === 0) {
      if (CONFIG.debug) {
        console.log('⏳ 等待会话...');
      }
      return;
    }

    for (const monitor of this.sessions.values()) {
      monitor.check();
    }
  }

  /**
   * 获取状态摘要
   */
  getStatus() {
    const total = this.sessions.size;
    const running = Array.from(this.sessions.values()).filter(m => m.isSpecRunning).length;
    return { total, running };
  }
}

// ==================== 主程序 ====================
function printBanner() {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║   Kiro 自动恢复监控脚本 v1.0.0            ║');
  console.log('╚════════════════════════════════════════════╝');
  console.log('');
  console.log(`📊 检查间隔: ${CONFIG.checkInterval}秒`);
  console.log(`⏱️  超时阈值: ${CONFIG.inactivityTimeout}秒`);
  console.log(`📁 日志目录: ${CONFIG.logDir}`);
  console.log(`🐛 调试模式: ${CONFIG.debug ? '开启' : '关闭'}`);
  console.log(`✅ 自动同意: ${CONFIG.autoApprove ? '开启' : '关闭'}`);
  console.log(`🔢 最大重试: ${CONFIG.maxRetries > 0 ? `${CONFIG.maxRetries}次` : '无限制'}`);
  console.log('');
  console.log('💡 提示: 按 Ctrl+C 停止监控');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
}

function printHelp() {
  console.log('使用方法:');
  console.log('  node scripts/kiro-auto-resume.mjs [选项]');
  console.log('');
  console.log('选项:');
  console.log('  --interval=<秒>      检查间隔（默认: 30）');
  console.log('  --timeout=<秒>       超时阈值（默认: 120）');
  console.log('  --max-retries=<次数> 最大自动恢复次数（默认: 0 = 无限制）');
  console.log('  --debug              启用调试日志');
  console.log('  --auto-approve       自动同意所有命令（跳过确认）');
  console.log('  --help               显示帮助信息');
  console.log('');
  console.log('示例:');
  console.log('  node scripts/kiro-auto-resume.mjs --interval=20 --timeout=90');
  console.log('  node scripts/kiro-auto-resume.mjs --debug');
  console.log('  node scripts/kiro-auto-resume.mjs --auto-approve');
  console.log('  node scripts/kiro-auto-resume.mjs --max-retries=3');
  console.log('  node scripts/kiro-auto-resume.mjs --debug --auto-approve --max-retries=5');
}

async function main() {
  if (process.argv.includes('--help')) {
    printHelp();
    process.exit(0);
  }

  printBanner();

  const manager = new MultiSessionManager();

  // 初始扫描
  manager.discoverSessions();

  // 定期扫描新会话（每分钟）
  setInterval(() => {
    manager.discoverSessions();
  }, 60 * 1000);

  // 定期检查所有会话
  setInterval(() => {
    manager.checkAll();
    
    // 每5分钟输出一次状态摘要
    const now = Date.now();
    if (!main.lastStatusTime || now - main.lastStatusTime > 5 * 60 * 1000) {
      const status = manager.getStatus();
      console.log(`📊 状态摘要: ${status.total} 个会话，${status.running} 个正在执行`);
      main.lastStatusTime = now;
    }
  }, CONFIG.checkInterval * 1000);

  // 优雅退出
  process.on('SIGINT', () => {
    console.log('');
    console.log('👋 监控已停止');
    process.exit(0);
  });

  console.log('🚀 监控已启动，等待会话...');
}

main().catch(err => {
  console.error('❌ 程序异常:', err);
  process.exit(1);
});
