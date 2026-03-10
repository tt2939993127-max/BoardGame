import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { GameBoardProps } from '../../engine/transport/protocol';
import type { CardiaCore, PlayedCard } from './domain/core-types';
import { getLocalizedImageUrls, getLocalizedLocalAssetPath, getOptimizedImageUrls } from '../../core';
import { EndgameOverlay } from '../../components/game/framework/widgets/EndgameOverlay';
import { GameDebugPanel } from '../../components/game/framework/widgets/GameDebugPanel';
import { OptimizedImage } from '../../components/common/media/OptimizedImage';
import { UndoProvider } from '../../contexts/UndoContext';
import { useGameMode } from '../../contexts/GameModeContext';
import { useTutorialBridge } from '../../contexts/TutorialContext';
import { useEndgame } from '../../hooks/game/useEndgame';
import { useGameAudio } from '../../lib/audio/useGameAudio';
import { useToast } from '../../contexts/ToastContext';
import { cardiaAudioConfig } from './audio.config';
import { CARDIA_MANIFEST } from './manifest';
import { CARDIA_COMMANDS } from './domain/commands';
import { AbilityButton } from './ui/AbilityButton';
import { CardSelectionModal } from './ui/CardSelectionModal';
import { FactionSelectionModal } from './ui/FactionSelectionModal';
import { ChoiceModal } from './ui/ChoiceModal';
import { useAbilityAnimations, AbilityAnimationsLayer } from './ui/AbilityAnimations';
import { CardMagnifyOverlay, type CardMagnifyTarget } from './ui/CardMagnifyOverlay';
import { DiscardPile } from './ui/DiscardPile';
import { CardTransition, CardListTransition } from './ui/CardTransition';
import { CardFlip } from './ui/CardFlip';
import type { FactionId } from './domain/ids';
import { CARDIA_EVENTS } from './domain/events';
import { exposeDebugTools } from './debug';
import { INTERACTION_COMMANDS } from '../../engine/systems/InteractionSystem';
import { CARDIA_IMAGE_PATHS, resolveCardiaCardImagePath } from './imagePaths';

type Props = GameBoardProps<CardiaCore>;

