import type { ReactNode } from 'react';
import { NeonTicTacToeThumbnail } from '../components/lobby/thumbnails';

export interface GameConfig {
    id: string;
    title: string;
    description: string;
    category: string;
    players: string;
    thumbnail?: ReactNode;
    icon?: ReactNode;
    enabled: boolean;
}

export const GAMES_REGISTRY: GameConfig[] = [
    {
        id: 'tictactoe',
        title: '井字棋',
        description: "经典的X和O游戏。挑战AI或与朋友对战。",
        category: '策略',
        players: '2人游戏',
        thumbnail: <NeonTicTacToeThumbnail />,
        enabled: true,
    },
    // 未来可以在这里添加更多游戏
    // {
    //     id: 'chess',
    //     title: 'Chess',
    //     description: 'The timeless strategy game. Checkmate your opponent.',
    //     category: 'Strategy',
    //     players: '2 Players',
    //     icon: <span className="text-2xl">♟️</span>,
    //     enabled: false,
    // },
];

/**
 * 根据 ID 获取游戏配置
 */
export const getGameById = (id: string): GameConfig | undefined => {
    return GAMES_REGISTRY.find(game => game.id === id);
};

/**
 * 获取所有已启用的游戏
 */
export const getEnabledGames = (): GameConfig[] => {
    return GAMES_REGISTRY.filter(game => game.enabled);
};

/**
 * 根据分类筛选游戏
 */
export const getGamesByCategory = (category: string): GameConfig[] => {
    if (category === 'All') {
        return getEnabledGames();
    }
    return GAMES_REGISTRY.filter(game => game.enabled && game.category === category);
};
