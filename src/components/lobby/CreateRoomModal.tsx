/**
 * 创建房间配置弹窗
 *
 * 支持配置：
 * - 房间名称
 * - 游戏人数（从 manifest.playerOptions 读取）
 * - 房间保存时间（TTL）
 * - manifest 声明的 setupOptions（单选 / 多选）
 */

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import type { GameManifestEntry } from '../../games/manifest.types';
import { UI_Z_INDEX } from '../../core';
import type { AiSeatController } from '../../engine/ai';
import {
    createDefaultLocalMatchPreferences,
    normalizeLocalMatchPreferences,
    type LocalMatchPreferences,
} from '../../engine/ai';
import {
    getDefaultSetupSelections,
    type GameSetupSelections,
} from '../../games/setupOptions';
import { SetupOptionsFields } from './SetupOptionsFields';

/** 保存时间选项（秒） */
const RETENTION_OPTIONS = [
    { value: 0, key: 'none' },
    { value: 86400, key: '1day' },
    { value: 259200, key: '3days' },
    { value: 604800, key: '7days' },
] as const;

export interface RoomConfig {
    roomName: string;
    numPlayers: number;
    ttlSeconds: number;
    password?: string;
    enableAi: boolean;
    seatControllers: Record<string, AiSeatController>;
    setupSelections: GameSetupSelections;
}

interface CreateRoomModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (config: RoomConfig) => void;
    gameManifest: GameManifestEntry;
    initialPreferences?: LocalMatchPreferences | null;
    isLoading?: boolean;
}

const OWNER_PLAYER_ID = '0';

function getDefaultEnabledAiController(gameManifest: GameManifestEntry): AiSeatController {
    if (gameManifest.ai?.localAi) {
        return { type: 'local-ai' };
    }
    if (gameManifest.ai?.remoteAi) {
        return { type: 'remote-ai', providerId: 'astrbot' };
    }
    return { type: 'human' };
}

function forceHumanOwnerSeat(seatControllers: Record<string, AiSeatController>): Record<string, AiSeatController> {
    return {
        ...seatControllers,
        [OWNER_PLAYER_ID]: { type: 'human' },
    };
}

function countAiSeats(seatControllers: Record<string, AiSeatController>, numPlayers: number): number {
    let total = 0;
    for (let index = 0; index < numPlayers; index += 1) {
        const controller = seatControllers[String(index)];
        if (controller && controller.type !== 'human') {
            total += 1;
        }
    }
    return total;
}