export const CardiaBoard: React.FC<Props> = ({ G, dispatch, playerID, reset, matchData, isMultiplayer }) => {
    const core = G.core;
    const phase = G.sys.phase;  // 从 sys.phase 读取阶段（FlowSystem 管理）
    const isGameOver = G.sys.gameover;
    const gameMode = useGameMode();
    const isLocalMatch = gameMode ? !gameMode.isMultiplayer : !isMultiplayer;
    const { t, i18n } = useTranslation('game-cardia');
    const toast = useToast();
    const effectiveLocale = i18n.resolvedLanguage ?? i18n.language ?? 'zh-CN';
    const boardBackgroundUrls = React.useMemo(
        () => getLocalizedImageUrls(CARDIA_IMAGE_PATHS.BOARD_BACKGROUND, effectiveLocale),
        [effectiveLocale],
    );
    const boardBackgroundLocalUrls = React.useMemo(() => {
        const primaryLocalPath = getLocalizedLocalAssetPath(CARDIA_IMAGE_PATHS.BOARD_BACKGROUND, effectiveLocale);
        const primary = getOptimizedImageUrls(primaryLocalPath).webp;

        const fallbackLocale = effectiveLocale === 'zh-CN' ? 'en' : 'zh-CN';
        const fallbackLocalPath = getLocalizedLocalAssetPath(CARDIA_IMAGE_PATHS.BOARD_BACKGROUND, fallbackLocale);
        const fallback = getOptimizedImageUrls(fallbackLocalPath).webp;

        return { primary, fallback };
    }, [effectiveLocale]);
    const legacyBoardBackgroundUrls = React.useMemo(
        () => getLocalizedImageUrls('cardia/cards/background', effectiveLocale),
        [effectiveLocale],
    );
    
    // 交互状态
    const [showCardSelection, setShowCardSelection] = useState(false);
    const [showFactionSelection, setShowFactionSelection] = useState(false);
    const [showChoice, setShowChoice] = useState(false);
    const [currentInteraction, setCurrentInteraction] = useState<any>(null);
    
    // 卡牌放大状态
    const [magnifyTarget, setMagnifyTarget] = useState<CardMagnifyTarget | null>(null);
    
    // 动画状态
    const animations = useAbilityAnimations();
    
    // 卡牌元素引用（用于动画定位）
    const cardRefs = React.useRef<Map<string, HTMLElement>>(new Map());
    const setCardRef = React.useCallback((cardUid: string, element: HTMLElement | null) => {
        if (element) {
            cardRefs.current.set(cardUid, element);
        } else {
            cardRefs.current.delete(cardUid);
        }
    }, []);
    
    useTutorialBridge(G.sys.tutorial, dispatch as any);
    
    // 用于追踪已处理的事件 ID（必须在组件顶层声明）
    const lastProcessedIdRef = React.useRef<number>(-1);
    
    // 监听事件流，触发动画
    React.useEffect(() => {
        if (!G.sys.eventStream) return;
        
        const stream = G.sys.eventStream;
        
        // 初始化 lastProcessedId（仅在首次有事件时）
        if (lastProcessedIdRef.current === -1 && stream.entries.length > 0) {
            lastProcessedIdRef.current = stream.entries[stream.entries.length - 1].id;
            return; // 首次挂载时跳过历史事件
        }
        
        // 处理新事件
        const newEntries = stream.entries.filter(entry => entry.id > lastProcessedIdRef.current);
        
        newEntries.forEach(entry => {
            const event = entry.event;
            
            // 能力激活闪光
            if (event.type === CARDIA_EVENTS.ABILITY_ACTIVATED) {
                animations.triggerAbilityFlash();
            }
            
            // 能力无有效目标提示
            if (event.type === CARDIA_EVENTS.ABILITY_NO_VALID_TARGET) {
                const payload = event.payload as any;
                if (payload.reason === 'no_markers') {
                    toast.warning(t('ability.noValidTarget.noMarkers', '场上没有带有修正标记或持续标记的卡牌'));
                }
            }
            
            // 修正标记放置动画
            if (event.type === CARDIA_EVENTS.MODIFIER_TOKEN_PLACED) {
                const payload = event.payload as any;
                const targetElement = cardRefs.current.get(payload.cardId);
                if (targetElement) {
                    // 从屏幕中心飞向目标卡牌
                    animations.addModifierToken(null, targetElement, payload.value);
                }
            }
            
            // 持续标记放置动画
            if (event.type === CARDIA_EVENTS.ONGOING_ABILITY_PLACED) {
                const payload = event.payload as any;
                const targetElement = cardRefs.current.get(payload.cardId);
                if (targetElement) {
                    animations.addOngoingMarker(targetElement);
                }
            }
            
            // 印戒移动动画
            if (event.type === CARDIA_EVENTS.SIGNET_MOVED) {
                const payload = event.payload as any;
                const fromElement = cardRefs.current.get(payload.fromCardId);
                const toElement = cardRefs.current.get(payload.toCardId);
                if (fromElement && toElement) {
                    animations.addSignetMove(fromElement, toElement);
                }
            }
        });
        
        // 更新最后处理的事件 ID
        if (newEntries.length > 0) {
            lastProcessedIdRef.current = newEntries[newEntries.length - 1].id;
        }
    }, [G.sys.eventStream, animations, toast, t]);
    
    const { overlayProps: endgameProps } = useEndgame({
        result: isGameOver || undefined,
        playerID,
        matchData,
        reset,
        isMultiplayer,
    });
    
    useGameAudio({
        config: cardiaAudioConfig,
        gameId: CARDIA_MANIFEST.id,
        G: core,
        ctx: {
            currentPlayer: core.currentPlayerId,
            phase: phase,
            gameover: isGameOver,
        },
    });
    
    // 暴露状态给 E2E 测试
    useEffect(() => {
        if (typeof window !== 'undefined') {
            (window as any).__BG_STATE__ = G;
            (window as any).__BG_DISPATCH__ = dispatch;
        }
    }, [G, dispatch]);
    
    // 暴露调试工具
    useEffect(() => {
        exposeDebugTools();
    }, []);
    
    const myPlayerId = playerID || '0';
    const opponentId = core.playerOrder.find(id => id !== myPlayerId) || core.playerOrder[1];
    const myPlayer = core.players[myPlayerId];
    const opponent = core.players[opponentId];
    
    // 监听交互状态变化
    useEffect(() => {
        const interaction = G.sys.interaction?.current;
        console.log('[Board] Interaction state changed:', {
            hasInteraction: !!interaction,
            interactionId: interaction?.id,
            interactionPlayerId: interaction?.playerId,
            myPlayerId,
            isMyInteraction: interaction?.playerId === myPlayerId,
            interactionType: (interaction?.data as any)?.interactionType,
            hasCardiaInteraction: !!(interaction?.data as any)?.cardiaInteraction,
            cardiaInteractionType: (interaction?.data as any)?.cardiaInteraction?.type,
        });
        
        if (interaction && interaction.playerId === myPlayerId) {
            setCurrentInteraction(interaction);
            
            // 根据交互类型显示对应的弹窗
            const data = interaction.data as any;
            console.log('[Board] Setting modal visibility:', {
                interactionType: data.interactionType,
                willShowCardSelection: data.interactionType === 'card-selection',
                willShowFactionSelection: data.interactionType === 'faction-selection',
                willShowChoice: data.interactionType === 'choice',
            });
            
            if (data.interactionType === 'card-selection') {
                setShowCardSelection(true);
            } else if (data.interactionType === 'faction-selection') {
                setShowFactionSelection(true);
            } else if (data.interactionType === 'choice') {
                setShowChoice(true);
            }
        } else {
            setCurrentInteraction(null);
            setShowCardSelection(false);
            setShowFactionSelection(false);
            setShowChoice(false);
        }
    }, [G.sys.interaction, myPlayerId]);
    
    const getTotalSignets = (player: any) => {
        return player.playedCards.reduce((sum: number, card: any) => sum + card.signets, 0);
    };
    const mySignets = getTotalSignets(myPlayer);
    const opponentSignets = getTotalSignets(opponent);
    
    const isAbilityPhase = phase === 'ability';
    
    // 能力阶段时，从 playedCards 中获取当前遭遇的卡牌
    // （currentCard 在遭遇解析后被清空）
    const myCurrentCard = isAbilityPhase 
        ? myPlayer.playedCards.find(card => card.encounterIndex === core.turnNumber)
        : myPlayer.currentCard;
    
    const canActivateAbility = isAbilityPhase 
        && core.currentEncounter?.loserId === myPlayerId
        && !G.sys.interaction.current  // 没有我的交互
        && !G.sys.interaction.isBlocked;  // ✅ 修复：对手有交互时也不显示能力按钮
    
    const handlePlayCard = (cardUid: string) => {
        if (phase !== 'play') {
            console.log('[Cardia] handlePlayCard blocked: not in play phase', { phase });
            return;
        }
        if (myPlayer.hasPlayed) {
            console.log('[Cardia] handlePlayCard blocked: already played');
            return;
        }
        console.log('[Cardia] Dispatching PLAY_CARD', { cardUid });
        dispatch(CARDIA_COMMANDS.PLAY_CARD, { cardUid });
    };
    
    const handleActivateAbility = () => {
        if (!canActivateAbility || !myCurrentCard) return;
        const abilityId = myCurrentCard.abilityIds[0];
        if (!abilityId) return;
        dispatch(CARDIA_COMMANDS.ACTIVATE_ABILITY, {
            abilityId,
            sourceCardUid: myCurrentCard.uid,
        });
    };
    
    const handleSkipAbility = () => {
        if (!canActivateAbility) return;
        dispatch(CARDIA_COMMANDS.SKIP_ABILITY, {
            playerId: myPlayerId,
        });
    };
    
    // 处理卡牌选择确认
    const handleCardSelectionConfirm = (selectedCardUids: string[]) => {
        if (!currentInteraction) {
            console.error('[Cardia] handleCardSelectionConfirm: no current interaction');
            return;
        }
        
        const data = currentInteraction.data as any;
        const maxSelect = data.maxSelect || 1;
        
        console.log('[Cardia] handleCardSelectionConfirm:', {
            selectedCardUids,
            maxSelect,
            interactionId: currentInteraction.id,
        });
        
        // 多选模式：使用 optionIds + mergedValue 传递所有选中的卡牌 UID
        if (maxSelect > 1) {
            console.log('[Cardia] Multi-select mode: dispatching with optionIds and mergedValue');
            
            // 找到所有选中卡牌对应的 optionId
            const selectedCards = data.cards?.filter((c: any) => selectedCardUids.includes(c.uid)) || [];
            const optionIds = selectedCards.map((c: any) => c.optionId).filter(Boolean);
            
            console.log('[Cardia] Selected cards:', {
                selectedCardUids,
                selectedCards: selectedCards.map((c: any) => ({ uid: c.uid, optionId: c.optionId })),
                optionIds,
                allCards: data.cards?.map((c: any) => ({ uid: c.uid, optionId: c.optionId })),
            });
            
            if (optionIds.length !== selectedCardUids.length) {
                console.error('[Cardia] Some selected cards do not have optionId');
                return;
            }
            
            // 使用 optionIds（用于验证）+ mergedValue（用于传递给 handler）
            dispatch(INTERACTION_COMMANDS.RESPOND, { 
                optionIds,
                mergedValue: { cardUids: selectedCardUids }
            });
        } else {
            // 单选模式：找到对应的选项
            const selectedCard = data.cards?.find((c: any) => c.uid === selectedCardUids[0]);
            
            if (selectedCard && selectedCard.optionId) {
                console.log('[Cardia] Single-select mode: dispatching with optionId:', selectedCard.optionId);
                dispatch(INTERACTION_COMMANDS.RESPOND, { optionId: selectedCard.optionId });
            } else {
                console.error('[Cardia] No optionId found for selected card');
            }
        }
        
        setShowCardSelection(false);
    };
    
    // 处理卡牌选择取消
    const handleCardSelectionCancel = () => {
        setShowCardSelection(false);
        // 可选：dispatch SKIP_ABILITY 或其他取消命令
    };
    
    // 处理派系选择确认
    const handleFactionSelectionConfirm = (factionId: FactionId) => {
        if (!currentInteraction) return;
        
        // 找到对应的选项
        const data = currentInteraction.data as any;
        const options = data.options || [];
        const selectedOption = options.find((opt: any) => opt.value?.faction === factionId);
        
        if (selectedOption && selectedOption.id) {
            console.log('[Cardia] Faction selected, dispatching RESPOND:', {
                optionId: selectedOption.id,
                faction: factionId,
            });
            dispatch(INTERACTION_COMMANDS.RESPOND, { optionId: selectedOption.id });
        } else {
            console.error('[Cardia] No optionId found for selected faction:', factionId);
        }
        
        setShowFactionSelection(false);
    };
    
    // 处理派系选择取消
    const handleFactionSelectionCancel = () => {
        setShowFactionSelection(false);
        // 可选：dispatch SKIP_ABILITY 或其他取消命令
    };
    
    // 处理通用选择确认
    const handleChoiceConfirm = (optionId: string) => {
        if (!currentInteraction) return;
        
        console.log('[Cardia] Choice selected, dispatching RESPOND:', { optionId });
        dispatch(INTERACTION_COMMANDS.RESPOND, { optionId });
        
        setShowChoice(false);
    };
    
    // 处理通用选择取消
    const handleChoiceCancel = () => {
        setShowChoice(false);
        // 可选：dispatch SKIP_ABILITY 或其他取消命令
    };
    
    return (
        <UndoProvider value={{ G, dispatch, playerID, isGameOver: !!isGameOver, isLocalMode: isLocalMatch }}>
            <div data-testid="cardia-board" className="relative w-full h-full overflow-hidden">
                {/* 背景图片层 */}
                <div 
                    className="absolute inset-0 w-full h-full bg-cover bg-center"
                    style={{
                        // 回退顺序：CDN 新路径 -> CDN 旧路径 -> 本地新路径
                        backgroundImage: [
                            `url("${boardBackgroundUrls.primary.webp}")`,
                            `url("${boardBackgroundUrls.fallback.webp}")`,
                            `url("${legacyBoardBackgroundUrls.primary.webp}")`,
                            `url("${legacyBoardBackgroundUrls.fallback.webp}")`,
                            `url("${boardBackgroundLocalUrls.primary}")`,
                            `url("${boardBackgroundLocalUrls.fallback}")`,
                        ].join(', '),
                    }}
                />
                
                <div className="relative w-full h-full flex flex-col p-4 gap-4">
                    {/* 对手区域（顶部） */}
                    <div className="flex-shrink-0 flex items-start gap-4">
                        {/* 对手弃牌堆 */}
                        <div className="flex-shrink-0">
                            <div className="text-xs text-gray-400 mb-1 text-center">{t('discard')}</div>
                            <DiscardPile
                                cards={opponent.discard}
                                isOpponent={true}
                                onCardClick={(card) => setMagnifyTarget({ card, core })}
                            />
                        </div>
                        
                        {/* 对手信息栏 */}
                        <div className="flex-1">
                            <PlayerInfoBar
                                player={opponent}
                                isOpponent={true}
                                totalSignets={opponentSignets}
                            />
                        </div>
                        
                        {/* 阶段和回合指示器 */}
                        <div className="flex-shrink-0 flex flex-col gap-2">
                            <div data-testid="cardia-phase-indicator" data-tutorial-id="cardia-phase-indicator" className="bg-black/50 backdrop-blur-sm rounded-lg px-4 py-2 text-white">
                                <div className="text-xs text-gray-400">{t('phase')}</div>
                                <div className="text-lg font-bold">{t(`phases.${phase}`)}</div>
                            </div>
                            
                            <div className="bg-black/50 backdrop-blur-sm rounded-lg px-4 py-2 text-white">
                                <div className="text-xs text-gray-400">{t('turn')}</div>
                                <div data-testid="cardia-turn-number" className="text-lg font-bold">{core.turnNumber}</div>
                            </div>
                        </div>
                    </div>
                    
                    {/* 中央战场区域 - 遭遇序列 */}
                    <div data-testid="cardia-battlefield" data-tutorial-id="cardia-battlefield" className="flex-1 flex items-center justify-center overflow-x-auto px-4">
                        <EncounterSequence
                            myPlayer={myPlayer}
                            opponent={opponent}
                            myPlayerId={myPlayerId}
                            opponentId={opponentId}
                            core={core}
                            setCardRef={setCardRef}
                            onMagnifyCard={(card) => setMagnifyTarget({ card, core })}
                        />
                    </div>
                    
                    {/* 我的区域（底部） */}
                    <div className="flex-shrink-0 flex items-end gap-4">
                        {/* 我的弃牌堆 */}
                        <div className="flex-shrink-0">
                            <div className="text-xs text-gray-400 mb-1 text-center">{t('discard')}</div>
                            <DiscardPile
                                cards={myPlayer.discard}
                                onCardClick={(card) => setMagnifyTarget({ card, core })}
                            />
                        </div>
                        
                        {/* 我的手牌和信息 */}
                        <div className="flex-1">
                            <PlayerArea
                                player={myPlayer}
                                core={core}
                                onPlayCard={handlePlayCard}
                                canPlay={phase === 'play' && !myPlayer.hasPlayed}
                                totalSignets={mySignets}
                                setCardRef={setCardRef}
                                onMagnifyCard={(card) => setMagnifyTarget({ card, core })}
                            />
                        </div>
                    </div>
                    
                    {/* 能力按钮（居中显示） */}
                    {canActivateAbility && (
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
                            {myCurrentCard && myCurrentCard.abilityIds[0] ? (
                                <AbilityButton
                                    abilityId={myCurrentCard.abilityIds[0]}
                                    onActivate={handleActivateAbility}
                                    onSkip={handleSkipAbility}
                                />
                            ) : (
                                // 没有能力时，只显示跳过按钮
                                <button
                                    data-testid="cardia-skip-ability-btn"
                                    onClick={handleSkipAbility}
                                    className="bg-gray-600 hover:bg-gray-700 text-white font-bold px-8 py-4 rounded-lg shadow-lg transition-colors text-xl"
                                >
                                    {t('skip')}
                                </button>
                            )}
                        </div>
                    )}
                    
                    {/* 结束回合按钮（结束阶段显示） */}
                    {phase === 'end' && core.currentPlayerId === myPlayerId && (
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
                            <button
                                data-testid="cardia-end-turn-btn"
                                data-tutorial-id="cardia-end-turn-btn"
                                onClick={() => dispatch(CARDIA_COMMANDS.END_TURN, {})}
                                className="bg-green-600 hover:bg-green-700 text-white font-bold px-8 py-4 rounded-lg shadow-lg transition-colors text-xl"
                            >
                                {t('endTurn')}
                            </button>
                        </div>
                    )}
                </div>
                
                {/* 卡牌选择弹窗 */}
                {showCardSelection && currentInteraction && (
                    <CardSelectionModal
                        title={(currentInteraction.data as any).title || t('selectOneCard')}
                        cards={(currentInteraction.data as any).cards || []}
                        minSelect={(currentInteraction.data as any).minSelect || 1}
                        maxSelect={(currentInteraction.data as any).maxSelect || 1}
                        disabledCardUids={(currentInteraction.data as any).disabledCardUids || []}
                        myPlayerId={(currentInteraction.data as any).myPlayerId || myPlayerId}
                        opponentId={(currentInteraction.data as any).opponentId || opponentId}
                        onConfirm={handleCardSelectionConfirm}
                        onCancel={handleCardSelectionCancel}
                    />
                )}
                
                {/* 派系选择弹窗 */}
                {showFactionSelection && currentInteraction && (
                    <FactionSelectionModal
                        title={(currentInteraction.data as any).title || t('selectFaction')}
                        onConfirm={handleFactionSelectionConfirm}
                        onCancel={handleFactionSelectionCancel}
                    />
                )}
                
                {/* 通用选择弹窗 */}
                {showChoice && currentInteraction && (() => {
                    const data = currentInteraction.data as any;
                    console.log('[Board] Rendering ChoiceModal:', {
                        showChoice,
                        hasCurrentInteraction: !!currentInteraction,
                        hasCardiaInteraction: !!data.cardiaInteraction,
                        title: data.cardiaInteraction?.title,
                        optionsCount: data.cardiaInteraction?.options?.length,
                        options: data.cardiaInteraction?.options,
                    });
                    return (
                        <ChoiceModal
                            title={data.cardiaInteraction?.title || t('makeChoice')}
                            description={data.cardiaInteraction?.description}
                            options={data.cardiaInteraction?.options || []}
                            onConfirm={handleChoiceConfirm}
                            onCancel={handleChoiceCancel}
                        />
                    );
                })()}
                
                {/* 卡牌放大预览 */}
                <CardMagnifyOverlay
                    target={magnifyTarget}
                    onClose={() => setMagnifyTarget(null)}
                />
                
                {isGameOver && <EndgameOverlay {...endgameProps} />}
                <GameDebugPanel G={G} dispatch={dispatch} playerID={myPlayerId} />
                
                {/* 动画层 */}
                <AbilityAnimationsLayer
                    state={animations.state}
                    onAbilityFlashComplete={animations.clearAbilityFlash}
                    onModifierTokenComplete={animations.removeModifierToken}
                    onOngoingMarkerComplete={animations.removeOngoingMarker}
                    onSignetMoveComplete={animations.removeSignetMove}
                />
            </div>
        </UndoProvider>
    );
};

