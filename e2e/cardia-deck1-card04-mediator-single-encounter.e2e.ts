import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { 
    setupCardiaTestScenario,
    readCoreState,
    playCard,
    waitForPhase,
} from './helpers/cardia';

// 本地辅助函数
async function clickEndTurn(page: Page) {
  await page.locator('[data-testid="cardia-end-turn-btn"]').click();
  await page.waitForTimeout(500);
}

/**
 * 影响力4 - 调停者：单次遭遇测试
 * 
 * 测试场景：验证调停者能力只影响当前遭遇，不影响后续遭遇
 * 
 * 步骤：
 * 1. 第一回合：P1 打出调停者（影响力4），P2 打出影响力10
 * 2. P1 激活调停者能力，强制平局
 * 3. 验证：第一回合为平局，双方都没有印戒
 * 4. 第二回合：P1 打出影响力1，P2 打出影响力7
 * 5. 验证：第二回合正常判定（P2 获胜），P2 获得印戒
 * 6. 验证：调停者能力不影响第二回合
 */
test.describe('Cardia 一号牌组 - 调停者单次遭遇', () => {
    test('调停者能力只影响当前遭遇，不影响后续遭遇', async ({ browser }) => {
        const setup = await setupCardiaTestScenario(browser, {
            player1: {
                hand: ['deck_i_card_04', 'deck_i_card_01'], // 调停者（影响力4）、影响力1
                deck: ['deck_i_card_02'],
            },
            player2: {
                hand: ['deck_i_card_10', 'deck_i_card_07'], // 傀儡师（影响力10）、影响力7
                deck: ['deck_i_card_08'],
            },
            phase: 'play',
        });
        
        try {
            console.log('\n=== 第一回合：调停者强制平局 ===');
            
            // 1. P1 打出调停者（影响力4）
            console.log('P1 打出调停者（影响力4）');
            await playCard(setup.player1Page, 0);
            
            // 2. P2 打出影响力10
            console.log('P2 打出影响力10');
            await playCard(setup.player2Page, 0);
            
            // 3. 等待进入能力阶段
            await waitForPhase(setup.player1Page, 'ability');
            
            // 4. 激活调停者能力
            const abilityButton = setup.player1Page.locator('[data-testid="cardia-activate-ability-btn"]');
            await abilityButton.waitFor({ state: 'visible', timeout: 5000 });
            console.log('激活调停者能力');
            await abilityButton.click();
            await setup.player1Page.waitForTimeout(1000);
            
            // 5. 等待回合结束
            await waitForPhase(setup.player1Page, 'play', 10000);
            
            // 6. 验证第一回合结果
            const afterRound1 = await readCoreState(setup.player1Page);
            type PlayerState = { 
                playedCards: Array<{ uid: string; defId: string; baseInfluence: number; signets: number }>;
                signets: number;
            };
            const playersAfterRound1 = afterRound1.players as Record<string, PlayerState>;
            
            console.log('第一回合结束:', {
                p1PlayedCards: playersAfterRound1['0'].playedCards.map(c => ({ 
                    defId: c.defId, 
                    signets: c.signets 
                })),
                p2PlayedCards: playersAfterRound1['1'].playedCards.map(c => ({ 
                    defId: c.defId, 
                    signets: c.signets 
                })),
                p1TotalSignets: playersAfterRound1['0'].signets,
                p2TotalSignets: playersAfterRound1['1'].signets,
            });
            
            // 验证：第一回合为平局，双方都没有印戒
            expect(playersAfterRound1['0'].playedCards[0].signets).toBe(0);
            expect(playersAfterRound1['1'].playedCards[0].signets).toBe(0);
            console.log('✅ 第一回合为平局，双方都没有印戒');
            
            console.log('\n=== 第二回合：正常判定（不受调停者影响）===');
            
            // 7. P1 打出影响力1
            console.log('P1 打出影响力1');
            await playCard(setup.player1Page, 0);
            
            // 8. P2 打出影响力7
            console.log('P2 打出影响力7');
            await playCard(setup.player2Page, 0);
            
            // 9. 等待进入能力阶段（P1 失败）
            await waitForPhase(setup.player1Page, 'ability');
            
            // 10. 读取第二回合遭遇结果
            const afterRound2Encounter = await readCoreState(setup.player1Page);
            type EncounterState = {
                winnerId?: string;
                player1Influence: number;
                player2Influence: number;
            };
            const encounter2 = afterRound2Encounter.currentEncounter as EncounterState;
            const playersAfterRound2Encounter = afterRound2Encounter.players as Record<string, PlayerState>;
            
            console.log('第二回合遭遇结果:', {
                winnerId: encounter2?.winnerId,
                p1Influence: encounter2?.player1Influence,
                p2Influence: encounter2?.player2Influence,
                p1PlayedCards: playersAfterRound2Encounter['0'].playedCards.map(c => ({ 
                    defId: c.defId, 
                    signets: c.signets 
                })),
                p2PlayedCards: playersAfterRound2Encounter['1'].playedCards.map(c => ({ 
                    defId: c.defId, 
                    signets: c.signets 
                })),
            });
            
            // 核心验证：第二回合正常判定（P2 获胜）
            expect(encounter2?.winnerId).toBe('1');
            expect(encounter2?.player1Influence).toBe(1);
            expect(encounter2?.player2Influence).toBe(7);
            console.log('✅ 第二回合正常判定：P2 获胜（7 > 1）');
            
            // 核心验证：P2 的第二张卡牌获得印戒
            expect(playersAfterRound2Encounter['1'].playedCards[1].signets).toBe(1);
            console.log('✅ P2 的第二张卡牌获得印戒');
            
            // 核心验证：P1 的第二张卡牌没有印戒
            expect(playersAfterRound2Encounter['0'].playedCards[1].signets).toBe(0);
            console.log('✅ P1 的第二张卡牌没有印戒');
            
            // 11. 跳过能力阶段
            const skipButton = setup.player1Page.locator('[data-testid="cardia-skip-ability-btn"]');
            await skipButton.waitFor({ state: 'visible', timeout: 5000 });
            await skipButton.click();
            await setup.player1Page.waitForTimeout(1000);
            
            // 12. 等待回合结束
            await waitForPhase(setup.player1Page, 'play', 10000);
            
            // 13. 验证最终状态
            const finalState = await readCoreState(setup.player1Page);
            const playersFinal = finalState.players as Record<string, PlayerState>;
            
            console.log('\n=== 最终状态 ===');
            console.log('最终状态:', {
                p1PlayedCards: playersFinal['0'].playedCards.map(c => ({ 
                    defId: c.defId, 
                    signets: c.signets 
                })),
                p2PlayedCards: playersFinal['1'].playedCards.map(c => ({ 
                    defId: c.defId, 
                    signets: c.signets 
                })),
                p1TotalSignets: playersFinal['0'].signets,
                p2TotalSignets: playersFinal['1'].signets,
            });
            
            // 最终验证：第一回合卡牌仍然没有印戒
            expect(playersFinal['0'].playedCards[0].signets).toBe(0);
            expect(playersFinal['1'].playedCards[0].signets).toBe(0);
            console.log('✅ 第一回合卡牌仍然没有印戒（调停者效果持续）');
            
            // 最终验证：第二回合卡牌有正确的印戒
            expect(playersFinal['0'].playedCards[1].signets).toBe(0);
            expect(playersFinal['1'].playedCards[1].signets).toBe(1);
            console.log('✅ 第二回合卡牌有正确的印戒（不受调停者影响）');
            
            console.log('\n✅ 所有断言通过：调停者能力只影响当前遭遇，不影响后续遭遇');
            
        } finally {
            await setup.player1Context.close();
            await setup.player2Context.close();
        }
    });
});
