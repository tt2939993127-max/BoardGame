
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Card, UnitCard, EventCard, StructureCard } from '../../domain/types';
import { getCardPoolByFaction, groupCardsByType } from '../../config/cardRegistry';
import { canAddCard, type DeckDraft } from '../../config/deckValidation';

interface CardPoolPanelProps {
    factionId: string | null;
    currentDeck: DeckDraft;
    onAddCard: (card: Card) => void;
    onSelectSummoner: (card: UnitCard) => void;
}

export const CardPoolPanel: React.FC<CardPoolPanelProps> = ({ factionId, currentDeck, onAddCard, onSelectSummoner }) => {
    const { t } = useTranslation('game-summonerwars');

    const cards = useMemo(() => {
        if (!factionId) return [];
        return getCardPoolByFaction(factionId);
    }, [factionId]);

    const groups = useMemo(() => groupCardsByType(cards), [cards]);

    if (!factionId) {
        return (
            <div className="flex-1 flex items-center justify-center text-white/30 text-lg uppercase tracking-widest">
                {t('deckBuilder.selectFactionFirst')}
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto p-4 bg-gradient-to-b from-[#1a1a1a] to-[#0f0f0f]">
            {/* Summoners */}
            {groups.summoners.length > 0 && (
                <CardSection
                    title={t('deckBuilder.summoners')}
                    cards={groups.summoners}
                    currentDeck={currentDeck}
                    onAdd={(c) => onSelectSummoner(c as UnitCard)}
                    isSummonerSection
                />
            )}

            {/* Champions */}
            {groups.champions.length > 0 && (
                <CardSection
                    title={t('deckBuilder.champions')}
                    cards={groups.champions}
                    currentDeck={currentDeck}
                    onAdd={onAddCard}
                />
            )}

            {/* Commons */}
            {groups.commons.length > 0 && (
                <CardSection
                    title={t('deckBuilder.commons')}
                    cards={groups.commons}
                    currentDeck={currentDeck}
                    onAdd={onAddCard}
                />
            )}

            {/* Events */}
            {groups.events.length > 0 && (
                <CardSection
                    title={t('deckBuilder.events')}
                    cards={groups.events}
                    currentDeck={currentDeck}
                    onAdd={onAddCard}
                />
            )}

            {/* Structures */}
            {groups.structures.length > 0 && (
                <CardSection
                    title={t('deckBuilder.structures')}
                    cards={groups.structures}
                    currentDeck={currentDeck}
                    onAdd={onAddCard}
                />
            )}
        </div>
    );
};

interface CardSectionProps {
    title: string;
    cards: Card[];
    currentDeck: DeckDraft;
    onAdd: (card: Card) => void;
    isSummonerSection?: boolean;
}

const CardSection: React.FC<CardSectionProps> = ({ title, cards, currentDeck, onAdd, isSummonerSection }) => {
    return (
        <div className="mb-8">
            <h3 className="text-amber-500/80 font-bold uppercase text-xs mb-3 flex items-center gap-2">
                <span className="w-1 h-1 bg-amber-500 rounded-full" />
                {title}
            </h3>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
                {cards.map(card => {
                    const isSelectedSummoner = isSummonerSection && currentDeck.summoner?.id === card.id;
                    const check = canAddCard(currentDeck, card);
                    const isDisabled = !check.allowed && !isSummonerSection; // 始终允许选择召唤师（如果是有效切换）

                    // 获取 atlas ID 的临时方法
                    const atlasId = card.cardType === 'unit' && card.unitClass === 'summoner'
                        ? 'sw:necromancer:hero' // 模拟
                        : 'sw:necromancer:cards'; // 模拟

                    return (
                        <div
                            key={card.id}
                            onClick={() => !isDisabled && onAdd(card)}
                            className={`
                relative group aspect-[0.714] rounded-lg overflow-hidden border cursor-pointer transition-all duration-200
                ${isSelectedSummoner ? 'border-amber-400 ring-2 ring-amber-400/50 scale-105 z-10' : ''}
                ${isDisabled ? 'opacity-50 grayscale cursor-not-allowed border-white/5' : 'border-white/20 hover:border-amber-400/60 hover:scale-[1.02] hover:shadow-xl'}
              `}
                        >
                            {/* 卡牌图片占位符 / 精灵图 */}
                            <div className="absolute inset-0 bg-[#2a2a2a] flex flex-col items-center justify-center p-2 text-center">
                                <div className="text-[10px] text-white/50 uppercase mb-1">{card.cardType}</div>
                                <div className="font-bold text-sm text-balance leading-tight">{card.name}</div>
                                {'cost' in card && <div className="absolute top-1 right-1 bg-blue-600/80 text-white text-xs px-1 rounded">{card.cost}</div>}
                                {'life' in card && <div className="absolute bottom-1 right-1 bg-red-600/80 text-white text-xs px-1 rounded">{card.life}</div>}
                                {'strength' in card && <div className="absolute bottom-1 left-1 bg-orange-600/80 text-white text-xs px-1 rounded">⚔{card.strength}</div>}
                            </div>

                            {/* 添加操作的覆盖层 */}
                            {!isDisabled && !isSelectedSummoner && (
                                <div className="absolute inset-0 bg-amber-500/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <div className="w-8 h-8 rounded-full bg-amber-500 text-black flex items-center justify-center font-bold shadow-lg transform scale-0 group-hover:scale-100 transition-transform">
                                        +
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