/**
 * 玩家信息栏组件（简化版，不显示手牌）
 */
interface PlayerInfoBarProps {
    player: any;
    isOpponent: boolean;
    totalSignets: number;
}

const PlayerInfoBar: React.FC<PlayerInfoBarProps> = ({ player, totalSignets }) => {
    const { t } = useTranslation('game-cardia');
    
    return (
        <div className="bg-black/30 backdrop-blur-sm rounded-lg px-4 py-2">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="text-white font-bold">{player.name}</div>
                    <div data-testid="cardia-signet-display" data-tutorial-id="cardia-signet-display" className="text-sm text-yellow-400">
                        🏆 {t('signets')}: {totalSignets}
                    </div>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-400">
                    <div>✋ {t('hand')}: {player.hand.length}</div>
                    <div>📚 {t('deck')}: {player.deck.length}</div>
                    <div>🗑️ {t('discard')}: {player.discard.length}</div>
                </div>
            </div>
        </div>
    );
};

/**
 * 遭遇序列组件（参考图片设计）
 */
interface EncounterSequenceProps {
    myPlayer: any;
    opponent: any;
    myPlayerId: string;
    opponentId: string;
    core: CardiaCore;
    setCardRef: (cardUid: string, element: HTMLElement | null) => void;
    onMagnifyCard?: (card: any) => void;
}

