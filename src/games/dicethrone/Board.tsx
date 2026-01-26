import React from 'react';
import type { BoardProps } from 'boardgame.io/react';
import type { AbilityCard, TurnPhase, DieFace, HeroState } from './types';
import { HAND_LIMIT } from './domain/types';
import type { MatchState } from '../../engine/types';
import { RESOURCE_IDS } from './domain/resources';
import type { DiceThroneCore } from './domain';
import { useTranslation } from 'react-i18next';
import { OptimizedImage } from '../../components/common/media/OptimizedImage';
import { GameDebugPanel } from '../../components/GameDebugPanel';
import {
    FlyingEffectsLayer,
    useFlyingEffects,
    getViewportCenter,
    getElementCenter,
} from '../../components/common/animations/FlyingEffect';
import { useShake } from '../../components/common/animations/ShakeContainer';
import { usePulseGlow } from '../../components/common/animations/PulseGlow';
import { buildLocalizedImageSet, getLocalizedAssetPath } from '../../core';
import { useToast } from '../../contexts/ToastContext';
import { ASSETS } from './ui/assets';
import {
    STATUS_EFFECT_META,
    getStatusEffectIconNode,
    loadStatusIconAtlasConfig,
    type StatusIconAtlasConfig,
} from './ui/statusEffects';
import { getAbilitySlotId } from './ui/AbilityOverlays';
import { HandArea } from './ui/HandArea';
import { getCardAtlasStyle, loadCardAtlasConfig, type CardAtlasConfig } from './ui/cardAtlas';
import { ConfirmSkipModal } from './ui/ConfirmSkipModal';
import { ChoiceModal } from './ui/ChoiceModal';
import { BonusDieOverlay } from './ui/BonusDieOverlay';
import { OpponentHeader } from './ui/OpponentHeader';
import { LeftSidebar } from './ui/LeftSidebar';
import { CenterBoard } from './ui/CenterBoard';
import { RightSidebar } from './ui/RightSidebar';
import { MagnifyOverlay } from '../../components/common/overlays/MagnifyOverlay';
import { EndgameOverlay } from '../../components/game/EndgameOverlay';
import { useRematch } from '../../contexts/RematchContext';
import { useGameMode } from '../../contexts/GameModeContext';
import { useCurrentChoice, useDiceThroneState } from './hooks/useDiceThroneState';
import { PROMPT_COMMANDS } from '../../engine/systems/PromptSystem';

type DiceThroneMatchState = MatchState<DiceThroneCore>;
type DiceThroneBoardProps = BoardProps<DiceThroneMatchState>;
type DiceThroneMoveMap = {
    advancePhase: () => void;
    rollDice: () => void;
    rollBonusDie: () => void;
    toggleDieLock: (id: number) => void;
    confirmRoll: () => void;
    selectAbility: (abilityId: string) => void;
    playCard: (cardId: string) => void;
    sellCard: (cardId: string) => void;
    undoSellCard?: () => void;
    resolveChoice: (statusId: string) => void;
    responsePass: () => void;
};

const requireMove = <T extends (...args: unknown[]) => void>(value: unknown, name: string): T => {
    if (typeof value !== 'function') {
        throw new Error(`[DiceThroneBoard] 缺少 move: ${name}`);
    }
    return value as T;
};

