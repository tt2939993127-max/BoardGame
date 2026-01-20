import type { ReactNode } from 'react';
import { NeonTicTacToeThumbnail } from '../components/lobby/thumbnails';

export interface GameConfig {
    id: string;
    title: string;
    description: string;
    category: '策略' | '休闲' | '派对' | '抽象';
    players: string;
    thumbnail: ReactNode;
    icon: string;
    enabled: boolean;
}

export const GAMES_REGISTRY: Record<string, GameConfig> = {
    'tictactoe': {
        id: 'tictactoe',
        title: '井字棋',
        description: '经典的X和O游戏。挑战AI或与朋友对战。',
        category: '策略',
        players: '2人游戏',
        thumbnail: <NeonTicTacToeThumbnail />,
        icon: '#',
        enabled: true
    },
    'dicethrone': {
        id: 'dicethrone',
        title: '王权骰铸 (Dice Throne)',
        description: '快节奏的骰子对战游戏。率领传奇英雄进行1v1对决。',
        category: '策略',
        players: '2人游戏',
        thumbnail: <div className="w-full h-full bg-slate-800 flex items-center justify-center text-4xl">🎲</div>, // Placeholder
        icon: '🎲',
        enabled: true
    },
};

export const getAllGames = () => Object.values(GAMES_REGISTRY).filter(g => g.enabled);
export const getGameById = (id: string) => GAMES_REGISTRY[id];
export const getGamesByCategory = (category: string) => {
    const games = getAllGames();
    if (category === 'All' || category === '全部游戏') return games;
    return games.filter(g => g.category === category);
};

export default GAMES_REGISTRY;