const EncounterSequence: React.FC<EncounterSequenceProps> = ({ myPlayer, opponent, myPlayerId, opponentId, core, setCardRef, onMagnifyCard }) => {
    const { t } = useTranslation('game-cardia');
    
    // 合并双方的场上卡牌，按遭遇序号排序
    const encounters: Array<{
        encounterIndex: number;
        myCard?: PlayedCard;
        opponentCard?: PlayedCard;
    }> = [];
    
    // 收集所有遭遇序号
    const allEncounterIndices = new Set<number>();
    myPlayer.playedCards.forEach((card: PlayedCard) => allEncounterIndices.add(card.encounterIndex));
    opponent.playedCards.forEach((card: PlayedCard) => allEncounterIndices.add(card.encounterIndex));
    
    // 构建遭遇对
    Array.from(allEncounterIndices).sort((a, b) => a - b).forEach(index => {
        const myCard = myPlayer.playedCards.find((c: PlayedCard) => c.encounterIndex === index);
        const opponentCard = opponent.playedCards.find((c: PlayedCard) => c.encounterIndex === index);
        encounters.push({ encounterIndex: index, myCard, opponentCard });
    });
    
    // 添加当前遭遇（如果有）
    if (myPlayer.currentCard || opponent.currentCard) {
        encounters.push({
            encounterIndex: core.turnNumber,
            myCard: myPlayer.currentCard,
            opponentCard: opponent.currentCard,
        });
    }
    
    if (encounters.length === 0) {
        return (
            <div className="text-gray-400 text-center">
                <div className="text-2xl mb-2">⚔️</div>
                <div>{t('waiting')}</div>
            </div>
        );
    }
    
    return (
        <div className="flex gap-4 items-center">
            <CardListTransition>
                {encounters.map((encounter, idx) => (
                    <CardTransition key={encounter.encounterIndex} cardUid={`encounter-${encounter.encounterIndex}`} type="field">
                        <EncounterPair
                            encounter={encounter}
                            isLatest={encounter.encounterIndex === core.turnNumber}
                            myPlayerId={myPlayerId}
                            opponentId={opponentId}
                            core={core}
                            setCardRef={setCardRef}
                            onMagnifyCard={onMagnifyCard}
                        />
                    </CardTransition>
                ))}
            </CardListTransition>
        </div>
    );
};

