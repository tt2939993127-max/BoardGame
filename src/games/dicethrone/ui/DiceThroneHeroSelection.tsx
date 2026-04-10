/**
 * Dice Throne 角色选择界面 - 物理架构还原版
 * 严格保留原始图片使用方式和布局比例，修复 fallbackSrc 缺失导致的图片破碎问题
 */

import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, MessageSquareWarning } from 'lucide-react';
import { OptimizedImage } from '../../../components/common/media/OptimizedImage';
import { MagnifyOverlay } from '../../../components/common/overlays/MagnifyOverlay';
import { buildLocalizedImageSet, UI_Z_INDEX } from '../../../core';
import { playSound } from '../../../lib/audio/useGameAudio';
import { getPortraitStyle, ASSETS } from './assets';
import { getPlayerBoardAspectRatio } from './abilitySlotLayout';
import {
    DICETHRONE_CHARACTER_CATALOG,
    type SelectableCharacterId,
    type CharacterId,
    type PendingSeatSwapRequest,
    type SeatControllerKind,
} from '../domain/types';
import type { PlayerId } from '../../../engine/types';
import clsx from 'clsx';

export interface DiceThroneHeroSelectionProps {
    isOpen: boolean;
    currentPlayerId: PlayerId;
    hostPlayerId: PlayerId;
    selectedCharacters: Record<PlayerId, CharacterId>;
    readyPlayers: Record<PlayerId, boolean>;
    playerNames: Record<PlayerId, string>;
    seatingOrder?: PlayerId[];
    seatControllers?: Record<PlayerId, SeatControllerKind>;
    seatSwapRequest?: PendingSeatSwapRequest;
    onSelect: (characterId: SelectableCharacterId) => void;
    onReady: () => void;
    onUnready: () => void;
    onRequestSeatSwap: (targetPlayerId: PlayerId) => void;
    onRespondSeatSwap: (approve: boolean) => void;
    onCancelSeatSwap: () => void;
    onStart: () => void;
    locale: string;
}

const PLAYER_COLORS: Record<string, { bg: string; text: string; glow: string; shadow: string }> = {
    '0': { bg: '#F43F5E', text: 'white', glow: 'rgba(244,63,94,0.6)', shadow: '#9F1239' },
    '1': { bg: '#3B82F6', text: 'white', glow: 'rgba(59,130,246,0.6)', shadow: '#1E40AF' },
    '2': { bg: '#10B981', text: 'white', glow: 'rgba(16,185,129,0.6)', shadow: '#065F46' },
    '3': { bg: '#F59E0B', text: 'black', glow: 'rgba(245,158,11,0.6)', shadow: '#92400E' },
};

const PLAYER_LABELS: Record<string, string> = {
    '0': 'P1',
    '1': 'P2',
    '2': 'P3',
    '3': 'P4',
};

const HERO_SELECTION_CLICK_SOUND_KEY = 'ui.general.khron_studio_rpg_interface_essentials_inventory_dialog_ucs_system_192khz.dialog.dialog_choice.uiclick_dialog_choice_01_krst_none';

type MagnifyPreview =
    | { src: string; kind: 'player-board'; characterId: CharacterId }
    | { src: string; kind: 'tip-board'; characterId: CharacterId }
    | null;

