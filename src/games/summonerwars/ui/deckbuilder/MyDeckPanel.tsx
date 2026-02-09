
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { DeckDraft, DeckValidationResult } from '../../config/deckValidation';
import type { SavedDeckSummary } from './useDeckBuilder';

interface MyDeckPanelProps {
    currentDeck: DeckDraft;
    validationResult: DeckValidationResult;
    savedDecks: SavedDeckSummary[];
    onRemoveCard: (cardId: string) => void;
    onSave: (name: string) => void;
    onLoad: (id: string) => void;
    onDelete: (id: string) => void;
    /** 确认使用当前牌组的回调（仅在牌组合法时可用） */
    onConfirm?: () => void;
}

export const MyDeckPanel: React.FC<MyDeckPanelProps> = ({
    currentDeck,
    validationResult,
    savedDecks,
    onRemoveCard,
    onSave,
    onLoad,
    onDelete,
    onConfirm
}) => {
    const { t } = useTranslation('game-summonerwars');
    const [deckName, setDeckName] = React.useState('');

    const totalCards = Array.from(currentDeck.manualCards.values()).reduce((sum, item) => sum + item.count, 0)
        + (currentDeck.summoner ? 1 : 0)
        + currentDeck.autoCards.length;

    // 简单摘要
    const unitCount = Array.from(currentDeck.manualCards.values()).filter(i => i.card.cardType === 'unit').reduce((sum, i) => sum + i.count, 0) + (currentDeck.summoner ? 1 : 0);
    const eventCount = Array.from(currentDeck.manualCards.values()).filter(i => i.card.cardType === 'event').reduce((sum, i) => sum + i.count, 0);

    return (
        <div className="w-[20vw] h-full bg-[#121212] border-l border-white/10 flex flex-col shadow-[-10px_0_30px_rgba(0,0,0,0.5)]">
            {/* Header / Stats */}
            <div className="p-4 border-b border-white/10 bg-black/20">
                <h2 className="text-amber-400 font-bold uppercase tracking-wider text-sm mb-2">{t('deckBuilder.myDeck')}</h2>
                <div className="flex gap-4 text-xs text-white/50">
                    <span>{t('deckBuilder.count')}: <strong className="text-white">{totalCards}</strong></span>
                    <span>{t('deckBuilder.units')}: <strong className="text-white">{unitCount}</strong></span>
                    <span>{t('deckBuilder.events')}: <strong className="text-white">{eventCount}</strong></span>
                </div>
            </div>

            {/* 验证错误 */}
            {!validationResult.valid && (
                <div className="p-3 bg-red-900/20 border-b border-red-500/20">
                    <div className="text-red-400 text-xs font-bold mb-1 uppercase tracking-wide">{t('deckBuilder.invalidDeck')}</div>
                    <ul className="space-y-1">
                        {validationResult.errors.map((err, idx) => (
                            <li key={idx} className="text-[10px] text-red-300 flex justify-between">
                                <span>{err.message}</span>
                                <span className="opacity-50">{err.current}/{err.expected}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* 牌组列表 */}
            <div className="flex-1 overflow-y-auto p-2 scrollbar-hide">
                {/* 召唤师 */}
                {currentDeck.summoner && (
                    <DeckItem
                        name={currentDeck.summoner.name}
                        count={1}
                        type="summoner"
                        isLocked
                    />
                )}

                {/* 自动填充卡牌 */}
                {currentDeck.autoCards.length > 0 && (
                    <div className="my-2 px-2 text-[10px] uppercase text-white/30 font-bold tracking-widest">{t('deckBuilder.startingCards')}</div>
                )}
                {/* 如果需要按名称分组自动卡牌，目前在 UI模拟中主要隐藏/隐含 */}

                {/* 手动添加卡牌 */}
                <div className="my-2 px-2 text-[10px] uppercase text-white/30 font-bold tracking-widest">{t('deckBuilder.buildCards')}</div>
                {Array.from(currentDeck.manualCards.values()).map(({ card, count }) => (
                    <DeckItem
                        key={card.id}
                        name={card.name}
                        count={count}
                        type={card.cardType}
                        onRemove={() => onRemoveCard(card.id)}
                    />
                ))}

                {currentDeck.manualCards.size === 0 && !currentDeck.summoner && (
                    <div className="text-center py-10 text-white/20 text-sm italic">
                        {t('deckBuilder.emptyState')}
                    </div>
                )}
            </div>

            {/* 保存 / 加载操作 */}
            <div className="p-4 border-t border-white/10 bg-black/40 space-y-3">
                {/* 确认使用牌组按钮（仅在牌组合法且有 onConfirm 回调时显示） */}
                {onConfirm && (
                    <button
                        onClick={onConfirm}
                        disabled={!validationResult.valid || !currentDeck.summoner}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-black uppercase tracking-wider transition-colors shadow-lg shadow-emerald-900/30"
                    >
                        {t('deckBuilder.useDeck')}
                    </button>
                )}
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={deckName}
                        onChange={e => setDeckName(e.target.value)}
                        placeholder={t('deckBuilder.placeholderName')}
                        className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-amber-500/50"
                    />
                    <button
                        onClick={() => onSave(deckName)}
                        disabled={!validationResult.valid || !deckName}
                        className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-3 py-1 rounded text-sm font-bold uppercase transition-colors"
                    >
                        {t('deckBuilder.save')}
                    </button>
                </div>

                {/* 已保存牌组列表（模拟） */}
                {savedDecks.length > 0 && (
                    <div className="pt-2 border-t border-white/5">
                        <div className="text-[10px] text-white/30 uppercase mb-2">{t('deckBuilder.savedDecks')}</div>
                        <div className="space-y-1 max-h-[100px] overflow-y-auto">
                            {savedDecks.map(deck => (
                                <div key={deck.id} className="flex items-center justify-between group text-xs text-white/70 hover:bg-white/5 p-1 rounded cursor-pointer" onClick={() => onLoad(deck.id)}>
                                    <span>{deck.name}</span>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onDelete(deck.id); }}
                                        className="text-white/20 hover:text-red-400 opacity-0 group-hover:opacity-100"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

interface DeckItemProps {
    name: string;
    count: number;
    type: string;
    isLocked?: boolean;
    onRemove?: () => void;
}

const DeckItem: React.FC<DeckItemProps> = ({ name, count, type, isLocked, onRemove }) => (
    <div className="flex items-center justify-between p-2 rounded hover:bg-white/5 group border border-transparent hover:border-white/5 transition-colors mb-1">
        <div className="flex items-center gap-2 overflow-hidden">
            <div className={`w-1 h-8 rounded-full ${type === 'summoner' ? 'bg-purple-500' : 'bg-gray-500'}`} />
            <div className="truncate text-sm font-medium text-white/90">{name}</div>
        </div>
        <div className="flex items-center gap-2">
            <div className="text-amber-400 font-bold font-mono text-sm">x{count}</div>
            {!isLocked && onRemove && (
                <button
                    onClick={(e) => { e.stopPropagation(); onRemove(); }}
                    className="w-5 h-5 flex items-center justify-center rounded-full bg-white/10 hover:bg-red-500/80 text-white/50 hover:text-white transition-colors"
                >
                    -
                </button>
            )}
        </div>
    </div>
);