export const CreateRoomModal = ({
    isOpen,
    onClose,
    onConfirm,
    gameManifest,
    initialPreferences,
    isLoading = false,
}: CreateRoomModalProps) => {
    const gameNamespace = `game-${gameManifest.id}`;
    const { t } = useTranslation(['lobby', gameNamespace]);
    const playerOptions = gameManifest.playerOptions ?? [2];
    const hasPlayerOptions = playerOptions.length > 1;

    const [roomName, setRoomName] = useState('');
    const [numPlayers, setNumPlayers] = useState(playerOptions[0]);
    const [ttlSeconds, setTtlSeconds] = useState(0);
    const [password, setPassword] = useState('');
    const [enableAi, setEnableAi] = useState(false);
    const [seatControllers, setSeatControllers] = useState<Record<string, AiSeatController>>({});
    const [setupSelections, setSetupSelections] = useState<GameSetupSelections>(() => getDefaultSetupSelections(gameManifest));

    useEffect(() => {
        if (!isOpen) return;
        const hasSavedPreferences = initialPreferences != null;
        const nextPreferences = normalizeLocalMatchPreferences(
            gameManifest,
            (initialPreferences ?? createDefaultLocalMatchPreferences(gameManifest)) as unknown as Record<string, unknown>,
        );
        const nextSeatControllers = hasSavedPreferences
            ? forceHumanOwnerSeat(nextPreferences.seatControllers)
            : forceHumanOwnerSeat(
                Object.fromEntries(
                    Array.from({ length: nextPreferences.numPlayers }, (_, index) => [String(index), { type: 'human' } as AiSeatController]),
                ),
            );
        setRoomName('');
        setNumPlayers(nextPreferences.numPlayers);
        setTtlSeconds(0);
        setPassword('');
        setEnableAi(hasSavedPreferences && countAiSeats(nextSeatControllers, nextPreferences.numPlayers) > 0);
        setSeatControllers(nextSeatControllers);
        setSetupSelections(nextPreferences.setupSelections);
    }, [gameManifest, initialPreferences, isOpen, playerOptions]);

    useEffect(() => {
        setSeatControllers((current) => {
            const normalized = normalizeLocalMatchPreferences(gameManifest, {
                numPlayers,
                seatControllers: current,
                setupSelections,
            }).seatControllers;
            return forceHumanOwnerSeat(normalized);
        });
    }, [gameManifest, numPlayers, setupSelections]);

    const handleToggleAiEnabled = () => {
        if (!gameManifest.ai?.localAi && !gameManifest.ai?.remoteAi) {
            return;
        }

        setEnableAi((current) => {
            const nextEnabled = !current;
            if (nextEnabled) {
                setSeatControllers((existing) => {
                    const nextControllers = forceHumanOwnerSeat({ ...existing });
                    const hasAiSeat = countAiSeats(nextControllers, numPlayers) > 0;
                    if (!hasAiSeat && numPlayers > 1) {
                        nextControllers['1'] = getDefaultEnabledAiController(gameManifest);
                    }
                    return nextControllers;
                });
                return true;
            }

            setSeatControllers((existing) => {
                const nextControllers = forceHumanOwnerSeat({ ...existing });
                for (let index = 1; index < numPlayers; index += 1) {
                    nextControllers[String(index)] = { type: 'human' };
                }
                return nextControllers;
            });
            return false;
        });
    };

    const handleToggleAiSeat = (playerId: string) => {
        if (playerId === OWNER_PLAYER_ID || !enableAi) return;
        setSeatControllers((current) => {
            const nextControllers = forceHumanOwnerSeat({ ...current });
            const currentController = nextControllers[playerId];
            nextControllers[playerId] = currentController?.type === 'human'
                ? getDefaultEnabledAiController(gameManifest)
                : { type: 'human' };
            return nextControllers;
        });
    };

    const handleConfirm = () => {
        const normalizedSeatControllers = enableAi
            ? forceHumanOwnerSeat(
                normalizeLocalMatchPreferences(gameManifest, {
                    numPlayers,
                    seatControllers,
                    setupSelections,
                }).seatControllers,
            )
            : forceHumanOwnerSeat(
                Object.fromEntries(
                    Array.from({ length: numPlayers }, (_, index) => [String(index), { type: 'human' } as AiSeatController]),
                ),
            );
        onConfirm({
            roomName: roomName.trim(),
            numPlayers,
            ttlSeconds,
            password: password.trim(),
            enableAi,
            seatControllers: normalizedSeatControllers,
            setupSelections,
        });
    };

    const handleBackdropClick = () => {
        if (!isLoading) {
            onClose();
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={handleBackdropClick}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
                        style={{ zIndex: UI_Z_INDEX.modalOverlay }}
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        className="fixed inset-0 flex items-center justify-center p-4 sm:p-8 pointer-events-none"
                        style={{ zIndex: UI_Z_INDEX.modalContent }}
                    >
                        <div
                            className="bg-parchment-card-bg pointer-events-auto relative flex w-full max-w-md max-h-[min(88dvh,42rem)] flex-col overflow-hidden rounded-sm border border-parchment-card-border/30 shadow-parchment-card-hover font-serif sm:max-h-[min(84dvh,44rem)]"
                            onClick={(event) => event.stopPropagation()}
                        >
                            <div className="absolute top-2 left-2 w-3 h-3 border-t border-l border-parchment-card-border/60" />
                            <div className="absolute top-2 right-2 w-3 h-3 border-t border-r border-parchment-card-border/60" />
                            <div className="absolute bottom-2 left-2 w-3 h-3 border-b border-l border-parchment-card-border/60" />
                            <div className="absolute bottom-2 right-2 w-3 h-3 border-b border-r border-parchment-card-border/60" />

                            <div className="shrink-0 p-6 pb-4">
                                <h2 className="text-xl font-bold text-parchment-base-text tracking-wide text-center">
                                    {t('createRoom.title')}
                                </h2>
                            </div>

                            <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-4 space-y-5">
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-sm font-bold text-parchment-base-text">
                                            {t('createRoom.roomName')}
                                        </label>
                                        <span className="text-xs text-parchment-light-text italic">
                                            {t('createRoom.roomNameHint')}
                                        </span>
                                    </div>
                                    <input
                                        type="text"
                                        value={roomName}
                                        onChange={(event) => setRoomName(event.target.value)}
                                        placeholder={t('createRoom.roomNamePlaceholder')}
                                        maxLength={20}
                                        className="w-full px-4 py-2.5 rounded-[4px] text-sm border border-parchment-card-border/30 bg-parchment-card-bg text-parchment-base-text placeholder:text-parchment-light-text/50 focus:outline-none focus:border-parchment-base-text transition-colors"
                                    />
                                </div>

                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-sm font-bold text-parchment-base-text">
                                            {t('createRoom.password')}
                                        </label>
                                        <span className="text-xs text-parchment-light-text italic">
                                            {t('createRoom.passwordHint')}
                                        </span>
                                    </div>
                                    <input
                                        type="text"
                                        value={password}
                                        onChange={(event) => setPassword(event.target.value)}
                                        placeholder={t('createRoom.passwordPlaceholder')}
                                        maxLength={10}
                                        className="w-full px-4 py-2.5 rounded-[4px] text-sm border border-parchment-card-border/30 bg-parchment-card-bg text-parchment-base-text placeholder:text-parchment-light-text/50 focus:outline-none focus:border-parchment-base-text transition-colors"
                                    />
                                </div>

                                {hasPlayerOptions && (
                                    <div>
                                        <label className="block text-sm font-bold text-parchment-base-text mb-2">
                                            {t('createRoom.playerCount')}
                                        </label>
                                        <div className="flex gap-2 flex-wrap">
                                            {playerOptions.map((count) => (
                                                <button
                                                    key={count}
                                                    type="button"
                                                    onClick={() => setNumPlayers(count)}
                                                    className={`px-4 py-2 rounded-[4px] text-sm font-bold transition-all cursor-pointer border ${
                                                        numPlayers === count
                                                            ? 'bg-parchment-base-text text-parchment-card-bg border-parchment-base-text'
                                                            : 'bg-parchment-card-bg text-parchment-base-text border-parchment-card-border/30 hover:bg-parchment-base-bg'
                                                    }`}
                                                >
                                                    {t('createRoom.playerCountUnit', { count })}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-sm font-bold text-parchment-base-text">
                                            {t('createRoom.retention')}
                                        </label>
                                        <span className="text-xs text-parchment-light-text italic">
                                            {t('createRoom.retentionHint')}
                                        </span>
                                    </div>
                                    <select
                                        value={ttlSeconds}
                                        onChange={(event) => setTtlSeconds(Number(event.target.value))}
                                        className="w-full px-4 py-2.5 rounded-[4px] text-sm border border-parchment-card-border/30 bg-parchment-card-bg text-parchment-base-text focus:outline-none focus:border-parchment-base-text cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%23433422%22%20d%3D%22M2%204l4%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_12px_center]"
                                    >
                                        {RETENTION_OPTIONS.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {t(`createRoom.retentionOptions.${option.key}`)}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <SetupOptionsFields
                                    gameManifest={gameManifest}
                                    selections={setupSelections}
                                    onSelectionsChange={setSetupSelections}
                                    t={t}
                                    gameNamespace={gameNamespace}
                                />

                                {(gameManifest.ai?.localAi || gameManifest.ai?.remoteAi) && (
                                    <div className="space-y-3">
                                        <button
                                            type="button"
                                            onClick={handleToggleAiEnabled}
                                            className={`w-full rounded-[6px] border px-4 py-3 text-left transition-colors cursor-pointer ${
                                                enableAi
                                                    ? 'border-emerald-700/20 bg-emerald-50/60'
                                                    : 'border-parchment-card-border/30 bg-parchment-base-bg/35 hover:bg-parchment-base-bg/60'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between gap-4">
                                                <div className="min-w-0">
                                                    <div className="text-sm font-bold text-parchment-base-text">
                                                        {t('createRoom.enableRoomAi')}
                                                    </div>
                                                    <div className="mt-1 text-xs text-parchment-light-text">
                                                        {enableAi
                                                            ? t('createRoom.enableRoomAiSummary', {
                                                                players: numPlayers,
                                                                aiCount: countAiSeats(seatControllers, numPlayers),
                                                            })
                                                            : t('createRoom.enableRoomAiHint')}
                                                    </div>
                                                </div>
                                                <span
                                                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
                                                        enableAi
                                                            ? 'bg-emerald-600 text-white'
                                                            : 'bg-parchment-card-bg text-parchment-light-text border border-parchment-card-border/30'
                                                    }`}
                                                >
                                                    {enableAi ? t('createRoom.enabled') : t('createRoom.disabled')}
                                                </span>
                                            </div>
                                        </button>

                                        {enableAi && (
                                            <div className="rounded-[6px] border border-parchment-card-border/20 bg-parchment-base-bg/25 px-4 py-3">
                                                <div className="mb-1 text-sm font-bold text-parchment-base-text">
                                                    {t('createRoom.occupiedSeats')}
                                                </div>
                                                <div className="mb-3 text-xs text-parchment-light-text">
                                                    {t('createRoom.occupiedSeatsHint')}
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {Array.from({ length: numPlayers }, (_, index) => {
                                                        const playerId = String(index);
                                                        const isOwnerSeat = playerId === OWNER_PLAYER_ID;
                                                        const isAiSeat = seatControllers[playerId]?.type !== 'human';
                                                        const label = isOwnerSeat
                                                            ? t('createRoom.ownerSeatUnit', { seat: index + 1 })
                                                            : t('createRoom.occupiedSeatUnit', { seat: index + 1 });

                                                        return (
                                                            <button
                                                                key={playerId}
                                                                type="button"
                                                                onClick={() => handleToggleAiSeat(playerId)}
                                                                disabled={isOwnerSeat}
                                                                aria-pressed={isOwnerSeat ? false : isAiSeat}
                                                                className={`rounded-[4px] border px-4 py-2 text-sm font-bold transition-all ${
                                                                    isOwnerSeat
                                                                        ? 'cursor-not-allowed border-parchment-card-border/25 bg-parchment-base-bg/55 text-parchment-light-text/80'
                                                                        : isAiSeat
                                                                            ? 'cursor-pointer border-emerald-600 bg-emerald-600 text-white shadow-sm'
                                                                            : 'cursor-pointer border-parchment-card-border/30 bg-parchment-card-bg text-parchment-base-text hover:bg-parchment-base-bg'
                                                                }`}
                                                            >
                                                                {label}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="shrink-0 border-t border-parchment-card-border/15 bg-parchment-card-bg/95 p-6 pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 py-2.5 px-4 bg-parchment-card-bg border border-parchment-card-border/30 text-parchment-base-text font-bold rounded-[4px] hover:bg-parchment-base-bg transition-all cursor-pointer"
                                    disabled={isLoading}
                                >
                                    {t('actions.cancel')}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleConfirm}
                                    className="flex-1 py-2.5 px-4 bg-parchment-base-text text-parchment-card-bg font-bold rounded-[4px] hover:bg-parchment-brown transition-all cursor-pointer disabled:opacity-50"
                                    disabled={isLoading}
                                >
                                    {isLoading ? t('button.processing') : t('createRoom.confirm')}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
