import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, type ReactNode } from 'react';
import { AudioManager } from '../lib/audio/AudioManager';
import type { BgmDefinition } from '../lib/audio/types';
import { getAudioSettings, updateAudioSettings, type AudioSettings, type BgmSelections } from '../api/user-settings';
import { useAuth } from './AuthContext';

const BGM_SELECTIONS_STORAGE_KEY = 'audio_bgm_selections';

const readLocalBgmSelections = (): BgmSelections => {
    if (typeof window === 'undefined') return {};
    try {
        const raw = localStorage.getItem(BGM_SELECTIONS_STORAGE_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return {};
        return parsed as BgmSelections;
    } catch {
        return {};
    }
};

const writeLocalBgmSelections = (selections: BgmSelections): void => {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(BGM_SELECTIONS_STORAGE_KEY, JSON.stringify(selections));
    } catch {
        // 忽略写入失败
    }
};

const areBgmSelectionsEqual = (a?: BgmSelections, b?: BgmSelections): boolean => {
    if (a === b) return true;
    if (!a || !b) return false;
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) return false;
    for (const gameId of aKeys) {
        const aGroups = a[gameId] ?? {};
        const bGroups = b[gameId] ?? {};
        const aGroupKeys = Object.keys(aGroups);
        const bGroupKeys = Object.keys(bGroups);
        if (aGroupKeys.length !== bGroupKeys.length) return false;
        for (const groupId of aGroupKeys) {
            if (aGroups[groupId] !== bGroups[groupId]) return false;
        }
    }
    return true;
};

interface AudioContextValue {
    muted: boolean;
    masterVolume: number;
    sfxVolume: number;
    bgmVolume: number;
    currentBgm: string | null;
    playlist: BgmDefinition[];
    bgmSelections: BgmSelections;
    activeGameId: string | null;
    activeBgmGroup: string | null;
    toggleMute: () => void;
    setMasterVolume: (volume: number) => void;
    setSfxVolume: (volume: number) => void;
    setBgmVolume: (volume: number) => void;
    play: (key: string, spriteKey?: string) => void;
    playBgm: (key: string) => void;
    stopBgm: () => void;
    setPlaylist: (list: BgmDefinition[]) => void;
    setBgmSelection: (gameId: string, groupId: string, key: string) => void;
    setBgmSelectionsForGame: (gameId: string, selections: Record<string, string>) => void;
    setActiveBgmContext: (gameId: string | null, groupId: string | null) => void;
    switchBgm: () => void;
}

const AudioContext = createContext<AudioContextValue | null>(null);

