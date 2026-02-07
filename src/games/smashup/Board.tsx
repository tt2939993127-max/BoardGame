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

type Props = BoardProps<MatchState<SmashUpCore>>;

const PHASE_NAMES: Record<string, string> = {
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
        const load = async (id: string, path: string) => {
            try {
                const config = await loadCardAtlasConfig(path);
                registerCardAtlasSource(id, { image: path, config });
            } catch (e) {
                console.error(`Atlas load failed: ${id}`, e);
            }
        };
        load(SMASHUP_ATLAS_IDS.BASE1, 'smashup/base/base1');
        load(SMASHUP_ATLAS_IDS.CARDS1, 'smashup/cards/cards1');
        load(SMASHUP_ATLAS_IDS.CARDS2, 'smashup/cards/cards2');
        load(SMASHUP_ATLAS_IDS.CARDS3, 'smashup/cards/cards3');
        load(SMASHUP_ATLAS_IDS.CARDS4, 'smashup/cards/cards4');
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
            // View Base Details
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
                    <div className="text-center font-black uppercase text-xl leading-none tracking-tighter mb-1 border-b-2 border-slate-800/20 pb-1">
                        Turn {core.turnNumber}
                    </div>
                    <div className="flex justify-between items-center text-sm font-bold font-mono">
                        <span>{isMyTurn ? 'YOU' : 'OPP'}</span>
                        <span className="text-blue-600 bg-blue-100 px-1 rounded transform rotate-2 inline-block">{PHASE_NAMES[phase]}</span>
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
                                <div key={pid} className={`flex flex-col items-center relative ${isCurrent ? 'scale-110' : 'opacity-60 grayscale'}`}>
                                    <span className="text-xs font-black uppercase mb-1">P{pid}</span>
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl font-black text-white shadow-md border-2 border-white ${conf.bg}`}>
                                        {core.players[pid].vp}
                                    </div>
                                </div>
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
                            // If we have a minion selected, we are hovering to deploy
                            isDeployMode={!!selectedCardUid}
                            onClick={() => handleBaseClick(idx)}
                            onViewMinion={(defId) => setViewingCard({ defId, type: 'minion' })}
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
        </div>
    );
};

// ============================================================================
// Base Zone: The "Battlefield"
// ============================================================================

const BaseZone: React.FC<{
    base: BaseInPlay;
    isDeployMode: boolean;
    onClick: () => void;
    onViewMinion: (defId: string) => void;
}> = ({ base, isDeployMode, onClick, onViewMinion }) => {
    const baseDef = getBaseDef(base.defId);
    const totalPower = getTotalPowerOnBase(base);
    const breakpoint = baseDef?.breakpoint || 20;

    // Group minions by controller
    const minionsByController: Record<string, MinionOnBase[]> = {};
    base.minions.forEach(m => {
        if (!minionsByController[m.controller]) minionsByController[m.controller] = [];
        minionsByController[m.controller].push(m);
    });
    const playerIds = Object.keys(minionsByController).sort();

    return (
        <div className="flex flex-col items-center group/base min-w-[15vw] mx-[1vw]">

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

                {/* Power Token - Relocated to TOP RIGHT to avoid blocking text/minions */}
                <div className="absolute -top-[1.5vw] -right-[1.5vw] w-[4vw] h-[4vw] pointer-events-none z-30 flex items-center justify-center">
                    {/* The "Paper Token" visual */}
                    <div className="w-[3.5vw] h-[3.5vw] bg-slate-900 rounded-full flex items-center justify-center border-[0.2vw] border-dashed border-white shadow-xl transform rotate-12 group-hover/base:scale-110 transition-transform">
                        <div className={`text-[1.2vw] font-black ${totalPower >= breakpoint ? 'text-green-400 animate-pulse' : 'text-white'}`}>
                            {totalPower}
                        </div>
                        <div className="absolute -bottom-[0.5vw] bg-white text-slate-900 text-[0.6vw] font-bold px-[0.4vw] py-[0.1vw] rounded shadow-sm border border-slate-300 whitespace-nowrap">
                            / {breakpoint}
                        </div>
                    </div>
                </div>
            </div>

            {/* --- MINIONS CONTAINER --- */}
            {/* Reduced gap below base */}
            <div className="flex items-start gap-[1vw] mt-[1vw] w-full justify-center transition-all pt-[0.5vw] min-h-[10vw]">
                {playerIds.length === 0 && isDeployMode ? (
                    // "Paper" Drop Zone
                    <div className="w-[5.5vw] h-[7.7vw] border-[0.2vw] border-white/40 rounded flex flex-col items-center justify-center opacity-60 animate-pulse bg-white/5">
                        <span className="text-white/80 text-[2vw] font-black">+</span>
                        <span className="text-white/80 text-[0.6vw] font-bold uppercase tracking-widest mt-1">Deploy</span>
                    </div>
                ) : (
                    playerIds.map(pid => (
                        <div key={pid} className="flex flex-col items-center gap-[0.5vw]">
                            {/* Replaced Dot with nothing, styling is on cards */}

                            {/* The Stack */}
                            <div className="flex flex-col items-center isolate">
                                {minionsByController[pid].map((m, i) => (
                                    <MinionCard
                                        key={m.uid}
                                        minion={m}
                                        index={i}
                                        pid={pid}
                                        onView={() => onViewMinion(m.defId)}
                                    />
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>

        </div>
    );
};

const MinionCard: React.FC<{
    minion: MinionOnBase;
    index: number;
    pid: string;
    onView: () => void;
}> = ({ minion, index, pid, onView }) => {
    const def = getMinionDef(minion.defId);
    const conf = PLAYER_CONFIG[parseInt(pid) % PLAYER_CONFIG.length];

    // Responsive size: 5.5vw (approx 105px on 1080p)
    const seed = minion.uid.charCodeAt(0) + index;
    const rotation = (seed % 6) - 3;

    const style = {
        marginTop: index === 0 ? 0 : '-5.5vw', // Dense overlap
        zIndex: index + 1,
        transform: `rotate(${rotation}deg)`,
    };

    return (
        <div
            onClick={(e) => { e.stopPropagation(); onView(); }}
            className={`
                relative w-[5.5vw] aspect-[0.714] bg-white p-[0.2vw] rounded-[0.2vw] 
                transition-all duration-200 group cursor-zoom-in hover:z-50 hover:scale-110 hover:rotate-0
                border-[0.15vw] ${conf.border} ${conf.shadow} shadow-md
            `}
            style={style}
        >
            <div className={`w-full h-full bg-slate-100 relative overflow-hidden`}>
                <CardPreview
                    previewRef={def?.previewRef}
                    className="w-full h-full object-cover"
                />

                {!def?.previewRef && (
                    <div className="absolute inset-0 p-[0.2vw] flex items-center justify-center text-center bg-slate-50">
                        <p className="text-[0.6vw] font-bold leading-none text-slate-800 line-clamp-4">{def?.name}</p>
                    </div>
                )}
            </div>

            {/* Power Badge - Only show if modified OR no preview */}
            {((minion.powerModifier !== 0) || !def?.previewRef) && (
                <div className={`absolute -top-[0.4vw] -right-[0.4vw] w-[1.2vw] h-[1.2vw] rounded-full flex items-center justify-center text-[0.7vw] font-black text-white shadow-sm border border-white ${minion.powerModifier > 0 ? 'bg-green-600' : (minion.powerModifier < 0 ? 'bg-red-600' : 'bg-slate-700')} z-10`}>
                    {minion.basePower + minion.powerModifier}
                </div>
            )}

        </div>
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