/**
 * 单个遭遇对组件
 */
interface EncounterPairProps {
    encounter: {
        encounterIndex: number;
        myCard?: any;
        opponentCard?: any;
    };
    isLatest: boolean;
    myPlayerId: string;
    opponentId: string;
    core: CardiaCore;
    setCardRef: (cardUid: string, element: HTMLElement | null) => void;
    onMagnifyCard?: (card: any) => void;
}

const EncounterPair: React.FC<EncounterPairProps> = ({ encounter, isLatest, myPlayerId, opponentId, core, setCardRef, onMagnifyCard }) => {
    const { t } = useTranslation('game-cardia');
    const { myCard, opponentCard } = encounter;
    
    const opponent = core.players[opponentId];
    const myPlayer = core.players[myPlayerId];
    
    // 追踪对手卡牌的翻转状态
    // 关键：使用 useRef 追踪初始化状态，避免重复初始化
    const isInitializedRef = React.useRef(false);
    const [opponentFlipState, setOpponentFlipState] = React.useState(() => {
        // 初始状态：
        // - 历史遭遇：直接显示明牌（不播放动画）
        // - 当前遭遇：从暗牌开始（等待翻转）
        if (!isLatest) {
            return true; // 历史遭遇直接显示明牌
        }
        // 当前遭遇：如果对手已经打出卡牌，初始为暗牌（等待我打牌后触发翻转）
        return false;
    });
    
    // 监听对手卡牌的翻开状态变化
    React.useEffect(() => {
        // 标记已初始化
        if (!isInitializedRef.current) {
            isInitializedRef.current = true;
            return;
        }
        
        // 只有当前遭遇才需要监听翻转
        if (!isLatest) {
            return;
        }
        
        // 当对手卡牌应该翻开时，触发翻转
        if (opponent.cardRevealed && !opponentFlipState) {
            setOpponentFlipState(true);
        }
    }, [isLatest, opponent.cardRevealed, opponentFlipState]);
    
    // 判断是否已翻开
    const myRevealed = !isLatest || !!myCard;
    const opponentRevealed = opponentFlipState;
    
    // 只有双方都打出卡牌后才显示 VS 指示器
    const showVS = myCard && opponentCard;
    
    return (
        <div className="relative flex flex-col items-center gap-2">
            {/* 对手卡牌 */}
            <div className="relative z-10">
                {opponentCard ? (
                    <CardFlip
                        showFront={opponentRevealed}
                        enableAnimation={isLatest}
                        frontContent={
                            <CardDisplay 
                                card={opponentCard} 
                                core={core}
                                size="normal"
                                onRef={(el) => setCardRef(opponentCard.uid, el)}
                                onMagnify={onMagnifyCard}
                            />
                        }
                        backContent={<CardBack />}
                    />
                ) : (
                    <EmptySlot />
                )}
            </div>
            
            {/* VS 指示器 - 悬浮在两张卡中间 */}
            {showVS && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 flex items-center justify-center bg-white rounded px-2 py-1 border border-gray-300 shadow-md">
                    <div className="text-sm font-bold text-purple-600">VS</div>
                </div>
            )}
            
            {/* 我的卡牌 */}
            <div className="relative z-10">
                {myCard ? (
                    myRevealed ? (
                        <CardDisplay 
                            card={myCard} 
                            core={core}
                            size="normal"
                            onRef={(el) => setCardRef(myCard.uid, el)}
                            onMagnify={onMagnifyCard}
                        />
                    ) : (
                        <CardBack />
                    )
                ) : (
                    <EmptySlot />
                )}
            </div>
        </div>
    );
};

