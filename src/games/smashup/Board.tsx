/**
 * 大杀四方 (Smash Up) - "Paper Chaos" Aesthetic
 * 
 * Style Guide:
 * - Theme: "Basement Board Game Night" / American Comic Spoof
 * - Background: Warm wooden table surface, cluttered but cozy.
 * - Cards: Physical objects with white printed borders, slight imperfections (rotations).
 * - UI: "Sticky notes", "Scrap paper", "Tokens" - nothing digital.
 * - Font: Thick, bold, informal.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { BoardProps } from 'boardgame.io/react';
import type { MatchState } from '../../engine/types';
import type { SmashUpCore, BaseInPlay, CardInstance, MinionOnBase } from './domain/types';
import { SU_COMMANDS, HAND_LIMIT, getCurrentPlayerId, getTotalPowerOnBase } from './domain/types';
import { getBaseDef, getMinionDef, getCardDef } from './data/cards';
import { CardPreview, registerCardAtlasSource } from '../../components/common/media/CardPreview';
import { AnimatePresence, motion } from 'framer-motion';
import { loadCardAtlasConfig } from './ui/cardAtlas';
import { SMASHUP_ATLAS_IDS } from './domain/ids';
import { HandArea } from './ui/HandArea';
import { useGameEvents } from './ui/useGameEvents';
import { SmashUpEffectsLayer } from './ui/BoardEffects';
import { FactionSelection } from './ui/FactionSelection';
import { PromptOverlay } from './ui/PromptOverlay';

type Props = BoardProps<MatchState<SmashUpCore>>;

const PHASE_NAMES: Record<string, string> = {
    factionSelect: 'Draft',
    startTurn: 'Start',
    playCards: 'Play',
    scoreBases: 'Score',
    draw: 'Draw',
    endTurn: 'End',
};

// Player "Chips" Colors - Bright, opaque, acrylic feel
const PLAYER_CONFIG = [
    {
        border: 'border-red-600',
        ring: 'ring-red-500',
        shadow: 'shadow-red-500/50',
        bg: 'bg-red-500'
    },
    {
        border: 'border-blue-600',
        ring: 'ring-blue-500',
        shadow: 'shadow-blue-500/50',
        bg: 'bg-blue-500'
    },
    {
        border: 'border-green-600',
        ring: 'ring-green-500',
        shadow: 'shadow-green-500/50',
        bg: 'bg-green-500'
    },
    {
        border: 'border-yellow-600',
        ring: 'ring-yellow-500',
        shadow: 'shadow-yellow-500/50',
        bg: 'bg-yellow-500'
    },
];

const SmashUpBoard: React.FC<Props> = ({ G, moves, playerID }) => {
    const core = G.core;
    const phase = G.sys.phase;
    const currentPid = getCurrentPlayerId(core);
    const isMyTurn = playerID === currentPid;
    const myPlayer = playerID ? core.players[playerID] : undefined;

    const [selectedCardUid, setSelectedCardUid] = useState<string | null>(null);
    const [discardSelection, setDiscardSelection] = useState<Set<string>>(new Set());
    const autoAdvancePhaseRef = useRef<string | null>(null);
    const needDiscard = isMyTurn && phase === 'draw' && myPlayer && myPlayer.hand.length > HAND_LIMIT;
    const discardCount = needDiscard ? myPlayer!.hand.length - HAND_LIMIT : 0;

    // 事件流消费 → 动画驱动
    const myPid = playerID || '0';
    const gameEvents = useGameEvents({ G, myPlayerId: myPid });

    // 基地 DOM 引用（用于力量浮字定位）
    const baseRefsMap = useRef<Map<number, HTMLElement>>(new Map());

    // 回合切换提示
    const [showTurnNotice, setShowTurnNotice] = useState(false);
    const prevCurrentPidRef = useRef(currentPid);
    useEffect(() => {
        if (prevCurrentPidRef.current !== currentPid) {
            prevCurrentPidRef.current = currentPid;
            if (currentPid === playerID) {
                setShowTurnNotice(true);
                const timer = setTimeout(() => setShowTurnNotice(false), 1500);
                return () => clearTimeout(timer);
            }
        }
    }, [currentPid, playerID]);

    // --- State Management ---
    useEffect(() => {
        if (isMyTurn && phase === 'draw' && myPlayer && myPlayer.hand.length <= HAND_LIMIT) {
            moves['ADVANCE_PHASE']?.();
        }
    }, [isMyTurn, phase, myPlayer?.hand.length]);

    useEffect(() => {
        if (!isMyTurn) {
            autoAdvancePhaseRef.current = null;
            return;
        }
        const shouldAutoAdvance = phase === 'startTurn' || phase === 'scoreBases' || phase === 'endTurn';
        if (!shouldAutoAdvance) {
            autoAdvancePhaseRef.current = null;
            return;
        }
        if (autoAdvancePhaseRef.current === phase) return;
        autoAdvancePhaseRef.current = phase;
        moves['ADVANCE_PHASE']?.();
    }, [isMyTurn, phase, moves]);

    useEffect(() => {
        setSelectedCardUid(null);
        setDiscardSelection(new Set());
    }, [phase, currentPid]);

    useEffect(() => {
        const load = async (id: string, path: string, defaultGrid?: { rows: number; cols: number }) => {
            try {
                const config = await loadCardAtlasConfig(path, undefined, defaultGrid);
                registerCardAtlasSource(id, { image: path, config });
            } catch (e) {
                console.error(`Atlas load failed: ${id}`, e);
            }
        };
        // 基地图集：横向 4 列
        load(SMASHUP_ATLAS_IDS.BASE1, 'smashup/base/base1', { rows: 4, cols: 4 });
        load(SMASHUP_ATLAS_IDS.BASE2, 'smashup/base/base2', { rows: 2, cols: 4 });
        load(SMASHUP_ATLAS_IDS.BASE3, 'smashup/base/base3', { rows: 2, cols: 4 });
        load(SMASHUP_ATLAS_IDS.BASE4, 'smashup/base/base4', { rows: 3, cols: 4 });
        // 卡牌图集
        load(SMASHUP_ATLAS_IDS.CARDS1, 'smashup/cards/cards1', { rows: 7, cols: 8 });
        load(SMASHUP_ATLAS_IDS.CARDS2, 'smashup/cards/cards2', { rows: 7, cols: 8 });
        load(SMASHUP_ATLAS_IDS.CARDS3, 'smashup/cards/cards3', { rows: 7, cols: 8 });
        load(SMASHUP_ATLAS_IDS.CARDS4, 'smashup/cards/cards4', { rows: 7, cols: 8 });
    }, []);

    // --- Handlers ---
    const handlePlayMinion = useCallback((cardUid: string, baseIndex: number) => {
        moves[SU_COMMANDS.PLAY_MINION]?.({ cardUid, baseIndex });
        setSelectedCardUid(null);
    }, [moves]);

    // VIEWING STATE
    const [viewingCard, setViewingCard] = useState<{ defId: string; type: 'minion' | 'base' | 'action' } | null>(null);

    const handleBaseClick = useCallback((index: number) => {
        const base = core.bases[index];
        if (selectedCardUid) {
            handlePlayMinion(selectedCardUid, index);
        } else {
            setViewingCard({ defId: base.defId, type: 'base' });
        }
    }, [selectedCardUid, handlePlayMinion, core.bases]);

    const handleCardClick = useCallback((card: CardInstance) => {
        if (!isMyTurn || phase !== 'playCards') return;
        if (card.type === 'action') {
            moves[SU_COMMANDS.PLAY_ACTION]?.({ cardUid: card.uid });
        } else {
            setSelectedCardUid(curr => curr === card.uid ? null : card.uid);
        }
    }, [isMyTurn, phase, moves]);

    const handleViewAction = useCallback((defId: string) => {
        setViewingCard({ defId, type: 'action' });
    }, []);

    // EARLY RETURN: Faction Selection
    if (phase === 'factionSelect') {
        return (
            <div className="relative w-full h-screen bg-[#3e2723] overflow-hidden font-sans select-none">
                <div className="absolute inset-0 z-0 pointer-events-none opacity-40 mix-blend-multiply">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')]" />
                </div>
                <FactionSelection core={core} moves={moves} playerID={playerID} />
            </div>
        );
    }

    return (
        // BACKGROUND: A warm, dark wooden table texture. 
        <div className="relative w-full h-screen bg-[#3e2723] overflow-hidden font-sans select-none">

            {/* Table Texture Layer */}
            <div className="absolute inset-0 z-0 pointer-events-none opacity-40 mix-blend-multiply">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')]" />
            </div>
            {/* Vignette for focus */}
            <div className="absolute inset-0 z-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.6)_100%)]" />

            {/* --- TOP HUD: "Sticky Notes" Style --- */}
            <div className="relative z-20 flex justify-between items-start p-6 pointer-events-none">

                {/* Left: Turn Tracker (Yellow Notepad) */}
                <div className="bg-[#fef3c7] text-slate-800 p-3 pt-4 shadow-[2px_3px_5px_rgba(0,0,0,0.2)] -rotate-1 pointer-events-auto min-w-[140px] clip-path-jagged">
                    <div className="w-3 h-3 rounded-full bg-red-400 absolute top-1 left-1/2 -translate-x-1/2 opacity-50 shadow-inner" /> {/* Pin */}
                    <motion.div
                        key={`turn-${core.turnNumber}`}
                        initial={{ scale: 0.9, rotate: -3 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                        className="text-center font-black uppercase text-xl leading-none tracking-tighter mb-1 border-b-2 border-slate-800/20 pb-1"
                    >
                        Turn {core.turnNumber}
                    </motion.div>
                    <div className="flex justify-between items-center text-sm font-bold font-mono">
                        <span>{isMyTurn ? 'YOU' : 'OPP'}</span>
                        <motion.span
                            key={phase}
                            initial={{ scale: 0.7, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                            className="text-blue-600 bg-blue-100 px-1 rounded transform rotate-2 inline-block"
                        >
                            {PHASE_NAMES[phase]}
                        </motion.span>
                    </div>
                </div>

                {/* Right: Score Sheet (White Paper) */}
                {/* REVERTED: Removed emoji, kept layout */}
                <div className="bg-white text-slate-900 p-4 shadow-[3px_4px_10px_rgba(0,0,0,0.3)] rotate-1 max-w-[400px] pointer-events-auto rounded-sm">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center mb-2 border-b border-slate-200">Score Sheet</div>
                    <div className="flex gap-6">
                        {core.turnOrder.map(pid => {
                            const conf = PLAYER_CONFIG[parseInt(pid) % PLAYER_CONFIG.length];
                            const isCurrent = pid === currentPid;
                            return (
                                <motion.div
                                    key={pid}
                                    className={`flex flex-col items-center relative ${isCurrent ? 'scale-110' : 'opacity-60 grayscale'}`}
                                    animate={isCurrent ? { scale: 1.1 } : { scale: 1 }}
                                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                                >
                                    <span className="text-xs font-black uppercase mb-1">P{pid}</span>
                                    <motion.div
                                        key={`vp-${pid}-${core.players[pid].vp}`}
                                        className={`w-10 h-10 rounded-full flex items-center justify-center text-xl font-black text-white shadow-md border-2 border-white ${conf.bg}`}
                                        initial={{ scale: 1 }}
                                        animate={{ scale: [1, 1.3, 1] }}
                                        transition={{ duration: 0.4, ease: 'easeOut' }}
                                    >
                                        {core.players[pid].vp}
                                    </motion.div>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* --- MAIN BOARD --- */}
            {/* Scrollable table area */}
            <div className="absolute inset-0 flex items-center justify-center overflow-x-auto overflow-y-hidden z-10 no-scrollbar pt-12 pb-60">
                <div className="flex items-start gap-12 px-20 min-w-max">
                    {core.bases.map((base, idx) => (
                        <BaseZone
                            key={`${base.defId}-${idx}`}
                            base={base}
                            baseIndex={idx}
                            isDeployMode={!!selectedCardUid}
                            isMyTurn={isMyTurn}
                            myPlayerId={playerID}
                            moves={moves}
                            onClick={() => handleBaseClick(idx)}
                            onViewMinion={(defId) => setViewingCard({ defId, type: 'minion' })}
                            onViewAction={handleViewAction}
                            tokenRef={(el) => {
                                if (el) baseRefsMap.current.set(idx, el);
                                else baseRefsMap.current.delete(idx);
                            }}
                        />
                    ))}
                </div>
            </div>

            {/* --- BOTTOM: HAND & CONTROLS --- */}
            {/* Not a bar, but floating elements */}
            {myPlayer && (
                <div className="absolute bottom-0 inset-x-0 h-[220px] z-30 pointer-events-none">

                    {/* Discard Overlay (Messy Pile) */}
                    {needDiscard && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center pointer-events-auto">
                            <div className="bg-white p-6 rotate-1 shadow-2xl max-w-md text-center border-4 border-red-500 border-dashed">
                                <h2 className="text-2xl font-black text-red-600 uppercase mb-2 transform -rotate-1">Too Many Cards!</h2>
                                <p className="font-bold text-slate-700 mb-4">Discard <span className="text-3xl align-middle text-red-600">{discardCount}</span> cards to continue.</p>
                                <button
                                    onClick={() => {
                                        if (discardSelection.size === discardCount) {
                                            moves[SU_COMMANDS.DISCARD_TO_LIMIT]?.({ cardUids: Array.from(discardSelection) });
                                            setDiscardSelection(new Set());
                                        }
                                    }}
                                    disabled={discardSelection.size !== discardCount}
                                    className="bg-slate-800 text-white font-black px-6 py-3 rounded shadow-lg hover:bg-black hover:scale-105 transition-all uppercase tracking-widest disabled:opacity-50"
                                >
                                    Throw Away
                                </button>
                            </div>
                        </div>
                    )}

                    <HandArea
                        hand={myPlayer.hand}
                        selectedCardUid={selectedCardUid}
                        onCardSelect={handleCardClick}
                        isDiscardMode={needDiscard}
                        discardSelection={discardSelection}
                        // If not my turn, hand is "put down" (lower opacity or stylized)
                        disableInteraction={!isMyTurn && !needDiscard}
                    />

                    {/* End Phase Token */}
                    {isMyTurn && phase === 'playCards' && (
                        <div className="absolute right-12 bottom-24 pointer-events-auto">
                            <button
                                onClick={() => moves['ADVANCE_PHASE']?.()}
                                className="group w-24 h-24 rounded-full bg-slate-900 border-4 border-white shadow-[0_5px_15px_rgba(0,0,0,0.5)] flex flex-col items-center justify-center hover:scale-105 hover:rotate-3 transition-all active:scale-95 text-white"
                            >
                                <span className="text-xs font-bold opacity-50 uppercase">Finish</span>
                                <span className="text-xl font-black uppercase italic leading-none">Turn</span>
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* 特效层 */}
            <SmashUpEffectsLayer
                powerChanges={gameEvents.powerChanges}
                onPowerChangeComplete={gameEvents.removePowerChange}
                actionShows={gameEvents.actionShows}
                onActionShowComplete={gameEvents.removeActionShow}
                baseScored={gameEvents.baseScored}
                onBaseScoredComplete={gameEvents.removeBaseScored}
                baseRefs={baseRefsMap}
            />

            {/* 回合切换提示 */}
            <AnimatePresence>
                {showTurnNotice && (
                    <motion.div
                        className="fixed inset-0 z-[70] flex items-center justify-center pointer-events-none"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <motion.div
                            className="bg-[#fef3c7] text-slate-900 px-8 py-4 shadow-2xl border-4 border-dashed border-slate-800/30"
                            initial={{ scale: 0.5, rotate: -10 }}
                            animate={{ scale: 1, rotate: 2 }}
                            exit={{ scale: 0.5, rotate: 10, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                            style={{ fontFamily: "'Caveat', 'Comic Sans MS', cursive" }}
                        >
                            <span className="text-[3vw] font-black uppercase tracking-tight">Your Turn!</span>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* PREVIEW OVERLAY */}
            <AnimatePresence>
                {viewingCard && (
                    <CardDetailOverlay
                        defId={viewingCard.defId}
                        type={viewingCard.type}
                        onClose={() => setViewingCard(null)}
                    />
                )}
            </AnimatePresence>

            {/* PROMPT OVERLAY */}
            <PromptOverlay
                prompt={core.activePrompt}
                moves={moves}
                playerID={playerID}
            />
        </div>
    );
};

// ============================================================================
// Base Zone: The "Battlefield"
// ============================================================================

const BaseZone: React.FC<{
    base: BaseInPlay;
    baseIndex: number;
    isDeployMode: boolean;
    isMyTurn: boolean;
    myPlayerId: string | null;
    moves: Record<string, any>;
    onClick: () => void;
    onViewMinion: (defId: string) => void;
    onViewAction: (defId: string) => void;
    tokenRef?: (el: HTMLDivElement | null) => void;
}> = ({ base, baseIndex, isDeployMode, isMyTurn, myPlayerId, moves, onClick, onViewMinion, onViewAction, tokenRef }) => {
    const baseDef = getBaseDef(base.defId);
    const totalPower = getTotalPowerOnBase(base);
    const breakpoint = baseDef?.breakpoint || 20;
    const ratio = totalPower / breakpoint;
    const isNearBreak = ratio >= 0.8 && ratio < 1;
    const isAtBreak = ratio >= 1;

    // 按控制者分组随从
    const minionsByController: Record<string, MinionOnBase[]> = {};
    base.minions.forEach(m => {
        if (!minionsByController[m.controller]) minionsByController[m.controller] = [];
        minionsByController[m.controller].push(m);
    });
    const playerIds = Object.keys(minionsByController).sort();

    // 各玩家力量明细
    const playerPowers = playerIds.map(pid => {
        const minions = minionsByController[pid];
        const total = minions.reduce((sum, m) => sum + m.basePower + m.powerModifier, 0);
        const basePowerTotal = minions.reduce((sum, m) => sum + m.basePower, 0);
        // 总力量与印刷力量之差 = 外部增益/减益的净影响
        const modifierDelta = total - basePowerTotal;
        return { pid, total, modifierDelta };
    });

    return (
        <div className="flex flex-col items-center group/base min-w-[15vw] mx-[1vw]">

            {/* --- 持续行动卡（基地上方） --- */}
            {/* TODO: 教程引导 - 说明基地上方的卡牌是附着在该基地上的持续效果 */}
            {base.ongoingActions?.length > 0 && (
                <div className="flex gap-[0.5vw] mb-[0.8vw] justify-center">
                    {base.ongoingActions.map(oa => {
                        const actionDef = getCardDef(oa.defId);
                        const ownerConf = PLAYER_CONFIG[parseInt(oa.ownerId) % PLAYER_CONFIG.length];
                        return (
                            <motion.div
                                key={oa.uid}
                                onClick={() => onViewAction(oa.defId)}
                                className={`
                                    relative w-[5.5vw] aspect-[0.714] bg-white p-[0.2vw] rounded-[0.2vw]
                                    shadow-md cursor-zoom-in hover:z-50 hover:scale-110 transition-transform
                                    border-[0.15vw] ${ownerConf.border} ${ownerConf.shadow}
                                `}
                                initial={{ scale: 0, opacity: 0, y: -20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                transition={{ type: 'spring', stiffness: 350, damping: 20 }}
                                title={actionDef?.name || oa.defId}
                            >
                                <div className="w-full h-full bg-slate-100 relative overflow-hidden">
                                    <CardPreview
                                        previewRef={actionDef?.previewRef}
                                        className="w-full h-full object-cover"
                                    />
                                    {!actionDef?.previewRef && (
                                        <div className="absolute inset-0 p-[0.2vw] flex items-center justify-center text-center bg-slate-50">
                                            <p className="text-[0.6vw] font-bold leading-none text-slate-800 line-clamp-4">{actionDef?.name}</p>
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
                    relative w-[14vw] aspect-[1.43] bg-white p-[0.4vw] shadow-sm rounded-sm transition-all duration-300
                    ${isDeployMode
                        ? 'cursor-pointer rotate-0 scale-105 z-20 shadow-[0_0_2vw_rgba(255,255,255,0.4)] ring-4 ring-green-400'
                        : 'rotate-1 hover:rotate-0 hover:z-10 hover:shadow-xl cursor-zoom-in'}
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
                        title={baseDef?.name}
                    />

                    {/* Fallback Text */}
                    {!baseDef?.previewRef && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-[0.5vw]">
                            <h3 className="font-black text-[1.2vw] text-slate-800 uppercase tracking-tighter rotate-[-2deg] leading-tight mb-[0.5vw]">
                                {baseDef?.name || base.defId}
                            </h3>
                            <div className="bg-white/90 p-[0.3vw] shadow-sm transform rotate-1 border border-slate-200">
                                <p className="font-mono text-[0.6vw] text-slate-700 leading-tight">
                                    {baseDef?.abilityText}
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

                {/* VP 奖励提示 */}
                {baseDef && (
                    <div className="absolute -bottom-[0.3vw] left-1/2 -translate-x-1/2 flex gap-[0.3vw] z-30">
                        {baseDef.vpAwards.map((vp, i) => (
                            <div key={i} className={`text-[0.5vw] font-bold px-[0.3vw] py-[0.05vw] rounded-sm border shadow-sm ${
                                i === 0 ? 'bg-yellow-400 text-yellow-900 border-yellow-500' :
                                i === 1 ? 'bg-slate-300 text-slate-700 border-slate-400' :
                                'bg-amber-700 text-amber-100 border-amber-800'
                            }`}>
                                {vp}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* --- MINIONS CONTAINER --- */}
            <div className="flex items-start gap-[1vw] mt-[1vw] w-full justify-center transition-all pt-[0.5vw] min-h-[10vw]">
                {playerIds.length === 0 && isDeployMode ? (
                    <div className="w-[5.5vw] h-[7.7vw] border-[0.2vw] border-white/40 rounded flex flex-col items-center justify-center opacity-60 animate-pulse bg-white/5">
                        <span className="text-white/80 text-[2vw] font-black">+</span>
                        <span className="text-white/80 text-[0.6vw] font-bold uppercase tracking-widest mt-1">Deploy</span>
                    </div>
                ) : (
                    playerIds.map(pid => (
                        <div key={pid} className="flex flex-col items-center gap-[0.5vw]">
                            <div className="flex flex-col items-center isolate">
                                {minionsByController[pid].map((m, i) => (
                                    <MinionCard
                                        key={m.uid}
                                        minion={m}
                                        index={i}
                                        pid={pid}
                                        baseIndex={baseIndex}
                                        isMyTurn={isMyTurn}
                                        myPlayerId={myPlayerId}
                                        moves={moves}
                                        onView={() => onViewMinion(m.defId)}
                                    />
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* --- 玩家力量明细（随从区下方） --- */}
            {playerPowers.length > 0 && (
                <div className="flex gap-[0.8vw] mt-[0.5vw]">
                    {playerPowers.map(pp => {
                        const conf = PLAYER_CONFIG[parseInt(pp.pid) % PLAYER_CONFIG.length];
                        return (
                            <div key={pp.pid} className="flex items-center gap-[0.2vw]">
                                <div className={`w-[0.8vw] h-[0.8vw] rounded-full ${conf.bg}`} />
                                <span className={`text-[0.65vw] font-black ${
                                    pp.modifierDelta > 0 ? 'text-green-400' :
                                    pp.modifierDelta < 0 ? 'text-red-400' :
                                    'text-white/70'
                                }`}>
                                    {pp.total}
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}

        </div>
    );
};

const MinionCard: React.FC<{
    minion: MinionOnBase;
    index: number;
    pid: string;
    baseIndex: number;
    isMyTurn: boolean;
    myPlayerId: string | null;
    moves: Record<string, any>;
    onView: () => void;
}> = ({ minion, index, pid, baseIndex, isMyTurn, myPlayerId, moves, onView }) => {
    const def = getMinionDef(minion.defId);
    const conf = PLAYER_CONFIG[parseInt(pid) % PLAYER_CONFIG.length];

    // 天赋判定：有 talent 标签 + 本回合未使用 + 是我的随从 + 轮到我
    const hasTalent = def?.abilityTags?.includes('talent') ?? false;
    const canUseTalent = hasTalent && !minion.talentUsed && isMyTurn && minion.controller === myPlayerId;

    const seed = minion.uid.charCodeAt(0) + index;
    const rotation = (seed % 6) - 3;

    const style = {
        marginTop: index === 0 ? 0 : '-5.5vw',
        zIndex: index + 1,
        transform: `rotate(${rotation}deg)`,
    };

    const handleClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        if (canUseTalent) {
            moves[SU_COMMANDS.USE_TALENT]?.({ minionUid: minion.uid, baseIndex });
        } else {
            onView();
        }
    }, [canUseTalent, moves, minion.uid, baseIndex, onView]);

    return (
        <motion.div
            onClick={handleClick}
            className={`
                relative w-[5.5vw] aspect-[0.714] bg-white p-[0.2vw] rounded-[0.2vw] 
                transition-shadow duration-200 group hover:z-50 hover:scale-110 hover:rotate-0
                border-[0.15vw] ${conf.border} ${conf.shadow} shadow-md
                ${canUseTalent ? 'cursor-pointer ring-2 ring-amber-400/80 shadow-[0_0_12px_rgba(251,191,36,0.5)]' : 'cursor-zoom-in'}
            `}
            style={style}
            initial={{ scale: 0.3, y: -60, opacity: 0, rotate: -15 }}
            animate={canUseTalent
                ? { scale: 1, y: 0, opacity: 1, rotate: [rotation - 2, rotation + 2, rotation - 2], transition: { rotate: { repeat: Infinity, duration: 1.5, ease: 'easeInOut' } } }
                : { scale: 1, y: 0, opacity: 1, rotate: rotation }
            }
            transition={{ type: 'spring', stiffness: 350, damping: 20, delay: index * 0.05 }}
        >
            <div className="w-full h-full bg-slate-100 relative overflow-hidden">
                <CardPreview
                    previewRef={def?.previewRef}
                    className="w-full h-full object-cover"
                />

                {!def?.previewRef && (
                    <div className="absolute inset-0 p-[0.2vw] flex items-center justify-center text-center bg-slate-50">
                        <p className="text-[0.6vw] font-bold leading-none text-slate-800 line-clamp-4">{def?.name}</p>
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
                    已用
                </div>
            )}
        </motion.div>
    );
};

export default SmashUpBoard;

// ============================================================================
// Overlay: Click-to-View Details
// ============================================================================
const CardDetailOverlay: React.FC<{
    defId: string;
    type: 'minion' | 'base' | 'action';
    onClose: () => void;
}> = ({ defId, type, onClose }) => {
    const def = type === 'base' ? getBaseDef(defId) : getCardDef(defId);
    if (!def) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-8 cursor-pointer"
        >
            <motion.div
                initial={{ scale: 0.8, y: 50 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.8, y: 50 }}
                className={`
                    relative rounded-xl shadow-2xl bg-transparent
                    ${type === 'base' ? 'w-[40vw] max-w-[600px] aspect-[1.43]' : 'w-[25vw] max-w-[400px] aspect-[0.714]'}
                `}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close Button Mobile-ish */}
                <button onClick={onClose} className="absolute -top-4 -right-4 bg-white text-black rounded-full w-8 h-8 font-black border-2 border-black z-50 hover:scale-110">X</button>

                <CardPreview
                    previewRef={def.previewRef}
                    className="w-full h-full object-contain rounded-xl shadow-2xl"
                    title={def.name}
                />

                {/* Detail Box if no preview */}
                {!def.previewRef && (
                    <div className="absolute inset-0 bg-white rounded-xl p-6 border-4 border-slate-800 flex flex-col items-center justify-center text-center">
                        <h2 className="text-3xl font-black uppercase mb-4">{def.name}</h2>
                        <p className="font-mono text-lg">{type === 'base' ? (def as any).abilityText : ((def as any).text || (def as any).abilityText || (def as any).effectText)}</p>
                    </div>
                )}
            </motion.div>
        </motion.div>
    );
};
