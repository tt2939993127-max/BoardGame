import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { getGamesByCategory, type GameConfig } from '../../config/games.config';
import { type Category } from '../layout/CategoryPills';
import { resolveGameDisplayName } from '../lobby/gameDetailsContent';
import clsx from 'clsx';
import { HOME_V2_PAGE_ZONE_STYLES } from './sceneLayout';

export const PAGE_ZONES = HOME_V2_PAGE_ZONE_STYLES;

const CATEGORIES: Category[] = ['All', 'card', 'dice', 'abstract', 'wargame', 'casual', 'tools'];
const CATEGORY_LABEL_KEYS: Record<Category, string> = {
    All: 'category.all',
    card: 'category.card',
    dice: 'category.dice',
    abstract: 'category.abstract',
    wargame: 'category.wargame',
    casual: 'category.casual',
    tools: 'category.tools',
};

interface LobbyDirectoryProps {
    activeCategory: Category;
    setActiveCategory: (cat: Category) => void;
    onGameClick: (id: string) => void;
}

export const LobbyDirectory = ({
    activeCategory,
    setActiveCategory,
    onGameClick,
}: LobbyDirectoryProps) => {
    const { t, i18n } = useTranslation(['lobby', 'common']);
    
    const filteredGames = useMemo(() => {
        const games = getGamesByCategory(activeCategory);
        return activeCategory === 'All' ? games.filter(g => g.type !== 'tool') : games;
    }, [activeCategory]);

    const getDisplayName = (game: GameConfig & { name?: string }) => {
        if (game.isUgc && game.name) return game.titleKey || game.name || game.id; // Fallback for UGC if needed
        if (typeof i18n?.getFixedT === 'function') {
            const fixedT = i18n.getFixedT('zh-CN', ['lobby', 'common']);
            return resolveGameDisplayName(game, fixedT);
        }
        return resolveGameDisplayName(game, t);
    };

    return (
        <>
            {/* 左页：品牌与导航 */}
            <div
                className="absolute flex flex-col pointer-events-auto"
                style={PAGE_ZONES.left}
            >
                <div className="flex-1 flex flex-col pt-4 px-4">
                    <div className="mb-8 text-center">
                        <h1 className="text-2xl md:text-3xl font-bold text-parchment-base-text font-serif tracking-widest mb-2">
                            {t('lobby:home.title')}
                        </h1>
                        <p className="text-[10px] text-parchment-light-text tracking-[0.2em] font-bold uppercase opacity-80">
                            {t('lobby:home.subtitle')}
                        </p>
                    </div>

                    {/* 继续对局占位 */}
                    <div className="mb-8">
                        <div className="text-xs font-bold text-[#8c7b64] uppercase tracking-widest mb-3 text-center border-b border-[#e5e0d0] pb-2">
                            {t('lobby:home.continueMatch', '继续对局')}
                        </div>
                        <div className="text-center text-xs text-parchment-light-text italic py-4">
                            {t('lobby:home.noActiveMatch', '暂无进行中的对局')}
                        </div>
                    </div>

                    {/* 游戏分类 */}
                    <div className="mt-auto mb-4">
                        <div className="text-xs font-bold text-[#8c7b64] uppercase tracking-widest mb-3 text-center border-b border-[#e5e0d0] pb-2">
                            {t('lobby:home.categories', '游戏分类')}
                        </div>
                        <div className="flex flex-wrap justify-center gap-2">
                            {CATEGORIES.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setActiveCategory(cat)}
                                    className={clsx(
                                        "px-3 py-1.5 text-xs font-bold rounded-full transition-colors cursor-pointer",
                                        activeCategory === cat 
                                            ? "bg-parchment-brown/10 text-parchment-base-text" 
                                            : "text-parchment-light-text hover:text-parchment-base-text hover:bg-parchment-cream/50"
                                    )}
                                >
                                    {t(`common:${CATEGORY_LABEL_KEYS[cat]}`)}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* 右页：游戏列表 */}
            <div
                className="absolute flex flex-col pointer-events-auto"
                style={PAGE_ZONES.right}
            >
                <div className="flex-1 overflow-y-auto custom-scrollbar py-4 px-2 grid grid-cols-2 gap-x-4 gap-y-6 content-start pr-4">
                    {filteredGames.map(game => (
                        <button
                            key={game.id}
                            onClick={() => onGameClick(game.id)}
                            className="flex flex-col items-center text-center group cursor-pointer"
                        >
                            <div className="w-full aspect-square rounded-xl overflow-hidden shadow-sm border border-[#e5e0d0] bg-[#f8f5ed] mb-2 group-hover:border-[#c5b599] group-hover:shadow-md transition-all duration-300">
                                {game.thumbnail}
                            </div>
                            <span className="text-xs font-bold text-[#4a3525] group-hover:text-[#2a1505] transition-colors leading-tight">
                                {getDisplayName(game)}
                            </span>
                            {game.category && (
                                <span className="text-[9px] text-[#8c7b64] mt-1">
                                    {t(`common:category.${game.category}`)}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>
        </>
    );
};
