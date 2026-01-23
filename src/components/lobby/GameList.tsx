import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import type { GameConfig } from '../../config/games.config';

interface GameListProps {
    games: GameConfig[];
    onGameClick: (id: string) => void;
}

export const GameList = ({ games, onGameClick }: GameListProps) => {
    const { t } = useTranslation(['lobby', 'common']);
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6 w-full max-w-full">
            {games.map((game, index) => (
                <motion.div
                    key={game.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => onGameClick(game.id)}
                    className="
                        group relative cursor-pointer 
                        flex flex-col 
                        bg-[#fcfbf9] 
                        p-[11px]
                        rounded-sm
                        shadow-[0_2px_8px_rgba(67,52,34,0.04)]
                        hover:shadow-[0_4px_16px_rgba(67,52,34,0.1)]
                        transition-all duration-300 hover:-translate-y-1
                    "
                >
                    {/* Interactive Corner Borders - 强化视觉效果 & 绝对居中对称 */}
                    <div className="absolute top-[5.5px] left-[5.5px] w-2 h-2 border-t-2 border-l-2 border-[#C8B69E] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="absolute top-[5.5px] right-[5.5px] w-2 h-2 border-t-2 border-r-2 border-[#C8B69E] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="absolute bottom-[5.5px] left-[5.5px] w-2 h-2 border-b-2 border-l-2 border-[#C8B69E] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="absolute bottom-[5.5px] right-[5.5px] w-2 h-2 border-b-2 border-r-2 border-[#C8B69E] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    {/* Thumbnail - Rectangular & Better usage of space */}
                    <div className="w-full aspect-[4/3] mb-2 relative overflow-hidden rounded-sm bg-slate-900 ring-1 ring-black/5">
                        <div className="w-full h-full transition-transform duration-500 group-hover:scale-110">
                            {game.thumbnail ? (
                                game.thumbnail
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-3xl text-[#00F3FF]">
                                    {game.icon}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex flex-col flex-1 justify-between">
                        <div>
                            <h3 className="text-sm font-serif font-bold text-[#433422] leading-tight mb-1">
                                {t(game.titleKey, { defaultValue: game.titleKey })}
                            </h3>
                            <p className="text-[11px] text-[#8c7b64] leading-snug line-clamp-2 min-h-[2.8em]">
                                {t(game.descriptionKey, { defaultValue: game.descriptionKey })}
                            </p>
                        </div>

                        {/* Metadata Tag */}
                        <div className="mt-3 flex items-center justify-between border-t border-[#e5e0d0] pt-3">
                            <span className="text-[10px] font-bold text-[#6b5a45] bg-[#e5e0d0]/30 px-1.5 py-0.5 rounded-[2px]">
                                {t(`common:category.${game.category}`)}
                            </span>
                            <span className="text-[10px] text-[#8c7b64] italic">
                                {t(game.playersKey, { defaultValue: game.playersKey })}
                            </span>
                        </div>
                    </div>
                </motion.div>
            ))}
        </div>
    );
};
