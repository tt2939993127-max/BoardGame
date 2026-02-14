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

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { BoardProps } from 'boardgame.io/react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import type { MatchState } from '../../engine/types';
import type { SmashUpCore, CardInstance, ActionCardDef } from './domain/types';
import { SU_COMMANDS, HAND_LIMIT, getCurrentPlayerId } from './domain/types';
import { getScores } from './domain/index';
import { FLOW_COMMANDS } from '../../engine/systems/FlowSystem';
import { asSimpleChoice, INTERACTION_COMMANDS } from '../../engine/systems/InteractionSystem';
import { getCardDef, getBaseDef, resolveCardName, resolveCardText } from './data/cards';
import { useGameAudio, playDeniedSound } from '../../lib/audio/useGameAudio';
import { CardPreview, registerCardAtlasSource } from '../../components/common/media/CardPreview';
import { AnimatePresence, motion } from 'framer-motion';
import { loadCardAtlasConfig } from './ui/cardAtlas';
import { SMASHUP_ATLAS_IDS } from './domain/ids';
import { SMASH_UP_MANIFEST } from './manifest';
import { HandArea } from './ui/HandArea';
import { useGameEvents } from './ui/useGameEvents';
import { SmashUpEffectsLayer } from './ui/BoardEffects';
import { FactionSelection } from './ui/FactionSelection';
import { PromptOverlay } from './ui/PromptOverlay';
import { CardRevealOverlay } from './ui/CardRevealOverlay';
import { getFactionMeta } from './ui/factionMeta';
import { PLAYER_CONFIG } from './ui/playerConfig';
import { BaseZone } from './ui/BaseZone';
import { MeFirstOverlay } from './ui/MeFirstOverlay';
import { GameButton as SmashUpGameButton } from './ui/GameButton';
import { DeckDiscardZone } from './ui/DeckDiscardZone';
import { SMASHUP_AUDIO_CONFIG } from './audio.config';
import { useTutorialBridge, useTutorial } from '../../contexts/TutorialContext';
import { useGameMode } from '../../contexts/GameModeContext';
import { UndoProvider } from '../../contexts/UndoContext';
import { TutorialSelectionGate } from '../../components/game/framework';
import { LoadingScreen } from '../../components/system/LoadingScreen';
import { UI_Z_INDEX } from '../../core';

type Props = BoardProps<MatchState<SmashUpCore>>;

const getPhaseNameKey = (phase: string) => `phases.${phase}`;

/** 可从弃牌堆打出的能力 ID 集合（用于弃牌堆 UI 指示器） */
const DISCARD_PLAY_ABILITY_IDS = new Set([
    'zombie_tenacious_z',
    'ghost_spectre',
    'zombie_theyre_coming_to_get_you',
    'zombie_they_keep_coming',
]);