/**
 * 玩家手牌区域组件
 */
interface PlayerAreaProps {
    player: any;
    core: CardiaCore;
    onPlayCard: (cardUid: string) => void;
    canPlay: boolean;
    totalSignets: number;
    setCardRef: (cardUid: string, element: HTMLElement | null) => void;
    onMagnifyCard?: (card: any) => void;
}

const PlayerArea: React.FC<PlayerAreaProps> = ({ player, core, onPlayCard, canPlay, totalSignets, setCardRef, onMagnifyCard }) => {
    const { t } = useTranslation('game-cardia');
    
    return (
        <div className="bg-black/30 backdrop-blur-sm rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-4">
                    <div className="text-white font-bold">{player.name}</div>
                    <div data-testid="cardia-signet-display" data-tutorial-id="cardia-signet-display" className="text-sm text-yellow-400">
                        🏆 {t('signets')}: {totalSignets}
                    </div>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-400">
                    <div>✋ {t('hand')}: {player.hand.length}</div>
                    <div>📚 {t('deck')}: {player.deck.length}</div>
                    <div>🗑️ {t('discard')}: {player.discard.length}</div>
                </div>
            </div>
            
            {/* 手牌区 */}
            <div data-testid="cardia-hand-area" data-tutorial-id="cardia-hand-area" className="flex gap-2 overflow-x-auto">
                <CardListTransition>
                    {player.hand.map((card: any) => (
                        <CardTransition key={card.uid} cardUid={card.uid} type="hand">
                            <button
                                data-testid={`card-${card.uid}`}
                                onClick={() => onPlayCard(card.uid)}
                                disabled={!canPlay}
                                className={`flex-shrink-0 ${canPlay ? 'hover:scale-105 cursor-pointer' : 'opacity-50 cursor-not-allowed'} transition-transform`}
                            >
                                <CardDisplay 
                                    card={card} 
                                    core={core}
                                    size="normal"
                                    onRef={(el) => setCardRef(card.uid, el)}
                                    onMagnify={onMagnifyCard}
                                />
                            </button>
                        </CardTransition>
                    ))}
                </CardListTransition>
            </div>
        </div>
    );
};

