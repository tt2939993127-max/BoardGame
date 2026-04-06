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

    return (
        <div className="flex h-full w-full flex-col px-[11%] pt-[30%] pb-[8%] text-[#5b3822] pointer-events-auto">
            <button
                onClick={onBack}
                className="mb-[6%] self-start rounded-full bg-[#f2dfc1]/90 px-[12px] py-[7px] text-[clamp(10px,0.96vw,13px)] font-bold text-[#7a5638] transition-colors hover:bg-[#ead2ad]"
            >
                ← {t('lobby:actions.backToDirectory', '返回目录')}
            </button>

            <div className="custom-scrollbar flex-1 overflow-y-auto pr-[2%]">
                <div className="mb-[6%] w-full overflow-hidden rounded-[18px] border border-[#d4b189] bg-[#fbf1df] shadow-[0_10px_24px_rgba(98,63,33,0.10)]">
                    {game.thumbnail}
                </div>

                <h2 className="mb-[4%] text-[clamp(20px,2.3vw,30px)] font-bold leading-[1.08] text-[#5b3822]">
                    {getDisplayName(game, t, i18n)}
                </h2>

                <div className="mb-[6%] flex flex-wrap gap-[8px]">
                    {game.category && (
                        <span className="rounded-full border border-[#d6b28a] bg-[#f2dfc1] px-[10px] py-[4px] text-[clamp(10px,0.9vw,12px)] text-[#7a5638]">
                            {t(`common:category.${game.category}`)}
                        </span>
                    )}
                    <span className="rounded-full border border-[#d6b28a] bg-[#f2dfc1] px-[10px] py-[4px] text-[clamp(10px,0.9vw,12px)] text-[#7a5638]">
                        {game.type === 'game' && game.playerOptions && game.playerOptions.length > 1
                            ? `${Math.min(...game.playerOptions)}-${Math.max(...game.playerOptions)} ${t('common:game_details.people')}`
                            : t(game.playersKey)}
                    </span>
                </div>

                <p className="text-[clamp(11px,0.92vw,13px)] leading-[1.62] text-[#7a5d46]">
                    {getDescription(game, t, i18n)}
                </p>
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

    return (
        <div className="flex h-full w-full flex-col px-[10%] pt-[30%] pb-[10%] text-[#5b3822] pointer-events-auto">
            <div className="mb-[8%] flex items-center justify-between border-b border-[#d9b48c] pb-[4%]">
                <h3 className="text-[clamp(12px,1vw,16px)] font-bold tracking-[0.12em] text-[#7a5638]">
                    {t('lobby:rooms.title', '游戏房间')}
                </h3>
                <button className="rounded-full bg-[#8b5e3b] px-[12px] py-[8px] text-[clamp(10px,0.9vw,12px)] font-bold text-[#fff7eb] transition-colors hover:bg-[#6f4b31]">
                    {t('lobby:actions.createRoom', '创建房间')}
                </button>
            </div>

            <div className="custom-scrollbar flex flex-1 items-center justify-center overflow-y-auto rounded-[18px] border border-[#d8b38a] bg-[#f6e8d1]/70">
                <div className="px-[8%] text-center text-[clamp(11px,0.94vw,13px)] italic text-[#8a6a4f]">
                    {t('lobby:rooms.empty', '暂无可用房间')}
                </div>
            </div>
        </div>
    );
};

export const GameDetails = {
    Left,
    Right
};
