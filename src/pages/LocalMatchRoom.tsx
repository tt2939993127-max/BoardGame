import { useNavigate, useParams } from 'react-router-dom';
import { Client } from 'boardgame.io/react';
import { TicTacToe } from '../games/default/game';
import { TicTacToeBoard } from '../games/default/Board';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - Boardgame.io types mismatch sometimes
import { getGameById } from '../config/games.config';

// 本地游戏客户端配置
// debug: true 开启调试面板
// multiplayer: undefined (不做配置即为本地模式)
const LocalClient = Client({
    game: TicTacToe,
    board: TicTacToeBoard,
    debug: false, // 关闭默认调试面板，因为我们已经在 Board.tsx 中集成了自定义面板
    numPlayers: 2,
});

export const LocalMatchRoom = () => {
    const { gameId } = useParams();
    const navigate = useNavigate();

    const gameConfig = gameId ? getGameById(gameId) : undefined;

    if (!gameConfig) {
        return <div className="text-white">Game not found</div>;
    }

    return (
        <div className="relative w-full h-screen bg-black overflow-hidden font-sans">
            {/* Top Left: Back Button */}
            <div className="absolute top-4 left-4 z-50">
                <button
                    onClick={() => navigate('/')}
                    className="bg-black/40 backdrop-blur-md text-white/90 px-4 py-2 rounded-full text-sm font-bold border border-white/10 hover:bg-white/10 hover:border-white/30 transition-all flex items-center gap-2 group shadow-lg"
                >
                    <span className="group-hover:-translate-x-1 transition-transform">←</span>
                    返回大厅
                </button>
            </div>

            {/* Top Right: Local Mode Indicator */}
            <div className="absolute top-4 right-4 z-50">
                <div className="bg-neon-blue/20 backdrop-blur-md px-4 py-2 rounded-full border border-neon-blue/30 flex items-center gap-2 shadow-lg">
                    <span className="w-2 h-2 rounded-full bg-neon-blue animate-pulse" />
                    <span className="text-neon-blue font-bold text-sm">本地同屏模式</span>
                </div>
            </div>

            {/* Game Board - Full Screen */}
            <div className="w-full h-full">
                {/* 不传递 matchID 和 playerID，即为本地同屏模式 */}
                <LocalClient />
            </div>
        </div>
    );
};
