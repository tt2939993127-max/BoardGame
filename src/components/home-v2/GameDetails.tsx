import React from 'react';
import { useTranslation } from 'react-i18next';
import { type GameConfig } from '../../config/games.config';
import { resolveGameDisplayName, resolveGameDescription } from '../lobby/gameDetailsContent';

const getDisplayName = (game: GameConfig, t: any, i18n: any) => {
    if (game.isUgc && (game as any).name) return game.titleKey || (game as any).name || game.id;
    if (typeof i18n?.getFixedT === 'function') {
        const fixedT = i18n.getFixedT('zh-CN', ['lobby', 'common']);
        return resolveGameDisplayName(game, fixedT);
    }
    return resolveGameDisplayName(game, t);
};

const getDescription = (game: GameConfig, t: any, i18n: any) => {
    if (game.isUgc && (game as any).description) return (game as any).description;
    if (typeof i18n?.getFixedT === 'function') {
        const fixedT = i18n.getFixedT('zh-CN', ['lobby', 'common']);
        return resolveGameDescription(game, fixedT);
    }
    return resolveGameDescription(game, t);
};

export interface LeftProps {
    game: GameConfig | null;
    onBack: () => void;
}

export const Left = ({ game, onBack }: LeftProps) => {
    const { t, i18n } = useTranslation(['lobby', 'common']);

    if (!game) return null;

    const playerLabel = game.type === 'game' && game.playerOptions && game.playerOptions.length > 1
        ? `${Math.min(...game.playerOptions)}-${Math.max(...game.playerOptions)} ${t('common:game_details.people')}`
        : t(game.playersKey);

    return (
        <div className="pointer-events-auto flex h-full w-full flex-col gap-[3.4%] text-[#5b3822]">
            <div className="flex items-center justify-between gap-[8px]">
                <button
                    onClick={onBack}
                    className="rounded-full border border-[#d7bc98]/70 bg-[#f8ecd8]/90 px-[10px] py-[5px] text-[clamp(10px,0.82vw,11px)] font-semibold text-[#7a5638] transition-[transform,background-color] duration-200 hover:-translate-y-[1px] hover:bg-[#efddbe]"
                >
                    ← {t('lobby:actions.backToDirectory', '返回目录')}
                </button>
                <div className="text-[clamp(9px,0.76vw,10px)] font-semibold tracking-[0.16em] text-[#8e6b4b]">
                    游戏图鉴
                </div>
            </div>

            <div className="custom-scrollbar flex-1 overflow-y-auto pr-[1.5%]">
                <div className="mb-[1.8%] text-[clamp(9px,0.74vw,10px)] font-semibold tracking-[0.16em] text-[#8f6847]">
                    书页条目
                </div>
                <h2 className="mb-[3.2%] text-[clamp(18px,1.8vw,24px)] font-bold leading-[1.08] text-[#5b3822]">
                    {getDisplayName(game, t, i18n)}
                </h2>

                <div className="mb-[4.4%] border-b border-[#d8b38a]/55 pb-[3.8%]">
                    <div className="flex flex-wrap gap-x-[12px] gap-y-[4px] text-[clamp(10px,0.82vw,11px)] text-[#77563a]">
                        {game.category ? (
                            <span>
                                <span className="mr-[6px] font-semibold text-[#8c6746]">类型</span>
                                {t(`common:category.${game.category}`)}
                            </span>
                        ) : null}
                        <span>
                            <span className="mr-[6px] font-semibold text-[#8c6746]">人数</span>
                            {playerLabel}
                        </span>
                    </div>
                </div>

                <div>
                    <div className="mb-[2.6%] text-[clamp(9px,0.74vw,10px)] font-semibold tracking-[0.14em] text-[#8d6747]">
                        玩法概览
                    </div>
                    <p className="text-[clamp(11px,0.84vw,12px)] leading-[1.72] text-[#75573f]">
                        {getDescription(game, t, i18n)}
                    </p>
                </div>
            </div>
        </div>
    );
};

export interface RightProps {
    game: GameConfig | null;
}

export const Right = ({ game }: RightProps) => {
    const { t } = useTranslation(['lobby', 'common']);

    if (!game) return null;

    const displayName = resolveGameDisplayName(game, t, game.id);

    return (
        <div className="pointer-events-auto flex h-full w-full flex-col gap-[3.6%] text-[#5b3822]">
            <div>
                <div className="mb-[1.4%] text-[clamp(9px,0.74vw,10px)] font-semibold tracking-[0.16em] text-[#8f6847]">
                    对局入口
                </div>
                <div className="text-[clamp(18px,1.8vw,24px)] font-bold leading-[1.08] text-[#5b3822]">
                    {t('lobby:rooms.title', '游戏房间')}
                </div>
            </div>

            <div className="border-b border-[#d8b38a]/55 pb-[4.2%]">
                <div className="mb-[2.2%] text-[clamp(10px,0.82vw,11px)] font-semibold tracking-[0.14em] text-[#8a6243]">
                    立即开局
                </div>
                <div className="mb-[4.4%] text-[clamp(11px,0.84vw,12px)] leading-[1.66] text-[#7c5c42]">
                    现在创建一间 {displayName} {t('lobby:rooms.title', '游戏房间')}，邀请好友加入或等待路人匹配。
                </div>
                <button className="rounded-[14px] border border-[#8d5b35] bg-[linear-gradient(180deg,_#9d6a43_0%,_#7f5435_100%)] px-[15px] py-[9px] text-[clamp(11px,0.84vw,12px)] font-bold text-[#fff4e6] shadow-[0_8px_16px_rgba(93,56,28,0.14)] transition-[transform,filter] duration-200 hover:-translate-y-[1px] hover:brightness-105">
                    {t('lobby:actions.createRoom', '创建房间')}
                </button>
            </div>

            <div className="border-b border-[#d8b38a]/55 pb-[3.4%]">
                <div className="mb-[2.2%] text-[clamp(9px,0.74vw,10px)] font-semibold tracking-[0.14em] text-[#8f6847]">
                    房间告示板
                </div>
                <div className="rounded-[12px] bg-[#f6e7cb]/52 px-[5%] py-[4.8%] text-[clamp(10px,0.82vw,11px)] font-semibold text-[#7a5638]">
                    {t('lobby:rooms.empty', '暂无活跃房间')}
                </div>
            </div>
        </div>
    );
};

export const GameDetails = {
    Left,
    Right
};