const resolveMoves = (raw: Record<string, unknown>): DiceThroneMoveMap => {
    // 统一把 payload 包装成领域命令结构，避免 die_not_found 等校验失败
    const advancePhase = requireMove(raw.advancePhase ?? raw.ADVANCE_PHASE, 'advancePhase');
    const rollDice = requireMove(raw.rollDice ?? raw.ROLL_DICE, 'rollDice');
    const rollBonusDie = requireMove(raw.rollBonusDie ?? raw.ROLL_BONUS_DIE, 'rollBonusDie');
    const toggleDieLock = requireMove(raw.toggleDieLock ?? raw.TOGGLE_DIE_LOCK, 'toggleDieLock');
    const confirmRoll = requireMove(raw.confirmRoll ?? raw.CONFIRM_ROLL, 'confirmRoll');
    const selectAbility = requireMove(raw.selectAbility ?? raw.SELECT_ABILITY, 'selectAbility');
    const playCard = requireMove(raw.playCard ?? raw.PLAY_CARD, 'playCard');
    const sellCard = requireMove(raw.sellCard ?? raw.SELL_CARD, 'sellCard');
    const undoSellCardRaw = (raw.undoSellCard ?? raw.UNDO_SELL_CARD) as ((payload?: unknown) => void) | undefined;
    const resolveChoice = requireMove(raw.resolveChoice ?? raw.RESOLVE_CHOICE, 'resolveChoice');

    const responsePassRaw = (raw.responsePass ?? raw.RESPONSE_PASS) as ((payload?: unknown) => void) | undefined;

    return {
        advancePhase: () => advancePhase({}),
        rollDice: () => rollDice({}),
        rollBonusDie: () => rollBonusDie({}),
        toggleDieLock: (id) => toggleDieLock({ dieId: id }),
        confirmRoll: () => confirmRoll({}),
        selectAbility: (abilityId) => selectAbility({ abilityId }),
        playCard: (cardId) => playCard({ cardId }),
        sellCard: (cardId) => sellCard({ cardId }),
        undoSellCard: undoSellCardRaw ? () => undoSellCardRaw({}) : undefined,
        resolveChoice: (statusId) => resolveChoice({ statusId }),
        responsePass: () => responsePassRaw?.({}),
    };
};