export const DiceThroneHeroSelection: React.FC<DiceThroneHeroSelectionProps> = ({
    isOpen,
    currentPlayerId,
    hostPlayerId,
    selectedCharacters,
    readyPlayers,
    playerNames,
    seatingOrder,
    seatControllers,
    seatSwapRequest,
    onSelect,
    onReady,
    onUnready,
    onRequestSeatSwap,
    onRespondSeatSwap,
    onCancelSeatSwap,
    onStart,
    locale,
}) => {
    const { t } = useTranslation('game-dicethrone');
    const isHost = currentPlayerId === hostPlayerId;
    const playerIds = Object.keys(playerNames);
    const isFourPlayerMode = playerIds.length === 4;

    const everyoneReady = playerIds.every(pid => {
        const char = selectedCharacters[pid as PlayerId];
        const hasSelected = char && char !== 'unselected';
        if (pid === hostPlayerId) return hasSelected;
        return hasSelected && readyPlayers[pid as PlayerId];
    });

    const hasSelectedChar = selectedCharacters[currentPlayerId] && selectedCharacters[currentPlayerId] !== 'unselected';

    const availableCharacters = useMemo(() => {
        return DICETHRONE_CHARACTER_CATALOG;
    }, []);

    const previewCharId = useMemo(() => {
        const mySelection = selectedCharacters[currentPlayerId];
        if (mySelection && mySelection !== 'unselected') return mySelection;
        return availableCharacters[0]?.id || 'monk';
    }, [selectedCharacters, currentPlayerId, availableCharacters]);

    const [magnifyPreview, setMagnifyPreview] = useState<MagnifyPreview>(null);
    const playerBoardAspectRatio = getPlayerBoardAspectRatio(previewCharId);

    const effectiveSeatingOrder = useMemo(() => {
        const orderedPlayers = seatingOrder?.filter((pid) => playerIds.includes(pid)) ?? [];
        return orderedPlayers.length === playerIds.length ? orderedPlayers : playerIds;
    }, [seatingOrder, playerIds]);
    const teamAPlayers = effectiveSeatingOrder.filter((_, index) => index % 2 === 0);
    const teamBPlayers = effectiveSeatingOrder.filter((_, index) => index % 2 === 1);

    const getPlayerLabel = (pid: string) => PLAYER_LABELS[pid] ?? `P${Number(pid) + 1}`;
    const getPlayerDisplayName = (pid: PlayerId) => playerNames[pid] || getPlayerLabel(pid);
    const currentSeatSwapRequest = React.useMemo(() => {
        if (!seatSwapRequest) {
            return undefined;
        }
        if (
            !effectiveSeatingOrder.includes(seatSwapRequest.requesterId)
            || !effectiveSeatingOrder.includes(seatSwapRequest.targetPlayerId)
        ) {
            return undefined;
        }
        return seatSwapRequest;
    }, [seatSwapRequest, effectiveSeatingOrder]);
    const isRequester = currentSeatSwapRequest?.requesterId === currentPlayerId;
    const isTarget = currentSeatSwapRequest?.targetPlayerId === currentPlayerId;
    const isSeatSwapPending = Boolean(currentSeatSwapRequest);
    const startDisabled = !everyoneReady || isSeatSwapPending;

    const handleSelectCharacter = (characterId: SelectableCharacterId) => {
        playSound(HERO_SELECTION_CLICK_SOUND_KEY);
        onSelect(characterId);
    };

    const handleReady = () => {
        playSound(HERO_SELECTION_CLICK_SOUND_KEY);
        onReady();
    };

    const handleUnready = () => {
        playSound(HERO_SELECTION_CLICK_SOUND_KEY);
        onUnready();
    };

    const handleStart = () => {
        playSound(HERO_SELECTION_CLICK_SOUND_KEY);
        onStart();
    };

    const handleSeatSwapAvatarClick = (pid: PlayerId) => {
        if (!isFourPlayerMode || isSeatSwapPending || pid === currentPlayerId) {
            return;
        }
        playSound(HERO_SELECTION_CLICK_SOUND_KEY);
        onRequestSeatSwap(pid);
    };

    const seatHintText = (() => {
        if (!isFourPlayerMode) {
            return null;
        }
        if (!currentSeatSwapRequest) {
            return t('selection.seating.swapHint');
        }
        if (isRequester) {
            return t('selection.seating.swapWaiting', {
                player: getPlayerDisplayName(currentSeatSwapRequest.targetPlayerId),
            });
        }
        if (isTarget) {
            return t('selection.seating.swapIncoming', {
                player: getPlayerDisplayName(currentSeatSwapRequest.requesterId),
            });
        }
        return t('selection.seating.swapPendingOther', {
            requester: getPlayerDisplayName(currentSeatSwapRequest.requesterId),
            target: getPlayerDisplayName(currentSeatSwapRequest.targetPlayerId),
        });
    })();

    const renderSeatPlayerCard = (pid: PlayerId, seatIndex: number) => {
        const colors = PLAYER_COLORS[pid] || PLAYER_COLORS['0'];
        const hasSelected = selectedCharacters[pid] && selectedCharacters[pid] !== 'unselected';
        const isMe = pid === currentPlayerId;
        const isAiSeat = (seatControllers?.[pid] ?? 'human') === 'ai';
        const isRequesterSeat = currentSeatSwapRequest?.requesterId === pid;
        const isTargetSeat = currentSeatSwapRequest?.targetPlayerId === pid;
        const avatarDisabled = !isFourPlayerMode || isSeatSwapPending || isMe;

        return (
            <div
                key={`seat-player-${pid}-${seatIndex}`}
                data-testid={`dt-seat-swap-seat-${pid}`}
                className={clsx(
                    'min-w-[8.6vw] rounded-[0.9vw] border px-[0.8vw] py-[0.68vw] text-left transition-all',
                    isRequesterSeat || isTargetSeat
                        ? 'border-amber-300/70 bg-amber-500/12 shadow-[0_0_1vw_rgba(245,158,11,0.22)]'
                        : isMe
                            ? 'border-white/28 bg-white/10'
                            : 'border-white/12 bg-black/25'
                )}
            >
                <div className="flex items-center gap-[0.55vw]">
                    <button
                        type="button"
                        onClick={() => handleSeatSwapAvatarClick(pid)}
                        disabled={avatarDisabled}
                        data-testid={`dt-seat-swap-avatar-${pid}`}
                        className={clsx(
                            'relative flex h-[1.7vw] w-[1.7vw] items-center justify-center rounded-full font-black text-[0.62vw] transition-all',
                            avatarDisabled
                                ? 'cursor-default opacity-95'
                                : 'cursor-pointer hover:scale-105 hover:ring-2 hover:ring-amber-300/55'
                        )}
                        style={{
                            backgroundColor: colors.bg,
                            color: colors.text,
                            boxShadow: `0 0 12px ${colors.glow}`,
                        }}
                    >
                        {getPlayerLabel(pid)}
                        {isAiSeat && (
                            <span className="absolute -right-[0.16vw] -bottom-[0.12vw] rounded-full border border-sky-200/45 bg-sky-500 px-[0.16vw] py-[0.02vw] text-[0.34vw] font-black uppercase tracking-[0.08em] text-white shadow-[0_0_0.35vw_rgba(14,165,233,0.45)]">
                                {t('selection.seating.aiBadge')}
                            </span>
                        )}
                    </button>
                    <div className="min-w-0">
                        <div className="text-[0.56vw] font-black text-white/90">
                            {t('selection.seating.seatNumber', { seat: seatIndex + 1 })}
                        </div>
                        <div className="truncate text-[0.52vw] text-white/60">
                            {getPlayerDisplayName(pid)}
                        </div>
                    </div>
                </div>
                <div className={clsx('mt-[0.35vw] truncate text-[0.5vw] font-bold', hasSelected ? 'text-amber-300' : 'text-white/35')}>
                    {hasSelected ? t(`characters.${selectedCharacters[pid]}`) : t('selection.notSelected')}
                </div>
            </div>
        );
    };

    const readyProgressDots = useMemo(() => {
        return playerIds.map(pid => {
            const charId = selectedCharacters[pid as PlayerId];
            const hasSelected = charId && charId !== 'unselected';
            const isReady = pid === hostPlayerId ? hasSelected : hasSelected && readyPlayers[pid as PlayerId];

            return (
                <span
                    key={`ready-dot-${pid}`}
                    className={clsx(
                        'w-[0.55vw] h-[0.55vw] rounded-full',
                        isReady
                            ? 'bg-emerald-400 shadow-[0_0_0.6vw_rgba(16,185,129,0.6)]'
                            : 'bg-white/30'
                    )}
                />
            );
        });
    }, [playerIds, selectedCharacters, readyPlayers, hostPlayerId]);

    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            data-testid="character-selection-overlay"
            className="absolute inset-0 flex h-full w-full max-h-full max-w-full overflow-hidden bg-[#050510] select-none text-white font-sans"
            style={{ zIndex: UI_Z_INDEX.overlay }}
        >
            {/* 动态氛围背景（铺满整个 overlay） */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    zIndex: 0,
                    backgroundImage: buildLocalizedImageSet('dicethrone/images/Common/background', locale),
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                    opacity: 0.85,
                }}
            />
            <div className="absolute inset-0 bg-indigo-950/3 pointer-events-none" style={{ zIndex: 1 }} />

            {/* 左侧：英雄选择列表 (18vw) */}
            <div className="w-[18vw] h-full border-r border-white/5 flex flex-col z-10 bg-black/15 backdrop-blur-2xl relative flex-shrink-0">
                <div className="px-[1vw] pt-[1.2vw] pb-[0.6vw] border-b border-white/10">
                    <h2 className="text-[1vw] font-bold text-white/90 uppercase tracking-wider">
                        {t('selection.title')}
                    </h2>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-[1vw] grid grid-cols-2 gap-[0.8vw] content-start pt-[1vw]">
                    {availableCharacters.map((char, index) => {
                        const isSelectedByMe = selectedCharacters[currentPlayerId] === char.id;

                        return (
                            <motion.div
                                key={char.id}
                                data-character-id={char.id}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.03 }}
                                className={clsx(
                                    "relative aspect-[3/4] rounded-[0.4vw] border-2 transition-all duration-300 overflow-hidden cursor-pointer group",
                                    isSelectedByMe
                                        ? "border-amber-400 shadow-[0_0_1.5vw_rgba(251,191,36,0.4)] z-20 scale-[1.02]"
                                        : "border-white/10 hover:border-white/30 hover:scale-[1.02]"
                                )}
                                onClick={() => handleSelectCharacter(char.id as SelectableCharacterId)}
                            >
                                <div className={clsx(
                                    "absolute inset-0 z-0 transition-all duration-500",
                                    isSelectedByMe ? "grayscale-0 scale-110" : "grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 group-hover:scale-105"
                                )}
                                    style={getPortraitStyle(char.id, locale)} />

                                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />

                                <div className="absolute bottom-[0.5vw] left-[0.5vw] right-[0.5vw]">
                                    <div className="text-[0.7vw] font-black truncate uppercase tracking-tight text-white/90">
                                        {t(char.nameKey)}
                                    </div>
                                </div>

                                <div className="absolute top-[0.3vw] right-[0.3vw] flex -space-x-[0.3vw]">
                                    {playerIds.filter(pid => selectedCharacters[pid as PlayerId] === char.id).map(pid => (
                                        <div
                                            key={pid}
                                            className="w-[1.2vw] h-[1.2vw] rounded-full border border-white/80 flex items-center justify-center text-[0.5vw] font-black shadow-lg"
                                            style={{ backgroundColor: PLAYER_COLORS[pid]?.bg }}
                                        >
                                            {PLAYER_LABELS[pid]}
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            {/* 右侧：角色预览区 */}
            <div className="flex-1 h-full relative flex flex-col z-10 overflow-hidden bg-gradient-to-br from-slate-900/5 to-black/12">
                <div className="flex-1 flex items-center justify-center p-[1vw] overflow-hidden">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={previewCharId}
                            initial={{ opacity: 0, scale: 0.98, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 1.02, y: -20 }}
                            className="relative w-full h-full flex items-center justify-center"
                        >
                            <div className="flex items-center justify-center gap-[1vw] h-full">
                                {/* 物理面板预览 - OptimizedImage 自动处理本地化路径 */}
                                <div
                                    className="relative h-[85%] w-auto shadow-2xl rounded-[0.6vw] overflow-hidden cursor-zoom-in hover:ring-2 hover:ring-amber-400/50 transition-all"
                                    style={{ aspectRatio: String(playerBoardAspectRatio) }}
                                    onClick={() => setMagnifyPreview({
                                        src: ASSETS.PLAYER_BOARD(previewCharId as CharacterId),
                                        kind: 'player-board',
                                        characterId: previewCharId as CharacterId,
                                    })}
                                >
                                    <OptimizedImage
                                        src={ASSETS.PLAYER_BOARD(previewCharId as CharacterId)}
                                        locale={locale}
                                        className="block h-full w-auto object-contain"
                                        alt="玩家面板"
                                    />
                                </div>

                                <div
                                    className="relative h-[85%] w-auto rounded-[0.6vw] overflow-hidden shadow-2xl cursor-zoom-in hover:ring-2 hover:ring-amber-400/50 transition-all"
                                    onClick={() => setMagnifyPreview({
                                        src: ASSETS.TIP_BOARD(previewCharId as CharacterId),
                                        kind: 'tip-board',
                                        characterId: previewCharId as CharacterId,
                                    })}
                                >
                                    <OptimizedImage
                                        src={ASSETS.TIP_BOARD(previewCharId as CharacterId)}
                                        locale={locale}
                                        className="h-full w-auto object-contain"
                                        alt="提示板"
                                    />
                                </div>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>

                {isFourPlayerMode && (
                    <div className="absolute right-[2vw] bottom-[9vw] w-[22vw] rounded-[1vw] border border-white/12 bg-black/45 p-[0.95vw] backdrop-blur-xl shadow-[0_1.2vw_3vw_rgba(0,0,0,0.35)]">
                        <div>
                            <div className="text-[0.72vw] font-black uppercase tracking-[0.18em] text-white/88">
                                {t('selection.seating.title')}
                            </div>
                            <div className="mt-[0.2vw] text-[0.5vw] leading-relaxed text-white/56">
                                {seatHintText}
                            </div>
                        </div>

                        <div className="mt-[0.85vw] flex flex-wrap gap-[0.45vw]">
                            {effectiveSeatingOrder.map((pid, seatIndex) => renderSeatPlayerCard(pid, seatIndex))}
                        </div>

                        {isSeatSwapPending && (
                            <div className="mt-[0.85vw] rounded-[0.9vw] border border-white/14 bg-black/35 p-[0.8vw] shadow-[0_0.8vw_2vw_rgba(0,0,0,0.22)]">
                                {isTarget ? (
                                    <div className="flex flex-col gap-[0.65vw]">
                                        <div className="flex items-center gap-[0.45vw] border-b border-white/10 pb-[0.45vw]">
                                            <MessageSquareWarning className="h-[0.95vw] w-[0.95vw] text-amber-400" />
                                            <span className="text-[0.62vw] font-black text-amber-400">
                                                {t('selection.seating.swapIncoming', {
                                                    player: getPlayerDisplayName(currentSeatSwapRequest!.requesterId),
                                                })}
                                            </span>
                                        </div>
                                        <p className="text-[0.5vw] leading-relaxed text-white/78">
                                            {t('selection.seating.swapHint')}
                                        </p>
                                        <div className="flex gap-[0.45vw]">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    playSound(HERO_SELECTION_CLICK_SOUND_KEY);
                                                    onRespondSeatSwap(true);
                                                }}
                                                data-testid="dt-seat-swap-approve"
                                                className="flex-1 rounded-[0.65vw] border border-emerald-500/50 bg-emerald-500/20 px-[0.8vw] py-[0.55vw] text-[0.58vw] font-black text-emerald-300 transition hover:bg-emerald-500/38 hover:text-white"
                                            >
                                                {t('selection.seating.swapApprove')}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    playSound(HERO_SELECTION_CLICK_SOUND_KEY);
                                                    onRespondSeatSwap(false);
                                                }}
                                                data-testid="dt-seat-swap-reject"
                                                className="flex-1 rounded-[0.65vw] border border-rose-500/50 bg-rose-500/20 px-[0.8vw] py-[0.55vw] text-[0.58vw] font-black text-rose-300 transition hover:bg-rose-500/38 hover:text-white"
                                            >
                                                {t('selection.seating.swapReject')}
                                            </button>
                                        </div>
                                    </div>
                                ) : isRequester ? (
                                    <div className="flex flex-col gap-[0.65vw]">
                                        <div className="flex items-center gap-[0.45vw] border-b border-white/10 pb-[0.45vw]">
                                            <div className="h-[0.6vw] w-[0.6vw] rounded-full bg-amber-400 animate-pulse" />
                                            <span className="text-[0.62vw] font-black text-amber-400">
                                                {t('selection.seating.swapWaiting', {
                                                    player: getPlayerDisplayName(currentSeatSwapRequest!.targetPlayerId),
                                                })}
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                playSound(HERO_SELECTION_CLICK_SOUND_KEY);
                                                onCancelSeatSwap();
                                            }}
                                            data-testid="dt-seat-swap-cancel"
                                            className="w-full rounded-[0.65vw] border border-amber-500/45 bg-amber-500/16 px-[0.8vw] py-[0.55vw] text-[0.58vw] font-black text-amber-300 transition hover:bg-amber-500/32 hover:text-white"
                                        >
                                            {t('selection.seating.swapCancel')}
                                        </button>
                                    </div>
                                ) : (
                                    <div className="text-[0.54vw] font-semibold text-white/78">
                                        {t('selection.seating.swapPendingOther', {
                                            requester: getPlayerDisplayName(currentSeatSwapRequest!.requesterId),
                                            target: getPlayerDisplayName(currentSeatSwapRequest!.targetPlayerId),
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="mt-[0.8vw] grid grid-cols-2 gap-[0.45vw] text-[0.48vw] text-white/72">
                            <div className="rounded-[0.8vw] border border-sky-400/22 bg-sky-500/10 px-[0.7vw] py-[0.55vw]">
                                <div className="font-black uppercase tracking-[0.16em] text-sky-200/90">
                                    {t('selection.seating.teamA')}
                                </div>
                                <div className="mt-[0.18vw] text-white/78">
                                    {teamAPlayers.map(getPlayerLabel).join(' / ')}
                                </div>
                            </div>
                            <div className="rounded-[0.8vw] border border-rose-400/22 bg-rose-500/10 px-[0.7vw] py-[0.55vw]">
                                <div className="font-black uppercase tracking-[0.16em] text-rose-200/90">
                                    {t('selection.seating.teamB')}
                                </div>
                                <div className="mt-[0.18vw] text-white/78">
                                    {teamBPlayers.map(getPlayerLabel).join(' / ')}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 底部玩家面板 (8vw) */}
                <div
                    className="h-[8vw] bg-gradient-to-t from-black/25 via-black/10 to-transparent backdrop-blur-xl flex items-center justify-center gap-[3vw] px-[4vw] flex-shrink-0"
                    style={{ zIndex: UI_Z_INDEX.hud }}
                >
                    <div className="flex items-center justify-center gap-[1.5vw]">
                        {playerIds.map(pid => {
                            const charId = selectedCharacters[pid as PlayerId];
                            const isMe = pid === currentPlayerId;
                            const hasSelected = charId && charId !== 'unselected';
                            const colors = PLAYER_COLORS[pid] || PLAYER_COLORS['0'];

                            return (
                                <motion.div
                                    key={pid}
                                    className={clsx(
                                        "flex items-center gap-[0.8vw] px-[1.5vw] py-[0.6vw] rounded-full transition-all duration-300",
                                        isMe ? "bg-white/15 ring-2 ring-amber-400/50" : "bg-white/8"
                                    )}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: Number(pid) * 0.08 }}
                                >
                                    <div
                                        className="w-[2.5vw] h-[2.5vw] rounded-full flex items-center justify-center text-[1vw] font-black"
                                        style={{
                                            backgroundColor: colors.bg,
                                            color: colors.text,
                                            boxShadow: `0 0 15px ${colors.glow}`
                                        }}
                                    >
                                        {PLAYER_LABELS[pid]}
                                    </div>

                                    <div className="flex flex-col">
                                        <div className={clsx(
                                            "text-[0.9vw] font-black uppercase tracking-wide leading-tight",
                                            hasSelected ? "text-amber-400" : "text-white/50"
                                        )}>
                                            {hasSelected ? t(`characters.${charId}`) : t('selection.notSelected')}
                                        </div>
                                        <div className="text-[0.6vw] text-white/50 truncate max-w-[8vw]">
                                            {playerNames[pid as PlayerId]}
                                            {isMe && <span className="ml-[0.2vw] text-amber-400/80 font-bold">({t('selection.you')})</span>}
                                        </div>
                                    </div>

                                    {readyPlayers[pid as PlayerId] && (
                                        <div className="w-[1.2vw] h-[1.2vw] rounded-full bg-emerald-500 flex items-center justify-center text-white">
                                            <Check size={14} className="text-white" strokeWidth={3} />
                                        </div>
                                    )}
                                </motion.div>
                            );
                        })}
                    </div>

                    <div className="flex items-center">
                        {!isHost && hasSelectedChar && !readyPlayers[currentPlayerId] && (
                            <motion.button
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                onClick={handleReady}
                                className="px-[3vw] py-[1vw] rounded-full text-[1.2vw] font-black uppercase tracking-[0.2em] transition-all duration-300 border-2 bg-emerald-500 text-white border-emerald-400 hover:bg-emerald-400 hover:scale-105 active:scale-95 cursor-pointer shadow-[0_0_30px_rgba(16,185,129,0.5)]"
                            >
                                {t('selection.ready')}
                            </motion.button>
                        )}

                        {!isHost && readyPlayers[currentPlayerId] && (
                            <motion.button
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                onClick={handleUnready}
                                className="px-[3vw] py-[1vw] rounded-full text-[1.2vw] font-black uppercase tracking-[0.2em] transition-all duration-300 border-2 bg-white/5 text-emerald-400/70 border-emerald-400/30 hover:bg-red-500/20 hover:text-red-400 hover:border-red-400/50 cursor-pointer"
                            >
                                {t('selection.cancelReady')}
                            </motion.button>
                        )}

                        {isHost && hasSelectedChar && (
                            <motion.button
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                disabled={startDisabled}
                                onClick={handleStart}
                                className={clsx(
                                    "px-[3vw] py-[1vw] rounded-full text-[1.2vw] font-black uppercase tracking-[0.2em] transition-all duration-300 border-2",
                                    !startDisabled
                                        ? "bg-amber-500 text-black border-amber-400 hover:bg-amber-400 hover:scale-105 active:scale-95 cursor-pointer shadow-[0_0_30px_rgba(245,158,11,0.5)]"
                                        : "bg-white/5 text-white/30 border-white/10 cursor-not-allowed"
                                )}
                            >
                                <span className="inline-flex items-center gap-[0.8vw]">
                                    <span>
                                        {isSeatSwapPending
                                            ? t('selection.seating.swapResolving')
                                            : everyoneReady
                                                ? t('selection.pressStart')
                                                : t('selection.waitingAll')}
                                    </span>
                                    <span className="flex items-center gap-[0.35vw]">{readyProgressDots}</span>
                                </span>
                            </motion.button>
                        )}
                    </div>
                </div>
            </div>

            {/* 资源预加载已由 CriticalImageGate 统一处理，无需额外离屏渲染 */}

            {/* 放大预览弹窗 - OptimizedImage 自动处理本地化路径 */}
            <MagnifyOverlay
                isOpen={!!magnifyPreview}
                onClose={() => setMagnifyPreview(null)}
                containerClassName="max-h-[90vh] max-w-[90vw]"
                closeLabel={t('actions.closePreview')}
                overlayTestId="character-selection-magnify-overlay"
            >
                {magnifyPreview && (
                    <div
                        className="relative"
                        style={magnifyPreview.kind === 'player-board'
                            ? { aspectRatio: String(getPlayerBoardAspectRatio(magnifyPreview.characterId)) }
                            : undefined}
                    >
                        <OptimizedImage
                            src={magnifyPreview.src}
                            locale={locale}
                            className="block max-h-[90vh] max-w-[90vw] w-auto h-auto object-contain"
                            alt="预览图"
                        />
                    </div>
                )}
            </MagnifyOverlay>
        </motion.div>
    );
};
