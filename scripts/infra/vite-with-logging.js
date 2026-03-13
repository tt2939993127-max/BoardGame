#!/usr/bin/env node

/**
 * Vite 启动包装器 - 捕获崩溃日志
 * 
 * 用途：
 * 1. 捕获 Vite 进程的所有输出（stdout + stderr）
 * 2. 捕获进程退出事件和退出码
 * 3. 捕获未捕获的异常和 Promise 拒绝
 * 4. 将日志写入文件以便排查
 */

import { spawn } from 'child_process';
import { writeFileSync, appendFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { assertChildProcessSupport } from './assert-child-process-support.mjs';
import { withWindowsHide } from './windows-hide.js';

await assertChildProcessSupport('Vite 开发服务器启动');

const logDir = join(process.cwd(), 'logs');
if (!existsSync(logDir)) {
  mkdirSync(logDir, { recursive: true });
}

const logFile = join(logDir, `vite-${new Date().toISOString().replace(/[:.]/g, '-')}.log`);

function log(message) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${message}\n`;
  console.log(line.trim());
  appendFileSync(logFile, line);
}

log('=== Vite 启动包装器 ===');
log(`日志文件: ${logFile}`);
log(`Node 版本: ${process.version}`);
log(`工作目录: ${process.cwd()}`);
log(`内存限制: ${process.execArgv.join(' ')}`);

// 启动 Vite 进程
const viteArgs = process.argv.slice(2);
log(`Vite 参数: ${viteArgs.join(' ')}`);

const vite = spawn(process.execPath, [
  '--max-old-space-size=4096',
  'node_modules/vite/bin/vite.js',
  ...viteArgs
], withWindowsHide({
  stdio: ['inherit', 'pipe', 'pipe'],
  env: {
    ...process.env,
    FORCE_COLOR: '1',
  },
}));

log(`Vite 进程 PID: ${vite.pid}`);

// 捕获 stdout
vite.stdout.on('data', (data) => {
  const message = data.toString();
  process.stdout.write(message);
  appendFileSync(logFile, `[STDOUT] ${message}`);
});

// 捕获 stderr
vite.stderr.on('data', (data) => {
  const message = data.toString();
  process.stderr.write(message);
  appendFileSync(logFile, `[STDERR] ${message}`);
});

// 捕获进程错误
vite.on('error', (error) => {
  log(`[ERROR] Vite 进程错误: ${error.message}`);
  log(`[ERROR] 堆栈: ${error.stack}`);
});

// 捕获进程退出
vite.on('exit', (code, signal) => {
  log(`[EXIT] Vite 进程退出`);
  log(`[EXIT] 退出码: ${code}`);
  log(`[EXIT] 信号: ${signal}`);
  
  if (code !== 0 && code !== null) {
    log(`[EXIT] 异常退出！退出码: ${code}`);
    log(`[EXIT] 可能的原因:`);
    log(`[EXIT] - 内存不足 (OOM)`);
    log(`[EXIT] - 未捕获的异常`);
    log(`[EXIT] - 文件监听错误`);
    log(`[EXIT] - WebSocket 连接问题`);
  }
  
  process.exit(code || 0);
});

// 捕获进程关闭
vite.on('close', (code, signal) => {
  log(`[CLOSE] Vite 进程关闭`);
  log(`[CLOSE] 退出码: ${code}`);
  log(`[CLOSE] 信号: ${signal}`);
});

// 捕获未捕获的异常
process.on('uncaughtException', (error) => {
  log(`[UNCAUGHT] 未捕获的异常: ${error.message}`);
  log(`[UNCAUGHT] 堆栈: ${error.stack}`);
  process.exit(1);
});

// 捕获未处理的 Promise 拒绝
process.on('unhandledRejection', (reason, promise) => {
  log(`[UNHANDLED] 未处理的 Promise 拒绝`);
  log(`[UNHANDLED] 原因: ${reason}`);
  log(`[UNHANDLED] Promise: ${promise}`);
});

// 捕获 SIGINT (Ctrl+C)
process.on('SIGINT', () => {
  log('[SIGINT] 收到 SIGINT 信号，正在关闭...');
  vite.kill('SIGINT');
});

// 捕获 SIGTERM
process.on('SIGTERM', () => {
  log('[SIGTERM] 收到 SIGTERM 信号，正在关闭...');
  vite.kill('SIGTERM');
});

log('=== Vite 启动完成，开始监听 ===');
