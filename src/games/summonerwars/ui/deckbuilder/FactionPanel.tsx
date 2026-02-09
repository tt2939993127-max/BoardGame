
import React from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { FACTION_CATALOG } from '../../config/factions';
import type { FactionId } from '../../domain/types';
import { CardSprite } from '../CardSprite';

interface FactionPanelProps {
    selectedFactionId: FactionId | null;
    onSelect: (factionId: FactionId) => void;
}

export const FactionPanel: React.FC<FactionPanelProps> = ({ selectedFactionId, onSelect }) => {
    const { t } = useTranslation('game-summonerwars');
    const availableFactions = FACTION_CATALOG.filter(f => f.selectable !== false);

    return (
        <div className="w-[18vw] h-full bg-black/40 backdrop-blur-md border-r border-white/10 flex flex-col">
            <div className="p-4 border-b border-white/10">
                <h2 className="text-amber-400 font-bold uppercase tracking-wider text-sm">
                    {t('deckBuilder.factions')}
                </h2>
            </div>

            <div className="flex-1 overflow-y-auto p-2 scrollbar-hide">
                <div className="flex flex-col gap-2">
                    {availableFactions.map(faction => {
                        const isSelected = selectedFactionId === faction.id;
                        // 获取图标/英雄的 atlas ID 的临时方法
                        const atlasId = `sw:${faction.id.replace('summoner-wars-', '')}:hero`; // 简化逻辑

                        return (
                            <motion.button
                                key={faction.id}
                                onClick={() => onSelect(faction.id)}
                                whileHover={{ scale: 1.02, x: 4 }}
                                whileTap={{ scale: 0.98 }}
                                className={clsx(
                                    'relative w-full text-left p-3 rounded-lg border transition-all duration-200 group overflow-hidden',
                                    isSelected
                                        ? 'bg-amber-900/40 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                                        : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20'
                                )}
                            >
                                {/* 选中指示器 */}
                                {isSelected && (
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-400" />
                                )}

                                <div className="flex items-center gap-3 relative z-10">
                                    {/* Faction Icon Placeholder or Hero Sprite */}
                                    <div className={clsx(
                                        "w-10 h-10 rounded-full border flex items-center justify-center overflow-hidden bg-black/50",
                                        isSelected ? "border-amber-400" : "border-white/20"
                                    )}>
                                        {/* 如果有有效的 atlasId，可以在这里放 CardSprite，或者只放首字母 */}
                                        <span className="text-lg font-bold text-white/50">{t(faction.nameKey).charAt(0)}</span>
                                    </div>

                                    <div className="flex-1">
                                        <div className={clsx(
                                            "font-bold text-sm transition-colors",
                                            isSelected ? "text-amber-100" : "text-white/70 group-hover:text-white"
                                        )}>
                                            {t(faction.nameKey)}
                                        </div>
                                    </div>
                                </div>
                            </motion.button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
