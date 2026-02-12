/**
 * UGC 远程宿主 Board（Remote Host）
 *
 * 仅透传命令与状态，不在客户端执行 rulesCode。
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { BoardProps } from 'boardgame.io/react';
import type { MatchState } from '../../engine/types';
import type { UGCGameState, PlayerId } from '../sdk/types';
import { createHostBridge, type UGCHostBridge } from '../runtime/hostBridge';
import { attachBuilderPreviewConfig, type BuilderPreviewConfig } from '../runtime/previewConfig';

export interface UgcRemoteHostBoardOptions {
    packageId: string;
    viewUrl?: string | null;
    allowedOrigins?: string[];
    previewConfig?: BuilderPreviewConfig;
}

const DEFAULT_RUNTIME_VIEW_URL = '/dev/ugc/runtime-view';

export const createUgcRemoteHostBoard = (options: UgcRemoteHostBoardOptions) => {
    const { packageId, viewUrl, allowedOrigins, previewConfig } = options;
    const iframeSrc = viewUrl && viewUrl.trim() ? viewUrl.trim() : DEFAULT_RUNTIME_VIEW_URL;

    const UgcRemoteHostBoard = ({ G, ctx, moves, playerID, matchID, credentials }: BoardProps<MatchState<UGCGameState>>) => {
        const iframeRef = useRef<HTMLIFrameElement | null>(null);
        const bridgeRef = useRef<UGCHostBridge | null>(null);
        const stateRef = useRef<UGCGameState | null>(null);
        const buildStateRef = useRef<(() => UGCGameState) | null>(null);
        const handleCommandRef = useRef<((commandType: string, playerId: PlayerId, params: Record<string, unknown>) =>
            Promise<{ success: boolean; error?: string }>) | null>(null);
        const [iframeReady, setIframeReady] = useState(false);
        const [runtimeError, setRuntimeError] = useState<string | null>(null);

        const coreState = (G?.core ?? {}) as Partial<UGCGameState>;
        const corePlayers = (coreState.players && typeof coreState.players === 'object')
            ? coreState.players
            : {};

        const playerIds = useMemo<PlayerId[]>(() => {
            const playOrder = (ctx.playOrder as Array<string | number> | undefined) ?? [];
            const normalized = playOrder.map((id) => String(id));
            if (normalized.length > 0) return normalized;
            return Object.keys(corePlayers);
        }, [ctx.playOrder, corePlayers]);

        const currentPlayerId = useMemo<PlayerId>(() => {
            if (coreState.activePlayerId) return coreState.activePlayerId;
            if (ctx.currentPlayer !== undefined && ctx.currentPlayer !== null) {
                return String(ctx.currentPlayer);
            }
            return playerIds[0] ?? '';
        }, [coreState.activePlayerId, ctx.currentPlayer, playerIds]);

        const buildState = useCallback((): UGCGameState => {
            const phase = typeof coreState.phase === 'string' ? coreState.phase : (ctx.phase ?? '');
            const turnNumber = typeof coreState.turnNumber === 'number' ? coreState.turnNumber : (ctx.turn ?? 0);
            const ctxGameOver = ctx.gameover && typeof ctx.gameover === 'object'
                ? (ctx.gameover as { winner?: PlayerId; draw?: boolean })
                : undefined;
            const gameOver = coreState.gameOver ?? ctxGameOver;
            const baseState: UGCGameState = {
                phase,
                activePlayerId: coreState.activePlayerId ?? currentPlayerId,
                turnNumber,
                players: corePlayers,
                publicZones: coreState.publicZones ?? {},
                gameOver,
            };
            if (previewConfig) {
                return attachBuilderPreviewConfig(baseState, previewConfig);
            }
            return baseState;
        }, [coreState, corePlayers, ctx.phase, ctx.turn, ctx.gameover, currentPlayerId, previewConfig]);

        useEffect(() => {
            buildStateRef.current = buildState;
        }, [buildState]);

        useEffect(() => {
            const nextState = buildState();
            // 只有状态真正变化时才发送更新
            if (JSON.stringify(stateRef.current) !== JSON.stringify(nextState)) {
                stateRef.current = nextState;
                bridgeRef.current?.sendStateUpdate();
            }
        }, [buildState]);

        const handleCommand = useCallback(async (
            commandType: string,
            runtimePlayerId: PlayerId,
            params: Record<string, unknown>
        ) => {
            console.log(`[UGC Board] handleCommand: ${commandType}`, { 
                runtimePlayerId, 
                currentPlayerID: playerID,
                params 
            });

            // UGC online 模式：直接调用 move，让 boardgame.io 处理权限验证
            // 注意：boardgame.io 会自动使用当前客户端的 playerID
            // 如果需要跨玩家操作，应该为每个玩家创建独立的客户端连接

            const moveFn = (moves as Record<string, (payload: unknown) => void>)[commandType];
            console.log(`[UGC Board] Available moves:`, Object.keys(moves || {}));
            console.log(`[UGC Board] Move function exists:`, !!moveFn);
            if (!moveFn) {
                return { success: false, error: `未知命令: ${commandType}` };
            }
            try {
                moveFn(params);
                console.log(`[UGC Board] Command executed successfully`);
                return { success: true };
            } catch (error) {
                console.error(`[UGC Board] Command execution error:`, error);
                return { success: false, error: error instanceof Error ? error.message : '命令执行失败' };
            }
        }, [moves, playerID]);

        useEffect(() => {
            handleCommandRef.current = handleCommand;
        }, [handleCommand]);

        const commandHandler = useCallback((
            commandType: string,
            playerId: PlayerId,
            params: Record<string, unknown>
        ) => handleCommandRef.current?.(commandType, playerId, params)
            ?? Promise.resolve({ success: false, error: '命令处理器未就绪' }), []);

        useEffect(() => {
            if (!iframeReady || !iframeRef.current) return undefined;

            const bridge = createHostBridge({
                iframe: iframeRef.current,
                packageId,
                currentPlayerId,
                playerIds,
                allowedOrigins,
                onCommand: commandHandler,
                getState: () => stateRef.current ?? buildStateRef.current?.() ?? buildState(),
                onError: (error) => setRuntimeError(error),
            });
            bridge.start();
            bridgeRef.current = bridge;

            return () => {
                bridge.stop();
                bridgeRef.current = null;
            };
        }, [iframeReady, packageId, currentPlayerId, playerIds, allowedOrigins, commandHandler]);

        if (runtimeError) {
            return (
                <div className="flex h-full w-full items-center justify-center bg-slate-950 text-red-300 text-xs">
                    {runtimeError}
                </div>
            );
        }

        return (
            <div className="relative h-full w-full bg-slate-950">
                <iframe
                    ref={iframeRef}
                    title={`UGC Remote Host ${packageId}`}
                    src={iframeSrc}
                    className="h-full w-full border-0"
                    onLoad={() => setIframeReady(true)}
                />
            </div>
        );
    };

    UgcRemoteHostBoard.displayName = `UgcRemoteHostBoard(${packageId})`;
    return UgcRemoteHostBoard;
};
