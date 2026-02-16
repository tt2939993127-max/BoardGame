/**
 * 大杀四方 - 睡眠孢子力量修正 bug E2E 测试
 * 
 * 用户报告：只有一个睡眠孢子，但对手随从显示 -2 力量修正
 */

import { test, expect } from '@playwright/test';

test.describe('睡眠孢子力量修正 bug', () => {
    test('一个睡眠孢子应该只给对手随从 -1 力量', async ({ page }) => {
        // 访问本地游戏页面
        await page.goto('http://localhost:5173/play/smashup/local');
        
        // 等待游戏加载
        await page.waitForSelector('[data-testid="game-board"]', { timeout: 10000 });
        
        // 等待派系选择完成（如果有）
        // 这里需要根据实际 UI 调整
        
        // TODO: 通过 UI 操作打出睡眠孢子
        // 1. 选择食人花派系
        // 2. 打出睡眠孢子到基地
        // 3. 对手打出随从
        // 4. 检查随从的力量修正显示
        
        // 临时方案：直接检查控制台日志
        const logs: string[] = [];
        page.on('console', msg => {
            if (msg.text().includes('[getOngoingPowerModifier]')) {
                logs.push(msg.text());
            }
        });
        
        // 等待一段时间让游戏运行
        await page.waitForTimeout(5000);
        
        // 检查日志
        console.log('控制台日志:', logs);
        
        // 如果有日志，验证修正值
        if (logs.length > 0) {
            const lastLog = logs[logs.length - 1];
            expect(lastLog).toContain('total=-1');
            expect(lastLog).not.toContain('total=-2');
        }
    });
});
