import { motion } from 'framer-motion';
import type { GameConfig } from '../../config/games.config';

interface GameListProps {
    games: GameConfig[];
    onGameClick: (id: string) => void;
}

export const GameList = ({ games, onGameClick }: GameListProps) => {
    return (
        <div className="flex flex-wrap justify-center gap-4 max-w-2xl mx-auto px-4">
            {games.map((game, index) => (
                <motion.div
                    key={game.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => onGameClick(game.id)}
                    className="
                        group relative w-[180px] cursor-pointer 
                        flex flex-col 
                        bg-[#fcfbf9] 
                        p-3
                        rounded-[4px]
                        shadow-[0_2px_8px_rgba(67,52,34,0.03)]
                        hover:shadow-[0_4px_12px_rgba(67,52,34,0.08)]
                        transition-transform duration-300 hover:-translate-y-1
                    "
                >
                    {/* Interactive Corner Borders - Updated Color to Light Taupe/Gold */}
                    <div className="absolute top-1 left-1 w-3 h-3 border-t-2 border-l-2 border-[#C8B69E] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="absolute top-1 right-1 w-3 h-3 border-t-2 border-r-2 border-[#C8B69E] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="absolute bottom-1 left-1 w-3 h-3 border-b-2 border-l-2 border-[#C8B69E] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="absolute bottom-1 right-1 w-3 h-3 border-b-2 border-r-2 border-[#C8B69E] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    {/* Thumbnail - Rectangular & Better usage of space */}
                    <div className="w-full aspect-[4/3] mb-3 relative overflow-hidden rounded-sm bg-slate-900 ring-1 ring-black/5">
                        <div className="w-full h-full transition-transform duration-500 group-hover:scale-110">
                            {game.thumbnail ? (
                                game.thumbnail
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-xl text-[#00F3FF]">
                                    {game.icon}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex flex-col flex-1 justify-between">
                        <div>
                            <h3 className="text-sm font-serif font-bold text-[#433422] leading-tight mb-1">
                                {game.title}
                            </h3>
                            <p className="text-[10px] text-[#8c7b64] leading-snug line-clamp-2 min-h-[2.5em]">
                                {game.description}
                            </p>
                        </div>

                        {/* Metadata Tag */}
                        <div className="mt-3 flex items-center justify-between border-t border-[#e5e0d0] pt-2">
                            <span className="text-[10px] font-bold text-[#6b5a45] bg-[#e5e0d0]/30 px-1.5 py-0.5 rounded">
                                {game.category}
                            </span>
                            <span className="text-[10px] text-[#8c7b64] italic">
                                {game.players}
                            </span>
                        </div>
                    </div>
                </motion.div>
            ))}
        </div>
    );
};
