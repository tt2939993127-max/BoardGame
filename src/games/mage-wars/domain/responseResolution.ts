import type { PlayerId, ResolutionFrame } from '../../../engine/types';
import type { MageWarsSpellCasterRef } from './core-types';
import { isMageWarsSpellCasterRef } from './spellCasting';

export const MAGE_WARS_RESPONSE_FRAME_KIND = 'mage-wars.enchantment-response' as const;
export const MAGE_WARS_RESPONSE_METADATA_KEY = 'mageWarsResponse' as const;

export type MageWarsSpellResponseContext = {
    kind: 'spell-counter';
    responseId: string;
    responseCardId: 1825 | 1901;
    responseObjectId: string;
    responseOwnerId: PlayerId;
    triggeringPlayerId: PlayerId;
    caster: MageWarsSpellCasterRef;
    spellCardId: number;
    manaCost: number;
    objectManaCost?: number;
    playerManaCost?: number;
    spellType: string;
    castMode: 'quickcast' | 'action' | 'deployment';
    targetObjectId?: string;
    sourceCommandType: string;
};

export type MageWarsAttackResponseContext = {
    kind: 'attack-reversal';
    responseId: string;
    responseCardId: 1904;
    responseObjectId: string;
    responseOwnerId: PlayerId;
    attackerObjectId: string;
    defenderObjectId: string;
    attackProfileId: string;
    unavoidable: boolean;
    actionCost?: 'normal' | 'none';
    allowCounterstrikeOpportunity: boolean;
    removeGuardAfterMelee: boolean;
    counterstrikeSourceObjectId?: string;
    isCounterstrike: boolean;
    sourceCommandType: string;
};

export type MageWarsResponseContext = MageWarsSpellResponseContext | MageWarsAttackResponseContext;

export function createMageWarsResponseFrame(
    context: MageWarsResponseContext,
): ResolutionFrame {
    return {
        id: context.responseId,
        kind: MAGE_WARS_RESPONSE_FRAME_KIND,
        ownerGame: 'mage-wars',
        ownerSystem: 'mage-wars-interactions',
        ownerToken: context.responseId,
        ordering: 'explicit',
        status: 'running',
        phase: context.kind === 'spell-counter' ? 'spell-counter' : 'attack-evasion',
        phaseGate: 'block-advance-when-blocked',
        metadata: {
            [MAGE_WARS_RESPONSE_METADATA_KEY]: context,
        },
    };
}

export function readMageWarsResponseContext(frame: ResolutionFrame | undefined): MageWarsResponseContext | undefined {
    const value = frame?.metadata?.[MAGE_WARS_RESPONSE_METADATA_KEY];
    if (!value || typeof value !== 'object') return undefined;

    const candidate = value as Partial<MageWarsResponseContext>;
    if (
        candidate.kind !== 'spell-counter'
        && candidate.kind !== 'attack-reversal'
    ) return undefined;
    if (typeof candidate.responseId !== 'string' || typeof candidate.responseObjectId !== 'string') return undefined;
    if (typeof candidate.responseOwnerId !== 'string') return undefined;
    if (candidate.kind === 'spell-counter') {
        if (
            (candidate.responseCardId !== 1825 && candidate.responseCardId !== 1901)
            || typeof candidate.triggeringPlayerId !== 'string'
            || !isMageWarsSpellCasterRef(candidate.caster)
            || typeof candidate.spellCardId !== 'number'
            || typeof candidate.manaCost !== 'number'
            || typeof candidate.spellType !== 'string'
            || typeof candidate.castMode !== 'string'
            || (candidate.responseCardId === 1901 && typeof candidate.targetObjectId !== 'string')
            || typeof candidate.sourceCommandType !== 'string'
        ) return undefined;
        return candidate as MageWarsSpellResponseContext;
    }

    if (
        candidate.responseCardId !== 1904
        || typeof candidate.attackerObjectId !== 'string'
        || typeof candidate.defenderObjectId !== 'string'
        || typeof candidate.attackProfileId !== 'string'
        || typeof candidate.unavoidable !== 'boolean'
        || typeof candidate.allowCounterstrikeOpportunity !== 'boolean'
        || typeof candidate.removeGuardAfterMelee !== 'boolean'
        || typeof candidate.isCounterstrike !== 'boolean'
        || typeof candidate.sourceCommandType !== 'string'
    ) return undefined;
    return candidate as MageWarsAttackResponseContext;
}
