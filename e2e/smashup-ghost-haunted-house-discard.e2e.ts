/**
 * SmashUp E2E 测试：幽灵 + 鬼屋同时触发弃牌 Bug 验证
 * 
 * Bug 描述：
 * - 当幽灵（Ghost）打出到鬼屋（Haunted House）基地时，会同时触发两个弃牌交互
 * - 第二个交互看到的是初始状态，导致可以选择已经弃掉的卡牌
 * 
 * 修复方案：
 * - InteractionSystem 自动注入 optionsGenerator
 * - 当选项包含 cardUid 字段时，自动基于最新状态过滤选项
 * - 确保后续交互看到的是最新的手牌状态
 */

import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';

test.describe('SmashUp - Ghost + Haunted House 弃牌 Bug', () => {
    let page: Page;
    let matchId: string;

    test.beforeEach(async ({ createSmashUpMatch }) => {
        const result = await createSmashUpMatch({
            factions: [
                { player: 'p1', factions: ['ghosts', 'aliens'] },
                { player: 'p2', factions: ['robots', 'ninjas'] },
            ],
        });
        page = result.page;
        matchId = result.matchId;
    });

    test('幽灵打出到鬼屋时，第二次弃牌不应显示已弃掉的卡牌', async () => {
        // 1. 构造测试场景：玩家手牌有 3 张卡，其中一张是幽灵随从
        const testState = {
            core: {
                players: {
                    p1: {
                        hand: [
                            { uid: 'card-ghost-1', defId: 'ghost_ghost', type: 'minion' },
                            { uid: 'card-action-1', defId: 'ghost_seance', type: 'action' },
                            { uid: 'card-action-2', defId: 'ghost_shady_deal', type: 'action' },
                        ],
                    },
                },
                bases: [
                    {
                        defId: 'base_haunted_house_al9000', // 鬼屋基地
                        minions: [],
                    },
                ],
            },
        };

        // 注入测试状态
        await page.evaluate((state) => {
            if (window.__BG_TEST_HARNESS__) {
                window.__BG_TEST_HARNESS__.state.patch(state);
            }
        }, testState);

        // 2. 打出幽灵随从到鬼屋基地
        // 这会触发两个弃牌交互：
        // - 幽灵自身能力：弃一张手牌
        // - 鬼屋基地能力：打出随从后必须弃一张手牌
        await page.click('[data-card-uid="card-ghost-1"]'); // 选择幽灵卡牌
        await page.click('[data-base-index="0"]'); // 打出到鬼屋基地

        // 3. 第一次弃牌交互（幽灵能力）
        // 等待弹窗出现
        await page.waitForSelector('[data-testid="interaction-overlay"]', { timeout: 5000 });
        
        // 验证第一次弹窗显示 2 张可弃卡牌（排除幽灵自身）
        const firstOptions = await page.$$('[data-testid="prompt-option"]');
        expect(firstOptions.length).toBe(3); // 2 张卡牌 + 1 个跳过选项

        // 选择弃掉第一张行动卡
        await page.click('[data-option-id="card-0"]');

        // 4. 第二次弃牌交互（鬼屋能力）
        // 等待第二个弹窗出现
        await page.waitForSelector('[data-testid="interaction-overlay"]', { timeout: 5000 });

        // 验证第二次弹窗只显示 1 张可弃卡牌（第一张已被弃掉）
        const secondOptions = await page.$$('[data-testid="prompt-option"]');
        expect(secondOptions.length).toBe(1); // 只剩 1 张卡牌（第一张已弃掉）

        // 验证选项内容：不应包含已弃掉的卡牌
        const optionTexts = await Promise.all(
            secondOptions.map(opt => opt.textContent())
        );
        expect(optionTexts).not.toContain('ghost_seance'); // 第一张已弃掉
        expect(optionTexts.some(t => t?.includes('ghost_shady_deal'))).toBe(true); // 第二张仍在

        // 选择弃掉剩余的卡牌
        await page.click('[data-option-id="card-0"]');

        // 5. 验证最终状态：手牌应该为空（3 张卡：1 张打出 + 2 张弃掉）
        const finalState = await page.evaluate(() => {
            if (window.__BG_TEST_HARNESS__) {
                return window.__BG_TEST_HARNESS__.state.read();
            }
            return null;
        });

        expect(finalState?.core?.players?.p1?.hand?.length).toBe(0);
    });

    test('自动注入的 optionsGenerator 应该正确过滤已弃掉的卡牌', async () => {
        // 这个测试直接验证 InteractionSystem 的自动注入机制

        // 1. 构造初始状态：3 张手牌
        const initialHand = [
            { uid: 'card-1', defId: 'ghost_ghost', type: 'minion' },
            { uid: 'card-2', defId: 'ghost_seance', type: 'action' },
            { uid: 'card-3', defId: 'ghost_shady_deal', type: 'action' },
        ];

        await page.evaluate((hand) => {
            if (window.__BG_TEST_HARNESS__) {
                window.__BG_TEST_HARNESS__.state.patch({
                    core: {
                        players: {
                            p1: { hand },
                        },
                    },
                });
            }
        }, initialHand);

        // 2. 创建两个连续的弃牌交互（模拟幽灵 + 鬼屋）
        await page.evaluate(() => {
            if (window.__BG_TEST_HARNESS__) {
                const { command } = window.__BG_TEST_HARNESS__;
                
                // 第一个交互：选择弃掉 card-2
                command.dispatch({
                    type: 'SYS_INTERACTION_RESPOND',
                    playerId: 'p1',
                    payload: { optionId: 'card-1', mergedValue: { cardUid: 'card-2' } },
                });
            }
        });

        // 等待第一次弃牌完成
        await page.waitForTimeout(500);

        // 3. 验证第二个交互的选项不包含 card-2
        const secondInteraction = await page.evaluate(() => {
            if (window.__BG_TEST_HARNESS__) {
                const state = window.__BG_TEST_HARNESS__.state.read();
                return state?.sys?.interaction?.current;
            }
            return null;
        });

        expect(secondInteraction).toBeTruthy();
        const options = (secondInteraction as any)?.data?.options || [];
        const cardUids = options
            .map((opt: any) => opt.value?.cardUid)
            .filter(Boolean);

        // 验证：选项中不应包含已弃掉的 card-2
        expect(cardUids).not.toContain('card-2');
        // 验证：选项中应该包含 card-1 和 card-3
        expect(cardUids).toContain('card-1');
        expect(cardUids).toContain('card-3');
    });
});
