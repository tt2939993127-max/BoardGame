#!/usr/bin/env node
/**
 * Kiro 心跳检查脚本（最简单有效的版本）
 * 
 * 工作原理：
 * 1. 你在 Kiro 中说"继续"
 * 2. 脚本检测到你的输入
 * 3. 如果 Kiro 长时间没有响应，脚本自动帮你再说一次"继续"
 * 
 * 使用方法：
 *   node scripts/kiro-heartbeat-simple.mjs
 */

import { writeFileSync, readFileSync, existsSync } from 'fs';
import readline from 'readline';

const CONFIG = {
  maxRetries: 20,
  countFile: '.kiro-continue-count',
};

let count = 0;

// 加载计数
if (existsSync(CONFIG.countFile)) {
  try {
    const data = JSON.parse(readFileSync(CONFIG.countFile, 'utf-8'));
    count = data.count || 0;
  } catch (err) {
    // 忽略
  }
}

console.log('╔════════════════════════════════════════════╗');
console.log('║   Kiro 自动继续助手                        ║');
console.log('╚════════════════════════════════════════════╝');
console.log('');
console.log(`当前计数: ${count}/${CONFIG.maxRetries}`);
console.log('');
console.log('使用方法:');
console.log('  1. 在 Kiro 中手动输入"继续"');
console.log('  2. 如果 Kiro 中断，回到这个窗口按回车');
console.log('  3. 脚本会生成一个提示，复制到 Kiro 中');
console.log('  4. 重复步骤 2-3，最多 20 次');
console.log('');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function prompt() {
  if (count >= CONFIG.maxRetries) {
    console.log(`⛔ 已达到最大重试次数 (${CONFIG.maxRetries})`);
    console.log('请手动检查任务状态');
    process.exit(0);
  }

  rl.question('按回车生成"继续"提示（或输入 reset 重置计数，quit 退出）: ', (answer) => {
    const cmd = answer.trim().toLowerCase();

    if (cmd === 'quit' || cmd === 'exit') {
      console.log('👋 再见！');
      process.exit(0);
    }

    if (cmd === 'reset') {
      count = 0;
      try {
        writeFileSync(CONFIG.countFile, JSON.stringify({ count: 0 }, null, 2));
      } catch (err) {
        // 忽略
      }
      console.log('✅ 计数已重置');
      console.log('');
      prompt();
      return;
    }

    count++;
    try {
      writeFileSync(CONFIG.countFile, JSON.stringify({ count }, null, 2));
    } catch (err) {
      // 忽略
    }

    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 复制以下内容到 Kiro:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('继续执行之前的任务。自动同意所有后续命令。');
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🔢 当前计数: ${count}/${CONFIG.maxRetries}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');

    prompt();
  });
}

prompt();
