/**
 * ActiveModifierBadge 组件
 *
 * 当攻击修正卡（timing: 'roll'）被打出后，在骰子区域上方显示一个小徽章，
 * 提示玩家该卡效果将在伤害结算时触发。类似实体桌游中将修正卡放在攻击区旁边。
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap } from 'lucide-react';
import type { ActiveModifier } from '../hooks/useActiveModifiers';

interface ActiveModifierBadgeProps {
    modifiers: ActiveModifier[];
}

export const ActiveModifierBadge: React.FC<ActiveModifierBadgeProps> = ({ modifiers }) => {
    const { t } = useTranslation('game-dicethrone');

    if (modifiers.length === 0) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.9 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="pointer-events-auto"
                title={t('modifierActive.tooltip')}
            >
                <div className="flex items-center justify-center gap-[0.4vw] px-[0.8vw] py-[0.3vw] rounded-full bg-gradient-to-r from-amber-900/90 to-orange-900/90 border border-amber-500/50 shadow-[0_0_1vw_rgba(245,158,11,0.3)] backdrop-blur-sm">
                    <Zap className="w-[0.9vw] h-[0.9vw] text-amber-400 fill-amber-400" />
                    <span className="text-amber-200 text-[0.7vw] font-bold tracking-wide whitespace-nowrap">
                        {t('modifierActive.label')}
                        {modifiers.length > 1 && (
                            <span className="text-amber-400 ml-[0.2vw]">×{modifiers.length}</span>
                        )}
                    </span>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};
