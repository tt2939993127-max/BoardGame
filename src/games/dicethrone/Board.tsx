import React from 'react';
import type { BoardProps } from 'boardgame.io/react';
import type { AbilityCard, DieFace } from './types';
import { HAND_LIMIT, type TokenResponsePhase } from './domain/types';
import type { MatchState } from '../../engine/types';
import { RESOURCE_IDS } from './domain/resources';
import type { DiceThroneCore } from './domain';
import { useTranslation } from 'react-i18next';
import { OptimizedImage } from '../../components/common/media/OptimizedImage';
import { GameDebugPanel } from '../../components/GameDebugPanel';
import { DiceThroneDebugConfig } from './debug-config';
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
import { ConfirmRemoveStunModal } from './ui/ConfirmRemoveStunModal';
import { ChoiceModal } from './ui/ChoiceModal';
import { BonusDieOverlay } from './ui/BonusDieOverlay';
import { CardSpotlightOverlay, type CardSpotlightItem } from './ui/CardSpotlightOverlay';
import { AbilitySpotlightOverlay, type AbilitySpotlightItem } from './ui/AbilitySpotlightOverlay';
import { TokenResponseModal } from './ui/TokenResponseModal';
import { PurifyModal } from './ui/PurifyModal';
import { OpponentHeader } from './ui/OpponentHeader';
import { LeftSidebar } from './ui/LeftSidebar';
import { CenterBoard } from './ui/CenterBoard';
import { RightSidebar } from './ui/RightSidebar';
import { InteractionOverlay } from './ui/InteractionOverlay';
import type { DiceInteractionConfig } from './ui/DiceTray';
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
    responsePass: (forPlayerId?: string) => void;
    // 卡牌交互相关
    modifyDie: (dieId: number, newValue: number) => void;
    rerollDie: (dieId: number) => void;
    removeStatus: (targetPlayerId: string, statusId?: string) => void;
    transferStatus: (fromPlayerId: string, toPlayerId: string, statusId: string) => void;
    confirmInteraction: (interactionId: string, selectedDiceIds?: number[]) => void;
    cancelInteraction: () => void;
    // Token 响应相关
    useToken: (tokenId: string, amount: number) => void;
    skipTokenResponse: () => void;
    usePurify: (statusId: string) => void;
    // 击倒移除
    payToRemoveStun: () => void;
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
    // 卡牌交互 moves
    const modifyDieRaw = (raw.modifyDie ?? raw.MODIFY_DIE) as ((payload: unknown) => void) | undefined;
    const rerollDieRaw = (raw.rerollDie ?? raw.REROLL_DIE) as ((payload: unknown) => void) | undefined;
    const removeStatusRaw = (raw.removeStatus ?? raw.REMOVE_STATUS) as ((payload: unknown) => void) | undefined;
    const transferStatusRaw = (raw.transferStatus ?? raw.TRANSFER_STATUS) as ((payload: unknown) => void) | undefined;
    const confirmInteractionRaw = (raw.confirmInteraction ?? raw.CONFIRM_INTERACTION) as ((payload: unknown) => void) | undefined;
    const cancelInteractionRaw = (raw.cancelInteraction ?? raw.CANCEL_INTERACTION) as ((payload: unknown) => void) | undefined;
    // Token 响应 moves
    const useTokenRaw = (raw.useToken ?? raw.USE_TOKEN) as ((payload: unknown) => void) | undefined;
    const skipTokenResponseRaw = (raw.skipTokenResponse ?? raw.SKIP_TOKEN_RESPONSE) as ((payload: unknown) => void) | undefined;
    const usePurifyRaw = (raw.usePurify ?? raw.USE_PURIFY) as ((payload: unknown) => void) | undefined;
    const payToRemoveStunRaw = (raw.payToRemoveStun ?? raw.PAY_TO_REMOVE_STUN) as ((payload: unknown) => void) | undefined;

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
        responsePass: (forPlayerId) => responsePassRaw?.(forPlayerId ? { forPlayerId } : {}),
        // 卡牌交互
        modifyDie: (dieId, newValue) => modifyDieRaw?.({ dieId, newValue }),
        rerollDie: (dieId) => rerollDieRaw?.({ dieId }),
        removeStatus: (targetPlayerId, statusId) => removeStatusRaw?.({ targetPlayerId, statusId }),
        transferStatus: (fromPlayerId, toPlayerId, statusId) => transferStatusRaw?.({ fromPlayerId, toPlayerId, statusId }),
        confirmInteraction: (interactionId, selectedDiceIds) => confirmInteractionRaw?.({ interactionId, selectedDiceIds }),
        cancelInteraction: () => cancelInteractionRaw?.({}),
        // Token 响应
        useToken: (tokenId, amount) => useTokenRaw?.({ tokenId, amount }),
        skipTokenResponse: () => skipTokenResponseRaw?.({}),
        usePurify: (statusId) => usePurifyRaw?.({ statusId }),
        // 击倒移除
        payToRemoveStun: () => payToRemoveStunRaw?.({}),
    };
};

