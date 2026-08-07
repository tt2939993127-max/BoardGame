import { resolveCurrentTurnPlayerId } from '../sessionContext';
import type { MatchState } from '../types';

export type SeatControllerLike = {
    type?: string;
};

export type LocalPregameControlContext = {
    state: unknown;
    seatControllers: Record<string, SeatControllerLike>;
    localPlayerId?: string | null;
};

export type LocalPregameControlResolver = (args: LocalPregameControlContext) => string | null;

/**
 * 本地热座运行中的实际操作者解析。
 *
 * 只用于 LocalGameProvider 决定当前页面代哪个座位显示和发命令；在线 transport
 * 仍以已认证的 socket 玩家为唯一命令执行者。
 */
export type LocalRuntimeControlResolver = (args: {
    state: MatchState<unknown>;
    fallbackPlayerId: string | null;
}) => string | null | undefined;

export function resolveFollowCurrentTurnPlayerId(core: unknown): string | null {
    return resolveCurrentTurnPlayerId(core);
}

export function resolveLocalPregameControlledPlayerId(args: {
    state: unknown;
    seatControllers: Record<string, SeatControllerLike>;
    localPlayerId?: string | null;
    resolver?: LocalPregameControlResolver;
}): string | null {
    return args.resolver?.({
        state: args.state,
        seatControllers: args.seatControllers,
        localPlayerId: args.localPlayerId,
    }) ?? null;
}