const SmashUpBoard: React.FC<Props> = ({ G, moves, playerID, ctx }) => {
    const { t } = useTranslation('game-smashup');
    const core = G.core;
    const gameMode = useGameMode();
    const phase = G.sys.phase;
    const currentPid = getCurrentPlayerId(core);
    const isMyTurn = playerID === currentPid;
    const myPlayer = playerID ? core.players[playerID] : undefined;
    const isGameOver = ctx.gameover;
    const isLocalMatch = gameMode ? !gameMode.isMultiplayer : false;
    const rootPid = playerID || '0';
    const isWinner = !!isGameOver && isGameOver.winner === rootPid;

    const [selectedCardUid, setSelectedCardUid] = useState<string | null>(null);
    const [selectedCardMode, setSelectedCardMode] = useState<'minion' | 'ongoing' | 'ongoing-minion' | null>(null);
    const [discardSelection, setDiscardSelection] = useState<Set<string>>(new Set());
    const autoAdvancePhaseRef = useRef<string | null>(null);
    const needDiscard = phase === 'discard' && isMyTurn && myPlayer != null && myPlayer.hand.length > HAND_LIMIT;
    const discardCount = needDiscard ? myPlayer!.hand.length - HAND_LIMIT : 0;

    // 含疯狂卡惩罚的最终分数（统一查询入口）
    const finalScores = useMemo(() => getScores(core), [core]);

    // 手牌弃牌交互检测：当前 interaction 的所有选项都对应手牌时，用手牌区直接选择
    const currentInteraction = G.sys.interaction?.current;
    const currentPrompt = useMemo(() => asSimpleChoice(currentInteraction), [currentInteraction]);
    const isHandDiscardPrompt = useMemo(() => {
        if (!currentPrompt || currentPrompt.playerId !== playerID) return false;
        if (!myPlayer || myPlayer.hand.length === 0) return false;
        const handUids = new Set(myPlayer.hand.map(c => c.uid));
        return currentPrompt.options.length > 0 &&
            currentPrompt.options.every(opt => {
                const val = opt.value as { cardUid?: string } | undefined;
                return val?.cardUid && handUids.has(val.cardUid);
            });
    }, [currentPrompt, playerID, myPlayer]);

    // 基地选择交互检测：当前 interaction 的所有选项都包含有效 baseIndex 时，用基地区直接点击选择
    const isBaseSelectPrompt = useMemo(() => {
        if (!currentPrompt || currentPrompt.playerId !== playerID) return false;
        const data = currentInteraction?.data as Record<string, unknown> | undefined;
        // 优先使用 targetType 字段（数据驱动）
        if (data?.targetType === 'base') return true;
        // 兼容旧模式：所有选项都包含有效 baseIndex（≥0，排除"完成"等特殊选项）
        return currentPrompt.options.length > 0 &&
            currentPrompt.options.every(opt => {
                const val = opt.value as { baseIndex?: number } | undefined;
                return val != null && typeof val.baseIndex === 'number' && val.baseIndex >= 0;
            });
    }, [currentPrompt, playerID, currentInteraction]);

    const baseSelectPromptTitle = isBaseSelectPrompt && currentPrompt ? currentPrompt.title : '';

    // 可选基地索引集合（只高亮候选基地，避免浪费）
    const selectableBaseIndices = useMemo<Set<number>>(() => {
        if (!isBaseSelectPrompt || !currentPrompt) return new Set();
        const indices = new Set<number>();
        for (const opt of currentPrompt.options) {
            const val = opt.value as { baseIndex?: number } | undefined;
            if (val != null && typeof val.baseIndex === 'number') {
                indices.add(val.baseIndex);
            }
        }
        return indices;
    }, [isBaseSelectPrompt, currentPrompt]);

    // 随从选择交互检测：targetType === 'minion' 或所有选项都包含 minionUid
    const isMinionSelectPrompt = useMemo(() => {
        if (!currentPrompt || currentPrompt.playerId !== playerID) return false;
        const data = currentInteraction?.data as Record<string, unknown> | undefined;
        if (data?.targetType === 'minion') return true;
        return currentPrompt.options.length > 0 &&
            currentPrompt.options.every(opt => {
                const val = opt.value as { minionUid?: string } | undefined;
                return val != null && typeof val.minionUid === 'string';
            });
    }, [currentPrompt, playerID, currentInteraction]);

    // 可选随从 UID 集合（只高亮候选随从）
    const selectableMinionUids = useMemo<Set<string>>(() => {
        if (!isMinionSelectPrompt || !currentPrompt) return new Set();
        const uids = new Set<string>();
        for (const opt of currentPrompt.options) {
            const val = opt.value as { minionUid?: string } | undefined;
            if (val?.minionUid) uids.add(val.minionUid);
        }
        return uids;
    }, [isMinionSelectPrompt, currentPrompt]);

    // 交互驱动的选择提示标题
    const interactionSelectTitle = useMemo(() => {
        if (isBaseSelectPrompt && currentPrompt) return currentPrompt.title;
        if (isMinionSelectPrompt && currentPrompt) return currentPrompt.title;
        return '';
    }, [isBaseSelectPrompt, isMinionSelectPrompt, currentPrompt]);

    // 事件流消费 → 动画驱动
    const myPid = playerID || '0';
    const gameEvents = useGameEvents({ G, myPlayerId: myPid });

    // 音效系统
    useGameAudio({
        config: SMASHUP_AUDIO_CONFIG,
        gameId: SMASH_UP_MANIFEST.id,
        G: G.core,
        ctx: {
            currentPhase: phase,
            isGameOver: !!isGameOver,
            isWinner,
        },
        meta: {
            currentPlayerId: currentPid,
        },
        eventEntries: G.sys.eventStream.entries,
    });

    // 教学系统集成
    useTutorialBridge(G.sys.tutorial, moves as Record<string, unknown>);
    const { isActive: isTutorialActive, currentStep: tutorialStep } = useTutorial();
    const isTutorialMode = gameMode?.mode === 'tutorial';

    // 教学模式下的命令权限检查
    const isTutorialCommandAllowed = useCallback((commandType: string): boolean => {
        if (!isTutorialActive || !tutorialStep) return true;
        // 系统命令不受限制
        if (commandType.startsWith('SYS_')) return true;
        // 有 allowedCommands 白名单时，只允许白名单内的命令
        if (tutorialStep.allowedCommands && tutorialStep.allowedCommands.length > 0) {
            return tutorialStep.allowedCommands.includes(commandType);
        }
        return true;
    }, [isTutorialActive, tutorialStep]);

    // 教学模式下的目标级门控（卡牌/单位粒度）
    const isTutorialTargetAllowed = useCallback((targetId: string): boolean => {
        if (!isTutorialActive || !tutorialStep) return true;
        if (!tutorialStep.allowedTargets || tutorialStep.allowedTargets.length === 0) return true;
        return tutorialStep.allowedTargets.includes(targetId);
    }, [isTutorialActive, tutorialStep]);

    // 教学模式下被禁用的手牌 uid 集合
    const tutorialDisabledUids = useMemo<Set<string> | undefined>(() => {
        if (!isTutorialActive || !tutorialStep?.allowedTargets?.length) return undefined;
        const allowed = tutorialStep.allowedTargets;
        return new Set(
            myPlayer?.hand.filter(c => !allowed.includes(c.uid)).map(c => c.uid) ?? []
        );
    }, [isTutorialActive, tutorialStep, myPlayer?.hand]);

    // 基地 DOM 引用（用于力量浮字定位）
    const baseRefsMap = useRef<Map<number, HTMLElement>>(new Map());

    // 回合切换提示
    const [showTurnNotice, setShowTurnNotice] = useState(false);
    const prevCurrentPidRef = useRef(currentPid);
    useEffect(() => {
        if (prevCurrentPidRef.current !== currentPid) {
            prevCurrentPidRef.current = currentPid;
            if (currentPid === playerID) {
                setShowTurnNotice(true);
                const timer = setTimeout(() => setShowTurnNotice(false), 1500);
                return () => clearTimeout(timer);
            }
        }
    }, [currentPid, playerID]);

    // --- State Management ---
    useEffect(() => {
        setSelectedCardUid(null);
        setSelectedCardMode(null);
        setDiscardSelection(new Set());
    }, [phase, currentPid]);

    useEffect(() => {
        const load = async (id: string, path: string, defaultGrid?: { rows: number; cols: number }) => {
            try {
                const config = await loadCardAtlasConfig(path, undefined, defaultGrid);
                registerCardAtlasSource(id, { image: path, config });
            } catch (e) {
                console.error(`Atlas load failed: ${id}`, e);
            }
        };
        // 基地图集：横向 4 列
        load(SMASHUP_ATLAS_IDS.BASE1, 'smashup/base/base1', { rows: 4, cols: 4 });
        load(SMASHUP_ATLAS_IDS.BASE2, 'smashup/base/base2', { rows: 2, cols: 4 });
        load(SMASHUP_ATLAS_IDS.BASE3, 'smashup/base/base3', { rows: 2, cols: 4 });
        load(SMASHUP_ATLAS_IDS.BASE4, 'smashup/base/base4', { rows: 3, cols: 4 });
        // 卡牌图集
        load(SMASHUP_ATLAS_IDS.CARDS1, 'smashup/cards/cards1', { rows: 6, cols: 8 });
        load(SMASHUP_ATLAS_IDS.CARDS2, 'smashup/cards/cards2', { rows: 7, cols: 8 });
        load(SMASHUP_ATLAS_IDS.CARDS3, 'smashup/cards/cards3', { rows: 6, cols: 8 });
        load(SMASHUP_ATLAS_IDS.CARDS4, 'smashup/cards/cards4', { rows: 6, cols: 8 });
    }, []);

    // --- Handlers ---
    const handlePlayMinion = useCallback((cardUid: string, baseIndex: number) => {
        if (!isTutorialCommandAllowed(SU_COMMANDS.PLAY_MINION)) {
            playDeniedSound();
            return;
        }
        moves[SU_COMMANDS.PLAY_MINION]?.({ cardUid, baseIndex });
        setSelectedCardUid(null);
        setSelectedCardMode(null);
    }, [moves, isTutorialCommandAllowed]);

    const handlePlayOngoingAction = useCallback((cardUid: string, baseIndex: number) => {
        if (!isTutorialCommandAllowed(SU_COMMANDS.PLAY_ACTION)) {
            playDeniedSound();
            return;
        }
        moves[SU_COMMANDS.PLAY_ACTION]?.({ cardUid, targetBaseIndex: baseIndex });
        setSelectedCardUid(null);
        setSelectedCardMode(null);
    }, [moves, isTutorialCommandAllowed]);

    /** 持续行动卡附着到随从：点击随从时触发 */
    const handlePlayOngoingToMinion = useCallback((cardUid: string, baseIndex: number, minionUid: string) => {
        if (!isTutorialCommandAllowed(SU_COMMANDS.PLAY_ACTION)) {
            playDeniedSound();
            return;
        }
        moves[SU_COMMANDS.PLAY_ACTION]?.({ cardUid, targetBaseIndex: baseIndex, targetMinionUid: minionUid });
        setSelectedCardUid(null);
        setSelectedCardMode(null);
    }, [moves, isTutorialCommandAllowed]);

    // VIEWING STATE
    const [viewingCard, setViewingCard] = useState<{ defId: string; type: 'minion' | 'base' | 'action' } | null>(null);

    const handleBaseClick = useCallback((index: number) => {
        const base = core.bases[index];
        // 基地选择交互模式：直接响应 interaction
        if (isBaseSelectPrompt && currentPrompt) {
            if (!selectableBaseIndices.has(index)) {
                toast(t('ui.invalid_base_target', { defaultValue: '该基地不可选择' }));
                return;
            }
            const option = currentPrompt.options.find(
                opt => (opt.value as { baseIndex?: number })?.baseIndex === index
            );
            if (option) {
                moves[INTERACTION_COMMANDS.RESPOND]?.({ optionId: option.id });
            }
            return;
        }
        if (selectedCardUid) {
            if (selectedCardMode === 'ongoing-minion') {
                // 需要选择随从，点击基地无效
                toast(t('ui.select_minion_hint', { defaultValue: '请选择一个随从' }));
                return;
            }
            if (selectedCardMode === 'ongoing') {
                handlePlayOngoingAction(selectedCardUid, index);
            } else {
                handlePlayMinion(selectedCardUid, index);
            }
        } else {
            setViewingCard({ defId: base.defId, type: 'base' });
        }
    }, [selectedCardUid, selectedCardMode, handlePlayMinion, handlePlayOngoingAction, core.bases, t, isBaseSelectPrompt, selectableBaseIndices, currentPrompt, moves]);

    const handleCardClick = useCallback((card: CardInstance) => {
        // 手牌弃牌交互优先：直接响应 interaction
        if (isHandDiscardPrompt && currentPrompt) {
            const option = currentPrompt.options.find(
                opt => (opt.value as { cardUid?: string })?.cardUid === card.uid
            );
            if (option) {
                moves[INTERACTION_COMMANDS.RESPOND]?.({ optionId: option.id });
            }
            return;
        }

        // Validation for play phase / turn
        if (!isMyTurn || phase !== 'playCards') {
            playDeniedSound();
            toast(t('ui.invalid_play'));
            return;
        }

        // 教学模式下检查命令权限
        const commandType = card.type === 'action' ? SU_COMMANDS.PLAY_ACTION : SU_COMMANDS.PLAY_MINION;
        if (!isTutorialCommandAllowed(commandType)) {
            playDeniedSound();
            return;
        }

        // 教学模式下检查目标级门控
        if (!isTutorialTargetAllowed(card.uid)) {
            playDeniedSound();
            return;
        }

        // Normal play logic
        if (card.type === 'action') {
            // ongoing 行动卡需要选择目标
            const cardDef = getCardDef(card.defId) as ActionCardDef | undefined;
            if (cardDef?.subtype === 'ongoing') {
                // 进入/退出部署模式
                if (selectedCardUid === card.uid) {
                    setSelectedCardUid(null);
                    setSelectedCardMode(null);
                } else {
                    setSelectedCardUid(card.uid);
                    // 根据 ongoingTarget 决定选择基地还是随从
                    setSelectedCardMode(cardDef.ongoingTarget === 'minion' ? 'ongoing-minion' : 'ongoing');
                }
            } else {
                moves[SU_COMMANDS.PLAY_ACTION]?.({ cardUid: card.uid });
            }
        } else {
            if (selectedCardUid === card.uid) {
                setSelectedCardUid(null);
                setSelectedCardMode(null);
            } else {
                setSelectedCardUid(card.uid);
                setSelectedCardMode('minion');
            }
        }
    }, [isMyTurn, phase, moves, isTutorialCommandAllowed, isTutorialTargetAllowed, selectedCardUid, isHandDiscardPrompt, currentPrompt]);

    /** 随从点击回调：ongoing-minion 模式下附着行动卡到随从，或交互驱动的随从选择 */
    const handleMinionSelect = useCallback((minionUid: string, baseIndex: number) => {
        // 交互驱动的随从选择
        if (isMinionSelectPrompt && currentPrompt) {
            if (!selectableMinionUids.has(minionUid)) return;
            const option = currentPrompt.options.find(
                opt => (opt.value as { minionUid?: string })?.minionUid === minionUid
            );
            if (option) {
                moves[INTERACTION_COMMANDS.RESPOND]?.({ optionId: option.id });
            }
            return;
        }
        // ongoing-minion 模式下附着行动卡到随从
        if (selectedCardUid && selectedCardMode === 'ongoing-minion') {
            handlePlayOngoingToMinion(selectedCardUid, baseIndex, minionUid);
        }
    }, [selectedCardUid, selectedCardMode, handlePlayOngoingToMinion, isMinionSelectPrompt, selectableMinionUids, currentPrompt, moves]);

    const handleViewCardDetail = useCallback((card: CardInstance) => {
        setViewingCard({ defId: card.defId, type: card.type === 'minion' ? 'minion' : 'action' });
    }, []);

    const handleViewAction = useCallback((defId: string) => {
        setViewingCard({ defId, type: 'action' });
    }, []);

    // 防御性检查：HMR 或 boardgame.io client 重建时 core 可能不完整
    if (!core.turnOrder || !core.bases) {
        return (
            <UndoProvider value={{ G, ctx, moves, playerID, isGameOver: !!isGameOver, isLocalMode: isLocalMatch }}>
                <LoadingScreen
                    description={t('ui.loading', { defaultValue: '加载中...' })}
                    className="bg-[#3e2723]"
                />
            </UndoProvider>
        );
    }

    // EARLY RETURN: Faction Selection
    if (phase === 'factionSelect') {
        return (
            <UndoProvider value={{ G, ctx, moves, playerID, isGameOver: !!isGameOver, isLocalMode: isLocalMatch }}>
                <TutorialSelectionGate
                    isTutorialMode={isTutorialMode}
                    isTutorialActive={isTutorialActive}
                    containerClassName="bg-[#3e2723]"
                    textClassName="text-lg"
                >
                    <div className="relative w-full h-screen bg-[#3e2723] overflow-hidden font-sans select-none">
                        <div className="absolute inset-0 z-0 pointer-events-none opacity-40 mix-blend-multiply">
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')]" />
                        </div>
                        <FactionSelection core={core} moves={moves} playerID={playerID} />
                    </div>
                </TutorialSelectionGate>
            </UndoProvider>
        );
    }

    return (
        <UndoProvider value={{ G, ctx, moves, playerID, isGameOver: !!isGameOver, isLocalMode: isLocalMatch }}>
            {/* BACKGROUND: A warm, dark wooden table texture. */}
            <div className="relative w-full h-screen bg-[#3e2723] overflow-hidden font-sans select-none"
            >

                {/* Table Texture Layer */}
                <div className="absolute inset-0 z-0 pointer-events-none opacity-40 mix-blend-multiply">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')]" />
                </div>
                {/* Vignette for focus */}
                <div className="absolute inset-0 z-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.6)_100%)]" />

                {/* --- TOP HUD: "Sticky Notes" Style --- */}
                <div className="relative z-20 flex justify-between items-start pt-6 px-[2vw] pointer-events-none">

                {/* Left: Turn Tracker (Yellow Notepad) */}
                <div className="bg-[#fef3c7] text-slate-800 p-3 pt-4 shadow-[2px_3px_5px_rgba(0,0,0,0.2)] -rotate-1 pointer-events-auto min-w-[140px] clip-path-jagged" data-tutorial-id="su-turn-tracker">
                    <div className="w-3 h-3 rounded-full bg-red-400 absolute top-1 left-1/2 -translate-x-1/2 opacity-50 shadow-inner" /> {/* Pin */}
                    <motion.div
                        key={`turn-${core.turnNumber}`}
                        initial={{ scale: 0.9, rotate: -3 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                        className="text-center font-black uppercase text-xl leading-none tracking-tighter mb-1 border-b-2 border-slate-800/20 pb-1"
                    >
                        {t('ui.turn')} {core.turnNumber}
                    </motion.div>
                    <div className="flex justify-between items-center text-sm font-bold font-mono">
                        <span>{isMyTurn ? t('ui.you') : t('ui.opp')}</span>
                        <motion.span
                            key={phase}
                            initial={{ scale: 0.7, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                            className="text-blue-600 bg-blue-100 px-1 rounded transform rotate-2 inline-block"
                        >
                            {t(getPhaseNameKey(phase))}
                        </motion.span>
                    </div>
                </div>

                {/* Right: Score Sheet + Player Info */}
                <div className="bg-white text-slate-900 p-4 shadow-[3px_4px_10px_rgba(0,0,0,0.3)] rotate-1 max-w-[500px] pointer-events-auto rounded-sm" data-tutorial-id="su-scoreboard">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center mb-2 border-b border-slate-200">{t('ui.score_sheet')}</div>
                    <div className="flex gap-5">
                        {core.turnOrder.map(pid => {
                            const conf = PLAYER_CONFIG[parseInt(pid) % PLAYER_CONFIG.length];
                            const isCurrent = pid === currentPid;
                            const player = core.players[pid];
                            const isMe = pid === playerID;
                            // 派系图标
                            const factionIcons = (player.factions ?? [])
                                .map(fid => getFactionMeta(fid))
                                .filter(Boolean);
                            return (
                                <motion.div
                                    key={pid}
                                    className={`flex flex-col items-center relative ${isCurrent ? 'scale-110' : 'opacity-60 grayscale'}`}
                                    animate={isCurrent ? { scale: 1.1 } : { scale: 1 }}
                                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                                >
                                    <span className="text-xs font-black uppercase mb-1">
                                        {isMe ? t('ui.you_short') : t('ui.player_short', { id: pid })}
                                    </span>
                                    <motion.div
                                        key={`vp-${pid}-${finalScores[pid]}`}
                                        className={`w-10 h-10 rounded-full flex items-center justify-center text-xl font-black text-white shadow-md border-2 border-white ${conf.bg}`}
                                        initial={{ scale: 1 }}
                                        animate={{ scale: [1, 1.3, 1] }}
                                        transition={{ duration: 0.4, ease: 'easeOut' }}
                                    >
                                        {finalScores[pid]}
                                    </motion.div>
                                    {/* 派系图标 */}
                                    <div className="flex gap-0.5 mt-1">
                                        {factionIcons.map(meta => {
                                            if (!meta) return null;
                                            const Icon = meta.icon;
                                            return (
                                                <span key={meta.id} title={t(meta.nameKey)}>
                                                    <Icon className="w-4 h-4" />
                                                </span>
                                            );
                                        })}
                                    </div>
                                    {/* 自己的牌库/弃牌信息已移至下方 DeckDiscardZone */}
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* --- FINISH TURN BUTTON: Fixed Position (Right Edge) --- */}
            <div className="fixed right-[8vw] bottom-[28vh] z-50 flex pointer-events-none w-24 h-24" data-tutorial-id="su-end-turn-btn">
                <AnimatePresence>
                    {isMyTurn && phase === 'playCards' && (
                        <motion.div
                            initial={{ y: 100, opacity: 0, scale: 0.5 }}
                            animate={{ y: 0, opacity: 1, scale: 1 }}
                            exit={{ y: 100, opacity: 0, scale: 0.5 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                            className="pointer-events-auto"
                        >
                            <button
                                onClick={() => {
                                    if (!isTutorialCommandAllowed(FLOW_COMMANDS.ADVANCE_PHASE)) {
                                        playDeniedSound();
                                        return;
                                    }
                                    moves['ADVANCE_PHASE']?.();
                                }}
                                disabled={!isTutorialCommandAllowed(FLOW_COMMANDS.ADVANCE_PHASE)}
                                className={`group w-24 h-24 rounded-full border-4 border-white shadow-[0_10px_20px_rgba(0,0,0,0.4)] flex flex-col items-center justify-center transition-all text-white relative overflow-hidden ${
                                    !isTutorialCommandAllowed(FLOW_COMMANDS.ADVANCE_PHASE)
                                        ? 'bg-slate-600 opacity-50 cursor-not-allowed'
                                        : 'bg-slate-900 hover:scale-110 hover:rotate-3 active:scale-95'
                                }`}
                            >
                                <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/pinstriped-suit.png')]" />

                                {t('ui.finish_turn').includes(' ') ? (
                                    <>
                                        <span className="text-[10px] font-bold opacity-70 uppercase tracking-tighter leading-tight">
                                            {t('ui.finish_turn').split(' ')[0]}
                                        </span>
                                        <span className="text-lg font-black uppercase italic leading-none">
                                            {t('ui.finish_turn').split(' ')[1]}
                                        </span>
                                    </>
                                ) : (
                                    <span className="text-lg font-black uppercase italic leading-none tracking-tighter">
                                        {t('ui.finish_turn')}
                                    </span>
                                )}

                                <div className="absolute -inset-1 bg-white/5 blur-xl group-hover:bg-white/10 transition-colors" />
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* --- 交互选择提示横幅（基地/随从选择） --- */}
            <AnimatePresence>
                {(isBaseSelectPrompt || isMinionSelectPrompt) && (
                    <motion.div
                        initial={{ y: -40, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -40, opacity: 0 }}
                        className="absolute top-[72px] inset-x-0 z-30 flex justify-center pointer-events-none"
                    >
                        <div className="bg-amber-600/90 text-white px-8 py-3 rounded-b-xl shadow-lg border-2 border-amber-400 border-t-0">
                            <span className="font-black text-lg uppercase tracking-wide">
                                {interactionSelectTitle}
                            </span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* --- MAIN BOARD --- */}
            {/* Scrollable table area */}
            <div className="absolute inset-0 flex items-center justify-center overflow-x-auto overflow-y-hidden z-10 no-scrollbar pt-12 pb-60" data-tutorial-id="su-base-area">
                <div className="flex items-start gap-12 px-20 min-w-max">
                    {core.bases.map((base, idx) => (
                        <BaseZone
                            key={`${base.defId}-${idx}`}
                            base={base}
                            baseIndex={idx}
                            core={core}
                            turnOrder={core.turnOrder}
                            isDeployMode={!!selectedCardUid || (isBaseSelectPrompt && selectableBaseIndices.has(idx))}
                            isMinionSelectMode={selectedCardMode === 'ongoing-minion' || (isMinionSelectPrompt && selectableMinionUids.size > 0)}
                            selectableMinionUids={isMinionSelectPrompt ? selectableMinionUids : undefined}
                            isMyTurn={isMyTurn}
                            myPlayerId={playerID}
                            moves={moves}
                            onClick={() => handleBaseClick(idx)}
                            onMinionSelect={handleMinionSelect}
                            onViewMinion={(defId) => setViewingCard({ defId, type: 'minion' })}
                            onViewAction={handleViewAction}
                            onViewBase={(defId) => setViewingCard({ defId, type: 'base' })}
                            isTutorialTargetAllowed={isTutorialTargetAllowed}
                            tokenRef={(el) => {
                                if (el) baseRefsMap.current.set(idx, el);
                                else baseRefsMap.current.delete(idx);
                            }}
                        />

                    ))}
                </div>
            </div>

            {/* --- BOTTOM: HAND & CONTROLS --- */}
            {/* Not a bar, but floating elements */}
            {
                myPlayer && (
                    <div className="absolute bottom-0 inset-x-0 h-[220px] z-30 pointer-events-none">

                        {/* Discard Overlay (Messy Pile) */}
                        {needDiscard && (
                            <div className="absolute inset-0 bg-black/60 z-50 flex flex-col items-center justify-center pointer-events-auto">
                                <div className="bg-white p-6 rotate-1 shadow-2xl max-w-md text-center border-4 border-red-500 border-dashed">
                                    <h2 className="text-2xl font-black text-red-600 uppercase mb-2 transform -rotate-1">{t('ui.too_many_cards')}</h2>
                                    <p className="font-bold text-slate-700 mb-4">{t('ui.discard_desc', { count: discardCount })}</p>
                                    <SmashUpGameButton
                                        variant="primary"
                                        onClick={() => {
                                            if (discardSelection.size === discardCount) {
                                                moves[SU_COMMANDS.DISCARD_TO_LIMIT]?.({ cardUids: Array.from(discardSelection) });
                                                setDiscardSelection(new Set());
                                            }
                                        }}
                                        disabled={discardSelection.size !== discardCount}
                                    >
                                        {t('ui.throw_away')}
                                    </SmashUpGameButton>
                                </div>
                            </div>
                        )}

                        {/* 手牌弃牌交互提示横幅 */}
                        {isHandDiscardPrompt && currentPrompt && (
                            <div className="absolute top-0 inset-x-0 z-50 flex justify-center pointer-events-none">
                                <motion.div
                                    initial={{ y: -40, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    className="bg-red-600/90 text-white px-6 py-2 rounded-b-lg shadow-lg border-2 border-red-400 border-t-0 pointer-events-auto"
                                >
                                    <span className="font-black text-lg uppercase tracking-wide">
                                        {currentPrompt.title}
                                    </span>
                                </motion.div>
                            </div>
                        )}

                        <HandArea
                            hand={myPlayer.hand}
                            selectedCardUid={selectedCardUid}
                            onCardSelect={handleCardClick}
                            isDiscardMode={needDiscard || isHandDiscardPrompt}
                            discardSelection={discardSelection}
                            // 教学模式下，当不允许打出随从和行动时禁用手牌交互（摇头反馈）
                            disableInteraction={
                                isTutorialActive &&
                                !isTutorialCommandAllowed(SU_COMMANDS.PLAY_MINION) &&
                                !isTutorialCommandAllowed(SU_COMMANDS.PLAY_ACTION)
                            }
                            disabledCardUids={tutorialDisabledUids}
                            onCardView={handleViewCardDetail}
                        />



                        {/* NEW: Deck & Discard Zone */}
                        <DeckDiscardZone
                            deckCount={myPlayer.deck.length}
                            discard={myPlayer.discard}
                            myPlayerId={playerID || ''}
                            isMyTurn={isMyTurn}
                        hasPlayableFromDiscard={
                            isMyTurn &&
                            !!G.sys.interaction?.current &&
                            DISCARD_PLAY_ABILITY_IDS.has(
                                (G.sys.interaction.current.data as Record<string, unknown>)?.sourceId as string ?? ''
                            )
                        }
                            onCardView={handleViewCardDetail}
                        />
                    </div>
                )
            }

            {/* 特效层 */}
            <SmashUpEffectsLayer
                powerChanges={gameEvents.powerChanges}
                onPowerChangeComplete={gameEvents.removePowerChange}
                actionShows={gameEvents.actionShows}
                onActionShowComplete={gameEvents.removeActionShow}
                baseScored={gameEvents.baseScored}
                onBaseScoredComplete={gameEvents.removeBaseScored}
                baseRefs={baseRefsMap}
            />

            {/* 回合切换提示 */}
            <AnimatePresence>
                {showTurnNotice && (
                    <motion.div
                        className="fixed inset-0 flex items-center justify-center pointer-events-none"
                        style={{ zIndex: UI_Z_INDEX.hint }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <motion.div
                            className="bg-[#fef3c7] text-slate-900 px-8 py-4 shadow-2xl border-4 border-dashed border-slate-800/30"
                            initial={{ scale: 0.5, rotate: -10 }}
                            animate={{ scale: 1, rotate: 2 }}
                            exit={{ scale: 0.5, rotate: 10, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                            style={{ fontFamily: "'Caveat', 'Comic Sans MS', cursive" }}
                        >
                            <span className="text-[3vw] font-black uppercase tracking-tight">{t('ui.your_turn')}</span>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

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

            {/* PROMPT OVERLAY（手牌弃牌/基地选择/随从选择交互时隐藏，由对应区域直接处理） */}
            {!isHandDiscardPrompt && !isBaseSelectPrompt && !isMinionSelectPrompt && (
                <PromptOverlay
                    interaction={G.sys.interaction?.current}
                    moves={moves}
                    playerID={playerID}
                />
            )}

            {/* 卡牌展示覆盖层 */}
            <CardRevealOverlay
                pendingReveal={core.pendingReveal}
                playerID={playerID}
                onDismiss={() => moves[SU_COMMANDS.DISMISS_REVEAL]?.({})}
            />

            {/* ME FIRST! 响应窗口 */}
            <MeFirstOverlay
                G={G}
                moves={moves}
                playerID={playerID}
            />
        </div>
        </UndoProvider>
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
    const { t } = useTranslation('game-smashup');
    const def = type === 'base' ? getBaseDef(defId) : getCardDef(defId);
    if (!def) return null;
    const resolvedName = resolveCardName(def, t) || defId;
    const resolvedText = resolveCardText(def, t);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 flex items-center justify-center p-8 cursor-pointer"
            style={{ zIndex: UI_Z_INDEX.magnify }}
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
                    title={resolvedName}
                />

                {/* Detail Box if no preview */}
                {!def.previewRef && (
                    <div className="absolute inset-0 bg-white rounded-xl p-6 border-4 border-slate-800 flex flex-col items-center justify-center text-center">
                        <h2 className="text-3xl font-black uppercase mb-4">{resolvedName}</h2>
                        <p className="font-mono text-lg">{resolvedText}</p>
                    </div>
                )}
            </motion.div>
        </motion.div>
    );
};
