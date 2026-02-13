/**
 * 卡牌展示覆盖层
 * 
 * 用于展示外星人 Probe（查看对手手牌）、Scout Ship（查看牌库顶）、
 * 密大 Book of Iter（查看对手手牌）等能力触发的卡牌展示。
 * 
 * 视觉风格复用 PromptOverlay 的 "Paper Chaos" 美学。
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { CardPreview } from '../../../components/common/media/CardPreview';
import { GameButton } from './GameButton';
import { UI_Z_INDEX } from '../../../core';
import { getCardDef, resolveCardName } from '../data/cards';
import type { SmashUpCore } from '../domain/types';
import type { PlayerId } from '../../../engine/types';

interface Props {
    pendingReveal: SmashUpCore['pendingReveal'];
    playerID: PlayerId | null;
    onDismiss: () => void;
}

export const CardRevealOverlay: React.FC<Props> = ({ pendingReveal, playerID, onDismiss }) => {
    const { t, i18n } = useTranslation('game-smashup');

    if (!pendingReveal) return null;

    const isViewer = pendingReveal.viewerPlayerId === playerID;
    const cards = pendingReveal.cards;

    // 标题：根据展示类型和原因生成
    const title = pendingReveal.type === 'hand'
        ? t('ui.reveal_hand_title', { player: pendingReveal.targetPlayerId, defaultValue: 'P{{player}} 的手牌' })
        : t('ui.reveal_deck_top_title', { player: pendingReveal.targetPlayerId, defaultValue: 'P{{player}} 的牌库顶' });

    return (
        <AnimatePresence>
            <motion.div
                key="reveal-overlay"
                data-testid="card-reveal-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 flex items-center justify-center p-4 bg-black/40 pointer-events-auto"
                style={{ zIndex: UI_Z_INDEX.overlay }}
            >
                <motion.div
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-white rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden border-4 border-slate-800"
                >
                    {/* 标题栏 */}
                    <div className="bg-slate-800 p-6 text-center">
                        <h2 className="text-2xl font-black text-white uppercase tracking-tight">
                            {title}
                        </h2>
                        {!isViewer && (
                            <div className="mt-3 bg-yellow-500/20 text-yellow-300 px-3 py-1 rounded text-xs font-bold uppercase border border-yellow-500/50 inline-block animate-pulse">
                                {t('ui.waiting_for_player', { id: pendingReveal.viewerPlayerId })}
                            </div>
                        )}
                    </div>

                    {/* 卡牌展示区 */}
                    <div className="p-6 bg-slate-50 overflow-x-auto custom-scrollbar" data-testid="reveal-cards-area">
                        {isViewer && cards.length > 0 ? (
                            <div className="flex gap-3 snap-x snap-mandatory min-w-min justify-center">
                                {cards.map((card) => {
                                    const def = getCardDef(card.defId);
                                    const name = def ? resolveCardName(def, t) : card.defId;
                                    return (
                                        <div key={card.uid} className="flex flex-col items-center gap-1 snap-center shrink-0" data-testid={`reveal-card-${card.uid}`}>
                                            <div className="w-[120px] aspect-[0.714] rounded-lg overflow-hidden border-2 border-slate-300 shadow-md bg-slate-200">
                                                {def?.previewRef ? (
                                                    <CardPreview
                                                        previewRef={def.previewRef}
                                                        className="w-full h-full"
                                                        alt={name}
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-500 p-2 text-center">
                                                        {name}
                                                    </div>
                                                )}
                                            </div>
                                            <span className="text-xs font-bold text-slate-600 max-w-[120px] truncate text-center">
                                                {name}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : isViewer ? (
                            <div className="text-sm text-slate-500 text-center py-6">
                                {t('ui.reveal_no_cards', { defaultValue: '没有可展示的卡牌' })}
                            </div>
                        ) : (
                            <div className="text-sm text-slate-500 text-center py-6">
                                {t('ui.prompt_wait', { defaultValue: '等待对方确认…' })}
                            </div>
                        )}
                    </div>

                    {/* 底部确认按钮 */}
                    <div className="bg-slate-100 p-3 text-center border-t border-slate-200">
                        {isViewer ? (
                            <GameButton
                                variant="primary"
                                size="sm"
                                onClick={onDismiss}
                                data-testid="reveal-dismiss-btn"
                            >
                                {t('ui.confirm', { defaultValue: '确认' })}
                            </GameButton>
                        ) : (
                            <span className="text-xs text-slate-400 font-mono uppercase tracking-widest">
                                {t('ui.prompt_wait', { defaultValue: '等待对方确认…' })}
                            </span>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};
