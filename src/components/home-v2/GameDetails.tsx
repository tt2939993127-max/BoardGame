import React from 'react';
import { useTranslation } from 'react-i18next';
import { type GameConfig } from '../../config/games.config';
import { PAGE_ZONES } from './LobbyDirectory';
import { resolveGameDisplayName, resolveGameDescription } from '../lobby/gameDetailsContent';

interface GameDetailsProps {
    game: GameConfig | null;
    onBack: () => void;
}

export const GameDetails = ({ game, onBack }: GameDetailsProps) => {
    const { t, i18n } = useTranslation(['lobby', 'common']);

    if (!game) return null;

    const getDisplayName = (game: GameConfig) => {
        if (game.isUgc && (game as any).name) return game.titleKey || (game as any).name || game.id;
        if (typeof i18n?.getFixedT === 'function') {
            const fixedT = i18n.getFixedT('zh-CN', ['lobby', 'common']);
            return resolveGameDisplayName(game, fixedT);
        }
        return resolveGameDisplayName(game, t);
    };

    const getDescription = (game: GameConfig) => {
        if (game.isUgc && (game as any).description) return (game as any).description;
        if (typeof i18n?.getFixedT === 'function') {
            const fixedT = i18n.getFixedT('zh-CN', ['lobby', 'common']);
            return resolveGameDescription(game, fixedT);
        }
        return resolveGameDescription(game, t);
    };

    return (
        <>
            {/* 左页：返回按钮与游戏详情 */}
            <div 
                className="absolute flex flex-col pointer-events-auto"
                style={PAGE_ZONES.left}
            >
                <div className="flex-1 flex flex-col pt-4 px-4">
                    <button 
                        onClick={onBack}
                        className="self-start mb-4 text-xs font-bold text-parchment-light-text hover:text-parchment-base-text transition-colors cursor-pointer flex items-center gap-1"
                    >
                        ← {t('lobby:actions.backToDirectory', '返回目录')}
                    </button>
                    
                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                        <div className="w-full aspect-video rounded-xl overflow-hidden shadow-sm border border-[#e5e0d0] bg-[#f8f5ed] mb-4">
                            {game.thumbnail}
                        </div>
                        
                        <h2 className="text-xl font-bold text-parchment-base-text font-serif tracking-widest mb-2">
                            {getDisplayName(game)}
                        </h2>
                        
                        <div className="flex flex-wrap gap-2 mb-4">
                            {game.category && (
                                <span className="px-2 py-0.5 bg-parchment-cream text-parchment-light-text text-[10px] rounded border border-[#e5e0d0]">
                                    {t(`common:category.${game.category}`)}
                                </span>
                            )}
                            <span className="px-2 py-0.5 bg-parchment-cream text-parchment-light-text text-[10px] rounded border border-[#e5e0d0]">
                                {game.type === 'game' && game.playerOptions && game.playerOptions.length > 1
                                    ? `${Math.min(...game.playerOptions)}-${Math.max(...game.playerOptions)} ${t('common:game_details.people')}`
                                    : t(game.playersKey)}
                            </span>
                        </div>
                        
                        <p className="text-sm text-parchment-light-text leading-relaxed">
                            {getDescription(game)}
                        </p>
                    </div>
                </div>
            </div>

            {/* 右页：房间列表与操作区 */}
            <div 
                className="absolute flex flex-col pointer-events-auto"
                style={PAGE_ZONES.right}
            >
                <div className="flex-1 flex flex-col pt-12 px-4 pb-4">
                    <div className="flex justify-between items-center mb-4 border-b border-[#e5e0d0] pb-2">
                        <h3 className="text-sm font-bold text-[#8c7b64] uppercase tracking-widest">
                            {t('lobby:rooms.title', '游戏房间')}
                        </h3>
                        <button className="px-4 py-1.5 bg-parchment-brown text-white text-xs font-bold rounded shadow-sm hover:bg-[#6a4f38] transition-colors cursor-pointer">
                            {t('lobby:actions.createRoom', '创建房间')}
                        </button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto custom-scrollbar flex items-center justify-center">
                        <div className="text-center text-parchment-light-text italic text-sm">
                            {t('lobby:rooms.empty', '暂无可用房间')}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};
