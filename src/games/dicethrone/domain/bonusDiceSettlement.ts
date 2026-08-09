import type { RandomFn } from '../../../engine/types';
import type { DiceThroneCore, DiceThroneEvent, PendingBonusDiceSettlement } from './types';

export interface BonusDiceSettlementHandlerContext {
    state: DiceThroneCore;
    settlement: PendingBonusDiceSettlement;
    timestamp: number;
    random?: RandomFn;
}

export interface BonusDiceSettlementHandlerResult {
    totalDamage?: number;
    thresholdTriggered?: boolean;
    followupEvents?: DiceThroneEvent[];
}

export type BonusDiceSettlementHandler = (
    context: BonusDiceSettlementHandlerContext,
) => BonusDiceSettlementHandlerResult | undefined;

const bonusDiceSettlementHandlers = new Map<string, BonusDiceSettlementHandler>();

export function registerBonusDiceSettlementHandler(
    settlementId: string,
    handler: BonusDiceSettlementHandler,
): void {
    bonusDiceSettlementHandlers.set(settlementId, handler);
}

export function getBonusDiceSettlementHandler(
    settlementId: string,
): BonusDiceSettlementHandler | undefined {
    return bonusDiceSettlementHandlers.get(settlementId);
}

export function canRerollBonusDiceSettlement(
    settlement: Pick<PendingBonusDiceSettlement, 'rerollCostTokenId' | 'rerollCostAmount' | 'rerollCount' | 'maxRerollCount' | 'ultimateLocked'> | undefined,
    tokens: Record<string, number> | undefined,
): boolean {
    if (!settlement) return false;
    if (settlement.ultimateLocked === true) return false;
    if (settlement.maxRerollCount !== undefined && settlement.rerollCount >= settlement.maxRerollCount) {
        return false;
    }

    const costAmount = settlement.rerollCostAmount ?? 1;
    return costAmount === 0 || (tokens?.[settlement.rerollCostTokenId] ?? 0) >= costAmount;
}
