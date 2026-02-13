/**
 * 大杀四方 (Smash Up) - 基地区域 + 随从卡片组件
 */

import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import type { SmashUpCore, BaseInPlay, MinionOnBase } from '../domain/types';
import { SU_COMMANDS } from '../domain/types';
import { getTotalEffectivePowerOnBase } from '../domain/ongoingModifiers';
import { getBaseDef, getMinionDef, getCardDef, resolveCardName, resolveCardText } from '../data/cards';
import { CardPreview } from '../../../components/common/media/CardPreview';
import { PLAYER_CONFIG } from './playerConfig';

// ============================================================================
// Base Zone: The "Battlefield"
// ============================================================================

export const BaseZone: React.FC<{
    base: BaseInPlay;
    baseIndex: number;
    core: SmashUpCore;
    turnOrder: string[];
    isDeployMode: boolean;
    isMinionSelectMode?: boolean;
    isMyTurn: boolean;
    myPlayerId: string | null;
    moves: Record<string, (payload?: unknown) => void>;
    onClick: () => void;
    onMinionSelect?: (minionUid: string, baseIndex: number) => void;
    onViewMinion: (defId: string) => void;
    onViewAction: (defId: string) => void;
    tokenRef?: (el: HTMLDivElement | null) => void;
    isTutorialTargetAllowed?: (targetId: string) => boolean;
}> = ({ base, baseIndex, core, turnOrder, isDeployMode, isMinionSelectMode, isMyTurn, myPlayerId, moves, onClick, onMinionSelect, onViewMinion, onViewAction, tokenRef, isTutorialTargetAllowed }) => {
    const { t } = useTranslation('game-smashup');
    const baseDef = getBaseDef(base.defId);
    const baseName = resolveCardName(baseDef, t) || base.defId;
    const baseText = resolveCardText(baseDef, t);
    const totalPower = getTotalEffectivePowerOnBase(core, base, baseIndex);
    const breakpoint = baseDef?.breakpoint || 20;
    const ratio = totalPower / breakpoint;
    const isNearBreak = ratio >= 0.8 && ratio < 1;
    const isAtBreak = ratio >= 1;

    // 分组
    const minionsByController: Record<string, MinionOnBase[]> = {};
    base.minions.forEach(m => {
        if (!minionsByController[m.controller]) minionsByController[m.controller] = [];
        minionsByController[m.controller].push(m);
    });


    return (
        <div className="relative flex flex-col items-center group/base mx-[1vw]">

            {/* --- ONGOING EFFECTS (above base card, absolute positioned) --- */}
            {base.ongoingActions && base.ongoingActions.length > 0 && (
                <div className="absolute -top-[6vw] left-1/2 -translate-x-1/2 flex items-center gap-[0.4vw] z-30">
                    {base.ongoingActions.map((oa, idx) => {
                        const actionDef = getCardDef(oa.defId);
                        const actionName = resolveCardName(actionDef, t) || oa.defId;
                        const pConf = PLAYER_CONFIG[parseInt(oa.ownerId) % PLAYER_CONFIG.length];
                        return (
                            <motion.div
                                key={oa.uid}
                                onClick={(e) => { e.stopPropagation(); onViewAction(oa.defId); }}
                                className={`relative w-[3.8vw] aspect-[0.714] bg-white rounded-[0.15vw] shadow-lg cursor-pointer
                                    hover:z-50 hover:scale-125 hover:-translate-y-[0.3vw] transition-all
                                    border-[0.12vw] ${pConf.border} ${pConf.shadow}`}
                                initial={{ y: 20, opacity: 0, scale: 0.6 }}
                                animate={{ y: 0, opacity: 1, scale: 1 }}
                                transition={{ type: 'spring', stiffness: 350, damping: 20, delay: idx * 0.06 }}
                            >
                                <div className="w-full h-full overflow-hidden rounded-[0.1vw]">
                                    <CardPreview
                                        previewRef={actionDef?.previewRef}
                                        className="w-full h-full object-cover"
                                        title={actionName}
                                    />
                                    {!actionDef?.previewRef && (
                                        <div className="absolute inset-0 flex items-center justify-center p-[0.15vw] bg-gradient-to-br from-purple-100 to-purple-50">
                                            <span className="text-[0.5vw] font-bold text-center text-slate-700 leading-tight line-clamp-2">
                                                {actionName}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* --- BASE CARD --- */}
            <div
                onClick={onClick}
                className={`
                    relative w-[14vw] aspect-[1.43] bg-white p-[0.4vw] shadow-sm rounded-sm transition-all duration-300 z-20
                    ${isDeployMode && !isMinionSelectMode
                        ? 'cursor-pointer rotate-0 scale-105 shadow-[0_0_2vw_rgba(255,255,255,0.4)] ring-4 ring-green-400'
                        : 'rotate-1 hover:rotate-0 hover:shadow-xl cursor-zoom-in'}
                `}
                style={{
                    backgroundImage: 'repeating-linear-gradient(45deg, #fff 0px, #fff 2px, #fdfdfd 2px, #fdfdfd 4px)',
                }}
            >
                {/* Inner Art Area */}
                <div className="w-full h-full bg-slate-200 border border-slate-300 overflow-hidden relative">
                    <CardPreview
                        previewRef={baseDef?.previewRef}
                        className="w-full h-full object-cover"
                        title={baseName}
                    />

                    {/* Fallback Text */}
                    {!baseDef?.previewRef && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-[0.5vw]">
                            <h3 className="font-black text-[1.2vw] text-slate-800 uppercase tracking-tighter rotate-[-2deg] leading-tight mb-[0.5vw]">
                                {baseName}
                            </h3>
                            <div className="bg-white/90 p-[0.3vw] shadow-sm transform rotate-1 border border-slate-200">
                                <p className="font-mono text-[0.6vw] text-slate-700 leading-tight">
                                    {baseText}
                                </p>
                            </div>
                            <div className="absolute bottom-[0.5vw] right-[0.5vw] font-black text-[1.5vw] text-slate-900/20">
                                {breakpoint}
                            </div>
                        </div>
                    )}
                </div>

                {/* Power Token */}
                <div className="absolute -top-[1.5vw] -right-[1.5vw] w-[4vw] h-[4vw] pointer-events-none z-30 flex items-center justify-center"
                    ref={tokenRef}
                >
                    <motion.div
                        className={`w-[3.5vw] h-[3.5vw] rounded-full flex items-center justify-center border-[0.2vw] border-dashed shadow-xl transform rotate-12 group-hover/base:scale-110 transition-transform ${isAtBreak
                            ? 'bg-green-600 border-green-300'
                            : isNearBreak
                                ? 'bg-amber-600 border-amber-300'
                                : 'bg-slate-900 border-white'
                            }`}
                        animate={
                            isAtBreak
                                ? { scale: [1, 1.15, 1], boxShadow: ['0 0 0px rgba(74,222,128,0)', '0 0 20px rgba(74,222,128,0.6)', '0 0 0px rgba(74,222,128,0)'] }
                                : isNearBreak
                                    ? { scale: [1, 1.06, 1] }
                                    : {}
                        }
                        transition={
                            isAtBreak
                                ? { duration: 1.2, repeat: Infinity, ease: 'easeInOut' }
                                : isNearBreak
                                    ? { duration: 0.8, repeat: Infinity, ease: 'easeInOut' }
                                    : {}
                        }
                    >
                        <div className={`text-[1.2vw] font-black ${isAtBreak ? 'text-white' : isNearBreak ? 'text-amber-100' : 'text-white'}`}>
                            {totalPower}
                        </div>
                        <div className="absolute -bottom-[0.5vw] bg-white text-slate-900 text-[0.6vw] font-bold px-[0.4vw] py-[0.1vw] rounded shadow-sm border border-slate-300 whitespace-nowrap">
                            / {breakpoint}
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* --- PLAYER COLUMNS CONTAINER --- */}
            <div className="flex items-start justify-center gap-[0.5vw] w-full pt-[0.5vw]">
                {turnOrder.map(pid => {
                    const minions = minionsByController[pid] || [];

                    // Calc Power
                    const total = minions.reduce((sum, m) => sum + m.basePower + m.powerModifier, 0);
                    const basePowerTotal = minions.reduce((sum, m) => sum + m.basePower, 0);
                    const modifierDelta = total - basePowerTotal;

                    const pConf = PLAYER_CONFIG[parseInt(pid) % PLAYER_CONFIG.length];

                    return (
                        <div key={pid} className="flex flex-col items-center min-w-[5.5vw] relative">

                            {/* --- MINIONS --- */}
                            {minions.length > 0 ? (
                                <div className="flex flex-col items-center isolate z-10">
                                    {minions.map((m, i) => (
                                        <MinionCard
                                            key={m.uid}
                                            minion={m}
                                            index={i}
                                            pid={pid}
                                            baseIndex={baseIndex}
                                            isMyTurn={isMyTurn}
                                            myPlayerId={myPlayerId}
                                            moves={moves}
                                            isMinionSelectMode={isMinionSelectMode}
                                            onMinionSelect={onMinionSelect}
                                            onView={() => onViewMinion(m.defId)}
                                            onViewAction={onViewAction}
                                            isTutorialTargetAllowed={isTutorialTargetAllowed}
                                        />
                                    ))}
                                </div>
                            ) : (
                                /* Empty Placeholder for Layout Stability */
                                <div className={`w-[5.5vw] h-[2vw] rounded-sm border md-2 border-dashed border-slate-300/30 ${isDeployMode && isMyTurn ? 'animate-pulse bg-white/5' : ''}`}>
                                    {isDeployMode && isMyTurn && myPlayerId === pid && minions.length === 0 && (
                                        <div className="w-full h-full flex items-center justify-center text-white/50 text-[0.8vw]">+</div>
                                    )}
                                </div>
                            )}

                            {/* --- SCORE (POWER) --- */}
                            <div className="mt-2 flex items-center justify-center gap-1 z-10 bg-slate-900/40 rounded-full px-2 py-0.5 backdrop-blur-sm">
                                <div className={`w-[0.6vw] h-[0.6vw] rounded-full ${pConf.bg}`} />
                                <span className={`text-[0.7vw] font-black leading-none ${modifierDelta > 0 ? 'text-green-300' :
                                    modifierDelta < 0 ? 'text-red-300' :
                                        'text-white'
                                    }`}>
                                    {total}
                                </span>
                            </div>

                        </div>
                    );
                })}
            </div>

        </div>
    );
};

// ============================================================================
// Minion Card
// ============================================================================

const MinionCard: React.FC<{
    minion: MinionOnBase;
    index: number;
    pid: string;
    baseIndex: number;
    isMyTurn: boolean;
    myPlayerId: string | null;
    moves: Record<string, (payload?: unknown) => void>;
    isMinionSelectMode?: boolean;
    onMinionSelect?: (minionUid: string, baseIndex: number) => void;
    onView: () => void;
    onViewAction: (defId: string) => void;
    isTutorialTargetAllowed?: (targetId: string) => boolean;
}> = ({ minion, index, pid, baseIndex, isMyTurn, myPlayerId, moves, isMinionSelectMode, onMinionSelect, onView, onViewAction, isTutorialTargetAllowed }) => {
    const { t } = useTranslation('game-smashup');
    const def = getMinionDef(minion.defId);
    const resolvedName = resolveCardName(def, t) || minion.defId;
    const conf = PLAYER_CONFIG[parseInt(pid) % PLAYER_CONFIG.length];

    // 天赋判定：有 talent 标签 + 本回合未使用 + 是我的随从 + 轮到我 + 教程允许
    const hasTalent = def?.abilityTags?.includes('talent') ?? false;
    const tutorialAllowed = isTutorialTargetAllowed ? isTutorialTargetAllowed(minion.uid) : true;
    const canUseTalent = hasTalent && !minion.talentUsed && isMyTurn && minion.controller === myPlayerId && tutorialAllowed;

    const seed = minion.uid.charCodeAt(0) + index;
    const rotation = (seed % 6) - 3;

    const style = {
        marginTop: index === 0 ? 0 : '-5.5vw',
        zIndex: index + 1,
        transform: `rotate(${rotation}deg)`,
    };

    const handleClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        // 随从选择模式：点击随从附着 ongoing 行动卡
        if (isMinionSelectMode && onMinionSelect) {
            onMinionSelect(minion.uid, baseIndex);
            return;
        }
        if (canUseTalent) {
            moves[SU_COMMANDS.USE_TALENT]?.({ minionUid: minion.uid, baseIndex });
        } else {
            onView();
        }
    }, [isMinionSelectMode, onMinionSelect, canUseTalent, moves, minion.uid, baseIndex, onView]);

    // 随从选择模式下的高亮
    const isSelectableMinion = !!isMinionSelectMode;

    return (
        <motion.div
            onClick={handleClick}
            className={`
                relative w-[5.5vw] aspect-[0.714] bg-white p-[0.2vw] rounded-[0.2vw] 
                transition-shadow duration-200 group hover:z-50 hover:scale-110 hover:rotate-0
                border-[0.15vw] shadow-md
                ${isSelectableMinion
                    ? 'cursor-pointer border-purple-400 ring-2 ring-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.6),0_0_30px_rgba(168,85,247,0.3)]'
                    : canUseTalent
                    ? 'cursor-pointer border-amber-400 ring-2 ring-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.6),0_0_30px_rgba(251,191,36,0.3)]'
                    : `cursor-zoom-in ${conf.border} ${conf.shadow}`}
            `}
            style={style}
            initial={{ scale: 0.3, y: -60, opacity: 0, rotate: -15 }}
            animate={isSelectableMinion
                ? { scale: 1, y: 0, opacity: 1, rotate: [rotation - 1, rotation + 1, rotation - 1], transition: { rotate: { repeat: Infinity, duration: 1.2, ease: 'easeInOut' } } }
                : canUseTalent
                ? { scale: 1, y: 0, opacity: 1, rotate: [rotation - 2, rotation + 2, rotation - 2], transition: { rotate: { repeat: Infinity, duration: 1.5, ease: 'easeInOut' } } }
                : { scale: 1, y: 0, opacity: 1, rotate: rotation }
            }
            transition={{ type: 'spring', stiffness: 350, damping: 20, delay: index * 0.05 }}
        >
            <div className="w-full h-full bg-slate-100 relative overflow-hidden">
                <CardPreview
                    previewRef={def?.previewRef}
                    className="w-full h-full object-cover"
                    title={resolvedName}
                />

                {!def?.previewRef && (
                    <div className="absolute inset-0 p-[0.2vw] flex items-center justify-center text-center bg-slate-50">
                        <p className="text-[0.6vw] font-bold leading-none text-slate-800 line-clamp-4">{resolvedName}</p>
                    </div>
                )}

                {/* 天赋可用时的发光叠层 */}
                {canUseTalent && (
                    <motion.div
                        className="absolute inset-0 pointer-events-none z-20 rounded-[0.1vw]"
                        animate={{ opacity: [0.15, 0.35, 0.15] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                        style={{ background: 'radial-gradient(circle, rgba(251,191,36,0.6) 0%, transparent 70%)' }}
                    />
                )}
            </div>

            {/* 力量徽章 - 增益绿色/减益红色 */}
            {((minion.powerModifier !== 0) || !def?.previewRef) && (
                <div className={`absolute -top-[0.4vw] -right-[0.4vw] w-[1.2vw] h-[1.2vw] rounded-full flex items-center justify-center text-[0.7vw] font-black text-white shadow-sm border border-white ${minion.powerModifier > 0 ? 'bg-green-600' : (minion.powerModifier < 0 ? 'bg-red-600' : 'bg-slate-700')} z-10`}>
                    {minion.basePower + minion.powerModifier}
                </div>
            )}

            {/* 天赋已使用标记 */}
            {hasTalent && minion.talentUsed && (
                <div className="absolute -bottom-[0.3vw] left-1/2 -translate-x-1/2 bg-slate-600 text-white text-[0.45vw] font-bold px-[0.3vw] py-[0.05vw] rounded-sm shadow-sm border border-white z-10 whitespace-nowrap">
                    {t('ui.talent_used')}
                </div>
            )}

            {/* 附着的 ongoing 行动卡（右侧小卡片） */}
            {minion.attachedActions && minion.attachedActions.length > 0 && (
                <div className="absolute top-0 -right-[2.2vw] flex flex-col gap-[0.2vw] z-20">
                    {minion.attachedActions.map((aa) => {
                        const actionDef = getCardDef(aa.defId);
                        const actionName = resolveCardName(actionDef, t) || aa.defId;
                        return (
                            <motion.div
                                key={aa.uid}
                                onClick={(e) => { e.stopPropagation(); onViewAction(aa.defId); }}
                                className="w-[1.8vw] aspect-[0.714] bg-white rounded-[0.1vw] shadow-md cursor-pointer
                                    hover:scale-150 hover:z-50 transition-transform
                                    border-[0.08vw] border-purple-400 ring-1 ring-purple-300/50"
                                initial={{ x: -8, opacity: 0, scale: 0.5 }}
                                animate={{ x: 0, opacity: 1, scale: 1 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                                title={actionName}
                            >
                                <div className="w-full h-full overflow-hidden rounded-[0.06vw]">
                                    <CardPreview
                                        previewRef={actionDef?.previewRef}
                                        className="w-full h-full object-cover"
                                        title={actionName}
                                    />
                                    {!actionDef?.previewRef && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-purple-50 p-[0.05vw]">
                                            <span className="text-[0.3vw] font-bold text-purple-800 leading-tight text-center line-clamp-2">
                                                {actionName}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </motion.div>
    );
};
