
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Library, Trash2, X } from 'lucide-react';
import type { CardInstance } from '../domain/types';
import { getCardDef, resolveCardName } from '../data/cards';
import { CardPreview } from '../../../components/common/media/CardPreview';
import { useDelayedBackdropBlur } from '../../../hooks/ui/useDelayedBackdropBlur';
import { SMASHUP_CARD_BACK } from '../domain/ids';
import { UI_Z_INDEX } from '../../../core';

type Props = {
    deckCount: number;
    discard: CardInstance[];
    myPlayerId: string;
    isMyTurn: boolean;
    /** 弃牌堆中有可从弃牌堆打出的卡牌时为 true */
    hasPlayableFromDiscard?: boolean;
    onCardView?: (card: CardInstance) => void;
};

export const DeckDiscardZone: React.FC<Props> = ({ deckCount, discard, isMyTurn, hasPlayableFromDiscard, onCardView }) => {
    const { t, i18n } = useTranslation('game-smashup');
    const [showDiscard, setShowDiscard] = useState(false);
    const topCard = discard.length > 0 ? discard[discard.length - 1] : null;
    const topDef = topCard ? getCardDef(topCard.defId) : null;
    const topName = resolveCardName(topDef ?? undefined, i18n.language) || topCard?.defId;

    const handleDiscardClick = () => {
        if (!isMyTurn) {
            // Optional: You could show a toast here, or just allow viewing regardless of turn.
            // Requirement says "friendly hint if not own turn" but usually viewing discard is allowed anytime.
            // If the user meant "cannot operate", viewing is passive.
            // Assuming "operate" means "discard to limit".
            // If "operate" means "viewing", then we show a hint.
            // But usually discard pile is public info. 
            // Let's assume viewing is always allowed, but maybe "Discard to Limit" is the operation?
            // The prompt "discard to limit" is handled in Board.tsx. 
            // So here we likely just View. 
            // However, the user said "operate on non-turn should have hint". 
            // If this zone is JUST for viewing, then it's fine. 
            // If the user tries to click the "Discard" button in the overlay (which doesn't exist yet)?
            // The user request: "then non-self turn operations should have friendly prompt".
            // Maybe they mean clicking the deck/discard should warn if it's not relevant? 
            // But viewing is always relevant. 
            // Let's allow viewing always, but visual feedback might only be strong on my turn.
        }
        setShowDiscard(true);
    };

    return (
        <div
            data-tutorial-id="su-deck-discard"
            className="absolute bottom-4 left-[2vw] right-[2vw] flex justify-between items-end pointer-events-none"
            style={{ zIndex: UI_Z_INDEX.hud }}
        >
            {/* Deck Pile - Left */}
            <div className="flex flex-col items-center pointer-events-auto group">
                <div className="relative w-[7.5vw] aspect-[0.714]">
                    {/* Consistent Stack Effect */}
                    <div className="absolute inset-0 bg-slate-700 rounded-sm border border-slate-600 shadow-sm translate-x-1 -translate-y-1 rotate-1" />

                    {/* Top Card Back */}
                    <div className="absolute inset-0 bg-slate-800 rounded-sm border-2 border-slate-500 shadow-xl overflow-hidden z-10 transition-transform group-hover:-translate-y-2">
                        <CardPreview
                            previewRef={SMASHUP_CARD_BACK}
                            className="w-full h-full object-cover"
                        />
                        {/* Power/Count Overlay */}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                            <div className="w-8 h-8 rounded-full bg-slate-900/80 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-lg">
                                <span className="text-white font-black font-mono text-base">{deckCount}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="mt-2 h-5 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                    <Library size={10} /> {t('ui.deck')}
                </div>
            </div>

            {/* Discard Pile - Right */}
            <div
                className="flex flex-col items-center pointer-events-auto group cursor-pointer relative"
                onClick={handleDiscardClick}
            >
                <div className="relative w-[7.5vw] aspect-[0.714]">
                    {/* 可从弃牌堆打出时的脉冲光晕 */}
                    {hasPlayableFromDiscard && (
                        <div className="absolute -inset-2 rounded-lg z-0">
                            <div className="absolute inset-0 rounded-lg bg-amber-400/40 animate-ping" />
                            <div className="absolute inset-0 rounded-lg bg-amber-400/30 animate-pulse shadow-[0_0_20px_6px_rgba(251,191,36,0.5)]" />
                        </div>
                    )}
                    {discard.length > 0 ? (
                        <>
                            {/* Symmetric Stack Effect */}
                            <div className="absolute inset-0 bg-white rounded-sm border border-slate-300 shadow-sm -translate-x-1 -translate-y-1 -rotate-1" />

                            {/* Top Card */}
                            <div className={`absolute inset-0 bg-white rounded-sm shadow-xl transition-transform group-hover:-translate-y-2 group-hover:rotate-1 border overflow-hidden z-10 ${hasPlayableFromDiscard ? 'border-amber-400 border-2' : 'border-slate-200'}`}>
                                <CardPreview
                                    previewRef={topDef?.previewRef}
                                    className="w-full h-full object-cover"
                                />
                                {!topDef?.previewRef && (
                                    <div className="absolute inset-0 flex items-center justify-center p-1 text-center">
                                        <span className="text-[0.5vw] font-bold leading-none">{topName}</span>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="absolute inset-0 bg-black/20 rounded-sm border-2 border-dashed border-white/30 flex items-center justify-center">
                            <Trash2 className="text-white/30" />
                        </div>
                    )}
                    {/* 可打出徽章 */}
                    {hasPlayableFromDiscard && (
                        <div className="absolute -top-3 -right-3 z-20 flex items-center justify-center">
                            <span className="relative flex h-6 w-6">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-6 w-6 bg-amber-500 items-center justify-center text-white text-[10px] font-black shadow-lg">!</span>
                            </span>
                        </div>
                    )}
                </div>
                <div className={`mt-2 h-5 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-colors ${hasPlayableFromDiscard ? 'bg-amber-500/80 text-white animate-pulse' : 'bg-black/60 text-white group-hover:text-red-400'}`}>
                    <Trash2 size={10} /> {t('ui.discard')} ({discard.length})
                    {hasPlayableFromDiscard && <span className="text-[9px] ml-1">⚡</span>}
                    {(!isMyTurn && !hasPlayableFromDiscard) && <span className="text-yellow-400 text-[9px]">({t('ui.viewing')})</span>}
                </div>
            </div>

            {/* Discard List Overlay */}
            <AnimatePresence>
                {
                    showDiscard && (
                        <DiscardListOverlay
                            matches={discard}
                            onClose={() => setShowDiscard(false)}
                            onCardView={onCardView}
                        />
                    )
                }
            </AnimatePresence >
        </div>
    );
};

// Generic-ish Card List Overlay
const DiscardListOverlay: React.FC<{
    matches: CardInstance[];
    onClose: () => void;
    onCardView?: (card: CardInstance) => void;
}> = ({ matches, onClose, onCardView }) => {
    const { t, i18n } = useTranslation('game-smashup');
    // Standard backdrop blur handling according to AGENTS.md
    const blurActive = useDelayedBackdropBlur(true);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            // Apply delay-loaded blur class and ensure pointer events are enabled
            className={`fixed inset-0 bg-black/60 flex items-center justify-center p-10 cursor-pointer pointer-events-auto ${blurActive ? 'backdrop-blur-md' : ''}`}
            style={{ zIndex: UI_Z_INDEX.overlayRaised }}
            onClick={(e) => {
                // Ensure we are clicking the backdrop div itself
                if (e.target === e.currentTarget) {
                    onClose();
                }
            }}
        >
            <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-[#3e2723] w-full max-w-5xl h-[80vh] rounded-xl shadow-2xl flex flex-col overflow-hidden border-4 border-[#5d4037] relative cursor-auto"
                onClick={e => e.stopPropagation()} // Prevent closing when clicking inside content
                style={{
                    backgroundImage: 'url(https://www.transparenttextures.com/patterns/wood-pattern.png)'
                }}
            >
                {/* Header */}
                <div className="p-6 bg-black/20 flex justify-between items-center border-b border-[#5d4037]">
                    <h2 className="text-2xl font-black text-[#d7ccc8] uppercase tracking-widest flex items-center gap-3">
                        <Trash2 /> {t('ui.discard_pile')} ({matches.length})
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-[#d7ccc8] hover:text-white p-2 hover:bg-white/10 rounded-full transition-colors z-50 pointer-events-auto cursor-pointer"
                    >
                        <X size={32} />
                    </button>
                </div>

                {/* Grid */}
                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-[#5d4037] scrollbar-track-transparent">
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                        {matches.map((card) => {
                            const def = getCardDef(card.defId);
                            const resolvedName = resolveCardName(def, i18n.language) || card.defId;
                            return (
                                <div
                                    key={card.uid}
                                    className="relative aspect-[0.714] bg-white rounded shadow-lg hover:scale-105 transition-transform group cursor-zoom-in"
                                    onClick={() => onCardView?.(card)}
                                >
                                    <div className="w-full h-full rounded overflow-hidden relative bg-slate-200">
                                        <CardPreview
                                            previewRef={def?.previewRef}
                                            className="w-full h-full object-cover"
                                            title={resolvedName}
                                        />
                                        {!def?.previewRef && (
                                            <div className="p-2 text-center text-xs font-bold">{resolvedName}</div>
                                        )}
                                    </div>
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
                                </div>
                            );
                        })}
                        {matches.length === 0 && (
                            <div className="col-span-full h-40 flex items-center justify-center text-[#d7ccc8]/50 text-xl font-bold italic">
                                {t('ui.empty_pile')}
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};
