#!/usr/bin/env node
/**
 * Kiro 进程监控脚本（真正的自动化版本）
 * 
 * 功能：
 * - 监控 Kiro 窗口的最后活动时间
 * - 检测到长时间无响应时自动创建恢复标记
 * - 支持重试次数限制
 * - 真正的无人值守
 * 
 * 工作原理：
 * - 通过检查恢复标记文件的修改时间来判断 Kiro 是否还在活动
 * - 如果标记文件长时间未被删除，说明 Kiro 可能中断了
 * 
 * 使用方法：
 *   node scripts/kiro-process-monitor.mjs --max-retries=20
 */

import { writeFileSync, readFileSync, existsSync, unlinkSync, statSync } from 'fs';

// ==================== 配置 ====================
const CONFIG = {
  // 检查间隔（秒）
  checkInterval: parseInt(process.argv.find(arg => arg.startsWith('--interval='))?.split('=')[1]) || 30,
  // 无活动超时时间（秒）- 如果恢复标记文件存在超过这个时间，说明 Kiro 没有处理
  inactivityTimeout: parseInt(process.argv.find(arg => arg.startsWith('--timeout='))?.split('=')[1]) || 120,
  // 最大自动恢复次数（0 = 无限制）
  maxRetries: parseInt(process.argv.find(arg => arg.startsWith('--max-retries='))?.split('=')[1]) || 20,
  // 是否启用调试日志
  debug: process.argv.includes('--debug'),
  // 恢复标记文件前缀
  resumeFlagPrefix: '.kiro-resume-auto-',
  // 计数文件
  countFile: '.kiro-resume-count-auto',
  // 心跳文件（Kiro 应该定期更新这个文件）
  heartbeatFile: '.kiro-heartbeat',
};

// ==================== 状态管理 ====================
let resumeCount = 0;
let lastResumeTime = 0;
let sessionId = Date.now().toString();

/**
 * 加载恢复计数
 */
function loadResumeCount() {
  if (!existsSync(CONFIG.countFile)) {
    return 0;
  }
  
  try {
    const data = JSON.parse(readFileSync(CONFIG.countFile, 'utf-8'));
    return data.count || 0;
  } catch (err) {
    console.error('❌ 读取恢复计数失败:', err.message);
    return 0;
  }
}

/**
 * 保存恢复计数
 */
function saveResumeCount(count) {
  try {
    writeFileSync(CONFIG.countFile, JSON.stringify({
      count,
      lastResumeTime: Date.now(),
      sessionId,
    }, null, 2));
    resumeCount = count;
  } catch (err) {
    console.error('❌ 保存恢复计数失败:', err.message);
  }
}

/**
 * 检查是否有未处理的恢复标记
 */
function hasUnprocessedFlag() {
  const flagFile = `${CONFIG.resumeFlagPrefix}${sessionId}`;
  
  if (!existsSync(flagFile)) {
    return false;
  }
  
  try {
    const stats = statSync(flagFile);
    const age = Date.now() - stats.mtimeMs;
    
    // 如果标记文件存在超过超时时间，说明 Kiro 没有处理
    if (age > CONFIG.inactivityTimeout * 1000) {
      if (CONFIG.debug) {
        console.log(`🐛 发现未处理的恢复标记（已存在 ${Math.floor(age / 1000)}秒）`);
      }
      return true;
    }
  } catch (err) {
    console.error('❌ 检查恢复标记失败:', err.message);
  }
  
  return false;
}

/**
 * 检查心跳文件
 */
function checkHeartbeat() {
  if (!existsSync(CONFIG.heartbeatFile)) {
    // 心跳文件不存在，可能是首次运行
    if (CONFIG.debug) {
      console.log('🐛 心跳文件不存在，创建新的心跳文件');
    }
    updateHeartbeat();
    return true;
  }
  
  try {
    const stats = statSync(CONFIG.heartbeatFile);
    const age = Date.now() - stats.mtimeMs;
    
    // 如果心跳文件超过超时时间未更新，说明可能中断了
    if (age > CONFIG.inactivityTimeout * 1000) {
      if (CONFIG.debug) {
        console.log(`🐛 心跳超时（已 ${Math.floor(age / 1000)}秒未更新）`);
      }
      return false;
    }
    
    return true;
  } catch (err) {
    console.error('❌ 检查心跳失败:', err.message);
    return true; // 出错时假设正常
  }
}

/**
 * 更新心跳文件
 */
function updateHeartbeat() {
  try {
    writeFileSync(CONFIG.heartbeatFile, JSON.stringify({
      timestamp: Date.now(),
      sessionId,
    }, null, 2));
  } catch (err) {
    console.error('❌ 更新心跳失败:', err.message);
  }
}

/**
 * 创建恢复标记
 */
function createResumeFlag() {
  // 检查是否超过最大重试次数
  if (CONFIG.maxRetries > 0 && resumeCount >= CONFIG.maxRetries) {
    console.log(`⛔ 已达到最大恢复次数 (${CONFIG.maxRetries})，停止自动恢复`);
    return false;
  }
  
  const newCount = resumeCount + 1;
  const flagFile = `${CONFIG.resumeFlagPrefix}${sessionId}`;
  
  try {
    writeFileSync(flagFile, JSON.stringify({
      timestamp: Date.now(),
      sessionId,
      reason: 'auto_detected_interruption',
      resumeCount: newCount,
      maxRetries: CONFIG.maxRetries,
      autoApprove: true,
    }, null, 2));
    
    saveResumeCount(newCount);
    lastResumeTime = Date.now();
    
    console.log(`🔄 已创建恢复标记: ${flagFile}`);
    
    if (CONFIG.maxRetries > 0) {
      console.log(`🔢 恢复次数: ${newCount}/${CONFIG.maxRetries}`);
      console.log(`📊 剩余恢复次数: ${CONFIG.maxRetries - newCount}`);
    } else {
      console.log(`🔢 恢复次数: ${newCount} (无限制)`);
    }
    
    return true;
  } catch (err) {
    console.error('❌ 创建恢复标记失败:', err.message);
    return false;
  }
}

