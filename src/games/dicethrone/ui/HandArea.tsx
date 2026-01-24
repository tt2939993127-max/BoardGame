import React from 'react';
import type { RefObject } from 'react';
import { AnimatePresence, animate, motion, motionValue, type MotionValue } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import type { AbilityCard, TurnPhase } from '../types';
import { buildLocalizedImageSet } from '../../../core';
import { ENGINE_NOTIFICATION_EVENT, type EngineNotificationDetail } from '../../../engine/notifications';
import { ASSETS } from './assets';
import type { CardAtlasConfig } from './cardAtlas';
import { getCardAtlasStyle } from './cardAtlas';

// 5. Hand Area - 拖拽交互（向上拖拽打出，拖到弃牌堆售卖）
const DRAG_PLAY_THRESHOLD = -150; // 向上拖拽超过此距离触发打出

export const HandArea = ({
    hand,
    locale,
    atlas,
    currentPhase,
    playerCp = 0,
    onPlayCard,
    onSellCard,
    onError,
    canInteract = true,
    canPlayCards = true,
    drawDeckRef,
    discardPileRef,
    undoCardId,
    onSellHintChange,
    onPlayHintChange,
    onSellButtonChange,
}: {
    hand: AbilityCard[];
    locale?: string;
    atlas: CardAtlasConfig;
    currentPhase?: TurnPhase;
    playerCp?: number;
    onPlayCard?: (cardId: string) => void;
    onSellCard?: (cardId: string) => void;
    onError?: (message: string) => void;
    canInteract?: boolean;
    canPlayCards?: boolean;
    drawDeckRef?: RefObject<HTMLDivElement | null>;
    discardPileRef?: RefObject<HTMLDivElement | null>;
    undoCardId?: string;
    onSellHintChange?: (show: boolean) => void;
    onPlayHintChange?: (show: boolean) => void;
    onSellButtonChange?: (show: boolean) => void;
}) => {
    const { t } = useTranslation('game-dicethrone');
    const [draggingCardId, setDraggingCardId] = React.useState<string | null>(null);
    const dragOffsetRef = React.useRef({ x: 0, y: 0 });
    const dragReleaseTimerRef = React.useRef<number | null>(null);
    const draggingCardRef = React.useRef<AbilityCard | null>(null);
    const dragEndHandledRef = React.useRef(false);
    const [showSellHint, setShowSellHint] = React.useState(false);
    const [returningCardMap, setReturningCardMap] = React.useState<
        Record<string, { version: number; offset: { x: number; y: number }; originalIndex: number }>
    >({});
    const [returningVersionMap, setReturningVersionMap] = React.useState<Record<string, number>>({});
    const pendingPlayRef = React.useRef<{
        cardId: string;
        offset: { x: number; y: number };
        originalIndex: number;
    } | null>(null);
    const pendingPlayTimeoutRef = React.useRef<number | null>(null);
    const handRef = React.useRef(hand);
    const cardBackImage = React.useMemo(() => buildLocalizedImageSet(ASSETS.CARD_BG, locale), [locale]);
    const cardFrontImage = React.useMemo(() => buildLocalizedImageSet(ASSETS.CARDS_ATLAS, locale), [locale]);
    const handAreaRef = React.useRef<HTMLDivElement>(null);
    const dragValueMapRef = React.useRef(new Map<string, { x: MotionValue<number>; y: MotionValue<number> }>());

    const getDragValues = React.useCallback((cardId: string) => {
        const existing = dragValueMapRef.current.get(cardId);
        if (existing) return existing;
        const next = { x: motionValue(0), y: motionValue(0) };
        dragValueMapRef.current.set(cardId, next);
        return next;
    }, []);

    const resetDragValues = React.useCallback((cardId: string, source: 'drag' | 'window') => {
        const values = dragValueMapRef.current.get(cardId);
        if (!values) return;
        animate(values.x, 0, { duration: 0.25, ease: 'easeOut' });
        animate(values.y, 0, { duration: 0.25, ease: 'easeOut' });
    }, []);

    const getDeckOffset = React.useCallback(() => {
        if (!drawDeckRef?.current || !handAreaRef.current) {
            return { x: -window.innerWidth * 0.4, y: -window.innerHeight * 0.1 };
        }
        const deckRect = drawDeckRef.current.getBoundingClientRect();
        const handRect = handAreaRef.current.getBoundingClientRect();
        const deckCenterX = deckRect.left + deckRect.width / 2;
        const deckCenterY = deckRect.top + deckRect.height / 2;
        const handCenterX = handRect.left + handRect.width / 2;
        const handCenterY = handRect.bottom - window.innerWidth * 0.06;
        return {
            x: deckCenterX - handCenterX,
            y: deckCenterY - handCenterY,
        };
    }, [drawDeckRef]);

    const getDiscardPileOffset = React.useCallback(() => {
        if (!discardPileRef?.current || !handAreaRef.current) {
            return { x: window.innerWidth * 0.4, y: -window.innerHeight * 0.1 };
        }
        const discardRect = discardPileRef.current.getBoundingClientRect();
        const handRect = handAreaRef.current.getBoundingClientRect();
        const discardCenterX = discardRect.left + discardRect.width / 2;
        const discardCenterY = discardRect.top + discardRect.height / 2;
        const handCenterX = handRect.left + handRect.width / 2;
        const handCenterY = handRect.bottom - window.innerWidth * 0.06;
        return {
            x: discardCenterX - handCenterX,
            y: discardCenterY - handCenterY,
        };
    }, [discardPileRef]);

    const [visibleCardIds, setVisibleCardIds] = React.useState<Set<string>>(new Set());
    const [flippedCardIds, setFlippedCardIds] = React.useState<Set<string>>(new Set());
    const [dealingCardId, setDealingCardId] = React.useState<string | null>(null);
    const [cardSourceMap, setCardSourceMap] = React.useState<Map<string, 'deck' | 'discard'>>(new Map());
    const prevHandIdsRef = React.useRef<string[]>([]);
    const dealTimersRef = React.useRef<number[]>([]);
    const flipTimersRef = React.useRef<number[]>([]);

    const DEAL_INTERVAL = 300;
    const FLIP_INTERVAL = 250;
    const RETURN_RESET_DELAY = 320;
    const PENDING_PLAY_TIMEOUT = 2000;

    const totalCards = hand.length;
    const centerIndex = (totalCards - 1) / 2;

    const clearAnimationTimers = React.useCallback(() => {
        dealTimersRef.current.forEach(timerId => window.clearTimeout(timerId));
        flipTimersRef.current.forEach(timerId => window.clearTimeout(timerId));
        dealTimersRef.current = [];
        flipTimersRef.current = [];
    }, []);

    const clearPendingPlay = React.useCallback(() => {
        pendingPlayRef.current = null;
        if (pendingPlayTimeoutRef.current) {
            window.clearTimeout(pendingPlayTimeoutRef.current);
            pendingPlayTimeoutRef.current = null;
        }
    }, []);

    const triggerReturn = React.useCallback((cardId: string, offset: { x: number; y: number }, originalIndex: number) => {
        setReturningCardMap(prev => {
            const prevEntry = prev[cardId];
            const nextVersion = (prevEntry?.version ?? 0) + 1;
            setReturningVersionMap(prevVersions => ({
                ...prevVersions,
                [cardId]: nextVersion,
            }));
            return {
                ...prev,
                [cardId]: {
                    version: nextVersion,
                    offset,
                    originalIndex,
                },
            };
        });
        window.setTimeout(() => {
            setReturningCardMap(prev => {
                if (!prev[cardId]) return prev;
                const next = { ...prev };
                delete next[cardId];
                return next;
            });
        }, RETURN_RESET_DELAY);
    }, [RETURN_RESET_DELAY]);

    React.useEffect(() => {
        handRef.current = hand;
        if (pendingPlayRef.current && !hand.some(card => card.id === pendingPlayRef.current?.cardId)) {
            clearPendingPlay();
        }
    }, [clearPendingPlay, hand]);

    React.useEffect(() => {
        const currentIds = new Set(hand.map(card => card.id));
        dragValueMapRef.current.forEach((_value, cardId) => {
            if (!currentIds.has(cardId)) {
                dragValueMapRef.current.delete(cardId);
            }
        });
    }, [hand]);

    React.useEffect(() => {
        const handler = (event: Event) => {
            const pending = pendingPlayRef.current;
            if (!pending) return;
            const detail = (event as CustomEvent<EngineNotificationDetail>).detail;
            if (!detail) return;
            if (!handRef.current.some(card => card.id === pending.cardId)) {
                clearPendingPlay();
                return;
            }
            triggerReturn(pending.cardId, pending.offset, pending.originalIndex);
            clearPendingPlay();
        };

        window.addEventListener(ENGINE_NOTIFICATION_EVENT, handler as EventListener);
        return () => window.removeEventListener(ENGINE_NOTIFICATION_EVENT, handler as EventListener);
    }, [clearPendingPlay, triggerReturn]);

    React.useEffect(() => {
        const currentIds = hand.map(c => c.id);
        const prevIds = prevHandIdsRef.current;
        const newIds = currentIds.filter(id => !prevIds.includes(id));
        const removedIds = prevIds.filter(id => !currentIds.includes(id));
        const hasDiff = newIds.length > 0 || removedIds.length > 0;

        if (!hasDiff) {
            prevHandIdsRef.current = currentIds;
            return;
        }

        clearAnimationTimers();
        setDealingCardId(null);

        if (removedIds.length > 0) {
            setVisibleCardIds(prev => {
                const next = new Set(prev);
                removedIds.forEach(id => next.delete(id));
                return next;
            });
            setFlippedCardIds(prev => {
                const next = new Set(prev);
                removedIds.forEach(id => next.delete(id));
                return next;
            });
        }

        if (newIds.length > 0) {
            const isUndoCard = (id: string) => id === undoCardId;
            const undoIds = newIds.filter(isUndoCard);
            const normalIds = newIds.filter(id => !isUndoCard(id));

            setCardSourceMap(prev => {
                const next = new Map(prev);
                newIds.forEach(id => {
                    next.set(id, isUndoCard(id) ? 'discard' : 'deck');
                });
                return next;
            });

            if (undoIds.length > 0) {
                setVisibleCardIds(prev => new Set([...prev, ...undoIds]));
                setFlippedCardIds(prev => new Set([...prev, ...undoIds]));
                undoIds.forEach(id => {
                    setDealingCardId(id);
                    const clearTimerId = window.setTimeout(() => {
                        setDealingCardId(prev => prev === id ? null : prev);
                    }, DEAL_INTERVAL - 50);
                    dealTimersRef.current.push(clearTimerId);
                });
            }

            normalIds.forEach((id, i) => {
                const dealTimerId = window.setTimeout(() => {
                    setDealingCardId(id);
                    setVisibleCardIds(prev => new Set([...prev, id]));
                    const clearTimerId = window.setTimeout(() => {
                        setDealingCardId(prev => prev === id ? null : prev);
                    }, DEAL_INTERVAL - 50);
                    dealTimersRef.current.push(clearTimerId);
                }, i * DEAL_INTERVAL);
                dealTimersRef.current.push(dealTimerId);
            });

            const dealEndTime = normalIds.length * DEAL_INTERVAL;
            const sortedNewIds = [...normalIds].sort((a, b) => {
                const idxA = currentIds.indexOf(a);
                const idxB = currentIds.indexOf(b);
                return idxA - idxB;
            });
            sortedNewIds.forEach((id, i) => {
                const flipTimerId = window.setTimeout(() => {
                    setFlippedCardIds(prev => new Set([...prev, id]));
                }, dealEndTime + i * FLIP_INTERVAL);
                flipTimersRef.current.push(flipTimerId);
            });
        }

        prevHandIdsRef.current = currentIds;
    }, [hand, clearAnimationTimers, undoCardId]);

    const canPlayCard = (card: AbilityCard): { allowed: boolean; reason?: string } => {
        if (!currentPhase || !canPlayCards) return { allowed: false, reason: t('error.notYourTurn') };

        if (card.cpCost > 0 && playerCp < card.cpCost) {
            return { allowed: false, reason: t('error.notEnoughCp', { required: card.cpCost, current: playerCp }) };
        }

        if (card.type === 'upgrade') {
            return { allowed: false, reason: t('error.cannotPlayCard') };
        }
        if (card.timing === 'main') {
            if (currentPhase === 'main1' || currentPhase === 'main2') {
                return { allowed: true };
            }
            return { allowed: false, reason: t('error.wrongPhaseForMain') };
        }
        if (card.timing === 'roll') {
            if (currentPhase === 'offensiveRoll' || currentPhase === 'defensiveRoll') {
                return { allowed: true };
            }
            return { allowed: false, reason: t('error.wrongPhaseForRoll') };
        }
        if (card.timing === 'instant') {
            return { allowed: true };
        }
        return { allowed: false, reason: t('error.cannotPlayCard') };
    };

    const isOverDiscardPile = React.useCallback(() => {
        if (!discardPileRef?.current || !draggingCardId) return false;
        const discardRect = discardPileRef.current.getBoundingClientRect();
        const draggedEl = document.querySelector(`[data-card-id="${draggingCardId}"]`) as HTMLElement | null;
        if (!draggedEl) return false;
        const cardRect = draggedEl.getBoundingClientRect();
        const cardCenterX = cardRect.left + cardRect.width / 2;
        const cardCenterY = cardRect.top + cardRect.height / 2;
        const padding = 20;
        return cardCenterX >= discardRect.left - padding &&
               cardCenterX <= discardRect.right + padding &&
               cardCenterY >= discardRect.top - padding &&
               cardCenterY <= discardRect.bottom + padding;
    }, [discardPileRef, draggingCardId]);

    const handleDragEnd = React.useCallback((card: AbilityCard, source: 'drag' | 'window' = 'drag') => {
        if (!canInteract) return;
        if (dragEndHandledRef.current && source === 'drag') return;
        dragEndHandledRef.current = true;
        const { x, y } = dragOffsetRef.current;
        const overDiscard = isOverDiscardPile();
        const currentIndex = hand.findIndex(c => c.id === card.id);
        const offset = { x, y };

        let actionTaken = false;
        if (y < DRAG_PLAY_THRESHOLD) {
            const playCheck = canPlayCard(card);
            if (playCheck.allowed) {
                if (onPlayCard) {
                    pendingPlayRef.current = { cardId: card.id, offset, originalIndex: currentIndex };
                    if (pendingPlayTimeoutRef.current) {
                        window.clearTimeout(pendingPlayTimeoutRef.current);
                    }
                    pendingPlayTimeoutRef.current = window.setTimeout(() => {
                        clearPendingPlay();
                    }, PENDING_PLAY_TIMEOUT);
                    onPlayCard(card.id);
                    actionTaken = true;
                } else if (onError) {
                    onError(t('error.cannotPlayCard'));
                }
            } else if (playCheck.reason && onError) {
                onError(playCheck.reason);
            }
        } else if (overDiscard && (currentPhase === 'main1' || currentPhase === 'main2')) {
            if (!canPlayCards && onError) {
                onError(t('error.notYourTurn'));
            } else if (onSellCard) {
                onSellCard(card.id);
                actionTaken = true;
            }
        }

        if (!actionTaken) {
            triggerReturn(card.id, offset, currentIndex);
        }
        resetDragValues(card.id, source);
        setDraggingCardId(null);
        draggingCardRef.current = null;
        dragOffsetRef.current = { x: 0, y: 0 };
        onPlayHintChange?.(false);
        setShowSellHint(false);
        onSellHintChange?.(false);
        onSellButtonChange?.(false);
    }, [
        canInteract,
        canPlayCards,
        currentPhase,
        hand,
        isOverDiscardPile,
        onError,
        onPlayCard,
        onPlayHintChange,
        onSellCard,
        onSellButtonChange,
        onSellHintChange,
        resetDragValues,
        t,
        triggerReturn,
    ]);

    const handleDrag = (_cardId: string, info: { offset: { x: number; y: number } }) => {
        dragOffsetRef.current = info.offset;
        const canSellInPhase = currentPhase === 'main1' || currentPhase === 'main2';
        const nextSellHint = canSellInPhase && isOverDiscardPile();
        if (showSellHint !== nextSellHint) {
            setShowSellHint(nextSellHint);
            onSellHintChange?.(nextSellHint);
        }
    };

    React.useEffect(() => {
        const handlePointerEnd = (event: PointerEvent) => {
            if (!draggingCardRef.current || dragEndHandledRef.current) return;
            handleDragEnd(draggingCardRef.current, 'window');
        };

        const handleWindowBlur = () => {
            if (!draggingCardRef.current || dragEndHandledRef.current) return;
            handleDragEnd(draggingCardRef.current, 'window');
        };

        window.addEventListener('pointerup', handlePointerEnd);
        window.addEventListener('pointercancel', handlePointerEnd);
        window.addEventListener('blur', handleWindowBlur);
        return () => {
            window.removeEventListener('pointerup', handlePointerEnd);
            window.removeEventListener('pointercancel', handlePointerEnd);
            window.removeEventListener('blur', handleWindowBlur);
        };
    }, [handleDragEnd]);

    return (
        <div ref={handAreaRef} className="absolute bottom-0 left-0 right-0 z-[100] flex justify-center items-end pb-0 h-[22vw] pointer-events-none">
            <div className="relative w-[95vw] h-full flex justify-center items-end">
                <AnimatePresence>
                    {hand.map((card, i) => {
                        const isVisible = visibleCardIds.has(card.id);
                        if (!isVisible) return null;

                        const offset = i - centerIndex;
                        const rotation = offset * 5;
                        const yOffset = Math.abs(offset) * 0.8;
                        const spriteIndex = (card.atlasIndex ?? i) % (atlas.cols * atlas.rows);
                        const atlasStyle = getCardAtlasStyle(spriteIndex, atlas);
                        const isDragging = draggingCardId === card.id;
                        const isDealing = dealingCardId === card.id;
                        const isFlipped = flippedCardIds.has(card.id);
                        const returningEntry = returningCardMap[card.id];
                        const zIndex = isDragging ? 500 : 100 + i;
                        const isReturning = !!returningEntry;
                        const returnVersion = returningVersionMap[card.id] ?? 0;
                        const canDrag = canInteract && isFlipped && !isReturning;
                        const dragValues = getDragValues(card.id);

                        return (
                            <motion.div
                                key={`${card.id}-${returnVersion}`}
                                data-card-id={card.id}
                                drag={canDrag}
                                dragElastic={0.1}
                                dragMomentum={false}
                                onDragStart={() => {
                                    if (!canDrag) return;
                                    dragEndHandledRef.current = false;
                                    draggingCardRef.current = card;
                                    dragValues.x.set(0);
                                    dragValues.y.set(0);
                                    setDraggingCardId(card.id);
                                    onSellButtonChange?.(true);
                                    onPlayHintChange?.(true);
                                }}
                            onDrag={(_, info) => canDrag && handleDrag(card.id, info)}
                            onDragEnd={() => canDrag && handleDragEnd(card, 'drag')}
                                className={`
                                    absolute bottom-0 w-[12vw] aspect-[0.61] rounded-[0.8vw]
                                    cursor-grab active:cursor-grabbing pointer-events-auto origin-bottom-center bg-transparent overflow-visible
                                `}
                                style={{
                                    bottom: '-2vw',
                                    left: `calc(50% + ${offset * 7}vw - 6vw)`,
                                    x: dragValues.x,
                                    y: dragValues.y,
                                    zIndex,
                                }}
                            >
                                <motion.div
                                    className="relative w-full h-full"
                                    initial={isDealing
                                        ? (() => {
                                            const source = cardSourceMap.get(card.id) ?? (card.id === undoCardId ? 'discard' : 'deck');
                                            const pos = source === 'discard' ? getDiscardPileOffset() : getDeckOffset();
                                            const baseOffsetX = offset * window.innerWidth * 0.07;
                                            const baseOffsetY = yOffset * window.innerWidth * 0.01;
                                            return {
                                                opacity: 1,
                                                x: pos.x - baseOffsetX,
                                                y: pos.y - baseOffsetY,
                                                scale: 0.5,
                                                rotate: 0,
                                            };
                                        })()
                                        : (returningEntry ? (() => {
                                            const origOffset = returningEntry.originalIndex - centerIndex;
                                            const origYOffset = Math.abs(origOffset) * 0.8;
                                            return {
                                                opacity: 1,
                                                x: (origOffset - offset) * window.innerWidth * 0.07 + returningEntry.offset.x,
                                                y: (origYOffset - yOffset) * window.innerWidth * 0.01 + returningEntry.offset.y,
                                                scale: 1,
                                                rotate: 0,
                                            };
                                        })() : false)
                                    }
                                    animate={{
                                        opacity: 1,
                                        x: 0,
                                        y: yOffset * window.innerWidth * 0.01,
                                        scale: isDragging ? 1.15 : 1,
                                        rotate: isDragging ? 0 : rotation,
                                    }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    transition={isDragging
                                        ? { duration: 0 }
                                        : {
                                            duration: 0.25,
                                            ease: 'easeOut',
                                        }
                                    }
                                    whileHover={canDrag && !isDragging && !isReturning ? { y: -60, scale: 1.2, rotate: 0 } : undefined}
                                >
                                    <div className="relative w-full h-full" style={{ perspective: '1000px' }}>
                                        <motion.div
                                            className={`relative w-full h-full rounded-[0.8vw] shadow-2xl ${isDragging ? 'ring-4 ring-amber-400 shadow-amber-500/50' : ''}`}
                                            style={{ transformStyle: 'preserve-3d' }}
                                            initial={{ rotateY: isFlipped ? 0 : 180 }}
                                            animate={{ rotateY: isFlipped ? 0 : 180 }}
                                            transition={{ duration: 0.6 }}
                                        >
                                            <div
                                                className="absolute inset-0 w-full h-full rounded-[0.8vw] backface-hidden border border-slate-700"
                                                style={{
                                                    backgroundImage: cardFrontImage,
                                                    backgroundRepeat: 'no-repeat',
                                                    ...atlasStyle,
                                                }}
                                            />
                                            <div
                                                className="absolute inset-0 w-full h-full rounded-[0.8vw] backface-hidden border border-slate-700"
                                                style={{
                                                    transform: 'rotateY(180deg)',
                                                    backgroundImage: cardBackImage,
                                                    backgroundSize: 'cover',
                                                }}
                                            />
                                        </motion.div>
                                    </div>
                                </motion.div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
        </div>
    );
};
