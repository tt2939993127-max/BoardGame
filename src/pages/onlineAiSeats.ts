import type { GameManifestEntry } from '../games/manifest.types';
import { normalizeLocalMatchPreferences, type AiSeatController } from '../engine/ai';
import type { MatchInfo } from '../services/matchApi';

export type OnlineAiSeatState = {
    seatControllers: Record<string, AiSeatController>;
    seatCredentials: Record<string, string>;
};

type LoadOnlineAiSeatStateArgs = {
    gameConfig: GameManifestEntry;
    matchInfo: MatchInfo;
    storedAiSeatCredentials: Record<string, string>;
    claimMissingSeatCredential?: (playerId: string) => Promise<string>;
    onClaimError?: (playerId: string, error: unknown) => void;
};

const toPlainRecord = (value: unknown): Record<string, unknown> => (
    value && typeof value === 'object' && !Array.isArray(value)
        ? value as Record<string, unknown>
        : {}
);

export const isAiSeatController = (controller: AiSeatController | undefined): boolean => (
    Boolean(controller) && controller.type !== 'human'
);

export const haveAiSeatCredentialsChanged = (
    prev: Record<string, string>,
    next: Record<string, string>,
): boolean => {
    const prevKeys = Object.keys(prev);
    const nextKeys = Object.keys(next);
    if (prevKeys.length !== nextKeys.length) {
        return true;
    }
    return nextKeys.some((key) => prev[key] !== next[key]);
};

export async function loadOnlineAiSeatState({
    gameConfig,
    matchInfo,
    storedAiSeatCredentials,
    claimMissingSeatCredential,
    onClaimError,
}: LoadOnlineAiSeatStateArgs): Promise<OnlineAiSeatState> {
    const setupData = toPlainRecord(matchInfo.setupData);
    const rawSeatControllers = toPlainRecord(setupData.seatControllers);
    const rawSetupSelections = toPlainRecord(setupData.setupSelections);
    const seatControllers = normalizeLocalMatchPreferences(gameConfig, {
        numPlayers: matchInfo.players.length,
        seatControllers: rawSeatControllers,
        setupSelections: rawSetupSelections,
    }).seatControllers;

    const seatCredentials: Record<string, string> = { ...storedAiSeatCredentials };
    if (claimMissingSeatCredential) {
        for (let index = 0; index < matchInfo.players.length; index += 1) {
            const playerId = String(index);
            if (!isAiSeatController(seatControllers[playerId]) || seatCredentials[playerId]) {
                continue;
            }
            try {
                const credentials = await claimMissingSeatCredential(playerId);
                if (credentials) {
                    seatCredentials[playerId] = credentials;
                }
            } catch (error) {
                onClaimError?.(playerId, error);
            }
        }
    }

    return {
        seatControllers,
        seatCredentials,
    };
}