/**
 * 清理旧的恢复标记
 */
function cleanupOldFlags() {
  const flagFile = `${CONFIG.resumeFlagPrefix}${sessionId}`;
  
  if (existsSync(flagFile)) {
    try {
      const stats = statSync(flagFile);
      const age = Date.now() - stats.mtimeMs;
      
      // 如果标记文件已经被处理（超过 5 分钟），删除它
      if (age > 5 * 60 * 1000) {
        unlinkSync(flagFile);
        if (CONFIG.debug) {
          console.log('🐛 清理旧的恢复标记');
        }
      }
    } catch (err) {
      // 忽略错误
    }
  }
}

/**
 * 检查是否应该重置计数
 */
function checkResetCount() {
  if (resumeCount === 0) return;
  
  // 如果距离上次恢复超过 10 分钟，且没有未处理的标记，重置计数
  const timeSinceLastResume = Date.now() - lastResumeTime;
  if (timeSinceLastResume > 10 * 60 * 1000 && !hasUnprocessedFlag()) {
    if (CONFIG.debug) {
      console.log('🐛 检测到长时间正常运行，重置恢复计数');
    }
    saveResumeCount(0);
  }
}

/**
 * 打印横幅
 */
function printBanner() {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║   Kiro 进程监控脚本 v2.0.0                ║');
  console.log('║   (真正的自动化版本)                       ║');
  console.log('╚════════════════════════════════════════════╝');
  console.log('');
  console.log(`📊 检查间隔: ${CONFIG.checkInterval}秒`);
  console.log(`⏱️  超时阈值: ${CONFIG.inactivityTimeout}秒`);
  console.log(`🔢 最大重试: ${CONFIG.maxRetries > 0 ? `${CONFIG.maxRetries}次` : '无限制'}`);
  console.log(`🐛 调试模式: ${CONFIG.debug ? '开启' : '关闭'}`);
  console.log(`🆔 会话 ID: ${sessionId}`);
  console.log('');
  console.log('💡 工作原理:');
  console.log('   - 定期检查恢复标记文件是否被处理');
  console.log('   - 如果标记文件长时间未被删除，说明 Kiro 中断了');
  console.log('   - 自动创建新的恢复标记，触发 Hook 恢复');
  console.log('');
  console.log('💡 提示: 按 Ctrl+C 停止监控');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
}

/**
 * 打印帮助
 */
function printHelp() {
  console.log('使用方法:');
  console.log('  node scripts/kiro-process-monitor.mjs [选项]');
  console.log('');
  console.log('选项:');
  console.log('  --interval=<秒>      检查间隔（默认: 30）');
  console.log('  --timeout=<秒>       超时阈值（默认: 120）');
  console.log('  --max-retries=<次数> 最大自动恢复次数（默认: 20）');
  console.log('  --debug              启用调试日志');
  console.log('  --help               显示帮助信息');
  console.log('');
  console.log('示例:');
  console.log('  node scripts/kiro-process-monitor.mjs --max-retries=20');
  console.log('  node scripts/kiro-process-monitor.mjs --debug');
  console.log('  node scripts/kiro-process-monitor.mjs --interval=60 --timeout=180');
}

/**
 * 主监控循环
 */
function monitorLoop() {
  // 更新心跳
  updateHeartbeat();
  
  // 清理旧标记
  cleanupOldFlags();
  
  // 检查是否应该重置计数
  checkResetCount();
  
  // 检查是否有未处理的恢复标记
  if (hasUnprocessedFlag()) {
    console.log('⚠️  检测到 Kiro 可能中断（恢复标记未被处理）');
    
    // 删除旧标记
    const oldFlag = `${CONFIG.resumeFlagPrefix}${sessionId}`;
    try {
      if (existsSync(oldFlag)) {
        unlinkSync(oldFlag);
      }
    } catch (err) {
      // 忽略错误
    }
    
    // 创建新的恢复标记
    createResumeFlag();
  } else if (CONFIG.debug) {
    console.log(`✓ 检查完成 (${new Date().toLocaleTimeString()})`);
  }
}

/**
 * 主程序
 */
async function main() {
  if (process.argv.includes('--help')) {
    printHelp();
    process.exit(0);
  }

  printBanner();
  
  // 加载恢复计数
  resumeCount = loadResumeCount();
  if (resumeCount > 0) {
    console.log(`📝 已加载恢复计数: ${resumeCount}`);
    console.log('');
  }

  console.log('🚀 监控已启动...');
  console.log('');

  // 立即执行一次
  monitorLoop();

  // 定期执行
  setInterval(monitorLoop, CONFIG.checkInterval * 1000);

  // 每 5 分钟输出一次状态摘要
  setInterval(() => {
    console.log(`📊 状态摘要: 恢复次数 ${resumeCount}${CONFIG.maxRetries > 0 ? `/${CONFIG.maxRetries}` : ''}`);
  }, 5 * 60 * 1000);

  // 优雅退出
  process.on('SIGINT', () => {
    console.log('');
    console.log('👋 监控已停止');
    
    // 清理心跳文件
    try {
      if (existsSync(CONFIG.heartbeatFile)) {
        unlinkSync(CONFIG.heartbeatFile);
      }
    } catch (err) {
      // 忽略错误
    }
    
    process.exit(0);
  });
}

main().catch(err => {
  console.error('❌ 程序异常:', err);
  process.exit(1);
});
