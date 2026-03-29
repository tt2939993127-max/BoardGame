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
    setupSelections: GameSetupSelections;
}

interface CreateRoomModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (config: RoomConfig) => void;
    gameManifest: GameManifestEntry;
    isLoading?: boolean;
}

export const CreateRoomModal = ({
    isOpen,
    onClose,
    onConfirm,
    gameManifest,
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
    const [setupSelections, setSetupSelections] = useState<GameSetupSelections>(() => getDefaultSetupSelections(gameManifest));

    useEffect(() => {
        if (!isOpen) return;
        setRoomName('');
        setNumPlayers(playerOptions[0]);
        setTtlSeconds(0);
        setPassword('');
        setSetupSelections(getDefaultSetupSelections(gameManifest));
    }, [gameManifest, isOpen, playerOptions]);

    const handleConfirm = () => {
        onConfirm({
            roomName: roomName.trim(),
            numPlayers,
            ttlSeconds,
            password: password.trim(),
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
                            className="bg-parchment-card-bg pointer-events-auto w-full max-w-md rounded-sm shadow-parchment-card-hover border border-parchment-card-border/30 relative overflow-hidden font-serif"
                            onClick={(event) => event.stopPropagation()}
                        >
                            <div className="absolute top-2 left-2 w-3 h-3 border-t border-l border-parchment-card-border/60" />
                            <div className="absolute top-2 right-2 w-3 h-3 border-t border-r border-parchment-card-border/60" />
                            <div className="absolute bottom-2 left-2 w-3 h-3 border-b border-l border-parchment-card-border/60" />
                            <div className="absolute bottom-2 right-2 w-3 h-3 border-b border-r border-parchment-card-border/60" />

                            <div className="p-6 pb-4">
                                <h2 className="text-xl font-bold text-parchment-base-text tracking-wide text-center">
                                    {t('createRoom.title')}
                                </h2>
                            </div>

                            <div className="p-6 space-y-5">
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
                            </div>

                            <div className="p-6 pt-4 flex gap-3">
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
                                    {isLoading ? t('common:loading') : t('createRoom.confirm')}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
