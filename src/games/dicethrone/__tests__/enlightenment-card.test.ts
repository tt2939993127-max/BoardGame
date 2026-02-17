/**
 * 顿悟卡牌测试
 * 验证投掷莲花时获得2太极+闪避+净化
 */

import { describe, it, expect } from 'vitest';
import { GameTestRunner } from '../../../engine/testing';
import { DiceThroneDomain } from '../domain';
import { TOKEN_IDS, DICE_FACE_IDS } from '../domain/ids';
import {
    testSystems,
    createQueuedRandom,
    createInitializedState,
    assertState,
    cmd,
} from './test-utils';

describe('顿悟卡牌测试', () => {
    it('投掷莲花(6)获得2太极+1闪避+1净化', () => {
        // 骰子结果：莲花(6)
        const diceValues = [6];
        const random = createQueuedRandom(diceValues);

        const runner = new GameTestRunner({
            domain: DiceThroneDomain,
            systems: testSystems,
            playerIds: ['0', '1'],
            random,
            setup: (playerIds, random) => {
                const state = createInitializedState(playerIds, random);
                // 清空手牌，只保留顿悟卡
                state.core.players['0'].hand = [{
                    id: 'card-enlightenment',
                    name: '顿悟',
                    type: 'action',
                    cpCost: 0,
                    timing: 'main',
                    description: '投掷1骰：莲花→获得2气+闪避+净化；否则抽1牌',
                    effects: [{
                        description: '投掷1骰：莲花→获得2气+闪避+净化；否则抽1牌',
                        action: {
                            type: 'rollDie',
                            target: 'self',
                            diceCount: 1,
                            conditionalEffects: [
                                {
                                    face: DICE_FACE_IDS.LOTUS,
                                    grantTokens: [
                                        { tokenId: TOKEN_IDS.TAIJI, value: 2 },
                                        { tokenId: TOKEN_IDS.EVASIVE, value: 1 },
                                        { tokenId: TOKEN_IDS.PURIFY, value: 1 },
                                    ],
                                    effectKey: 'bonusDie.effect.enlightenmentLotus',
                                },
                            ],
                            defaultEffect: { drawCard: 1 },
                        },
                        timing: 'immediate',
                    }],
                }];
                state.core.players['0'].resources.cp = 1;
                return state;
            },
            assertFn: assertState,
            silent: false, // 开启日志以便调试
        });

        const result = runner.run({
            name: '顿悟卡牌：投掷莲花获得Token',
            commands: [
                cmd('PLAY_CARD', '0', { cardId: 'card-enlightenment' }),
            ],
            expect: {
                turnPhase: 'main1',
                players: {
                    '0': {
                        tokens: {
                            [TOKEN_IDS.TAIJI]: 2,
                            [TOKEN_IDS.EVASIVE]: 1,
                            [TOKEN_IDS.PURIFY]: 1,
                        },
                    },
                },
            },
        });

        if (result.assertionErrors.length > 0) {
            console.error('断言失败:', result.assertionErrors);
            console.error('最终状态 tokens:', result.finalState.core.players['0'].tokens);
        }

        expect(result.assertionErrors).toEqual([]);
    });
});