// --- Main Layout ---
export const DiceThroneBoard: React.FC<DiceThroneBoardProps> = ({ G: rawG, ctx, moves, playerID, reset, matchData, isMultiplayer }) => {
    const G = rawG.core;
    const access = useDiceThroneState(rawG);
    const choice = useCurrentChoice(access);
    const gameMode = useGameMode();
    const isSpectator = !!gameMode?.isSpectator;
    const engineMovesRaw = resolveMoves(moves as Record<string, unknown>);
    const blockedLogRef = React.useRef<Set<string>>(new Set());
    const logBlocked = (action: string) => {
        if (!import.meta.env.DEV) return;
        if (blockedLogRef.current.has(action)) return;
        blockedLogRef.current.add(action);
        console.warn('[Spectate][DiceThrone] blocked', { action, playerID, isSpectator });
    };
    const engineMoves: DiceThroneMoveMap = {
        advancePhase: () => {
            if (isSpectator) { logBlocked('advancePhase'); return; }
            engineMovesRaw.advancePhase();
        },
        rollDice: () => {
            if (isSpectator) { logBlocked('rollDice'); return; }
            engineMovesRaw.rollDice();
        },
        rollBonusDie: () => {
            if (isSpectator) { logBlocked('rollBonusDie'); return; }
            engineMovesRaw.rollBonusDie();
        },
        toggleDieLock: (id) => {
            if (isSpectator) { logBlocked('toggleDieLock'); return; }
            engineMovesRaw.toggleDieLock(id);
        },
        confirmRoll: () => {
            if (isSpectator) { logBlocked('confirmRoll'); return; }
            engineMovesRaw.confirmRoll();
        },
        selectAbility: (abilityId) => {
            if (isSpectator) { logBlocked('selectAbility'); return; }
            engineMovesRaw.selectAbility(abilityId);
        },
        playCard: (cardId) => {
            if (isSpectator) { logBlocked('playCard'); return; }
            engineMovesRaw.playCard(cardId);
        },
        sellCard: (cardId) => {
            if (isSpectator) { logBlocked('sellCard'); return; }
            engineMovesRaw.sellCard(cardId);
        },
        undoSellCard: engineMovesRaw.undoSellCard
            ? () => {
                if (isSpectator) { logBlocked('undoSellCard'); return; }
                engineMovesRaw.undoSellCard?.();
            }
            : undefined,
        resolveChoice: (statusId) => {
            if (isSpectator) { logBlocked('resolveChoice'); return; }
            engineMovesRaw.resolveChoice(statusId);
        },
        responsePass: (forPlayerId) => {
            if (isSpectator) { logBlocked('responsePass'); return; }
            engineMovesRaw.responsePass(forPlayerId);
        },
        modifyDie: (dieId, newValue) => {
            if (isSpectator) { logBlocked('modifyDie'); return; }
            engineMovesRaw.modifyDie(dieId, newValue);
        },
        rerollDie: (dieId) => {
            if (isSpectator) { logBlocked('rerollDie'); return; }
            engineMovesRaw.rerollDie(dieId);
        },
        removeStatus: (targetPlayerId, statusId) => {
            if (isSpectator) { logBlocked('removeStatus'); return; }
            engineMovesRaw.removeStatus(targetPlayerId, statusId);
        },
        transferStatus: (fromPlayerId, toPlayerId, statusId) => {
            if (isSpectator) { logBlocked('transferStatus'); return; }
            engineMovesRaw.transferStatus(fromPlayerId, toPlayerId, statusId);
        },
        confirmInteraction: (interactionId, selectedDiceIds) => {
            if (isSpectator) { logBlocked('confirmInteraction'); return; }
            engineMovesRaw.confirmInteraction(interactionId, selectedDiceIds);
        },
        cancelInteraction: () => {
            if (isSpectator) { logBlocked('cancelInteraction'); return; }
            engineMovesRaw.cancelInteraction();
        },
        useToken: (tokenId, amount) => {
            if (isSpectator) { logBlocked('useToken'); return; }
            engineMovesRaw.useToken(tokenId, amount);
        },
        skipTokenResponse: () => {
            if (isSpectator) { logBlocked('skipTokenResponse'); return; }
            engineMovesRaw.skipTokenResponse();
        },
        usePurify: (statusId) => {
            if (isSpectator) { logBlocked('usePurify'); return; }
            engineMovesRaw.usePurify(statusId);
        },
        payToRemoveStun: () => {
            if (isSpectator) { logBlocked('payToRemoveStun'); return; }
            engineMovesRaw.payToRemoveStun();
        },
    };
    const { t, i18n } = useTranslation('game-dicethrone');
    const toast = useToast();
    const locale = i18n.resolvedLanguage ?? i18n.language;

    // 重赛系统（socket）
    const { state: rematchState, vote: handleRematchVote, registerReset } = useRematch();

    // 注册 reset 回调（当双方都投票后由 socket 触发）
    React.useEffect(() => {
        if (!isSpectator && reset) {
            registerReset(reset);
        }
    }, [reset, registerReset, isSpectator]);

    const isGameOver = ctx.gameover;
    const rootPid = playerID || '0';
    const player = G.players[rootPid] || G.players['0'];
    const otherPid = Object.keys(G.players).find(id => id !== rootPid) || '1';
    const opponent = G.players[otherPid];
    // 获取对手用户名
    const opponentName = matchData?.find(p => String(p.id) === otherPid)?.name ?? t('common.opponent');

    const [isLayoutEditing, setIsLayoutEditing] = React.useState(false);
    // 从 access.turnPhase 读取阶段（单一权威：来自 sys.phase）
    const currentPhase = access.turnPhase;
    const [isTipOpen, setIsTipOpen] = React.useState(true);
    const [magnifiedImage, setMagnifiedImage] = React.useState<string | null>(null);
    const [magnifiedCard, setMagnifiedCard] = React.useState<AbilityCard | null>(null);
    /** 多张卡片放大预览（弃牌堆放大按钮） */
    const [magnifiedCards, setMagnifiedCards] = React.useState<AbilityCard[]>([]);
    const [manualViewMode, setManualViewMode] = React.useState<'self' | 'opponent'>('self');
    const [headerError, setHeaderError] = React.useState<string | null>(null);
    const [isConfirmingSkip, setIsConfirmingSkip] = React.useState(false);
    const [activatingAbilityId, setActivatingAbilityId] = React.useState<string | undefined>(undefined);
    const [isRolling, setIsRolling] = React.useState(false);
    // 正在重掷的骰子 ID 列表（用于单独触发骰子动画）
    const [rerollingDiceIds, setRerollingDiceIds] = React.useState<number[]>([]);
    const [cardAtlas, setCardAtlas] = React.useState<CardAtlasConfig | null>(null);
    const [statusIconAtlas, setStatusIconAtlas] = React.useState<StatusIconAtlasConfig | null>(null);
    // 额外骰子投掷展示状态
    const [bonusDieValue, setBonusDieValue] = React.useState<number | undefined>(undefined);
    const [bonusDieFace, setBonusDieFace] = React.useState<DieFace | undefined>(undefined);
    const [showBonusDie, setShowBonusDie] = React.useState(false);
    // 初始化为当前快照值：避免页面刷新/重连时把“最后一次结果”当作新事件重播。
    const prevBonusDieTimestampRef = React.useRef<number | undefined>(G.lastBonusDieRoll?.timestamp);

    // 卡牌特写队列（其他玩家打出的卡牌）
    const [cardSpotlightQueue, setCardSpotlightQueue] = React.useState<CardSpotlightItem[]>([]);
    const cardSpotlightQueueRef = React.useRef<CardSpotlightItem[]>([]);
    // 初始化为当前快照值：避免页面刷新/重连时重播上一张牌的特写。
    const prevLastPlayedCardTimestampRef = React.useRef<number | undefined>(G.lastPlayedCard?.timestamp);

    // 技能特写队列（其他玩家激活的技能）
    const [abilitySpotlightQueue, setAbilitySpotlightQueue] = React.useState<AbilitySpotlightItem[]>([]);
    const abilitySpotlightQueueRef = React.useRef<AbilitySpotlightItem[]>([]);
    // 初始化为当前快照值：避免页面刷新/重连时重播上一个技能的特写。
    const prevLastActivatedAbilityTimestampRef = React.useRef<number | undefined>(G.lastActivatedAbility?.timestamp);

    // 使用动画库 Hooks
    const { effects: flyingEffects, pushEffect: pushFlyingEffect, removeEffect: handleEffectComplete } = useFlyingEffects();
    const { isShaking: isOpponentShaking, triggerShake: triggerOpponentShake } = useShake(500);
    const { triggerGlow: triggerAbilityGlow } = usePulseGlow(800);

    const opponentHpRef = React.useRef<HTMLDivElement>(null);
    const selfHpRef = React.useRef<HTMLDivElement>(null);
    const opponentBuffRef = React.useRef<HTMLDivElement>(null);
    const opponentHeaderRef = React.useRef<HTMLDivElement>(null);
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

    // 卡牌交互状态
    const pendingInteraction = G.pendingInteraction;
    // 本地交互状态（用于 UI 选择）
    const [localInteraction, setLocalInteraction] = React.useState<{
        selectedDice: string[];
        modifiedDice: string[];  // 追踪已修改的骰子 ID（用于 any 模式）
        totalAdjustment: number; // 累计调整量（用于 adjust 模式）
        selectedStatus?: { playerId: string; statusId: string };
        selectedPlayer?: string;
    }>({ selectedDice: [], modifiedDice: [], totalAdjustment: 0 });

    // Token 响应状态
    const pendingDamage = G.pendingDamage;
    // 确定当前响应阶段
    const tokenResponsePhase: TokenResponsePhase | null = pendingDamage
        ? (pendingDamage.responderId === pendingDamage.sourcePlayerId ? 'attackerBoost' : 'defenderMitigation')
        : null;
    // 判断是否是当前玩家响应
    const isTokenResponder = pendingDamage && (pendingDamage.responderId === rootPid);

    // 净化弹窗状态
    const [isPurifyModalOpen, setIsPurifyModalOpen] = React.useState(false);
    // 击倒移除确认弹窗状态
    const [isConfirmRemoveStunOpen, setIsConfirmRemoveStunOpen] = React.useState(false);

    // 重置本地交互状态当 pendingInteraction 变化时
    React.useEffect(() => {
        setLocalInteraction({ selectedDice: [], modifiedDice: [], totalAdjustment: 0, selectedStatus: undefined, selectedPlayer: undefined });
    }, [pendingInteraction?.id]);

    // 追踪取消交互时返回的卡牌ID（用于动画从弃牌堆飞回）
    const prevInteractionRef = React.useRef<typeof pendingInteraction>(undefined);
    React.useEffect(() => {
        // 当交互被取消时（从有交互变为无交互），记录卡牌ID
        if (prevInteractionRef.current && !pendingInteraction) {
            setLastUndoCardId(prevInteractionRef.current.sourceCardId);
        }
        prevInteractionRef.current = pendingInteraction;
    }, [pendingInteraction]);

    const isActivePlayer = G.activePlayerId === rootPid;
    const rollerId = currentPhase === 'defensiveRoll' ? G.pendingAttack?.defenderId : G.activePlayerId;
    const shouldAutoObserve = currentPhase === 'defensiveRoll' && rootPid !== rollerId;
    const viewMode = shouldAutoObserve ? 'opponent' : manualViewMode;
    const isSelfView = viewMode === 'self';
    const viewPid = isSelfView ? rootPid : otherPid;
    const viewPlayer = (isSelfView ? player : opponent) || player;
    const isRollPhase = currentPhase === 'offensiveRoll' || currentPhase === 'defensiveRoll';
    const isViewRolling = viewPid === rollerId;
    const rollConfirmed = G.rollConfirmed;
    // availableAbilityIds 现在是派生状态，从 useDiceThroneState hook 中获取
    const availableAbilityIds = isViewRolling ? access.availableAbilityIds : [];
    const selectedAbilityId = currentPhase === 'defensiveRoll'
        ? (isViewRolling ? G.pendingAttack?.defenseAbilityId : undefined)
        : (isViewRolling ? G.pendingAttack?.sourceAbilityId : undefined);
    const canOperateView = isSelfView && !isSpectator;
    const hasRolled = G.rollCount > 0;
    
    // 焦点玩家判断（统一的操作权判断）
    const isFocusPlayer = !isSpectator && access.focusPlayerId === rootPid;
    
    // 防御阶段进入时就应高亮可用的防御技能，不需要等投骰
    const canHighlightAbility = canOperateView && isViewRolling && isRollPhase
        && (currentPhase === 'defensiveRoll' || hasRolled);
    const canSelectAbility = canOperateView && isViewRolling && isRollPhase
        && (currentPhase === 'defensiveRoll' ? true : G.rollConfirmed);
    // 阶段推进权限：由焦点玩家控制，防御阶段需要验证 rollConfirmed
    const canAdvancePhase = isFocusPlayer && (currentPhase === 'defensiveRoll' ? rollConfirmed : true);
    const canResolveChoice = Boolean(choice.hasChoice && choice.playerId === rootPid);
    const canInteractDice = canOperateView && isViewRolling;
    // 响应窗口状态
    const responseWindow = access.responseWindow;
    const isResponseWindowOpen = !!responseWindow;
    // 当前响应者 ID（从队列中获取）
    const currentResponderId = responseWindow?.responderQueue[responseWindow.currentResponderIndex];
    const isResponder = isResponseWindowOpen && currentResponderId === rootPid;
    
    // 检测当前响应者是否离线，如果离线则自动跳过
    const isResponderOffline = React.useMemo(() => {
        if (!isResponseWindowOpen || !currentResponderId) return false;
        // 找到当前响应者的 matchData
        const responderData = matchData?.find(p => String(p.id) === currentResponderId);
        // 如果找不到或者 isConnected 为 false，认为离线
        return responderData ? responderData.isConnected === false : false;
    }, [isResponseWindowOpen, currentResponderId, matchData]);
    
    // 当检测到当前响应者离线时，自动代替他跳过响应
    // 注：只有当自己是活跃玩家时才执行（避免双方都发送 pass）
    React.useEffect(() => {
        if (isResponderOffline && isActivePlayer && currentResponderId && currentResponderId !== rootPid) {
            console.log('[DiceThrone] 检测到响应者离线，自动跳过:', currentResponderId);
            // 延迟一小段时间确保 UI 状态同步
            const timer = setTimeout(() => {
                engineMoves.responsePass(currentResponderId);
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [isResponderOffline, isActivePlayer, currentResponderId, rootPid, engineMoves]);
    
    // 自己的手牌永远显示
    const handOwner = player;
    const showAdvancePhaseButton = isSelfView && !isSpectator;
    const handleCancelInteraction = React.useCallback(() => {
        if (pendingInteraction?.sourceCardId) {
            setLastUndoCardId(pendingInteraction.sourceCardId);
        }
        engineMoves.cancelInteraction();
    }, [engineMoves, pendingInteraction]);

    // 骰子交互配置（需要在 waitingReason 之前定义）
    const isDiceInteraction = pendingInteraction && (
        pendingInteraction.type === 'selectDie' || pendingInteraction.type === 'modifyDie'
    );
    // 只有交互所有者才能看到交互 UI
    const isInteractionOwner = !isSpectator && pendingInteraction?.playerId === rootPid;

    // 等待对方思考（isFocusPlayer 已在上方定义）
    const isWaitingOpponent = !isFocusPlayer;
    const thinkingOffsetClass = 'bottom-[12vw]';

    // 可被净化移除的负面状态：由定义驱动（支持扩展）
    const purifiableStatusIds = (G.statusDefinitions ?? [])
        .filter(def => def.type === 'debuff' && def.removable)
        .map(def => def.id);

    // 是否可以使用净化（有净化 Token 且有可移除的负面状态）
    const canUsePurify = !isSpectator && (player.tokens?.['purify'] ?? 0) > 0 &&
        Object.entries(player.statusEffects ?? {}).some(([id, stacks]) => purifiableStatusIds.includes(id) && stacks > 0);

    // 是否可以移除击倒（有击倒状态且 CP >= 2 且在 offensiveRoll 前的阶段）
    const canRemoveStun = !isSpectator && isActivePlayer &&
        (currentPhase === 'upkeep' || currentPhase === 'income' || currentPhase === 'main1') &&
        (player.statusEffects?.['stun'] ?? 0) > 0 &&
        (player.resources?.[RESOURCE_IDS.CP] ?? 0) >= 2;

    // 骰子交互配置
    const diceInteractionConfig: DiceInteractionConfig | undefined = isDiceInteraction && pendingInteraction && isInteractionOwner ? {
        interaction: {
            ...pendingInteraction,
            selected: localInteraction.selectedDice,
        },
        modifiedDice: localInteraction.modifiedDice,  // 传递已修改的骰子 ID 列表
        totalAdjustment: localInteraction.totalAdjustment,  // 传递累计调整量
        onSelectDie: (dieId: number) => {
            const dieIdStr = String(dieId);
            setLocalInteraction(prev => {
                const isSelected = prev.selectedDice.includes(dieIdStr);
                if (isSelected) {
                    return { ...prev, selectedDice: prev.selectedDice.filter(id => id !== dieIdStr) };
                }
                // 检查是否达到最大选择数
                if (prev.selectedDice.length >= (pendingInteraction?.selectCount ?? 1)) {
                    // 替换最后一个
                    return { ...prev, selectedDice: [...prev.selectedDice.slice(0, -1), dieIdStr] };
                }
                return { ...prev, selectedDice: [...prev.selectedDice, dieIdStr] };
            });
        },
        onModifyDie: (dieId: number, newValue: number) => {
            const dieIdStr = String(dieId);
            const currentDie = G.dice.find(d => d.id === dieId);
            const delta = currentDie ? newValue - currentDie.value : 0;
            const isAdjustMode = pendingInteraction?.dieModifyConfig?.mode === 'adjust';
            
            // 追踪已修改的骰子（用于 any 模式）和累计调整量（用于 adjust 模式）
            setLocalInteraction(prev => {
                const newModifiedDice = prev.modifiedDice.includes(dieIdStr)
                    ? prev.modifiedDice
                    : [...prev.modifiedDice, dieIdStr];
                const newTotalAdjustment = isAdjustMode ? prev.totalAdjustment + delta : prev.totalAdjustment;
                return { ...prev, modifiedDice: newModifiedDice, totalAdjustment: newTotalAdjustment };
            });
            // 直接调用 move 修改骰子
            engineMoves.modifyDie(dieId, newValue);
        },
        onConfirm: () => {
            if (pendingInteraction) {
                const mode = pendingInteraction.dieModifyConfig?.mode;
                const targetValue = pendingInteraction.dieModifyConfig?.targetValue;
                
                // set 模式：选择骰子后自动设为目标值（如 card-play-six 设为 6）
                if (mode === 'set' && targetValue !== undefined && localInteraction.selectedDice.length > 0) {
                    localInteraction.selectedDice.forEach(dieIdStr => {
                        engineMoves.modifyDie(Number(dieIdStr), targetValue);
                    });
                }
                
                // copy 模式：将第二颗骰子的值设为第一颗骰子的值
                if (mode === 'copy' && localInteraction.selectedDice.length === 2) {
                    const sourceDieId = Number(localInteraction.selectedDice[0]);
                    const targetDieId = Number(localInteraction.selectedDice[1]);
                    const sourceDie = G.dice.find(d => d.id === sourceDieId);
                    if (sourceDie) {
                        engineMoves.modifyDie(targetDieId, sourceDie.value);
                    }
                }
                
                // any 模式：修改已经在 onModifyDie 中实时完成，直接确认即可
                
                // selectDie 模式：把选中的骰子 ID 传给 confirmInteraction，由后端批量重掷
                if (pendingInteraction.type === 'selectDie' && localInteraction.selectedDice.length > 0) {
                    const selectedDiceIds = localInteraction.selectedDice.map(id => Number(id));
                    // 触发重掷动画
                    setRerollingDiceIds(selectedDiceIds);
                    // 动画结束后清除状态
                    setTimeout(() => setRerollingDiceIds([]), 600);
                    engineMoves.confirmInteraction(pendingInteraction.id, selectedDiceIds);
                } else {
                    engineMoves.confirmInteraction(pendingInteraction.id);
                }
            }
        },
        onCancel: handleCancelInteraction,
    } : undefined;

    // 状态效果/玩家交互配置
    const isStatusInteraction = pendingInteraction && (
        pendingInteraction.type === 'selectStatus' ||
        pendingInteraction.type === 'selectPlayer' ||
        pendingInteraction.type === 'selectTargetStatus'
    );

    const handleSelectStatus = (playerId: string, statusId: string) => {
        setLocalInteraction(prev => ({
            ...prev,
            selectedStatus: { playerId, statusId },
        }));
    };

    const handleSelectPlayer = (playerId: string) => {
        setLocalInteraction(prev => ({
            ...prev,
            selectedPlayer: prev.selectedPlayer === playerId ? undefined : playerId,
        }));
    };

    const handleStatusInteractionConfirm = () => {
        if (!pendingInteraction) return;

        if (pendingInteraction.type === 'selectStatus') {
            // 移除单个状态
            if (localInteraction.selectedStatus) {
                engineMoves.removeStatus(
                    localInteraction.selectedStatus.playerId,
                    localInteraction.selectedStatus.statusId
                );
            }
        } else if (pendingInteraction.type === 'selectPlayer') {
            // 移除玩家所有状态
            if (localInteraction.selectedPlayer) {
                engineMoves.removeStatus(localInteraction.selectedPlayer);
            }
        } else if (pendingInteraction.type === 'selectTargetStatus') {
            // 转移状态
            const transferConfig = pendingInteraction.transferConfig;
            if (transferConfig?.sourcePlayerId && transferConfig?.statusId && localInteraction.selectedPlayer) {
                engineMoves.transferStatus(
                    transferConfig.sourcePlayerId,
                    localInteraction.selectedPlayer,
                    transferConfig.statusId
                );
            } else if (localInteraction.selectedStatus) {
                // 第一阶段：选择要转移的状态
                // TODO: 这里需要更新 pendingInteraction.transferConfig
            }
        }
        engineMoves.confirmInteraction(pendingInteraction.id);
    };
    const isMagnifyOpen = Boolean(magnifiedImage || magnifiedCard || magnifiedCards.length > 0);
    const isPlayerBoardPreview = Boolean(magnifiedImage?.includes('monk-player-board'));
    const isMultiCardPreview = magnifiedCards.length > 0;
    const magnifyContainerClassName = `
        group/modal
        ${isPlayerBoardPreview ? 'aspect-[2048/1673] h-auto w-auto max-h-[90vh] max-w-[90vw]' : ''}
        ${magnifiedCard ? 'aspect-[0.61] h-auto w-auto max-h-[90vh] max-w-[60vw]' : ''}
        ${isMultiCardPreview ? 'max-h-[90vh] max-w-[90vw] overflow-x-auto overflow-y-hidden' : ''}
        ${!isPlayerBoardPreview && !magnifiedCard && !isMultiCardPreview ? 'max-h-[90vh] max-w-[90vw]' : ''}
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
        // 只有在有可用技能但玩家没选时才弹窗确认
        if (currentPhase === 'offensiveRoll' && !selectedAbilityId && availableAbilityIds.length > 0) {
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
        setMagnifiedCards([]);
    }, []);

    React.useEffect(() => {
        if (currentPhase === 'defensiveRoll') {
            // 防御掷骰时如果自己是掷骰者，强制切回自己视角
            // 若不是掷骰者，交给 shouldAutoObserve 临时切换，不改变手动视角
            if (rollerId && rollerId === rootPid) {
                setManualViewMode('self');
            }
            return;
        }
        if (currentPhase === 'offensiveRoll' && isActivePlayer) setManualViewMode('self');
    }, [currentPhase, isActivePlayer, rollerId, rootPid]);

    React.useEffect(() => {
        const sourceAbilityId = G.activatingAbilityId ?? G.pendingAttack?.sourceAbilityId;
        if (!sourceAbilityId) return;
        setActivatingAbilityId(sourceAbilityId);
        triggerAbilityGlow();
        const timer = setTimeout(() => setActivatingAbilityId(undefined), 800);
        return () => clearTimeout(timer);
    }, [G.activatingAbilityId, G.pendingAttack?.sourceAbilityId, triggerAbilityGlow]);

    React.useEffect(() => {
        cardSpotlightQueueRef.current = cardSpotlightQueue;
    }, [cardSpotlightQueue]);


    // 监听额外骰子投掷（使用独立的 lastBonusDieRoll 状态）
    // 现在对所有玩家显示（用于观战/同步其他玩家操作）
    React.useEffect(() => {
        const bonusDie = G.lastBonusDieRoll;
        const prevTimestamp = prevBonusDieTimestampRef.current;

        // 检测新的额外投掷结果（通过 timestamp 判断是否是新的）
        if (!bonusDie || bonusDie.timestamp === prevTimestamp) {
            return;
        }

        // 先更新 timestamp 引用（避免重复触发）
        prevBonusDieTimestampRef.current = bonusDie.timestamp;

        // 尝试绑定到卡牌队列（卡左骰右）
        const cardQueue = cardSpotlightQueueRef.current;
        const thresholdMs = 1500;
        const cardCandidate = [...cardQueue]
            .reverse()
            .find((item) => item.playerId === bonusDie.playerId && Math.abs(item.timestamp - bonusDie.timestamp) <= thresholdMs);

        if (cardCandidate) {
            setCardSpotlightQueue((prev) =>
                prev.map((item) =>
                    item.id === cardCandidate.id
                        ? {
                            ...item,
                            bonusDice: [
                                ...(item.bonusDice || []),
                                { value: bonusDie.value, face: bonusDie.face, timestamp: bonusDie.timestamp },
                            ],
                        }
                        : item
                )
            );
            setShowBonusDie(false);
            return;
        }

        // 否则使用独立骰子特写
        setBonusDieValue(bonusDie.value);
        setBonusDieFace(bonusDie.face);
        setShowBonusDie(true);
    }, [G.lastBonusDieRoll]);

    const handleBonusDieClose = React.useCallback(() => {
        setShowBonusDie(false);
    }, []);

    // 监听其他玩家打出卡牌（加入特写队列）
    React.useEffect(() => {
        const lastPlayedCard = G.lastPlayedCard;
        const prevTimestamp = prevLastPlayedCardTimestampRef.current;

        // 只处理新打出的卡牌（通过 timestamp 判断）
        if (!lastPlayedCard || lastPlayedCard.timestamp === prevTimestamp) {
            return;
        }

        // 只展示其他玩家打出的卡牌（不显示自己打的）
        if (lastPlayedCard.playerId !== rootPid) {
            const newItem: CardSpotlightItem = {
                id: `${lastPlayedCard.cardId}-${lastPlayedCard.timestamp}`,
                timestamp: lastPlayedCard.timestamp,
                atlasIndex: lastPlayedCard.atlasIndex,
                playerId: lastPlayedCard.playerId,
                playerName: opponentName,
            };
            setCardSpotlightQueue(prev => [...prev, newItem]);
        }

        // 始终更新 timestamp 引用
        prevLastPlayedCardTimestampRef.current = lastPlayedCard.timestamp;
    }, [G.lastPlayedCard, rootPid, opponentName]);

    // 关闭卡牌特写（从队列中移除）
    const handleCardSpotlightClose = React.useCallback((id: string) => {
        setCardSpotlightQueue(prev => prev.filter(item => item.id !== id));
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
            {!isSpectator && (
                <GameDebugPanel G={rawG} ctx={ctx} moves={moves} playerID={playerID}>
                    {/* DiceThrone 专属作弊工具 */}
                    <DiceThroneDebugConfig G={rawG} ctx={ctx} moves={moves} />
                    
                    {/* 测试工具 */}
                    <div className="pt-4 border-t border-gray-200 mt-4 space-y-3">
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">测试工具</h4>
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
                        <button
                            onClick={() => {
                                const testAtlasIndex = Math.floor(Math.random() * 30);
                                const now = Date.now();
                                const newItem: CardSpotlightItem = {
                                    id: `test-${now}`,
                                    timestamp: now,
                                    atlasIndex: testAtlasIndex,
                                    playerId: otherPid,
                                    playerName: opponentName,
                                };
                                setCardSpotlightQueue(prev => [...prev, newItem]);
                            }}
                            className="w-full py-2 rounded font-bold text-xs border transition-[background-color] duration-200 bg-cyan-700 border-cyan-500 text-white hover:bg-cyan-600"
                        >
                            🃏 测试卡牌特写
                        </button>
                    </div>
                </GameDebugPanel>
            )}

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
                    opponentName={opponentName}
                    viewMode={viewMode}
                    isOpponentShaking={isOpponentShaking}
                    shouldAutoObserve={shouldAutoObserve}
                    onToggleView={() => {
                        setManualViewMode(prev => prev === 'self' ? 'opponent' : 'self');
                    }}
                    headerError={headerError}
                    opponentBuffRef={opponentBuffRef}
                    opponentHpRef={opponentHpRef}
                    statusIconAtlas={statusIconAtlas}
                    locale={locale}
                    containerRef={opponentHeaderRef}
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
                    onPurifyClick={() => setIsPurifyModalOpen(true)}
                    canUsePurify={canUsePurify}
                    onStunClick={() => setIsConfirmRemoveStunOpen(true)}
                    canRemoveStun={canRemoveStun}
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
                    rerollingDiceIds={rerollingDiceIds}
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
                    onInspectRecentCards={cardAtlas ? (cards) => setMagnifiedCards(cards) : undefined}
                    canUndoDiscard={canOperateView && !!G.lastSoldCardId && (currentPhase === 'main1' || currentPhase === 'main2' || currentPhase === 'discard')}
                    onUndoDiscard={() => {
                        setLastUndoCardId(G.lastSoldCardId);
                        engineMoves.undoSellCard?.();
                    }}
                    discardHighlighted={discardHighlighted}
                    sellButtonVisible={sellButtonVisible}
                    diceInteractionConfig={diceInteractionConfig}
                />
            </div>

            {cardAtlas && (() => {
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
                                        <span className="text-[1.5vw]">🗑️</span>
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
                            canInteract={isResponder || isSelfView}
                            canPlayCards={isActivePlayer || isResponder}
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

            {/* 骰子交互提示（画面顶部中央） */}
            {isDiceInteraction && isInteractionOwner && pendingInteraction && (
                <div className="absolute top-[6vw] left-1/2 -translate-x-1/2 z-[150] pointer-events-none animate-pulse">
                    <div className="bg-amber-600/90 backdrop-blur-sm rounded-xl px-[2vw] py-[0.6vw] border border-amber-400/60 shadow-lg text-center">
                        <span className="text-white font-bold text-[1vw] tracking-wide">
                            {t(pendingInteraction.titleKey, { count: pendingInteraction.selectCount })}
                        </span>
                    </div>
                </div>
            )}

            {/* 对手思考中提示（画面正中央，无背景，缓慢闪烁） */}
            {isWaitingOpponent && (
                <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[600] pointer-events-none">
                    <div className="text-center animate-[pulse_2s_ease-in-out_infinite]">
                        <div className="text-amber-400 text-[2vw] font-bold tracking-wider drop-shadow-[0_0_10px_rgba(251,191,36,0.6)]">
                            {opponentName}
                        </div>
                        <div className="text-amber-300/80 text-[1.2vw] font-medium mt-[0.3vw] drop-shadow-[0_0_8px_rgba(251,191,36,0.4)]">
                            {t('waiting.thinkingMessage')}
                        </div>
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
                {isMultiCardPreview && cardAtlas ? (
                    /* 多张卡片预览（弃牌堆）：从左到右按时间从新到旧排列 */
                    <div className="flex flex-nowrap items-center justify-start gap-[2vw] p-[2vw] w-fit">
                        {magnifiedCards.map((card, idx) => (
                            <div
                                key={card.id}
                                className="w-[28vw] aspect-[0.61] max-w-[350px] max-h-[574px] rounded-xl shadow-2xl border border-white/20 flex-shrink-0"
                                style={{
                                    backgroundImage: buildLocalizedImageSet(ASSETS.CARDS_ATLAS, locale),
                                    backgroundRepeat: 'no-repeat',
                                    backgroundColor: '#0f172a',
                                    ...getCardAtlasStyle(card.atlasIndex ?? 0, cardAtlas),
                                }}
                                title={`#${idx + 1}`}
                            />
                        ))}
                    </div>
                ) : magnifiedCard && cardAtlas ? (
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

            {/* 击倒移除确认弹窗 */}
            <ConfirmRemoveStunModal
                isOpen={isConfirmRemoveStunOpen}
                onCancel={() => setIsConfirmRemoveStunOpen(false)}
                onConfirm={() => {
                    setIsConfirmRemoveStunOpen(false);
                    engineMoves.payToRemoveStun();
                }}
            />

            {/* Token 响应窗口 */}
            {pendingDamage && tokenResponsePhase && isTokenResponder && (
                <TokenResponseModal
                    pendingDamage={pendingDamage}
                    responsePhase={tokenResponsePhase}
                    responderState={G.players[pendingDamage.responderId]}
                    tokenDefinitions={G.tokenDefinitions}
                    onUseToken={(tokenId, amount) => {
                        engineMoves.useToken(tokenId, amount);
                    }}
                    onSkip={() => {
                        engineMoves.skipTokenResponse();
                    }}
                    locale={locale}
                    lastEvasionRoll={pendingDamage.lastEvasionRoll}
                />
            )}

            {/* 净化弹窗 */}
            {isPurifyModalOpen && (
                <PurifyModal
                    playerState={viewPlayer}
                    purifiableStatusIds={purifiableStatusIds}
                    onConfirm={(statusId) => {
                        engineMoves.usePurify(statusId);
                        setIsPurifyModalOpen(false);
                    }}
                    onCancel={() => setIsPurifyModalOpen(false)}
                    locale={locale}
                    statusIconAtlas={statusIconAtlas}
                />
            )}

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

            {/* 卡牌交互覆盖层（仅对交互发起者显示） */}
            {isStatusInteraction && pendingInteraction && pendingInteraction.playerId === rootPid && (
                <InteractionOverlay
                    interaction={{
                        ...pendingInteraction,
                        selected: localInteraction.selectedPlayer
                            ? [localInteraction.selectedPlayer]
                            : localInteraction.selectedStatus
                                ? [`${localInteraction.selectedStatus.playerId}:${localInteraction.selectedStatus.statusId}`]
                                : [],
                    }}
                    players={G.players}
                    currentPlayerId={rootPid}
                    onSelectStatus={handleSelectStatus}
                    onSelectPlayer={handleSelectPlayer}
                    onConfirm={handleStatusInteractionConfirm}
                    onCancel={handleCancelInteraction}
                    statusIconAtlas={statusIconAtlas}
                    locale={locale}
                />
            )}

            {/* 额外骰子投掷展示 */}
            <BonusDieOverlay
                value={bonusDieValue}
                face={bonusDieFace}
                isVisible={showBonusDie}
                onClose={handleBonusDieClose}
                locale={locale}
            />

            {/* 卡牌特写（其他玩家打出的卡牌） */}
            <CardSpotlightOverlay
                queue={cardSpotlightQueue}
                atlas={cardAtlas}
                locale={locale}
                onClose={handleCardSpotlightClose}
                opponentHeaderRef={opponentHeaderRef}
            />

            {/* 统一结束页面遮罩 */}
            <EndgameOverlay
                isGameOver={!!isGameOver}
                result={isGameOver}
                playerID={playerID}
                reset={reset}
                isMultiplayer={true}
                totalPlayers={matchData?.length}
                rematchState={rematchState}
                onVote={handleRematchVote}
            />
        </div>
    );
};

export default DiceThroneBoard;