// --- Main Layout ---
export const DiceThroneBoard: React.FC<DiceThroneBoardProps> = ({ G: rawG, ctx, moves, playerID, reset, matchData, isMultiplayer }) => {
    const G = rawG.core;
    const access = useDiceThroneState(rawG);
    const choice = useCurrentChoice(access);
    const engineMoves = resolveMoves(moves as Record<string, unknown>);
    const { t, i18n } = useTranslation('game-dicethrone');
    const toast = useToast();
    const locale = i18n.resolvedLanguage ?? i18n.language;
    const gameMode = useGameMode();
    const isLocalMatch = gameMode ? !gameMode.isMultiplayer : !isMultiplayer;

    // 重赛系统（多人模式使用 socket）
    const { state: rematchState, vote: handleRematchVote, registerReset } = useRematch();

    // 注册 reset 回调（当双方都投票后由 socket 触发）
    React.useEffect(() => {
        if (isMultiplayer && reset) {
            registerReset(reset);
        }
    }, [isMultiplayer, reset, registerReset]);

    const isGameOver = ctx.gameover;
    const rootPid = playerID || '0';
    const player = G.players[rootPid] || G.players['0'];
    const otherPid = Object.keys(G.players).find(id => id !== rootPid) || '1';
    const opponent = G.players[otherPid];

    const [isLayoutEditing, setIsLayoutEditing] = React.useState(false);
    const currentPhase = G.turnPhase as TurnPhase;
    const [isTipOpen, setIsTipOpen] = React.useState(true);
    const [magnifiedImage, setMagnifiedImage] = React.useState<string | null>(null);
    const [magnifiedCard, setMagnifiedCard] = React.useState<AbilityCard | null>(null);
    const [viewMode, setViewMode] = React.useState<'self' | 'opponent'>('self');
    const [headerError, setHeaderError] = React.useState<string | null>(null);
    const [isConfirmingSkip, setIsConfirmingSkip] = React.useState(false);
    const [activatingAbilityId, setActivatingAbilityId] = React.useState<string | undefined>(undefined);
    const [isRolling, setIsRolling] = React.useState(false);
    const [cardAtlas, setCardAtlas] = React.useState<CardAtlasConfig | null>(null);
    const [statusIconAtlas, setStatusIconAtlas] = React.useState<StatusIconAtlasConfig | null>(null);
    // 额外骰子投掷展示状态
    const [bonusDieValue, setBonusDieValue] = React.useState<number | undefined>(undefined);
    const [bonusDieFace, setBonusDieFace] = React.useState<DieFace | undefined>(undefined);
    const [showBonusDie, setShowBonusDie] = React.useState(false);
    const prevBonusDieTimestampRef = React.useRef<number | undefined>(undefined);
    const manualViewModeRef = React.useRef<'self' | 'opponent'>('self');
    const autoObserveRef = React.useRef(false);

    // 使用动画库 Hooks
    const { effects: flyingEffects, pushEffect: pushFlyingEffect, removeEffect: handleEffectComplete } = useFlyingEffects();
    const { isShaking: isOpponentShaking, triggerShake: triggerOpponentShake } = useShake(500);
    const { triggerGlow: triggerAbilityGlow } = usePulseGlow(800);

    const opponentHpRef = React.useRef<HTMLDivElement>(null);
    const selfHpRef = React.useRef<HTMLDivElement>(null);
    const opponentBuffRef = React.useRef<HTMLDivElement>(null);
    const selfBuffRef = React.useRef<HTMLDivElement>(null);
    const drawDeckRef = React.useRef<HTMLDivElement>(null);
    const discardPileRef = React.useRef<HTMLDivElement>(null);
    // 追踪最后撤回的卡牌ID（用于撤回动画来源）
    const [lastUndoCardId, setLastUndoCardId] = React.useState<string | undefined>(undefined);
    // 弃牌堆高亮状态（拖拽卡牌到弃牌堆上方时）
    const [discardHighlighted, setDiscardHighlighted] = React.useState(false);
    const [sellButtonVisible, setSellButtonVisible] = React.useState(false);
    // 核心区域高亮状态（拖拽卡牌向上时）
    const [coreAreaHighlighted, setCoreAreaHighlighted] = React.useState(false);
    const prevOpponentHealthRef = React.useRef(opponent?.resources[RESOURCE_IDS.HP]);
    const prevPlayerHealthRef = React.useRef(player?.resources[RESOURCE_IDS.HP]);
    const prevOpponentStatusRef = React.useRef<Record<string, number>>({ ...(opponent?.statusEffects || {}) });
    const prevPlayerStatusRef = React.useRef<Record<string, number>>({ ...(player?.statusEffects || {}) });

    const isSelfView = viewMode === 'self';
    const isActivePlayer = G.activePlayerId === rootPid;
    const viewPid = isSelfView ? rootPid : otherPid;
    const viewPlayer = (isSelfView ? player : opponent) || player;
    const rollerId = currentPhase === 'defensiveRoll' ? G.pendingAttack?.defenderId : G.activePlayerId;
    const shouldAutoObserve = !isLocalMatch && currentPhase === 'defensiveRoll' && rootPid !== rollerId;
    const isRollPhase = currentPhase === 'offensiveRoll' || currentPhase === 'defensiveRoll';
    const isViewRolling = isLocalMatch ? isRollPhase : viewPid === rollerId;
    const rollConfirmed = G.rollConfirmed;
    const availableAbilityIds = isViewRolling ? G.availableAbilityIds : [];
    const selectedAbilityId = currentPhase === 'defensiveRoll'
        ? (isViewRolling ? G.pendingAttack?.defenseAbilityId : undefined)
        : (isViewRolling ? G.pendingAttack?.sourceAbilityId : undefined);
    const canOperateView = isLocalMatch || isSelfView;
    const hasRolled = G.rollCount > 0;
    // 防御阶段进入时就应高亮可用的防御技能，不需要等投骰
    const canHighlightAbility = canOperateView && isViewRolling && isRollPhase
        && (currentPhase === 'defensiveRoll' || hasRolled);
    const canSelectAbility = canOperateView && isViewRolling && isRollPhase
        && (currentPhase === 'defensiveRoll' ? true : G.rollConfirmed);
    // 额外骰子现在在 resolveAttack 中自动投掷，不再需要手动按钮
    const canAdvancePhase = isActivePlayer && (
        currentPhase === 'defensiveRoll' ? rollConfirmed : true
    );
    const canResolveChoice = Boolean(choice.hasChoice && (isLocalMatch || choice.playerId === rootPid));
    const canInteractDice = isLocalMatch ? isRollPhase : (canOperateView && isViewRolling);
    const showHand = isLocalMatch || isSelfView;
    const handOwner = (isSelfView ? player : opponent) || player;
    const showAdvancePhaseButton = isLocalMatch || isSelfView;
    const showOpponentThinking = !isLocalMatch && currentPhase === 'defensiveRoll' && !!rollerId && !canInteractDice;
    // 响应窗口状态
    const responseWindow = access.responseWindow;
    const isResponseWindowOpen = !!responseWindow;
    const isResponder = isResponseWindowOpen && responseWindow.responderId === rootPid;
    const showResponseWaiting = !isLocalMatch && isResponseWindowOpen && !isResponder;
    const thinkingOffsetClass = showHand ? 'bottom-[12vw]' : 'bottom-[4vw]';
    const isMagnifyOpen = Boolean(magnifiedImage || magnifiedCard);
    const isPlayerBoardPreview = Boolean(magnifiedImage?.includes('monk-player-board'));
    const magnifyContainerClassName = `
        group/modal
        ${isPlayerBoardPreview ? 'aspect-[2048/1673] h-auto w-auto max-h-[90vh] max-w-[90vw]' : ''}
        ${magnifiedCard ? 'aspect-[0.61] h-auto w-auto max-h-[90vh] max-w-[60vw]' : 'max-h-[90vh] max-w-[90vw]'}
    `;

    const getAbilityStartPos = React.useCallback((abilityId?: string) => {
        if (!abilityId) return getViewportCenter();
        const slotId = getAbilitySlotId(abilityId);
        if (!slotId) return getViewportCenter();
        const element = document.querySelector(`[data-ability-slot="${slotId}"]`) as HTMLElement | null;
        return getElementCenter(element);
    }, []);

    // 获取效果动画的起点位置（优先从技能槽位置获取）
    const getEffectStartPos = React.useCallback(
        (targetId?: string) => {
            // 优先级：lastEffectSourceByPlayerId > activatingAbilityId > pendingAttack.sourceAbilityId
            const sourceAbilityId =
                (targetId && access.lastEffectSourceByPlayerId?.[targetId]) ||
                G.activatingAbilityId ||
                G.pendingAttack?.sourceAbilityId;
            return getAbilityStartPos(sourceAbilityId);
        },
        [access.lastEffectSourceByPlayerId, G.activatingAbilityId, G.pendingAttack?.sourceAbilityId, getAbilityStartPos]
    );

    React.useEffect(() => {
        let isActive = true;
        loadCardAtlasConfig(locale)
            .then((config) => {
                if (isActive) setCardAtlas(config);
            })
            .catch(() => {
                if (isActive) setCardAtlas(null);
            });
        return () => {
            isActive = false;
        };
    }, [locale]);

    React.useEffect(() => {
        let isActive = true;
        loadStatusIconAtlasConfig()
            .then((config) => {
                if (isActive) setStatusIconAtlas(config);
            })
            .catch(() => {
                if (isActive) setStatusIconAtlas(null);
            });
        return () => {
            isActive = false;
        };
    }, []);

    React.useEffect(() => {
        if (isLocalMatch) {
            autoObserveRef.current = false;
            return;
        }
        if (shouldAutoObserve) {
            if (!autoObserveRef.current) {
                manualViewModeRef.current = viewMode;
            }
            if (viewMode !== 'opponent') {
                setViewMode('opponent');
            }
        } else if (autoObserveRef.current) {
            if (viewMode !== manualViewModeRef.current) {
                setViewMode(manualViewModeRef.current);
            }
        }
        autoObserveRef.current = shouldAutoObserve;
    }, [isLocalMatch, shouldAutoObserve, viewMode]);

    const handleAdvancePhase = () => {
        if (!canAdvancePhase) {
            if (currentPhase === 'offensiveRoll' && !G.rollConfirmed) {
                setHeaderError(t('error.confirmRoll'));
                setTimeout(() => setHeaderError(null), 3000);
            } else if (currentPhase === 'defensiveRoll' && !G.rollConfirmed) {
                setHeaderError(t('error.confirmDefenseRoll'));
                setTimeout(() => setHeaderError(null), 3000);
            }
            return;
        }
        if (currentPhase === 'offensiveRoll' && !selectedAbilityId) {
            setIsConfirmingSkip(true);
            return;
        }
        engineMoves.advancePhase();
    };

    React.useEffect(() => {
        if (isActivePlayer && ['upkeep', 'income'].includes(currentPhase)) {
            const timer = setTimeout(() => engineMoves.advancePhase(), 800);
            return () => clearTimeout(timer);
        }
        // 弃牌阶段：只有手牌不超限时才自动推进
        if (isActivePlayer && currentPhase === 'discard' && player.hand.length <= HAND_LIMIT) {
            const timer = setTimeout(() => engineMoves.advancePhase(), 800);
            return () => clearTimeout(timer);
        }
    }, [currentPhase, isActivePlayer, engineMoves, player.hand.length]);


    const closeMagnified = React.useCallback(() => {
        setMagnifiedImage(null);
        setMagnifiedCard(null);
    }, []);

    React.useEffect(() => {
        if (isLocalMatch) return;
        if (currentPhase === 'defensiveRoll') {
            if (rollerId && rollerId === rootPid) {
                setViewMode('self');
            } else {
                setViewMode('opponent');
            }
            return;
        }
        if (currentPhase === 'offensiveRoll' && isActivePlayer) setViewMode('self');
    }, [currentPhase, isActivePlayer, isLocalMatch, rollerId, rootPid]);

    React.useEffect(() => {
        const sourceAbilityId = G.activatingAbilityId ?? G.pendingAttack?.sourceAbilityId;
        if (!sourceAbilityId) return;
        setActivatingAbilityId(sourceAbilityId);
        triggerAbilityGlow();
        const timer = setTimeout(() => setActivatingAbilityId(undefined), 800);
        return () => clearTimeout(timer);
    }, [G.activatingAbilityId, G.pendingAttack?.sourceAbilityId, triggerAbilityGlow]);

    // 监听额外骰子投掷（使用独立的 lastBonusDieRoll 状态）
    React.useEffect(() => {
        const bonusDie = G.lastBonusDieRoll;
        const prevTimestamp = prevBonusDieTimestampRef.current;

        // 检测新的额外投掷结果（通过 timestamp 判断是否是新的）
        if (bonusDie && bonusDie.timestamp !== prevTimestamp) {
            setBonusDieValue(bonusDie.value);
            setBonusDieFace(bonusDie.face);
            setShowBonusDie(true);
            prevBonusDieTimestampRef.current = bonusDie.timestamp;
        }
    }, [G.lastBonusDieRoll]);

    const handleBonusDieClose = React.useCallback(() => {
        setShowBonusDie(false);
    }, []);

    React.useEffect(() => {
        if (!opponent) return;
        const opponentHealth = opponent.resources[RESOURCE_IDS.HP] ?? 0;
        const prevHealth = prevOpponentHealthRef.current;
        if (prevHealth !== undefined && opponentHealth < prevHealth) {
            const damage = prevHealth - opponentHealth;
            pushFlyingEffect({
                type: 'damage',
                content: `-${damage}`,
                startPos: getEffectStartPos(otherPid),
                endPos: getElementCenter(opponentHpRef.current),
            });
            triggerOpponentShake();
        }
        prevOpponentHealthRef.current = opponentHealth;
    }, [opponent?.resources, opponent, pushFlyingEffect, triggerOpponentShake, getEffectStartPos, otherPid]);

    React.useEffect(() => {
        const playerHealth = player.resources[RESOURCE_IDS.HP] ?? 0;
        const prevHealth = prevPlayerHealthRef.current;
        if (prevHealth !== undefined && playerHealth < prevHealth) {
            const damage = prevHealth - playerHealth;
            pushFlyingEffect({
                type: 'damage',
                content: `-${damage}`,
                startPos: getEffectStartPos(rootPid),
                endPos: getElementCenter(selfHpRef.current),
            });
        }
        prevPlayerHealthRef.current = playerHealth;
    }, [player.resources, pushFlyingEffect, getEffectStartPos, rootPid]);

    React.useEffect(() => {
        if (!opponent) return;
        const prevStatus = prevOpponentStatusRef.current;
        Object.entries(opponent.statusEffects || {}).forEach(([effectId, stacks]) => {
            const prevStacks = prevStatus[effectId] ?? 0;
            if (stacks > prevStacks) {
                const info = STATUS_EFFECT_META[effectId] || { icon: '✨', color: 'from-slate-500 to-slate-600' };
                pushFlyingEffect({
                    type: 'buff',
                    content: getStatusEffectIconNode(info, locale, 'fly', statusIconAtlas),
                    color: info.color,
                    startPos: getEffectStartPos(otherPid),
                    endPos: getElementCenter(opponentBuffRef.current),
                });
            }
        });
        prevOpponentStatusRef.current = { ...opponent.statusEffects };
    }, [opponent?.statusEffects, opponent, pushFlyingEffect, getEffectStartPos, otherPid, locale]);

    React.useEffect(() => {
        const prevStatus = prevPlayerStatusRef.current;
        Object.entries(player.statusEffects || {}).forEach(([effectId, stacks]) => {
            const prevStacks = prevStatus[effectId] ?? 0;
            if (stacks > prevStacks) {
                const info = STATUS_EFFECT_META[effectId] || { icon: '✨', color: 'from-slate-500 to-slate-600' };
                pushFlyingEffect({
                    type: 'buff',
                    content: getStatusEffectIconNode(info, locale, 'fly', statusIconAtlas),
                    color: info.color,
                    startPos: getEffectStartPos(rootPid),
                    endPos: getElementCenter(selfBuffRef.current),
                });
            }
        });
        prevPlayerStatusRef.current = { ...player.statusEffects };
    }, [player.statusEffects, pushFlyingEffect, getEffectStartPos, rootPid, locale]);

    const advanceLabel = currentPhase === 'offensiveRoll'
        ? t('actions.resolveAttack')
        : currentPhase === 'defensiveRoll'
            ? t('actions.endDefense')
            : t('actions.nextPhase');

    if (!player) return <div className="p-10 text-white">{t('status.loadingGameState', { playerId: rootPid })}</div>;

    return (
        <div className="relative w-full h-dvh bg-black overflow-hidden font-sans select-none text-slate-200">
            <GameDebugPanel G={G} ctx={ctx} moves={moves} playerID={playerID}>
                <button
                    onClick={() => setIsLayoutEditing(!isLayoutEditing)}
                    className={`w-full py-2 rounded font-bold text-xs border transition-[background-color] duration-200 ${isLayoutEditing ? 'bg-amber-600 border-amber-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}
                >
                    {isLayoutEditing ? t('layout.exitEdit') : t('layout.enterEdit')}
                </button>
                <button
                    onClick={() => {
                        const testValue = Math.floor(Math.random() * 6) + 1;
                        setBonusDieValue(testValue);
                        setShowBonusDie(true);
                    }}
                    className="w-full py-2 rounded font-bold text-xs border transition-[background-color] duration-200 bg-purple-700 border-purple-500 text-white hover:bg-purple-600"
                >
                    🎲 测试额外骰子特写
                </button>
            </GameDebugPanel>

            <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-black/40 z-10 pointer-events-none" />
                <OptimizedImage
                    src={getLocalizedAssetPath('dicethrone/images/Common/compressed/background', locale)}
                    fallbackSrc="dicethrone/images/Common/compressed/background"
                    className="w-full h-full object-cover"
                    alt={t('imageAlt.background')}
                />
            </div>

            {opponent && (
                <OpponentHeader
                    opponent={opponent}
                    viewMode={viewMode}
                    isOpponentShaking={isOpponentShaking}
                    shouldAutoObserve={shouldAutoObserve}
                    onToggleView={() => {
                        if (isLocalMatch) return;
                        setViewMode(prev => {
                            const next = prev === 'self' ? 'opponent' : 'self';
                            manualViewModeRef.current = next;
                            return next;
                        });
                    }}
                    headerError={headerError}
                    opponentBuffRef={opponentBuffRef}
                    opponentHpRef={opponentHpRef}
                    statusIconAtlas={statusIconAtlas}
                    locale={locale}
                />
            )}

            <FlyingEffectsLayer effects={flyingEffects} onEffectComplete={handleEffectComplete} />
            <div className="absolute inset-x-0 top-[2vw] bottom-0 z-10 pointer-events-none">
                <LeftSidebar
                    currentPhase={currentPhase}
                    viewPlayer={viewPlayer}
                    locale={locale}
                    statusIconAtlas={statusIconAtlas}
                    selfBuffRef={selfBuffRef}
                    selfHpRef={selfHpRef}
                    drawDeckRef={drawDeckRef}
                />

                <CenterBoard
                    coreAreaHighlighted={coreAreaHighlighted}
                    isTipOpen={isTipOpen}
                    onToggleTip={() => setIsTipOpen(!isTipOpen)}
                    isLayoutEditing={isLayoutEditing}
                    isSelfView={isSelfView}
                    availableAbilityIds={availableAbilityIds}
                    canSelectAbility={canSelectAbility}
                    canHighlightAbility={canHighlightAbility}
                    onSelectAbility={(abilityId) => engineMoves.selectAbility(abilityId)}
                    onHighlightedAbilityClick={() => {
                        if (currentPhase === 'offensiveRoll' && !G.rollConfirmed) {
                            toast.warning(t('error.confirmRoll'));
                        }
                    }}
                    selectedAbilityId={selectedAbilityId}
                    activatingAbilityId={activatingAbilityId}
                    abilityLevels={viewPlayer.abilityLevels}
                    cardAtlas={cardAtlas ?? undefined}
                    locale={locale}
                    onMagnifyImage={(image) => setMagnifiedImage(image)}
                />

                <RightSidebar
                    dice={G.dice}
                    rollCount={G.rollCount}
                    rollLimit={G.rollLimit}
                    rollConfirmed={rollConfirmed}
                    currentPhase={currentPhase}
                    canInteractDice={canInteractDice}
                    isRolling={isRolling}
                    setIsRolling={setIsRolling}
                    locale={locale}
                    onToggleLock={(id) => engineMoves.toggleDieLock(id)}
                    onRoll={() => {
                        if (!canInteractDice) return;
                        engineMoves.rollDice();
                    }}
                    onConfirm={() => {
                        if (!canInteractDice) return;
                        engineMoves.confirmRoll();
                    }}
                    showAdvancePhaseButton={showAdvancePhaseButton}
                    advanceLabel={advanceLabel}
                    isAdvanceButtonEnabled={canAdvancePhase}
                    onAdvance={handleAdvancePhase}
                    discardPileRef={discardPileRef}
                    discardCards={viewPlayer.discard}
                    cardAtlas={cardAtlas ?? undefined}
                    onInspectCard={cardAtlas ? (card) => setMagnifiedCard(card) : undefined}
                    canUndoDiscard={canOperateView && !!G.lastSoldCardId && (currentPhase === 'main1' || currentPhase === 'main2' || currentPhase === 'discard')}
                    onUndoDiscard={() => {
                        setLastUndoCardId(G.lastSoldCardId);
                        engineMoves.undoSellCard?.();
                    }}
                    discardHighlighted={discardHighlighted}
                    sellButtonVisible={sellButtonVisible}
                />
            </div>

            {showHand && cardAtlas && (() => {
                const mustDiscardCount = Math.max(0, handOwner.hand.length - HAND_LIMIT);
                const isDiscardMode = currentPhase === 'discard' && mustDiscardCount > 0 && canOperateView;
                return (
                    <>
                        <div className="absolute bottom-0 left-0 right-0 z-40 pointer-events-none bg-gradient-to-t from-black/90 via-black/40 to-transparent h-[15vw]" />
                        {/* 弃牌阶段提示 Banner */}
                        {isDiscardMode && (
                            <div className="absolute bottom-[14vw] left-1/2 -translate-x-1/2 z-[150] pointer-events-none animate-pulse">
                                <div className="px-[2vw] py-[0.8vw] rounded-xl bg-gradient-to-r from-red-900/90 to-orange-900/90 border-2 border-red-500/60 shadow-[0_0_2vw_rgba(239,68,68,0.4)] backdrop-blur-sm">
                                    <div className="flex items-center gap-[1vw]">
                                        <span className="text-[1.5vw]">🃏</span>
                                        <div className="flex flex-col">
                                            <span className="text-red-200 text-[1vw] font-black tracking-wider">
                                                {t('discard.mustDiscard')}
                                            </span>
                                            <span className="text-orange-300 text-[0.8vw] font-bold">
                                                {t('discard.selectToDiscard', { count: mustDiscardCount })}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <HandArea
                            hand={handOwner.hand}
                            locale={locale}
                            atlas={cardAtlas}
                            currentPhase={currentPhase}
                            playerCp={handOwner.resources[RESOURCE_IDS.CP] ?? 0}
                            onPlayCard={(cardId) => engineMoves.playCard(cardId)}
                            onSellCard={(cardId) => engineMoves.sellCard(cardId)}
                            onError={(msg) => toast.warning(msg)}
                            canInteract={canOperateView}
                            canPlayCards={canOperateView && isActivePlayer}
                            drawDeckRef={drawDeckRef}
                            discardPileRef={discardPileRef}
                            undoCardId={lastUndoCardId}
                            onSellHintChange={setDiscardHighlighted}
                            onPlayHintChange={setCoreAreaHighlighted}
                            onSellButtonChange={setSellButtonVisible}
                            isDiscardMode={isDiscardMode}
                            onDiscardCard={(cardId) => engineMoves.sellCard(cardId)}
                        />
                    </>
                );
            })()}

            {showOpponentThinking && (
                <div className={`absolute ${thinkingOffsetClass} left-1/2 -translate-x-1/2 z-[120] pointer-events-none`}>
                    <div className="px-[1.4vw] py-[0.6vw] rounded-full bg-black/70 border border-amber-500/40 text-amber-300 text-[0.8vw] font-bold tracking-wider shadow-lg backdrop-blur-sm">
                        {t('dice.waitingOpponent')}
                    </div>
                </div>
            )}

            {/* 响应窗口：等待对手响应 */}
            {showResponseWaiting && (
                <div className={`absolute ${thinkingOffsetClass} left-1/2 -translate-x-1/2 z-[120] pointer-events-none`}>
                    <div className="px-[1.4vw] py-[0.6vw] rounded-full bg-black/70 border border-purple-500/40 text-purple-300 text-[0.8vw] font-bold tracking-wider shadow-lg backdrop-blur-sm">
                        {t('response.waitingOpponent')}
                    </div>
                </div>
            )}

            {/* 响应窗口：当前玩家可响应 */}
            {isResponder && (
                <div className={`absolute ${thinkingOffsetClass} left-1/2 -translate-x-1/2 z-[120]`}>
                    <div className="flex items-center gap-[1vw] px-[1.4vw] py-[0.6vw] rounded-full bg-black/80 border border-purple-500/60 shadow-lg backdrop-blur-sm">
                        <span className="text-purple-300 text-[0.8vw] font-bold tracking-wider">
                            {t('response.yourTurn')}
                        </span>
                        <button
                            onClick={() => engineMoves.responsePass()}
                            className="px-[1vw] py-[0.3vw] rounded bg-purple-600 hover:bg-purple-500 text-white text-[0.7vw] font-bold transition-colors"
                        >
                            {t('response.pass')}
                        </button>
                    </div>
                </div>
            )}

            <MagnifyOverlay
                isOpen={isMagnifyOpen}
                onClose={closeMagnified}
                containerClassName={magnifyContainerClassName}
                closeLabel={t('actions.closePreview')}
            >
                {magnifiedCard && cardAtlas ? (
                    <div
                        className="w-[40vw] h-[65vw] max-w-[400px] max-h-[650px]"
                        style={{
                            backgroundImage: buildLocalizedImageSet(ASSETS.CARDS_ATLAS, locale),
                            backgroundRepeat: 'no-repeat',
                            backgroundColor: '#0f172a',
                            ...getCardAtlasStyle(magnifiedCard.atlasIndex ?? 0, cardAtlas),
                        }}
                    />
                ) : (
                    <OptimizedImage
                        src={getLocalizedAssetPath(magnifiedImage ?? '', locale)}
                        fallbackSrc={magnifiedImage ?? ''}
                        className="max-h-[90vh] max-w-[90vw] w-auto h-auto object-contain"
                        alt="Preview"
                    />
                )}
            </MagnifyOverlay>

            <ConfirmSkipModal
                isOpen={isConfirmingSkip}
                onCancel={() => setIsConfirmingSkip(false)}
                onConfirm={() => {
                    setIsConfirmingSkip(false);
                    engineMoves.advancePhase();
                }}
            />

            <ChoiceModal
                choice={choice.hasChoice ? { title: choice.title ?? '', options: choice.options } : null}
                canResolve={canResolveChoice}
                onResolve={(optionId) => {
                    const promptMove = (moves as Record<string, unknown>)[PROMPT_COMMANDS.RESPOND];
                    if (typeof promptMove === 'function') {
                        (promptMove as (payload: { optionId: string }) => void)({ optionId });
                    }
                }}
                locale={locale}
                statusIconAtlas={statusIconAtlas}
            />

            {/* 额外骰子投掷展示 */}
            <BonusDieOverlay
                value={bonusDieValue}
                face={bonusDieFace}
                isVisible={showBonusDie}
                onClose={handleBonusDieClose}
                locale={locale}
            />

            {/* 统一结束页面遮罩 */}
            <EndgameOverlay
                isGameOver={!!isGameOver}
                result={isGameOver}
                playerID={playerID}
                reset={reset}
                isMultiplayer={isMultiplayer}
                totalPlayers={matchData?.length}
                rematchState={rematchState}
                onVote={handleRematchVote}
            />
        </div>
    );
};

export default DiceThroneBoard;
