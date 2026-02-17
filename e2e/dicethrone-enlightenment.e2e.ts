/**
 * 王权骰铸 - 顿悟卡牌测试
 * 
 * 测试场景：
 * 1. 打出顿悟卡，投出莲花（6）→ 应该获得 2太极 + 1闪避 + 1净化
 * 2. 打出顿悟卡，投出非莲花 → 应该抽1张牌
 */

import { test, expect } from './fixtures';
import {
    selectCharacter,
    readyAndStartGame,
    waitForGameBoard,
    readCoreState,
    applyCoreStateDirect,
} from './helpers/dicethrone';

const GAME_NAME = 'dicethrone';

test.describe('王权骰铸 - 顿悟卡牌', () => {
    test('投出莲花 → 获得2太极+1闪避+1净化', async ({ dicethroneMatch }) => {
        const { hostPage, guestPage, hostContext, guestContext } = dicethroneMatch;
        const host = { page: hostPage, context: hostContext };
        const guest = { page: guestPage, context: guestContext };

        // 等待进入 main1 阶段
        await hostPage.waitForSelector('[data-phase="main1"]', { timeout: 15000 });

        // 读取初始状态
        const initialState = await hostPage.evaluate(() => {
            return (window as any).__BG_CORE_STATE__;
        });

        console.log('初始手牌:', initialState.players['0'].hand);
        console.log('初始Token:', initialState.players['0'].tokens);

        // 确保手牌中有顿悟卡，如果没有则注入
        const hasEnlightenment = initialState.players['0'].hand.includes('card-enlightenment');
        if (!hasEnlightenment) {
            await hostPage.evaluate(() => {
                const state = (window as any).__BG_CORE_STATE__;
                state.players['0'].hand.push('card-enlightenment');
                (window as any).__BG_APPLY_STATE__(state);
            });
            console.log('已注入顿悟卡到手牌');
        }

        // 注入骰子结果：确保投出莲花（6）
        await hostPage.evaluate(() => {
            (window as any).__BG_INJECT_DICE_VALUES__ = [6]; // 莲花
        });

        // 点击顿悟卡
        const enlightenmentCard = hostPage.locator('[data-card-id="card-enlightenment"]').first();
        await enlightenmentCard.waitFor({ state: 'visible', timeout: 5000 });
        await enlightenmentCard.click();

        // 等待卡牌效果执行完成（等待骰子动画）
        await hostPage.waitForTimeout(2000);

        // 读取打牌后的状态
        const afterPlayState = await hostPage.evaluate(() => {
            return (window as any).__BG_CORE_STATE__;
        });

        console.log('打牌后手牌:', afterPlayState.players['0'].hand);
        console.log('打牌后Token:', afterPlayState.players['0'].tokens);

        // 验证：应该获得 2太极 + 1闪避 + 1净化
        const tokens = afterPlayState.players['0'].tokens;
        expect(tokens.taiji || 0).toBeGreaterThanOrEqual(2);
        expect(tokens.evasive || 0).toBeGreaterThanOrEqual(1);
        expect(tokens.purify || 0).toBeGreaterThanOrEqual(1);

        // 验证：顿悟卡应该从手牌移除
        expect(afterPlayState.players['0'].hand).not.toContain('card-enlightenment');
    });

    test('投出非莲花 → 抽1张牌', async ({ dicethroneMatch }) => {
        const { hostPage, guestPage, hostContext, guestContext } = dicethroneMatch;

        // 完成角色选择
        await selectCharacter(hostPage, 'monk');
        await selectCharacter(guestPage, 'barbarian');
        await readyAndStartGame(hostPage, guestPage);

        // 等待游戏开始
        await waitForGameBoard(hostPage);
        await waitForGameBoard(guestPage);

        // 等待进入 main1 阶段
        await hostPage.waitForSelector('[data-phase="main1"]', { timeout: 15000 });

        // 读取初始状态
        const initialState = await hostPage.evaluate(() => {
            return (window as any).__BG_CORE_STATE__;
        });

        const initialHandSize = initialState.players['0'].hand.length;

        // 确保手牌中有顿悟卡
        const hasEnlightenment = initialState.players['0'].hand.includes('card-enlightenment');
        if (!hasEnlightenment) {
            await hostPage.evaluate(() => {
                const state = (window as any).__BG_CORE_STATE__;
                state.players['0'].hand.push('card-enlightenment');
                (window as any).__BG_APPLY_STATE__(state);
            });
        }

        // 注入骰子结果：投出拳（1）
        await hostPage.evaluate(() => {
            (window as any).__BG_INJECT_DICE_VALUES__ = [1]; // 拳
        });

        // 点击顿悟卡
        const enlightenmentCard = hostPage.locator('[data-card-id="card-enlightenment"]').first();
        await enlightenmentCard.waitFor({ state: 'visible', timeout: 5000 });
        await enlightenmentCard.click();

        // 等待卡牌效果执行完成
        await hostPage.waitForTimeout(2000);

        // 读取打牌后的状态
        const afterPlayState = await hostPage.evaluate(() => {
            return (window as any).__BG_CORE_STATE__;
        });

        // 验证：手牌数量应该不变（打出1张，抽1张）
        expect(afterPlayState.players['0'].hand.length).toBe(initialHandSize);

        // 验证：顿悟卡应该从手牌移除
        expect(afterPlayState.players['0'].hand).not.toContain('card-enlightenment');
    });

    test('投出莲花 - 使用调试面板验证', async ({ dicethroneMatch }) => {
        const { hostPage, guestPage, hostContext, guestContext } = dicethroneMatch;

        // 完成角色选择
        await selectCharacter(hostPage, 'monk');
        await selectCharacter(guestPage, 'barbarian');
        await readyAndStartGame(hostPage, guestPage);

        // 等待游戏开始
        await waitForGameBoard(hostPage);
        await waitForGameBoard(guestPage);

        // 等待进入 main1 阶段
        await hostPage.waitForSelector('[data-phase="main1"]', { timeout: 15000 });

        // 使用调试面板注入状态：手牌中有顿悟卡
        await hostPage.evaluate(() => {
            const state = (window as any).__BG_CORE_STATE__;
            // 清空手牌，只保留顿悟卡
            state.players['0'].hand = ['card-enlightenment'];
            // 清空Token
            state.players['0'].tokens = {
                taiji: 0,
                evasive: 0,
                purify: 0,
                knockdown: 0,
            };
            (window as any).__BG_APPLY_STATE__(state);
        });

        // 注入骰子结果
        await hostPage.evaluate(() => {
            (window as any).__BG_INJECT_DICE_VALUES__ = [6]; // 莲花
        });

        console.log('=== 打牌前状态 ===');
        const beforeState = await hostPage.evaluate(() => {
            const state = (window as any).__BG_CORE_STATE__;
            return {
                hand: state.players['0'].hand,
                tokens: state.players['0'].tokens,
            };
        });
        console.log('手牌:', beforeState.hand);
        console.log('Token:', beforeState.tokens);

        // 点击顿悟卡
        const enlightenmentCard = hostPage.locator('[data-card-id="card-enlightenment"]').first();
        await enlightenmentCard.click();

        // 等待效果执行
        await hostPage.waitForTimeout(2000);

        console.log('=== 打牌后状态 ===');
        const afterState = await hostPage.evaluate(() => {
            const state = (window as any).__BG_CORE_STATE__;
            return {
                hand: state.players['0'].hand,
                tokens: state.players['0'].tokens,
                eventStream: state.sys?.eventStream?.entries?.slice(-10).map((e: any) => ({
                    type: e.event.type,
                    payload: e.event.payload,
                })),
            };
        });
        console.log('手牌:', afterState.hand);
        console.log('Token:', afterState.tokens);
        console.log('最近10个事件:', JSON.stringify(afterState.eventStream, null, 2));

        // 验证
        expect(afterState.tokens.taiji).toBe(2);
        expect(afterState.tokens.evasive).toBe(1);
        expect(afterState.tokens.purify).toBe(1);
        expect(afterState.hand).toEqual([]);
    });
});