export const AudioProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { token } = useAuth();
    const [muted, setMuted] = useState(false);
    const [masterVolume, setMasterVolumeState] = useState(1.0);
    const [sfxVolume, setSfxVolumeState] = useState(1.0);
    const [bgmVolume, setBgmVolumeState] = useState(0.6);
    const [currentBgm, setCurrentBgmState] = useState<string | null>(null);
    const [playlist, setPlaylist] = useState<BgmDefinition[]>([]);
    const [bgmSelections, setBgmSelectionsState] = useState<BgmSelections>(() => readLocalBgmSelections());
    const [activeGameId, setActiveGameId] = useState<string | null>(null);
    const [activeBgmGroup, setActiveBgmGroup] = useState<string | null>(null);
    const lastActiveContextRef = useRef<{ gameId: string; groupId: string } | null>(null);
    const hasRemoteSyncRef = useRef(false);
    const skipNextSyncRef = useRef(false);
    const lastSyncedRef = useRef<AudioSettings | null>(null);

    // 初始化音频管理器
    useEffect(() => {
        AudioManager.initialize();
        setMuted(AudioManager.muted);
        setMasterVolumeState(AudioManager.masterVolume);
        setSfxVolumeState(AudioManager.sfxVolume);
        setBgmVolumeState(AudioManager.bgmVolume);
    }, []);

    // 监听 BGM 状态更新（事件驱动，避免轮询）
    useEffect(() => {
        const unsubscribe = AudioManager.onBgmChange((nextBgm) => {
            setCurrentBgmState(nextBgm);
        });
        return unsubscribe;
    }, []);

    useEffect(() => {
        writeLocalBgmSelections(bgmSelections);
    }, [bgmSelections]);

    useEffect(() => {
        if (!token) {
            hasRemoteSyncRef.current = false;
            lastSyncedRef.current = null;
            setBgmSelectionsState(readLocalBgmSelections());
            return;
        }

        let cancelled = false;

        const syncSettings = async () => {
            try {
                const response = await getAudioSettings(token);
                if (cancelled) return;

                if (!response.settings || response.empty) {
                    const localSelections = readLocalBgmSelections();
                    const localSettings: AudioSettings = {
                        muted: AudioManager.muted,
                        masterVolume: AudioManager.masterVolume,
                        sfxVolume: AudioManager.sfxVolume,
                        bgmVolume: AudioManager.bgmVolume,
                        bgmSelections: localSelections,
                    };
                    await updateAudioSettings(token, localSettings);
                    if (cancelled) return;
                    lastSyncedRef.current = localSettings;
                    setBgmSelectionsState(localSelections);
                } else {
                    const remoteSettings = response.settings;
                    const remoteSelections = remoteSettings.bgmSelections;
                    const fallbackSelections = remoteSelections ?? readLocalBgmSelections();
                    const shouldSyncSelections = remoteSelections === undefined
                        && Object.keys(fallbackSelections).length > 0;
                    skipNextSyncRef.current = !shouldSyncSelections;
                    AudioManager.setMuted(remoteSettings.muted);
                    AudioManager.setMasterVolume(remoteSettings.masterVolume);
                    AudioManager.setSfxVolume(remoteSettings.sfxVolume);
                    AudioManager.setBgmVolume(remoteSettings.bgmVolume);
                    setMuted(remoteSettings.muted);
                    setMasterVolumeState(remoteSettings.masterVolume);
                    setSfxVolumeState(remoteSettings.sfxVolume);
                    setBgmVolumeState(remoteSettings.bgmVolume);
                    setBgmSelectionsState(fallbackSelections);
                    lastSyncedRef.current = remoteSettings;
                }

                hasRemoteSyncRef.current = true;
            } catch {
                if (cancelled) return;
                // 同步失败时保持本地设置，并允许后续本地改动继续上报
                hasRemoteSyncRef.current = true;
                lastSyncedRef.current = {
                    muted: AudioManager.muted,
                    masterVolume: AudioManager.masterVolume,
                    sfxVolume: AudioManager.sfxVolume,
                    bgmVolume: AudioManager.bgmVolume,
                    bgmSelections: readLocalBgmSelections(),
                };
            }
        };

        void syncSettings();

        return () => {
            cancelled = true;
        };
    }, [token]);

    useEffect(() => {
        if (!token || !hasRemoteSyncRef.current) return;
        if (skipNextSyncRef.current) {
            skipNextSyncRef.current = false;
            return;
        }

        const nextSettings: AudioSettings = {
            muted,
            masterVolume,
            sfxVolume,
            bgmVolume,
            bgmSelections,
        };
        const last = lastSyncedRef.current;
        if (
            last
            && last.muted === nextSettings.muted
            && last.masterVolume === nextSettings.masterVolume
            && last.sfxVolume === nextSettings.sfxVolume
            && last.bgmVolume === nextSettings.bgmVolume
            && areBgmSelectionsEqual(last.bgmSelections, nextSettings.bgmSelections)
        ) {
            return;
        }

        lastSyncedRef.current = nextSettings;
        void updateAudioSettings(token, nextSettings).catch(() => {
            // 失败时保持本地缓存
        });
    }, [token, muted, masterVolume, sfxVolume, bgmVolume, bgmSelections]);

    const toggleMute = useCallback(() => {
        const newMuted = !muted;
        AudioManager.setMuted(newMuted);
        setMuted(newMuted);
    }, [muted]);

    const setMasterVolume = useCallback((vol: number) => {
        AudioManager.setMasterVolume(vol);
        setMasterVolumeState(vol);
    }, []);

    const setSfxVolume = useCallback((vol: number) => {
        AudioManager.setSfxVolume(vol);
        setSfxVolumeState(vol);
    }, []);

    const setBgmVolume = useCallback((vol: number) => {
        AudioManager.setBgmVolume(vol);
        setBgmVolumeState(vol);
    }, []);

    const setBgmSelection = useCallback((gameId: string, groupId: string, key: string) => {
        setBgmSelectionsState((prev) => {
            const current = prev[gameId]?.[groupId];
            if (current === key) return prev;
            return {
                ...prev,
                [gameId]: {
                    ...(prev[gameId] ?? {}),
                    [groupId]: key,
                },
            };
        });
    }, []);

    const setBgmSelectionsForGame = useCallback((gameId: string, selections: Record<string, string>) => {
        setBgmSelectionsState((prev) => ({
            ...prev,
            [gameId]: {
                ...(prev[gameId] ?? {}),
                ...selections,
            },
        }));
    }, []);

    const setActiveBgmContext = useCallback((gameId: string | null, groupId: string | null) => {
        setActiveGameId(gameId);
        setActiveBgmGroup(groupId);
        if (gameId && groupId) {
            lastActiveContextRef.current = { gameId, groupId };
        }
    }, []);

    const play = useCallback((key: string, spriteKey?: string) => {
        AudioManager.play(key, spriteKey);
    }, []);

    const playBgm = useCallback((key: string) => {
        AudioManager.playBgm(key);
    }, []);

    const stopBgm = useCallback(() => {
        AudioManager.stopBgm();
    }, []);

    const switchBgm = useCallback(() => {
        if (playlist.length === 0) return;
        const currentIndex = playlist.findIndex(track => track.key === currentBgm);
        const nextIndex = (currentIndex + 1) % playlist.length;
        const nextKey = playlist[nextIndex]?.key;
        if (!nextKey) return;

        const fallbackContext = lastActiveContextRef.current;
        const resolvedGameId = activeGameId ?? fallbackContext?.gameId ?? null;
        const resolvedGroup = activeBgmGroup ?? fallbackContext?.groupId ?? null;
        if (!resolvedGameId || !resolvedGroup) {
            playBgm(nextKey);
            return;
        }

        const targetGroups = resolvedGroup === 'normal' || resolvedGroup === 'battle'
            ? ['normal', 'battle']
            : [resolvedGroup];
        const shouldPlayImmediately = !activeGameId || !activeBgmGroup;
        if (shouldPlayImmediately) {
            playBgm(nextKey);
        }

        setBgmSelectionsState((prev) => {
            const nextSelections = { ...(prev[resolvedGameId] ?? {}) };
            let changed = false;
            for (const groupId of targetGroups) {
                if (nextSelections[groupId] !== nextKey) {
                    nextSelections[groupId] = nextKey;
                    changed = true;
                }
            }
            if (!changed) return prev;
            return {
                ...prev,
                [resolvedGameId]: nextSelections,
            };
        });
    }, [activeGameId, activeBgmGroup, currentBgm, playBgm, playlist]);

    const value = useMemo(() => ({
        muted,
        masterVolume,
        sfxVolume,
        bgmVolume,
        currentBgm,
        playlist,
        bgmSelections,
        activeGameId,
        activeBgmGroup,
        toggleMute,
        setMasterVolume,
        setSfxVolume,
        setBgmVolume,
        play,
        playBgm,
        stopBgm,
        setPlaylist,
        setBgmSelection,
        setBgmSelectionsForGame,
        setActiveBgmContext,
        switchBgm,
    }), [
        muted,
        masterVolume,
        sfxVolume,
        bgmVolume,
        currentBgm,
        playlist,
        bgmSelections,
        activeGameId,
        activeBgmGroup,
        toggleMute,
        setMasterVolume,
        setSfxVolume,
        setBgmVolume,
        play,
        playBgm,
        stopBgm,
        setPlaylist,
        setBgmSelection,
        setBgmSelectionsForGame,
        setActiveBgmContext,
        switchBgm,
    ]);

    return (
        <AudioContext.Provider value={value}>
            {children}
        </AudioContext.Provider>
    );
};

export const useAudio = (): AudioContextValue => {
    const context = useContext(AudioContext);
    if (!context) {
        throw new Error('useAudio must be used within an AudioProvider');
    }
    return context;
};
