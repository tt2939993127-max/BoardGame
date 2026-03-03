#!/usr/bin/env node
/**
 * Kiro 会话监控脚本（简化版）
 * 
 * 功能：
 * - 定期检查 Kiro 是否还在响应
 * - 检测到无响应时创建恢复标记
 * - 支持重试次数限制
 * 
 * 使用方法：
 *   node scripts/kiro-session-monitor.mjs --max-retries=20
 */

import { writeFileSync, readFileSync, existsSync, unlinkSync } from 'fs';

// ==================== 配置 ====================
const CONFIG = {
  // 检查间隔（秒）
  checkInterval: parseInt(process.argv.find(arg => arg.startsWith('--interval='))?.split('=')[1]) || 60,
  // 最大自动恢复次数（0 = 无限制）
  maxRetries: parseInt(process.argv.find(arg => arg.startsWith('--max-retries='))?.split('=')[1]) || 20,
  // 是否启用调试日志
  debug: process.argv.includes('--debug'),
  // 恢复标记文件
  resumeFlag: '.kiro-resume-manual',
  // 计数文件
  countFile: '.kiro-resume-count-manual',
};

// ==================== 状态管理 ====================
let resumeCount = 0;
let lastPromptTime = Date.now();

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
    }, null, 2));
    resumeCount = count;
  } catch (err) {
    console.error('❌ 保存恢复计数失败:', err.message);
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
  
  try {
    writeFileSync(CONFIG.resumeFlag, JSON.stringify({
      timestamp: Date.now(),
      reason: 'manual_trigger',
      resumeCount: newCount,
      maxRetries: CONFIG.maxRetries,
      autoApprove: true,
    }, null, 2));
    
    saveResumeCount(newCount);
    
    console.log(`🔄 已创建恢复标记: ${CONFIG.resumeFlag}`);
    
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
 * 重置计数
 */
function resetCount() {
  try {
    if (existsSync(CONFIG.countFile)) {
      unlinkSync(CONFIG.countFile);
    }
    resumeCount = 0;
    console.log('✅ 恢复计数已重置');
  } catch (err) {
    console.error('❌ 重置计数失败:', err.message);
  }
}

/**
 * 打印横幅
 */
function printBanner() {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║   Kiro 会话监控脚本 v1.0.0                ║');
  console.log('╚════════════════════════════════════════════╝');
  console.log('');
  console.log(`📊 检查间隔: ${CONFIG.checkInterval}秒`);
  console.log(`🔢 最大重试: ${CONFIG.maxRetries > 0 ? `${CONFIG.maxRetries}次` : '无限制'}`);
  console.log(`🐛 调试模式: ${CONFIG.debug ? '开启' : '关闭'}`);
  console.log('');
  console.log('💡 使用说明:');
  console.log('   1. 当 Kiro 中断时，按任意键触发恢复');
  console.log('   2. 输入 "reset" 重置计数');
  console.log('   3. 输入 "quit" 或按 Ctrl+C 退出');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
}

/**
 * 打印帮助
 */
function printHelp() {
  console.log('使用方法:');
  console.log('  node scripts/kiro-session-monitor.mjs [选项]');
  console.log('');
  console.log('选项:');
  console.log('  --interval=<秒>      检查间隔（默认: 60）');
  console.log('  --max-retries=<次数> 最大自动恢复次数（默认: 20）');
  console.log('  --debug              启用调试日志');
  console.log('  --help               显示帮助信息');
  console.log('');
  console.log('示例:');
  console.log('  node scripts/kiro-session-monitor.mjs --max-retries=20');
  console.log('  node scripts/kiro-session-monitor.mjs --debug');
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
  }

  console.log('🚀 监控已启动，等待手动触发...');
  console.log('');

  // 监听键盘输入
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding('utf8');

  let inputBuffer = '';

  process.stdin.on('data', (key) => {
    // Ctrl+C
    if (key === '\u0003') {
      console.log('');
      console.log('👋 监控已停止');
      process.exit(0);
    }

    // Enter
    if (key === '\r' || key === '\n') {
      const command = inputBuffer.trim().toLowerCase();
      inputBuffer = '';
      console.log(''); // 换行

      if (command === 'reset') {
        resetCount();
      } else if (command === 'quit' || command === 'exit') {
        console.log('👋 监控已停止');
        process.exit(0);
      } else {
        // 任意其他输入都触发恢复
        createResumeFlag();
      }

      console.log('');
      console.log('💡 按任意键触发恢复，输入 "reset" 重置计数，输入 "quit" 退出');
      return;
    }

    // 退格
    if (key === '\u007F') {
      if (inputBuffer.length > 0) {
        inputBuffer = inputBuffer.slice(0, -1);
        process.stdout.write('\b \b');
      }
      return;
    }

    // 普通字符
    if (key >= ' ' && key <= '~') {
      inputBuffer += key;
      process.stdout.write(key);
    }
  });

  // 定期提示
  setInterval(() => {
    const elapsed = Math.floor((Date.now() - lastPromptTime) / 1000);
    if (elapsed >= CONFIG.checkInterval) {
      console.log(`⏰ 已等待 ${elapsed}秒，按任意键触发恢复...`);
      lastPromptTime = Date.now();
    }
  }, CONFIG.checkInterval * 1000);

  console.log('💡 按任意键触发恢复，输入 "reset" 重置计数，输入 "quit" 退出');
}

main().catch(err => {
  console.error('❌ 程序异常:', err);
  process.exit(1);
});
