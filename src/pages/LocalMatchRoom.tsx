import { useMemo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { Client } from 'boardgame.io/react';
import { GAME_IMPLEMENTATIONS } from '../games/registry';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - Boardgame.io 类型有时不匹配
import { getGameById } from '../config/games.config';
import { GameHUD } from '../components/game/GameHUD';

export const LocalMatchRoom = () => {
    const { gameId } = useParams();
    const { t, i18n } = useTranslation('lobby');
    const [isGameNamespaceReady, setIsGameNamespaceReady] = useState(true);

    const gameConfig = gameId ? getGameById(gameId) : undefined;

    useEffect(() => {
        if (!gameId) return;
        const namespace = `game-${gameId}`;
        let isActive = true;

        setIsGameNamespaceReady(false);
        i18n.loadNamespaces(namespace)
            .then(() => {
                if (isActive) {
                    setIsGameNamespaceReady(true);
                }
            })
            .catch(() => {
                if (isActive) {
                    setIsGameNamespaceReady(true);
                }
            });

        return () => {
            isActive = false;
        };
    }, [gameId, i18n]);

    const LocalClient = useMemo(() => {
        if (!gameId || !GAME_IMPLEMENTATIONS[gameId]) return null;
        const impl = GAME_IMPLEMENTATIONS[gameId];
        return Client({
            game: impl.game,
            board: impl.board,
            debug: false,
            numPlayers: 2,
        }) as React.ComponentType<{ playerID?: string | null }>;
    }, [gameId]);

    if (!isGameNamespaceReady) {
        return (
            <div className="w-full h-screen bg-black flex items-center justify-center">
                <div className="text-white/70 text-sm">正在加载对局资源...</div>
            </div>
        );
    }

    if (!gameConfig) {
        return <div className="text-white">{t('matchRoom.noGame')}</div>;
    }

    return (
        <div className="relative w-full h-screen bg-black overflow-hidden font-sans">
            {/* 统一的游戏 HUD */}
            <GameHUD mode="local" />

            {/* 游戏棋盘 - 全屏 */}
            <div className="w-full h-full">
                {LocalClient ? <LocalClient playerID={null} /> : (
                    <div className="w-full h-full flex items-center justify-center text-white/50">
                        {t('matchRoom.noClient')}
                    </div>
                )}
            </div>
        </div>
    );
};
