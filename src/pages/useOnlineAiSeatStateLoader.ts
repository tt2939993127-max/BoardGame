import { useEffect, useMemo, useState } from 'react';
import * as matchApi from '../services/matchApi';
import type { GameManifestEntry } from '../games/manifest.types';
import type { AiSeatController } from '../engine/ai';
import { isMatchNotFoundError } from '../hooks/match/useMatchStatus';
import { logMobileRuntimeCritical } from '../lib/mobile/mobileRuntimeDebug';
import { loadOnlineAiSeatState } from './onlineAiSeats';

type UseOnlineAiSeatStateLoaderArgs = {
    gameId?: string;
    matchId?: string;
    gameConfig?: GameManifestEntry;
    isTutorialRoute: boolean;
    matchStatusIsHost: boolean;
    statusPlayerID: string | null;
    guestId: string;
    token?: string | null;
    localStorageTick: number;
};

type UseOnlineAiSeatStateLoaderResult = {
    onlineAiSeatControllers: Record<string, AiSeatController>;
    onlineAiSeatCredentials: Record<string, string>;
    hasOnlineAiSeat: boolean;
    onlineAiRematchAutoAcceptedPlayerIds: string[];
};

export function useOnlineAiSeatStateLoader(
    args: UseOnlineAiSeatStateLoaderArgs,
): UseOnlineAiSeatStateLoaderResult {
    const { gameId, matchId, gameConfig, isTutorialRoute } = args;
    const [onlineAiSeatControllers, setOnlineAiSeatControllers] = useState<Record<string, AiSeatController>>({});
    const shouldEnable = !isTutorialRoute && Boolean(matchId && gameId && gameConfig);

    useEffect(() => {
        if (!shouldEnable || !matchId || !gameId || !gameConfig) {
            return;
        }
        let cancelled = false;
        void matchApi.getMatch(gameId, matchId).then(async (matchInfo) => {
            if (cancelled) return;
            const state = await loadOnlineAiSeatState({
                gameConfig,
                matchInfo,
                storedAiSeatCredentials: {},
            });
            if (cancelled) return;
            setOnlineAiSeatControllers(state.seatControllers);
            logMobileRuntimeCritical('MatchRoom', 'online-ai-seat-state-load-finished', {
                gameId,
                matchId,
                authority: 'server-online-ai-executor',
                aiSeatIds: Object.entries(state.seatControllers)
                    .filter(([, controller]) => controller.type !== 'human')
                    .map(([playerId]) => playerId)
                    .sort(),
            });
        }).catch((error) => {
            if (cancelled || !isMatchNotFoundError(error)) return;
            setOnlineAiSeatControllers({});
        });
        return () => {
            cancelled = true;
        };
    }, [gameConfig, gameId, matchId, shouldEnable]);

    const hasOnlineAiSeat = useMemo(
        () => Object.values(onlineAiSeatControllers).some((controller) => controller.type !== 'human'),
        [onlineAiSeatControllers],
    );
    const onlineAiRematchAutoAcceptedPlayerIds = useMemo(
        () => Object.entries(onlineAiSeatControllers)
            .filter(([, controller]) => controller.type !== 'human')
            .map(([playerId]) => playerId)
            .sort((leftId, rightId) => leftId.localeCompare(rightId)),
        [onlineAiSeatControllers],
    );

    return {
        onlineAiSeatControllers: shouldEnable ? onlineAiSeatControllers : {},
        onlineAiSeatCredentials: {},
        hasOnlineAiSeat: shouldEnable && hasOnlineAiSeat,
        onlineAiRematchAutoAcceptedPlayerIds: shouldEnable ? onlineAiRematchAutoAcceptedPlayerIds : [],
    };
}
