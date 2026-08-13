import { describe, expect, it } from 'vitest';
import type { MatchState } from '../../../engine/types';
import { createDiceThroneEventSystem } from '../domain/systems';
import { reduce } from '../domain/reducer';
import type { DiceThroneCore, DiceThroneEvent, PendingBonusDiceSettlement } from '../domain/types';
import { createHeroMatchup, createQueuedRandom } from './test-utils';

const bonusSettlement = (): PendingBonusDiceSettlement => ({
    id: 'ordinary-confirm-required',
    sourceAbilityId: 'ordinary-confirm-required',
    attackerId: '0',
    targetId: '1',
    dice: [{ index: 0, value: 4, face: 'sabre', effectParams: { value: 4 } }],
    rerollCostTokenId: 'tactical_advantage',
    rerollCostAmount: 1,
    rerollCount: 0,
    maxRerollCount: 1,
    readyToSettle: false,
    allowDiceModification: true,
});

const runBonusDiceSystem = (
    state: MatchState<DiceThroneCore>,
    events: DiceThroneEvent[],
) => {
    const system = createDiceThroneEventSystem();
    return system.afterEvents?.({
        state,
        events,
        random: createQueuedRandom([6]),
    } as any) as { state?: MatchState<DiceThroneCore>; events?: DiceThroneEvent[] } | undefined;
};

describe('DiceThrone 奖励骰普通确认合同', () => {
    it('无可用内置重投且没有响应时，奖励骰仍停在右侧骰盘等待普通确认', () => {
        const state = createHeroMatchup('monk', 'treant')(['0', '1'], createQueuedRandom([1]));
        const settlement = bonusSettlement();
        const requested = {
            type: 'BONUS_DICE_REROLL_REQUESTED',
            payload: { settlement },
            sourceCommandType: 'TEST_BONUS_DICE',
            timestamp: 100,
        } as DiceThroneEvent;
        const coreWithBonus = reduce(state.core, requested);
        coreWithBonus.players['0'].tokens.tactical_advantage = 0;

        const result = runBonusDiceSystem({ ...state, core: coreWithBonus }, [requested]);
        const nextState = result?.state;

        expect(result?.events ?? []).not.toContainEqual(expect.objectContaining({
            type: 'BONUS_DICE_SETTLED',
        }));
        expect(nextState?.core.pendingBonusDiceSettlement).toMatchObject({
            id: settlement.id,
            dice: [{ value: 4 }],
        });
        expect(nextState?.sys.interaction.current).toMatchObject({
            kind: 'dt:bonus-dice',
            playerId: '0',
        });
    });
});
