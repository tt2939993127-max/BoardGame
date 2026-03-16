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
import { getInitialOpponentFlipState, getNextOpponentFlipState } from './ui/encounterFlipState';
import type { FactionId } from './domain/ids';
import { CARDIA_EVENTS } from './domain/events';
import { exposeDebugTools } from './debug';
import { INTERACTION_COMMANDS } from '../../engine/systems/InteractionSystem';
import { CARDIA_IMAGE_PATHS, resolveCardiaCardImagePath } from './imagePaths';
import { logger } from '../../lib/logger';

type Props = GameBoardProps<CardiaCore>;

const CARDIA_SAFE_AREA_BOTTOM = 'env(safe-area-inset-bottom, 0px)';

const CARD_SIZE_CLASSES = 'w-[var(--cardia-card-width)] aspect-[106/160]';
const SMALL_CARD_SIZE_CLASSES = 'w-[var(--cardia-small-card-width)] aspect-[106/160]';

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

    const [viewportSize, setViewportSize] = useState(() => ({
        width: typeof window !== 'undefined' ? window.innerWidth : 0,
        height: typeof window !== 'undefined' ? window.innerHeight : 0,
    }));

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const syncViewportSize = () => {
            setViewportSize({
                width: window.innerWidth,
                height: window.innerHeight,
            });
        };

        syncViewportSize();
        window.addEventListener('resize', syncViewportSize);
        window.addEventListener('orientationchange', syncViewportSize);

        return () => {
            window.removeEventListener('resize', syncViewportSize);
            window.removeEventListener('orientationchange', syncViewportSize);
        };
    }, []);

    // 设备类型检测
    type DeviceType = 
        | 'phone-portrait'      // 手机竖屏
        | 'phone-landscape'     // 手机横屏
        | 'tablet-portrait'     // 平板竖屏
        | 'tablet-landscape'    // 平板横屏
        | 'desktop';            // 桌面

    const deviceType = React.useMemo((): DeviceType => {
        const { width, height } = viewportSize;
        if (width === 0 || height === 0) return 'desktop';
        
        const isPortrait = height > width;
        
        if (width < 768) {
            return isPortrait ? 'phone-portrait' : 'phone-landscape';
        } else if (width < 1024) {
            return isPortrait ? 'tablet-portrait' : 'tablet-landscape';
        } else {
            return 'desktop';
        }
    }, [viewportSize]);

    // 卡牌尺寸计算
    const cardSizeStyle = React.useMemo(() => {
        const desktopCardWidth = 106;
        const desktopSmallCardWidth = 80;
        const { width, height } = viewportSize;
        
        let cardWidth = desktopCardWidth;
        let smallCardWidth = desktopSmallCardWidth;

        switch (deviceType) {
            case 'phone-portrait':
                // 手机竖屏：基于宽度，确保手牌区域不需要过度滚动
                cardWidth = Math.max(66, Math.min(84, Math.round(width * 0.16)));
                smallCardWidth = Math.max(52, Math.min(68, Math.round(width * 0.13)));
                break;
                
            case 'phone-landscape':
                // 手机横屏：基于高度，充分利用垂直空间
                cardWidth = Math.max(62, Math.min(80, Math.round(height * 0.16)));
                smallCardWidth = Math.max(48, Math.min(64, Math.round(height * 0.125)));
                break;
                
            case 'tablet-portrait':
                // 平板竖屏：基于宽度，但比手机更大
                cardWidth = Math.max(90, Math.min(desktopCardWidth, Math.round(width * 0.12)));
                smallCardWidth = Math.max(72, Math.min(desktopSmallCardWidth, Math.round(width * 0.09)));
                break;
                
            case 'tablet-landscape':
                // 平板横屏：接近桌面尺寸
                cardWidth = Math.max(96, Math.min(desktopCardWidth, Math.round(width * 0.09)));
                smallCardWidth = Math.max(76, Math.min(desktopSmallCardWidth, Math.round(width * 0.07)));
                break;
                
            case 'desktop':
                // 桌面：固定尺寸
                cardWidth = desktopCardWidth;
                smallCardWidth = desktopSmallCardWidth;
                break;
        }

        return {
            '--cardia-card-width': `${cardWidth}px`,
            '--cardia-small-card-width': `${smallCardWidth}px`,
        } as React.CSSProperties;
    }, [deviceType, viewportSize]);

    const layoutStyle = React.useMemo(() => {
        // 说明：
        // - 手机竖屏 / 平板竖屏下，“我的区域”会绝对定位在底部。
        // - 为避免遮挡战场区域，需要为外层容器预留底部空间，并包含安全区。
        // - 预留空间必须和 PlayerZone 自身高度保持一致，否则会出现战场被遮挡/底部空白。
        const playerZoneHeight =
            deviceType === 'phone-portrait'
                ? 'clamp(5.75rem, 18vw, 6.75rem)'
                : deviceType === 'tablet-portrait'
                  ? 'clamp(6.5rem, 14vw, 7.75rem)'
                  : 'auto';

        const reservedBottom =
            deviceType === 'phone-portrait' || deviceType === 'tablet-portrait'
                ? `calc(${CARDIA_SAFE_AREA_BOTTOM} + ${playerZoneHeight})`
                : '0px';

        return {
            '--cardia-player-zone-height': playerZoneHeight,
            '--cardia-reserved-bottom': reservedBottom,
        } as React.CSSProperties;
    }, [deviceType]);

    const playerZoneWrapperStyle = React.useMemo(() => {
        if (deviceType !== 'phone-portrait' && deviceType !== 'tablet-portrait') return undefined;

        // PlayerZone 在竖屏下为 absolute，需要用 translateY 把 safe-area 让出来，
        // 避免：
        // - reservedBottom 把 safe-area 算进去后
        // - PlayerZone 又额外 “抬高”
        // 导致整体高度超出 viewport。
        return {
            height: 'var(--cardia-player-zone-height)',
            transform: `translateY(calc(-1 * ${CARDIA_SAFE_AREA_BOTTOM}))`,
        } as React.CSSProperties;
    }, [deviceType]);
    
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
        logger.debug('[CardiaBoard] Interaction state changed', {
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
            logger.debug('[CardiaBoard] Setting modal visibility', {
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
            logger.debug('[CardiaBoard] handlePlayCard blocked: not in play phase', { phase });
            return;
        }
        if (myPlayer.hasPlayed) {
            logger.debug('[CardiaBoard] handlePlayCard blocked: already played');
            return;
        }
        logger.debug('[CardiaBoard] Dispatching PLAY_CARD', { cardUid });
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
            logger.error('[CardiaBoard] handleCardSelectionConfirm: no current interaction');
            return;
        }
        
        const data = currentInteraction.data as any;
        const maxSelect = data.maxSelect || 1;
        
        logger.debug('[CardiaBoard] handleCardSelectionConfirm', {
            selectedCardUids,
            maxSelect,
            interactionId: currentInteraction.id,
        });
        
        // 多选模式：使用 optionIds + mergedValue 传递所有选中的卡牌 UID
        if (maxSelect > 1) {
            logger.debug('[CardiaBoard] Multi-select mode: dispatching with optionIds and mergedValue');
            
            // 找到所有选中卡牌对应的 optionId
            const selectedCards = data.cards?.filter((c: any) => selectedCardUids.includes(c.uid)) || [];
            const optionIds = selectedCards.map((c: any) => c.optionId).filter(Boolean);
            
            logger.debug('[CardiaBoard] Selected cards', {
                selectedCardUids,
                selectedCards: selectedCards.map((c: any) => ({ uid: c.uid, optionId: c.optionId })),
                optionIds,
                allCards: data.cards?.map((c: any) => ({ uid: c.uid, optionId: c.optionId })),
            });
            
            if (optionIds.length !== selectedCardUids.length) {
                logger.error('[CardiaBoard] Some selected cards do not have optionId');
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
                logger.debug('[CardiaBoard] Single-select mode: dispatching with optionId', {
                    optionId: selectedCard.optionId,
                });
                dispatch(INTERACTION_COMMANDS.RESPOND, { optionId: selectedCard.optionId });
            } else {
                logger.error('[CardiaBoard] No optionId found for selected card');
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
            logger.debug('[CardiaBoard] Faction selected, dispatching RESPOND', {
                optionId: selectedOption.id,
                faction: factionId,
            });
            dispatch(INTERACTION_COMMANDS.RESPOND, { optionId: selectedOption.id });
        } else {
            logger.error('[CardiaBoard] No optionId found for selected faction', { factionId });
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
        
        logger.debug('[CardiaBoard] Choice selected, dispatching RESPOND', { optionId });
        dispatch(INTERACTION_COMMANDS.RESPOND, { optionId });
        
        setShowChoice(false);
    };
    
    // 处理通用选择取消
    const handleChoiceCancel = () => {
        setShowChoice(false);
        // 可选：dispatch SKIP_ABILITY 或其他取消命令
    };
    
    const boardStatusCards = [
        {
            key: 'phase',
            label: t('phase'),
            value: t(`phases.${phase}`),
            containerProps: {
                'data-testid': 'cardia-phase-indicator',
                'data-tutorial-id': 'cardia-phase-indicator',
            },
        },
        {
            key: 'turn',
            label: t('turn'),
            value: (
                <span data-testid="cardia-turn-number">
                    {core.turnNumber}
                </span>
            ),
            containerProps: {},
        },
    ];

    return (
        <UndoProvider value={{ G, dispatch, playerID, isGameOver: !!isGameOver, isLocalMode: isLocalMatch }}>
            <div
                data-testid="cardia-board"
                className="relative w-full h-full overflow-hidden"
                style={{
                    ...cardSizeStyle,
                    ...layoutStyle,
                }}
            >
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
                
                <div
                    className={
                        deviceType === 'phone-landscape'
                            ? 'relative flex h-full min-h-0 w-full flex-row gap-1 p-1'
                            : deviceType === 'phone-portrait'
                              ? 'relative flex h-full min-h-0 w-full flex-col gap-1 p-1 pb-[var(--cardia-reserved-bottom)]'
                              : deviceType === 'tablet-portrait'
                                ? 'relative flex h-full min-h-0 w-full flex-col gap-2 p-2 pb-[var(--cardia-reserved-bottom)] lg:gap-3 lg:p-3 lg:pb-3'
                                : deviceType === 'tablet-landscape'
                                  ? 'relative flex h-full min-h-0 w-full flex-col gap-2 p-2 pb-[var(--cardia-reserved-bottom)] lg:gap-3 lg:p-3 lg:pb-3'
                                : 'relative flex h-full min-h-0 w-full flex-col gap-4 p-4'
                    }
                >
                    {/* 对手区域（顶部 / 横屏左栏） */}
                    <div className={
                        deviceType === 'phone-landscape'
                            ? 'flex w-[14rem] max-w-[32%] min-w-0 flex-shrink-0 flex-col gap-2'
                            : 'flex flex-shrink-0 flex-wrap items-start gap-1.5 sm:gap-3 md:gap-4'
                    }>
                        {/* 对手弃牌堆 */}
                        <div className="flex-shrink-0">
                            <div className="mb-1 text-center text-[11px] text-gray-300 sm:text-xs">{t('discard')}</div>
                            <DiscardPile
                                cards={opponent.discard}
                                isOpponent={true}
                                onCardClick={(card) => setMagnifyTarget({ card, core })}
                            />
                        </div>
                        
                        {/* 对手信息栏 */}
                        <div className={
                            deviceType === 'phone-landscape'
                                ? 'min-w-0'
                                : 'min-w-0 flex-1 basis-[16rem]'
                        }>
                            <PlayerInfoBar
                                player={opponent}
                                isOpponent={true}
                                totalSignets={opponentSignets}
                                deviceType={deviceType}
                            />
                        </div>

                        <div className={
                            deviceType === 'phone-landscape'
                                ? 'grid w-full grid-cols-2 gap-2'
                                : 'grid w-full grid-cols-2 gap-2 md:w-auto md:grid-cols-1 md:gap-2'
                        }>
                            {boardStatusCards.map((card) => (
                                <div
                                    key={card.key}
                                    className="rounded-lg border border-white/10 bg-black/55 px-3 py-2 text-white backdrop-blur-md md:px-4"
                                    {...card.containerProps}
                                >
                                    <div className="text-[11px] text-gray-300">{card.label}</div>
                                    <div className="text-sm font-bold sm:text-base md:text-lg">{card.value}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {deviceType === 'phone-landscape' ? (
                        <div className="flex min-w-0 flex-1 flex-col gap-1">
                            {/* 中央战场区域 - 遭遇序列 */}
                            <div
                                data-testid="cardia-battlefield"
                                data-tutorial-id="cardia-battlefield"
                                className="relative flex min-h-0 flex-1 items-start justify-center overflow-x-auto overflow-y-visible px-1 pt-0.5"
                            >
                                <EncounterSequence
                                    myPlayer={myPlayer}
                                    opponent={opponent}
                                    myPlayerId={myPlayerId}
                                    opponentId={opponentId}
                                    core={core}
                                    setCardRef={setCardRef}
                                    onMagnifyCard={(card) => setMagnifyTarget({ card, core })}
                                    deviceType={deviceType}
                                />
                            </div>

                            {/* 我的区域（横屏右侧下栏） */}
                            <div
                                data-testid="cardia-player-zone"
                                className="flex max-h-[38%] flex-shrink-0 items-end gap-1.5 overflow-hidden"
                                style={playerZoneWrapperStyle}
                            >
                                <div className="flex-shrink-0">
                                    <div className="mb-1 text-center text-[11px] text-gray-300 sm:text-xs">{t('discard')}</div>
                                    <DiscardPile
                                        cards={myPlayer.discard}
                                        onCardClick={(card) => setMagnifyTarget({ card, core })}
                                    />
                                </div>

                                <div className="min-w-0 flex-1">
                                    <PlayerArea
                                        player={myPlayer}
                                        core={core}
                                        onPlayCard={handlePlayCard}
                                        canPlay={phase === 'play' && !myPlayer.hasPlayed}
                                        totalSignets={mySignets}
                                        setCardRef={setCardRef}
                                        onMagnifyCard={(card) => setMagnifyTarget({ card, core })}
                                        deviceType={deviceType}
                                    />
                                </div>
                            </div>

                            {/**
                             * 移动端横屏：可视高度非常紧张。
                             * 这里额外兜底一次，避免 PlayerArea 的手牌横向滚动容器
                             * 把整个页面高度撑爆，导致出现纵向溢出/缩放。
                             */}
                            <style>{`
                              [data-testid="cardia-player-zone"] [data-testid="cardia-hand-area"] {
                                padding-bottom: 0 !important;
                              }
                            `}</style>
                        </div>
                    ) : (
                        <>
                            {/* 中央战场区域 - 遭遇序列 */}
                            <div
                                data-testid="cardia-battlefield"
                                data-tutorial-id="cardia-battlefield"
                                className={
                                    deviceType === 'phone-portrait'
                                        ? 'relative flex min-h-[7.5rem] flex-1 items-center justify-start overflow-x-auto overflow-y-visible px-1 py-0.5 pr-10'
                                        : deviceType === 'tablet-portrait'
                                        ? 'relative flex min-h-[10rem] flex-1 items-center justify-start overflow-x-auto overflow-y-visible px-2 py-1 pr-12'
                                        : deviceType === 'tablet-landscape'
                                          ? 'relative flex min-h-[10rem] flex-1 items-center justify-center overflow-x-auto overflow-y-visible px-3 py-1'
                                        : 'relative flex min-h-[12rem] flex-1 items-center justify-center overflow-x-auto overflow-y-visible px-4 py-2'
                                }
                            >
                                <EncounterSequence
                                    myPlayer={myPlayer}
                                    opponent={opponent}
                                    myPlayerId={myPlayerId}
                                    opponentId={opponentId}
                                    core={core}
                                    setCardRef={setCardRef}
                                    onMagnifyCard={(card) => setMagnifyTarget({ card, core })}
                                    deviceType={deviceType}
                                />

                                {/* 移动端视觉引导：右侧渐隐 + 滑动提示 */}
                                {(deviceType === 'phone-portrait' || deviceType === 'tablet-portrait') && (
                                    <div className="pointer-events-none absolute right-0 top-0 h-full w-14 md:hidden">
                                        <div className="absolute inset-0 bg-gradient-to-l from-black/70 via-black/25 to-transparent" />
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 select-none text-xl font-black text-white/70">
                                            ›
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* 我的区域（底部） */}
                            <div
                                data-testid="cardia-player-zone"
                                className={
                                    deviceType === 'phone-portrait'
                                        ? 'absolute inset-x-1 bottom-1 z-10 flex items-end gap-1.5'
                                        : deviceType === 'tablet-portrait'
                                        ? 'absolute inset-x-2 bottom-2 z-10 flex items-end gap-3 lg:static lg:z-auto lg:flex-shrink-0 lg:gap-4'
                                        : deviceType === 'tablet-landscape'
                                          ? 'flex flex-shrink-0 items-end gap-3 lg:gap-4'
                                        : 'flex flex-shrink-0 items-end gap-4'
                                }
                                style={playerZoneWrapperStyle}
                            >
                        {/* 我的弃牌堆 */}
                        <div className="flex-shrink-0">
                            <div className="mb-1 text-center text-[11px] text-gray-300 sm:text-xs">{t('discard')}</div>
                            <DiscardPile
                                cards={myPlayer.discard}
                                onCardClick={(card) => setMagnifyTarget({ card, core })}
                            />
                        </div>
                        
                        {/* 我的手牌和信息 */}
                        <div className="min-w-0 flex-1">
                <PlayerArea
                    player={myPlayer}
                    core={core}
                    onPlayCard={handlePlayCard}
                    canPlay={phase === 'play' && !myPlayer.hasPlayed}
                    totalSignets={mySignets}
                    setCardRef={setCardRef}
                    onMagnifyCard={(card) => setMagnifyTarget({ card, core })}
                    deviceType={deviceType}
                />
            </div>
                            </div>
                        </>
                    )}
                    
                    {/* 能力按钮（居中显示） */}
                    {canActivateAbility && (
                        <div className="absolute inset-x-2 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-10 flex justify-center md:inset-x-auto md:bottom-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2">
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
                                    className="w-full rounded-xl bg-gray-600 px-6 py-3 text-base font-bold text-white shadow-lg transition-colors hover:bg-gray-700 md:w-auto md:px-8 md:py-4 md:text-xl"
                                >
                                    {t('skip')}
                                </button>
                            )}
                        </div>
                    )}
                    
                    {/* 结束回合按钮（结束阶段显示） */}
                    {phase === 'end' && core.currentPlayerId === myPlayerId && (
                        <div className="absolute inset-x-2 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-10 flex justify-center md:inset-x-auto md:bottom-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2">
                            <button
                                data-testid="cardia-end-turn-btn"
                                data-tutorial-id="cardia-end-turn-btn"
                                onClick={() => dispatch(CARDIA_COMMANDS.END_TURN, {})}
                                className="w-full rounded-xl bg-green-600 px-6 py-3 text-base font-bold text-white shadow-lg transition-colors hover:bg-green-700 md:w-auto md:px-8 md:py-4 md:text-xl"
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
                    logger.debug('[CardiaBoard] Rendering ChoiceModal', {
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
    deviceType: 'phone-portrait' | 'phone-landscape' | 'tablet-portrait' | 'tablet-landscape' | 'desktop';
}

const PlayerInfoBar: React.FC<PlayerInfoBarProps> = ({ player, totalSignets, deviceType }) => {
    const { t } = useTranslation('game-cardia');
    
    const isCompact = deviceType === 'phone-landscape' || deviceType === 'phone-portrait';
    
    return (
        <div className={isCompact
            ? 'rounded-lg border border-white/10 bg-black/35 px-2 py-1 backdrop-blur-md'
            : 'rounded-lg border border-white/10 bg-black/35 px-2.5 py-2 backdrop-blur-md sm:px-3 sm:py-2.5 lg:px-4'}
        >
            <div className={isCompact
                ? 'flex items-center justify-between gap-2'
                : 'flex flex-col gap-2 md:flex-row md:items-center md:justify-between'}
            >
                <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 sm:gap-x-4">
                    <div className={isCompact ? 'truncate text-xs font-bold text-white' : 'truncate text-sm font-bold text-white sm:text-base'}>
                        {player.name}
                    </div>
                    <div
                        data-testid="cardia-signet-display"
                        data-tutorial-id="cardia-signet-display"
                        className={isCompact ? 'text-[11px] text-yellow-400' : 'text-xs text-yellow-400 sm:text-sm'}
                    >
                        🏆 {t('signets')}: {totalSignets}
                    </div>
                </div>
                <div className={isCompact
                    ? 'flex flex-wrap items-center justify-end gap-1.5 text-[9px] text-gray-300'
                    : 'grid grid-cols-3 gap-x-2 gap-y-1 text-[10px] text-gray-300 sm:flex sm:flex-wrap sm:items-center sm:justify-end sm:gap-4 sm:text-sm'}
                >
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
    deviceType: 'phone-portrait' | 'phone-landscape' | 'tablet-portrait' | 'tablet-landscape' | 'desktop';
}

const EncounterSequence: React.FC<EncounterSequenceProps> = ({ myPlayer, opponent, myPlayerId, opponentId, core, setCardRef, onMagnifyCard, deviceType }) => {
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
    
    // 根据设备类型调整间距
    const gapClass = deviceType === 'phone-portrait' || deviceType === 'phone-landscape'
        ? 'gap-2'
        : deviceType === 'tablet-portrait' || deviceType === 'tablet-landscape'
        ? 'gap-3'
        : 'gap-4';
    
    return (
        <div className={`flex w-max snap-x snap-mandatory items-center px-1 sm:px-2 ${gapClass}`}>
            <CardListTransition>
                {encounters.map((encounter) => (
                    <CardTransition key={encounter.encounterIndex} cardUid={`encounter-${encounter.encounterIndex}`} type="field">
                        <EncounterPair
                            encounter={encounter}
                            isLatest={encounter.encounterIndex === core.turnNumber}
                            myPlayerId={myPlayerId}
                            opponentId={opponentId}
                            core={core}
                            setCardRef={setCardRef}
                            onMagnifyCard={onMagnifyCard}
                            deviceType={deviceType}
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
    deviceType: 'phone-portrait' | 'phone-landscape' | 'tablet-portrait' | 'tablet-landscape' | 'desktop';
}

const EncounterPair: React.FC<EncounterPairProps> = ({ encounter, isLatest, myPlayerId, opponentId, core, setCardRef, onMagnifyCard, deviceType }) => {
    const { t } = useTranslation('game-cardia');
    const { myCard, opponentCard } = encounter;
    
    const opponent = core.players[opponentId];
    const myPlayer = core.players[myPlayerId];
    
    // 追踪对手卡牌的翻转状态
    // 关键：使用 useRef 追踪初始化状态，避免重复初始化
    const isInitializedRef = React.useRef(false);
    const [opponentFlipState, setOpponentFlipState] = React.useState(() => getInitialOpponentFlipState({
        isLatest,
        opponentCardRevealed: opponent.cardRevealed,
    }));
    
    // 监听对手卡牌的翻开状态变化
    React.useEffect(() => {
        // 标记已初始化
        if (!isInitializedRef.current) {
            isInitializedRef.current = true;
            return;
        }
        
        setOpponentFlipState(prev => getNextOpponentFlipState({
            isLatest,
            opponentCardRevealed: opponent.cardRevealed,
            currentFlipState: prev,
        }));
    }, [isLatest, opponent.cardRevealed]);
    
    // 判断是否已翻开
    const myRevealed = !isLatest || !!myCard;
    const opponentRevealed = opponentFlipState;
    
    // 只有双方都打出卡牌后才显示 VS 指示器
    const showVS = myCard && opponentCard;

    const battlefieldCardSize = deviceType === 'phone-landscape' ? 'small' : 'normal';
    
    return (
        <div className="relative flex snap-center flex-col items-center gap-1 sm:gap-2">
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
                                size={battlefieldCardSize}
                                onRef={(el) => setCardRef(opponentCard.uid, el)}
                                onMagnify={onMagnifyCard}
                            />
                        }
                        backContent={<CardBack size={battlefieldCardSize} />}
                    />
                ) : (
                    <EmptySlot size={battlefieldCardSize} />
                )}
            </div>
            
            {/* VS 指示器 - 悬浮在两张卡中间 */}
            {showVS && (
                <div className="absolute left-1/2 top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-md border border-gray-300 bg-white px-1.5 py-0.5 shadow-md sm:px-2 sm:py-1">
                    <div className="text-xs font-bold text-purple-600 sm:text-sm">VS</div>
                </div>
            )}
            
            {/* 我的卡牌 */}
            <div className="relative z-10">
                {myCard ? (
                    myRevealed ? (
                        <CardDisplay 
                            card={myCard} 
                            core={core}
                            size={battlefieldCardSize}
                            onRef={(el) => setCardRef(myCard.uid, el)}
                            onMagnify={onMagnifyCard}
                        />
                    ) : (
                        <CardBack size={battlefieldCardSize} />
                    )
                ) : (
                    <EmptySlot size={battlefieldCardSize} />
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
    deviceType: 'phone-portrait' | 'phone-landscape' | 'tablet-portrait' | 'tablet-landscape' | 'desktop';
}

const PlayerArea: React.FC<PlayerAreaProps> = ({ player, core, onPlayCard, canPlay, totalSignets, setCardRef, onMagnifyCard, deviceType }) => {
    const { t } = useTranslation('game-cardia');
    const handleCardKeyDown = React.useCallback((event: React.KeyboardEvent<HTMLDivElement>, cardUid: string) => {
        if (!canPlay) return;
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        onPlayCard(cardUid);
    }, [canPlay, onPlayCard]);
    
    const isCompact = deviceType === 'phone-landscape';
    
    return (
        <div
            data-testid="cardia-player-area-panel"
            className={isCompact
                ? 'rounded-lg border border-white/10 bg-black/35 px-2 py-1 backdrop-blur-md'
                : 'rounded-lg border border-white/10 bg-black/35 p-2 backdrop-blur-md sm:p-3 lg:p-4'}
        >
            <div className={isCompact
                ? 'mb-1 flex items-center justify-between gap-2'
                : 'mb-2 flex flex-col gap-2 md:flex-row md:items-center md:justify-between'}
            >
                <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 sm:gap-x-4">
                    <div className={isCompact ? 'truncate text-xs font-bold text-white' : 'truncate text-sm font-bold text-white sm:text-base'}>
                        {player.name}
                    </div>
                    <div
                        data-testid="cardia-signet-display"
                        data-tutorial-id="cardia-signet-display"
                        className={isCompact ? 'text-[11px] text-yellow-400' : 'text-xs text-yellow-400 sm:text-sm'}
                    >
                        🏆 {t('signets')}: {totalSignets}
                    </div>
                </div>
                <div className={isCompact
                    ? 'flex flex-wrap items-center justify-end gap-1.5 text-[9px] text-gray-300'
                    : 'grid grid-cols-3 gap-x-2 gap-y-1 text-[10px] text-gray-300 sm:flex sm:flex-wrap sm:items-center sm:justify-end sm:gap-4 sm:text-sm'}
                >
                    <div>✋ {t('hand')}: {player.hand.length}</div>
                    <div>📚 {t('deck')}: {player.deck.length}</div>
                    <div>🗑️ {t('discard')}: {player.discard.length}</div>
                </div>
            </div>
            
            {/* 手牌区 */}
            <div
                data-testid="cardia-hand-area"
                data-tutorial-id="cardia-hand-area"
                className={isCompact
                    ? 'flex snap-x snap-mandatory gap-1 overflow-x-auto overflow-y-visible pb-0.5 pr-1'
                    : 'flex snap-x snap-mandatory gap-2 overflow-x-auto overflow-y-visible pb-1 pr-1'}
            >
                <CardListTransition>
                    {player.hand.map((card: any) => (
                        <CardTransition key={card.uid} cardUid={card.uid} type="hand">
                            <div
                                data-testid={`card-${card.uid}`}
                                role={canPlay ? 'button' : undefined}
                                tabIndex={canPlay ? 0 : -1}
                                aria-disabled={!canPlay}
                                onClick={() => {
                                    if (!canPlay) return;
                                    onPlayCard(card.uid);
                                }}
                                onKeyDown={(event) => handleCardKeyDown(event, card.uid)}
                                className={`flex-shrink-0 snap-center ${canPlay ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
                            >
                                <CardDisplay 
                                    card={card} 
                                    core={core}
                                    size="small"
                                    onRef={(el) => setCardRef(card.uid, el)}
                                    onMagnify={onMagnifyCard}
                                    showInfluenceBadge={false}
                                />
                            </div>
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
    showInfluenceBadge?: boolean;
}

const CardDisplay: React.FC<CardDisplayProps> = ({
    card,
    core,
    size = 'normal',
    onRef,
    onMagnify,
    showInfluenceBadge = true,
}) => {
    const { t } = useTranslation('game-cardia');
    const [imageError, setImageError] = React.useState(false);
    const [isTouchDevice, setIsTouchDevice] = React.useState(false);
    const longPressTimerRef = React.useRef<number | null>(null);
    const longPressTriggeredRef = React.useRef(false);
    
    const factionColors = {
        swamp: 'from-green-700 to-green-900',
        academy: 'from-yellow-700 to-yellow-900',
        guild: 'from-red-700 to-red-900',
        dynasty: 'from-blue-700 to-blue-900',
    };
    
    const bgColor = factionColors[card.faction as keyof typeof factionColors] || 'from-gray-700 to-gray-900';
    const imagePath = resolveCardiaCardImagePath(card);
    
    // 卡牌尺寸由棋盘根节点的 CSS 变量统一控制：PC 固定，移动端自适应。
    const sizeClasses = size === 'small' ? SMALL_CARD_SIZE_CLASSES : CARD_SIZE_CLASSES;
    
    // 计算修正标记总和（从 core.modifierTokens 中过滤）
    const modifierTotal = core.modifierTokens
        .filter(token => token.cardId === card.uid)
        .reduce((sum, token) => sum + token.value, 0);
    
    // 计算当前影响力（基础影响力 + 修正标记）
    const displayInfluence = card.baseInfluence + modifierTotal;

    React.useEffect(() => {
        if (typeof window === 'undefined') return;

        const mediaQuery = window.matchMedia('(hover: none), (pointer: coarse)');
        const syncTouchCapability = () => setIsTouchDevice(mediaQuery.matches || window.innerWidth < 1024);

        syncTouchCapability();
        mediaQuery.addEventListener?.('change', syncTouchCapability);
        window.addEventListener('resize', syncTouchCapability);

        return () => {
            mediaQuery.removeEventListener?.('change', syncTouchCapability);
            window.removeEventListener('resize', syncTouchCapability);
        };
    }, []);

    const clearLongPressTimer = React.useCallback(() => {
        if (longPressTimerRef.current === null) return;
        window.clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
    }, []);

    const handlePointerDown = React.useCallback(() => {
        if (!isTouchDevice) return;
        if (!onMagnify) return;

        clearLongPressTimer();
        longPressTriggeredRef.current = false;
        longPressTimerRef.current = window.setTimeout(() => {
            longPressTriggeredRef.current = true;
            longPressTimerRef.current = null;
            onMagnify(card);
        }, 320);
    }, [card, clearLongPressTimer, isTouchDevice, onMagnify]);

    const handlePointerUpOrCancel = React.useCallback(() => {
        if (!isTouchDevice) return;
        clearLongPressTimer();
    }, [clearLongPressTimer, isTouchDevice]);

    const handleClickCapture = React.useCallback((event: React.MouseEvent<HTMLDivElement>) => {
        if (!isTouchDevice) return;
        if (!longPressTriggeredRef.current) return;

        event.preventDefault();
        event.stopPropagation();
        longPressTriggeredRef.current = false;
    }, [isTouchDevice]);

    // 放大镜按钮尺寸与卡面等比例
    // - 按钮大小约等于卡面宽度的 22.5%
    // - 图标大小约等于卡面宽度的 12.6%
    // 使用 clamp 做上下限，避免极端屏幕过大/过小
    const magnifyButtonSize = size === 'small'
        ? {
            button: 'h-[clamp(18px,calc(var(--cardia-small-card-width)*0.225),26px)] w-[clamp(18px,calc(var(--cardia-small-card-width)*0.225),26px)]',
            icon: 'h-[clamp(10px,calc(var(--cardia-small-card-width)*0.126),14px)] w-[clamp(10px,calc(var(--cardia-small-card-width)*0.126),14px)]',
            position: 'right-[clamp(2px,calc(var(--cardia-small-card-width)*0.03),6px)] top-[clamp(2px,calc(var(--cardia-small-card-width)*0.03),6px)]',
        }
        : {
            button: 'h-[clamp(22px,calc(var(--cardia-card-width)*0.225),36px)] w-[clamp(22px,calc(var(--cardia-card-width)*0.225),36px)]',
            icon: 'h-[clamp(12px,calc(var(--cardia-card-width)*0.126),20px)] w-[clamp(12px,calc(var(--cardia-card-width)*0.126),20px)]',
            position: 'right-[clamp(4px,calc(var(--cardia-card-width)*0.04),10px)] top-[clamp(4px,calc(var(--cardia-card-width)*0.04),10px)]',
        };
    
    return (
        <div 
            ref={onRef}
            data-testid={`card-${card.uid}`}
            className={`group relative ${sizeClasses} overflow-hidden rounded-lg border-2 border-white/20 shadow-lg transition-transform duration-150 ease-out hover:z-30 hover:scale-110`}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUpOrCancel}
            onPointerCancel={handlePointerUpOrCancel}
            onPointerLeave={handlePointerUpOrCancel}
            onClickCapture={handleClickCapture}
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
            {showInfluenceBadge && (
                <div className="absolute left-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 backdrop-blur-sm sm:h-9 sm:w-9">
                    <span className="text-sm font-bold text-white sm:text-base">{displayInfluence}</span>
                </div>
            )}

            {/* 放大镜按钮（右上角，PC 端 hover 时显示） */}
            {onMagnify && (
                <button
                    onClick={(event) => {
                        event.stopPropagation();
                        event.preventDefault();
                        onMagnify(card);
                    }}
                    className={`absolute z-20 flex items-center justify-center rounded-full border border-white/20 bg-black/75 text-white shadow-lg transition-all duration-200 hover:bg-amber-500/80 ${magnifyButtonSize.position} ${magnifyButtonSize.button} ${
                        isTouchDevice ? 'opacity-0 pointer-events-none' : 'opacity-0 group-hover:opacity-100'
                    }`}
                    title="查看大图"
                    type="button"
                >
                    <svg className={`fill-current ${magnifyButtonSize.icon}`} viewBox="0 0 20 20">
                        <path d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" />
                    </svg>
                </button>
            )}
            
            {/* 修正标记显示（右上角） */}
            {modifierTotal !== 0 && (
                <div className={`absolute top-1 right-1 ${
                    modifierTotal > 0 ? 'bg-green-500' : 'bg-red-500'
                } rounded-full px-1 py-0.5 text-[10px] font-bold text-white shadow-lg sm:px-1.5 sm:text-xs`}>
                    {modifierTotal > 0 ? '+' : ''}{modifierTotal}
                </div>
            )}
            
            {/* 持续能力标记（右上角，如果没有修正标记则显示在这里） */}
            {card.ongoingMarkers && card.ongoingMarkers.length > 0 && (
                <div className={`absolute ${modifierTotal !== 0 ? 'top-10' : 'top-1'} right-1 flex items-center gap-0.5 rounded-full bg-purple-500 px-1 py-0.5 text-[10px] text-white shadow-lg sm:px-1.5 sm:text-xs`}>
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
                        <div key={i} className="h-3 w-3 rounded-full border border-yellow-600 bg-yellow-400 shadow sm:h-4 sm:w-4" />
                    ))}
                </div>
            )}
            
        </div>
    );
};

/**
 * 卡背组件
 */
const CardBack: React.FC<{ size?: 'normal' | 'small' }> = ({ size = 'normal' }) => {
    const [imageError, setImageError] = React.useState(false);
    const sizeClasses = size === 'small' ? SMALL_CARD_SIZE_CLASSES : CARD_SIZE_CLASSES;
    
    return (
        <div className={`${sizeClasses} overflow-hidden rounded-lg border-2 border-purple-600 shadow-lg`}>
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
const EmptySlot: React.FC<{ size?: 'normal' | 'small' }> = ({ size = 'normal' }) => {
    const sizeClasses = size === 'small' ? SMALL_CARD_SIZE_CLASSES : CARD_SIZE_CLASSES;
    return (
        <div className={`${sizeClasses} flex items-center justify-center rounded-lg border-2 border-dashed border-gray-600 text-gray-500`}>
            <div className="text-[10px] sm:text-xs">等待中...</div>
        </div>
    );
};

// 默认导出（用于客户端清单）
export default CardiaBoard;
