/**
 * 王权骰铸 - 顿悟卡牌 E2E 测试
 * 
 * 验证投掷莲花时获得2太极+1闪避+1净化
 */

import { test, expect } from '@playwright/test';
import {
    setupDTOnlineMatch,
    selectCharacter,
    readyAndStartGame,
    waitForGameBoard,
    readCoreState,
    applyCoreStateDirect,
} from './helpers/dicethrone';

test.describe('王权骰铸 - 顿悟卡牌', () => {
    test('投出莲花 → 获得2太极+1闪避+1净化', async ({ browser }, testInfo) => {
        test.setTimeout(60000);
        const baseURL = testInfo.project.use.baseURL as string | undefined;

        const setup = await setupDTOnlineMatch(browser, baseURL);
        
        if (!setup) {
            test.skip(true, '游戏服务器不可用或创建房间失败');
            return;
        }
        
        const { hostPage, guestPage, hostContext, guestContext, matchId } = setup;

        console.log(`[Test] 对局创建成功: ${matchId}`);

        // 选择角色
        await selectCharacter(hostPage, 'monk');
        await selectCharacter(guestPage, 'barbarian');
        console.log('[Test] 角色选择完成');

        // 准备并开始游戏
        await readyAndStartGame(hostPage, guestPage);
        console.log('[Test] 游戏开始');

        // 等待游戏棋盘加载
        await waitForGameBoard(hostPage);
        await waitForGameBoard(guestPage);
        console.log('[Test] 游戏棋盘已加载');

        // 等待初始化完成
        await hostPage.waitForTimeout(2000);

        // 读取初始状态
        const initialState = await readCoreState(hostPage);
        console.log('[Test] 初始状态:', {
            phase: initialState.sys?.phase,
            activePlayer: initialState.activePlayerId,
            player0Hand: initialState.players?.['0']?.hand?.length || 0,
            player0Tokens: initialState.players?.['0']?.tokens || {},
        });

        // 注入顿悟卡到手牌，并设置到 main1 阶段（可以打出 timing='main' 的卡牌）
        const modifiedState = { ...initialState };
        if (modifiedState.players?.['0']) {
            // 清空手牌，只保留顿悟卡
            modifiedState.players['0'].hand = [{
                id: 'card-enlightenment',
                name: '顿悟',
                type: 'action',
                cpCost: 0,
                timing: 'main',
                description: '投掷1骰：莲花→获得2气+闪避+净化；否则抽1牌',
            }];
            // 确保有足够CP
            modifiedState.players['0'].resources.cp = 5;
            // 清空 Token
            modifiedState.players['0'].tokens = {
                taiji: 0,
                evasive: 0,
                purify: 0,
                knockdown: 0,
            };
        }
        // 设置阶段为 main1（可以打出行动卡）
        if (!modifiedState.sys) {
            modifiedState.sys = {};
        }
        modifiedState.sys.phase = 'main1';
        
        await applyCoreStateDirect(hostPage, modifiedState);
        console.log('[Test] 已注入顿悟卡到手牌并设置阶段为 main1');

        // TODO: 骰子注入问题
        // 顿悟卡使用 rollDie action，会调用 random.d(6) 生成随机骰子
        // 目前没有简单的方法在 E2E 测试中控制 bonus die 的结果
        // 可能的解决方案：
        // 1. 添加 SYS_CHEAT_SET_TUTORIAL_RANDOM_POLICY 命令到 CheatSystem
        // 2. 使用调试面板直接设置 sys.tutorial.randomPolicy
        // 3. 多次运行测试直到投出莲花（不可靠）
        // 
        // 当前测试会随机失败（只有 1/6 概率投出莲花）
        console.log('[Test] 注意：骰子结果是随机的，测试可能失败');

        // 等待状态更新
        await hostPage.waitForTimeout(1000);

        // 点击顿悟卡 - 使用 data-card-key 选择器（格式为 cardId-sequence）
        const enlightenmentCard = hostPage.locator('[data-card-key^="card-enlightenment-"]').first();
        await expect(enlightenmentCard).toBeVisible({ timeout: 5000 });
        
        console.log('[Test] 准备点击顿悟卡');
        await enlightenmentCard.click();
        console.log('[Test] 已点击顿悟卡');

        // 等待效果执行 - 增加等待时间并检查中间状态
        await hostPage.waitForTimeout(1000);
        
        // 检查中间状态：卡牌是否被打出
        const midState = await readCoreState(hostPage);
        console.log('[Test] 中间状态:', {
            hand: midState.players?.['0']?.hand?.length || 0,
            discard: midState.players?.['0']?.discard?.length || 0,
            tokens: midState.players?.['0']?.tokens || {},
        });
        
        // 再等待一段时间确保所有效果完成
        await hostPage.waitForTimeout(2000);

        // 读取最终状态
        const finalState = await readCoreState(hostPage);
        const player0 = finalState.players?.['0'];
        console.log('[Test] 最终状态:', {
            tokens: player0?.tokens || {},
            hand: player0?.hand?.length || 0,
            discard: player0?.discard?.length || 0,
        });

        // 验证 Token
        console.log('\n=== 验证结果 ===');
        console.log(`太极: ${player0?.tokens?.taiji || 0} (期望: 2)`);
        console.log(`闪避: ${player0?.tokens?.evasive || 0} (期望: 1)`);
        console.log(`净化: ${player0?.tokens?.purify || 0} (期望: 1)`);

        expect(player0?.tokens?.taiji || 0).toBe(2);
        expect(player0?.tokens?.evasive || 0).toBe(1);
        expect(player0?.tokens?.purify || 0).toBe(1);
        
        console.log('[Test] ✅ 测试通过：玩家获得了 2太极+1闪避+1净化');

        // 清理
        await guestContext.close();
        await hostContext.close();
    });
});
