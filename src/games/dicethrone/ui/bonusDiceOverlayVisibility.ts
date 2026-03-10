import type { PlayerId } from '../../../engine/types';
import type { PendingBonusDiceSettlement } from '../domain/types';
import type { CardSpotlightItem } from './CardSpotlightOverlay';

const CARD_SPOTLIGHT_MATCH_THRESHOLD_MS = 1500;

function normalizePlayerId(value: PlayerId | string | number | null | undefined): string {
    if (value === null || value === undefined) return '';
    const raw = String(value);
    const match = raw.match(/(\d+)$/);
    return match ? match[1] : raw;
}

function parseDisplayOnlySettlementTimestamp(settlementId: string | undefined): number | null {
    if (!settlementId) return null;
    const match = settlementId.match(/-(\d+)$/);
    if (!match) return null;
    const parsed = Number(match[1]);
    return Number.isFinite(parsed) ? parsed : null;
}

export interface PendingBonusOverlayVisibilityArgs {
    settlement?: PendingBonusDiceSettlement;
    cardSpotlightQueue: CardSpotlightItem[];
    viewerPlayerId: PlayerId | string;
}

export function shouldSuppressPendingDisplayOnlyBonusOverlay({
    settlement,
    cardSpotlightQueue,
    viewerPlayerId,
}: PendingBonusOverlayVisibilityArgs): boolean {
    if (!settlement?.displayOnly) return false;

    const viewerId = normalizePlayerId(viewerPlayerId);
    const attackerId = normalizePlayerId(settlement.attackerId);
    if (!attackerId || viewerId === attackerId) return false;

    const currentSpotlight = cardSpotlightQueue[0];
    if (!currentSpotlight) return false;
    if (normalizePlayerId(currentSpotlight.playerId) !== attackerId) return false;

    const settlementTimestamp = parseDisplayOnlySettlementTimestamp(settlement.id);
    if (settlementTimestamp === null) return false;
    if (Math.abs(currentSpotlight.timestamp - settlementTimestamp) > CARD_SPOTLIGHT_MATCH_THRESHOLD_MS) {
        return false;
    }

    const spotlightDiceCount = currentSpotlight.bonusDice?.length ?? 0;
    const settlementDiceCount = settlement.dice.length;
    return spotlightDiceCount >= settlementDiceCount && settlementDiceCount > 0;
}
