import { describe, expect, it } from 'vitest';
import { executePipeline } from '../../../engine/pipeline';
import { DiceThroneDomain } from '../domain';
import { TOKEN_IDS } from '../domain/ids';
import type { DiceThroneCommand, DiceThroneCore } from '../domain/types';
import {
    createHeroMatchup,
    createQueuedRandom,
    testSystems,
} from './test-utils';

const playerIds = ['0', '1'] as const;

const command = (
    type: DiceThroneCommand['type'],
    playerId: (typeof playerIds)[number],
    payload: Record<string, unknown> = {},
): DiceThroneCommand => ({
    type,
    playerId,
    payload,
    timestamp: 100,
});

describe('武僧 FAQ 规则回归', () => {
    it('闪避失败后仍保留已经激活的防御能力', () => {
        const state = createHeroMatchup('barbarian', 'monk')(playerIds as any, createQueuedRandom([4]));
        state.sys.phase = 'defensiveRoll';
        state.core.pendingAttack = {
            attackerId: '0',
            defenderId: '1',
            sourceAbilityId: 'fist-technique-5',
            isDefendable: true,
            damage: 5,
        };
        state.core.players['1'].tokens[TOKEN_IDS.EVASIVE] = 1;

        const selected = executePipeline(
            { domain: DiceThroneDomain, systems: testSystems },
            state,
            command('SELECT_ABILITY', '1', { abilityId: 'meditation' }),
            createQueuedRandom([4]),
            [...playerIds],
        );
        expect(selected.success).toBe(true);
        if (!selected.success) return;
        expect(selected.state.core.pendingAttack?.defenseAbilityId).toBe('meditation');

        selected.state.core.pendingDamage = {
            id: 'monk-evasive-faq',
            sourcePlayerId: '0',
            targetPlayerId: '1',
            originalDamage: 5,
            currentDamage: 5,
            sourceAbilityId: 'fist-technique-5',
            responseType: 'beforeDamageReceived',
            responderId: '1',
            isFullyEvaded: false,
        };

        const evasive = executePipeline(
            { domain: DiceThroneDomain, systems: testSystems },
            selected.state as { core: DiceThroneCore; sys: typeof state.sys },
            command('USE_TOKEN', '1', { tokenId: TOKEN_IDS.EVASIVE, amount: 1 }),
            createQueuedRandom([4]),
            [...playerIds],
        );
        expect(evasive.success).toBe(true);
        if (!evasive.success) return;
        expect(evasive.state.core.pendingAttack?.defenseAbilityId).toBe('meditation');
        expect(evasive.state.core.pendingDamage?.isFullyEvaded).toBe(false);
        expect(evasive.state.core.players['1'].tokens[TOKEN_IDS.EVASIVE]).toBe(0);
    });
});