/**
 * 卡牌展示组件
 */
interface CardDisplayProps {
    card: any;
    core: CardiaCore;
    size?: 'normal' | 'small';
    onRef?: (element: HTMLElement | null) => void;
    onMagnify?: (card: any) => void;
}

const CardDisplay: React.FC<CardDisplayProps> = ({ card, core, size = 'normal', onRef, onMagnify }) => {
    const { t } = useTranslation('game-cardia');
    const [imageError, setImageError] = React.useState(false);
    const [isHovered, setIsHovered] = React.useState(false);
    
    const factionColors = {
        swamp: 'from-green-700 to-green-900',
        academy: 'from-yellow-700 to-yellow-900',
        guild: 'from-red-700 to-red-900',
        dynasty: 'from-blue-700 to-blue-900',
    };
    
    const bgColor = factionColors[card.faction as keyof typeof factionColors] || 'from-gray-700 to-gray-900';
    const imagePath = resolveCardiaCardImagePath(card);
    
    // 调整卡牌尺寸：缩小到 95%（约 106px × 160px）
    const sizeClasses = size === 'small' ? 'w-20 h-30' : 'w-[106px] h-[160px]';
    
    // 计算修正标记总和（从 core.modifierTokens 中过滤）
    const modifierTotal = core.modifierTokens
        .filter(token => token.cardId === card.uid)
        .reduce((sum, token) => sum + token.value, 0);
    
    // 计算当前影响力（基础影响力 + 修正标记）
    const displayInfluence = card.baseInfluence + modifierTotal;
    
    // 获取能力描述文本（用于悬浮显示）
    // abilityId 格式：ability_i_void_mage -> i18n key: abilities.void_mage.description
    // 特殊映射：ability_i_magistrate -> abilities.judge.description
    const abilityNameMap: Record<string, string> = {
        'magistrate': 'judge', // 审判官的 i18n key 是 judge
    };
    
    const abilityTexts = card.abilityIds
        .map((abilityId: string) => {
            // 提取能力名称（去掉 ability_i_ 或 ability_ii_ 前缀）
            let abilityName = abilityId.replace(/^ability_(i{1,2}_)?/, '');
            // 应用映射
            abilityName = abilityNameMap[abilityName] || abilityName;
            return t(`abilities.${abilityName}.description`, '');
        })
        .filter((text: string) => text.length > 0);
    
    return (
        <div 
            ref={onRef}
            data-testid={`card-${card.uid}`}
            className={`relative ${sizeClasses} rounded-lg border-2 border-white/20 shadow-lg overflow-hidden`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {imagePath && !imageError ? (
                <OptimizedImage
                    src={imagePath}
                    alt={t(card.defId)}
                    className="absolute inset-0 w-full h-full object-cover"
                    onError={() => setImageError(true)}
                />
            ) : (
                <div className={`absolute inset-0 bg-gradient-to-br ${bgColor}`} />
            )}
            
            {/* 影响力显示（左上角） */}
            <div className="absolute top-1 left-1 bg-black/70 backdrop-blur-sm rounded-full w-9 h-9 flex items-center justify-center">
                <span className="text-white font-bold text-base">{displayInfluence}</span>
            </div>
            
            {/* 放大镜按钮（右上角） */}
            {onMagnify && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onMagnify(card);
                    }}
                    className={`absolute top-1 right-1 w-8 h-8 flex items-center justify-center bg-black/60 hover:bg-amber-500/80 text-white rounded-full transition-all duration-200 shadow-lg border border-white/20 z-20 ${
                        isHovered ? 'opacity-100' : 'opacity-0'
                    }`}
                    title="查看大图"
                >
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 20 20">
                        <path d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" />
                    </svg>
                </button>
            )}
            
            {/* 修正标记显示（右上角，放大镜按钮下方） */}
            {modifierTotal !== 0 && (
                <div className={`absolute ${onMagnify ? 'top-10' : 'top-1'} right-1 ${
                    modifierTotal > 0 ? 'bg-green-500' : 'bg-red-500'
                } text-white font-bold text-xs px-1.5 py-0.5 rounded-full shadow-lg`}>
                    {modifierTotal > 0 ? '+' : ''}{modifierTotal}
                </div>
            )}
            
            {/* 持续能力标记（右上角，如果没有修正标记则显示在这里） */}
            {card.ongoingMarkers && card.ongoingMarkers.length > 0 && (
                <div className={`absolute ${
                    onMagnify && modifierTotal !== 0 ? 'top-[4.5rem]' : 
                    onMagnify || modifierTotal !== 0 ? 'top-10' : 
                    'top-1'
                } right-1 bg-purple-500 text-white text-xs px-1.5 py-0.5 rounded-full shadow-lg flex items-center gap-0.5`}>
                    <span>🔄</span>
                    {card.ongoingMarkers.length > 1 && (
                        <span className="font-bold">×{card.ongoingMarkers.length}</span>
                    )}
                </div>
            )}
            
            {/* 印戒标记（底部） */}
            {card.signets > 0 && (
                <div className="absolute bottom-1 left-0 right-0 flex justify-center gap-0.5">
                    {Array.from({ length: card.signets }).map((_, i) => (
                        <div key={i} className="w-4 h-4 bg-yellow-400 rounded-full border border-yellow-600 shadow" />
                    ))}
                </div>
            )}
            
            {/* 能力文本悬浮覆盖层（参考 Smash Up） */}
            {abilityTexts.length > 0 && (
                <div 
                    className={`absolute inset-0 z-10 pointer-events-none flex flex-col justify-end p-2 transition-opacity duration-200 ${
                        isHovered ? 'opacity-100' : 'opacity-0'
                    }`}
                    data-testid="ability-overlay"
                >
                    {/* 能力文本 - 白色背景，黑色粗体 */}
                    <div className="w-full bg-white/90 backdrop-blur-md text-black font-bold rounded shadow-md leading-tight p-2 text-xs">
                        {abilityTexts.map((text: string, index: number) => (
                            <div key={index} className={index > 0 ? 'mt-1' : ''}>
                                {text}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

/**
 * 卡背组件
 */
const CardBack: React.FC = () => {
    const [imageError, setImageError] = React.useState(false);
    
    return (
        <div className="w-[106px] h-[160px] rounded-lg border-2 border-purple-600 shadow-lg overflow-hidden">
            {!imageError ? (
                <OptimizedImage
                    src={CARDIA_IMAGE_PATHS.DECK1_BACK}
                    alt="Card Back"
                    className="w-full h-full object-cover"
                    onError={() => setImageError(true)}
                />
            ) : (
                <div className="w-full h-full bg-gradient-to-br from-purple-800 to-blue-800 flex items-center justify-center">
                    <div className="text-5xl">🎴</div>
                </div>
            )}
        </div>
    );
};

/**
 * 空槽位组件
 */
const EmptySlot: React.FC = () => {
    return (
        <div className="w-[106px] h-[160px] border-2 border-dashed border-gray-600 rounded-lg flex items-center justify-center text-gray-500">
            <div className="text-xs">等待中...</div>
        </div>
    );
};

// 默认导出（用于客户端清单）
export default CardiaBoard;
