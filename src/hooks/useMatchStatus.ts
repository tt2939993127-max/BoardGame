import { useState, useEffect, useCallback } from 'react';
import { LobbyClient } from 'boardgame.io/client';
import { GAME_SERVER_URL } from '../config/server';

const lobbyClient = new LobbyClient({ server: GAME_SERVER_URL });

export interface PlayerStatus {
    id: number;
    name?: string;
    isConnected?: boolean;
}

export function clearMatchCredentials(matchID: string): void {
    if (!matchID) return;
    localStorage.removeItem(`match_creds_${matchID}`);
}

export interface MatchStatus {
    matchID: string;
    players: PlayerStatus[];
    isLoading: boolean;
    error: string | null;
    myPlayerID: string | null;
    opponentName: string | null;
    opponentConnected: boolean;
    isHost: boolean; // 是否是房主（playerID === '0'）
}

/**
 * 房间状态 Hook
 * 用于实时获取房间信息和对手状态
 */
export function useMatchStatus(gameName: string | undefined, matchID: string | undefined, myPlayerID: string | null): MatchStatus {
    const [players, setPlayers] = useState<PlayerStatus[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // 获取房间状态
    const fetchMatchStatus = useCallback(async () => {
        if (!matchID) return;

        try {
            const effectiveGameName = gameName || 'tictactoe';
            const match = await lobbyClient.getMatch(effectiveGameName, matchID);
            setPlayers(match.players.map(p => ({
                id: p.id,
                name: p.name,
                isConnected: p.isConnected,
            })));
            setError(null);
        } catch (err) {
            console.error('获取房间状态失败:', err);
            setError('房间不存在或已被删除');
        } finally {
            setIsLoading(false);
        }
    }, [gameName, matchID]);

    // 定期轮询房间状态
    useEffect(() => {
        if (!matchID) return;

        fetchMatchStatus();

        // 每 3 秒轮询一次（可以后续改为 WebSocket）
        const interval = setInterval(fetchMatchStatus, 3000);

        return () => clearInterval(interval);
    }, [matchID, fetchMatchStatus]);

    // 计算对手信息
    const myIndex = myPlayerID ? parseInt(myPlayerID) : -1;
    const opponentIndex = myIndex === 0 ? 1 : 0;
    const opponent = players[opponentIndex];

    return {
        matchID: matchID || '',
        players,
        isLoading,
        error,
        myPlayerID,
        opponentName: opponent?.name || null,
        opponentConnected: opponent?.isConnected || false,
        isHost: myPlayerID === '0',
    };
}

/**
 * 离开房间（只取消占位，不删除房间）
 */
export async function leaveMatch(
    gameName: string,
    matchID: string,
    playerID: string,
    credentials: string
): Promise<boolean> {
    try {
        await lobbyClient.leaveMatch(gameName, matchID, {
            playerID,
            credentials,
        });
        // 清理本地凭证
        clearMatchCredentials(matchID);
        return true;
    } catch (err) {
        console.error('离开房间失败:', err);
        return false;
    }
}

/**
 * 重新加入房间（如果之前离开过）
 */
export async function rejoinMatch(
    gameName: string,
    matchID: string,
    playerID: string,
    playerName: string
): Promise<{ success: boolean; credentials?: string }> {
    try {
        const { playerCredentials } = await lobbyClient.joinMatch(gameName, matchID, {
            playerID,
            playerName,
        });

        // 保存新凭证
        const storageKey = `match_creds_${matchID}`;
        let existing: any = null;
        try {
            const raw = localStorage.getItem(storageKey);
            if (raw) existing = JSON.parse(raw);
        } catch {
            existing = null;
        }

        localStorage.setItem(storageKey, JSON.stringify({
            ...(existing && typeof existing === 'object' ? existing : {}),
            playerID,
            credentials: playerCredentials,
            matchID,
            gameName,
        }));

        return { success: true, credentials: playerCredentials };
    } catch (err) {
        console.error('重新加入房间失败:', err);
        clearMatchCredentials(matchID);
        return { success: false };
    }
}
