/**
 * DiceThrone 攻击音效调试测试
 * 
 * 目标：验证攻击方和防御方都能听到攻击音效
 * 
 * 问题：用户反馈攻击方听不到攻击音效，但防御方能正常听到
 */

import { test, expect } from '@playwright/test';
import { setupDTOnlineMatch, selectCharacter, readyAndStartGame, waitForGameBoard, applyCoreStateDirect } from './helpers/dicethrone';
import { waitForTestHarness } from './helpers/common';

test.describe('DiceThrone Attack Sound Debug', () => {
    test('should play attack sound for both attacker and defender', async ({ browser }, testInfo) => {
        test.setTimeout(120000);
        const baseURL = testInfo.project.use.baseURL as string | undefined;

        // 1. 创建在线对局
        const setup = await setupDTOnlineMatch(browser, baseURL);
        
        if (!setup) {
            test.skip(true, '游戏服务器不可用或创建房间失败');
            return;
        }
        
        const { hostPage, guestPage, hostContext, guestContext } = setup;

        try {
            // 2. 选择英雄：野蛮人 vs 月精灵
            await selectCharacter(hostPage, 'barbarian');
            await selectCharacter(guestPage, 'moon_elf');
            
            // 3. 准备并开始游戏
            await readyAndStartGame(hostPage, guestPage);
            
            // 4. 等待游戏开始
            await waitForGameBoard(hostPage);
            await waitForGameBoard(guestPage);

            // 5. 等待 TestHarness 就绪
            await waitForTestHarness(hostPage);

            // 6. 等待游戏完全加载（等待主阶段按钮）
            await hostPage.waitForSelector('button:has-text("NEXT PHASE")', { timeout: 10000 });
            await hostPage.waitForTimeout(1000);

            // 7. 点击 NEXT PHASE 进入进攻投骰阶段
            await hostPage.click('button:has-text("NEXT PHASE")');
            await hostPage.waitForTimeout(500);

            // 8. 等待骰子区域出现
            await hostPage.waitForSelector('[data-testid="dice-area"]', { timeout: 5000 });

            // 9. 投骰子
            await hostPage.click('button:has-text("ROLL")');
            await hostPage.waitForTimeout(500);

            // 10. 确认骰面
            await hostPage.click('button:has-text("CONFIRM")');
            await hostPage.waitForTimeout(500);

            // 8. 设置控制台日志监听（攻击方）
            const hostConsoleLogs: string[] = [];
            hostPage.on('console', msg => {
                const text = msg.text();
                if (text.includes('[Audio Debug]') || text.includes('[DT Audio Debug]')) {
                    hostConsoleLogs.push(text);
                    console.log('[HOST]', text);
                }
            });

            // 9. 设置控制台日志监听（防御方）
            const guestConsoleLogs: string[] = [];
            guestPage.on('console', msg => {
                const text = msg.text();
                if (text.includes('[Audio Debug]') || text.includes('[DT Audio Debug]')) {
                    guestConsoleLogs.push(text);
                    console.log('[GUEST]', text);
                }
            });

            // 10. 等待技能按钮出现
            await hostPage.waitForSelector('[data-ability-id]', { timeout: 5000 });

            // 11. 点击第一个技能（触发攻击）
            const abilityButton = hostPage.locator('[data-ability-id]').first();
            await abilityButton.click();

            // 12. 等待一段时间让事件处理完成
            await hostPage.waitForTimeout(2000);
            await guestPage.waitForTimeout(2000);

            // 13. 截图保存当前状态
            await hostPage.screenshot({ 
                path: testInfo.outputPath('host-after-attack.png'),
                fullPage: true 
            });
            await guestPage.screenshot({ 
                path: testInfo.outputPath('guest-after-attack.png'),
                fullPage: true 
            });

            // 14. 检查控制台日志
            console.log('\n=== HOST (Attacker) Console Logs ===');
            hostConsoleLogs.forEach(log => console.log(log));
            console.log('=====================================\n');

            console.log('\n=== GUEST (Defender) Console Logs ===');
            guestConsoleLogs.forEach(log => console.log(log));
            console.log('======================================\n');

            // 15. 验证攻击方收到 ATTACK_INITIATED 事件
            const hostAttackLogs = hostConsoleLogs.filter(log => 
                log.includes('ATTACK_INITIATED')
            );
            console.log('Host ATTACK_INITIATED logs:', hostAttackLogs.length);

            // 16. 验证防御方收到 ATTACK_INITIATED 事件
            const guestAttackLogs = guestConsoleLogs.filter(log => 
                log.includes('ATTACK_INITIATED')
            );
            console.log('Guest ATTACK_INITIATED logs:', guestAttackLogs.length);

            // 17. 分析日志差异
            console.log('\n=== Analysis ===');
            
            // 攻击方日志分析
            const hostEventProcessing = hostConsoleLogs.find(log => 
                log.includes('ATTACK_INITIATED event processing')
            );
            const hostFeedbackResolution = hostConsoleLogs.find(log => 
                log.includes('ATTACK_INITIATED feedback resolution')
            );
            const hostAudioDebug = hostConsoleLogs.find(log => 
                log.includes('[DT Audio Debug] ATTACK_INITIATED')
            );

            console.log('HOST Event Processing:', hostEventProcessing);
            console.log('HOST Feedback Resolution:', hostFeedbackResolution);
            console.log('HOST Audio Debug:', hostAudioDebug);

            // 防御方日志分析
            const guestEventProcessing = guestConsoleLogs.find(log => 
                log.includes('ATTACK_INITIATED event processing')
            );
            const guestFeedbackResolution = guestConsoleLogs.find(log => 
                log.includes('ATTACK_INITIATED feedback resolution')
            );
            const guestAudioDebug = guestConsoleLogs.find(log => 
                log.includes('[DT Audio Debug] ATTACK_INITIATED')
            );

            console.log('GUEST Event Processing:', guestEventProcessing);
            console.log('GUEST Feedback Resolution:', guestFeedbackResolution);
            console.log('GUEST Audio Debug:', guestAudioDebug);
            console.log('================\n');

            // 18. 验证两边都收到了事件
            expect(hostAttackLogs.length).toBeGreaterThan(0);
            expect(guestAttackLogs.length).toBeGreaterThan(0);

        } finally {
            await hostContext.close();
            await guestContext.close();
        }
    });
});
