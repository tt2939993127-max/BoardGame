import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { AudioManager } from '../lib/audio/AudioManager';
import type { BgmDefinition } from '../lib/audio/types';

interface AudioContextValue {
    muted: boolean;
    masterVolume: number;
    sfxVolume: number;
    bgmVolume: number;
    currentBgm: string | null;
    playlist: BgmDefinition[];
    toggleMute: () => void;
    setMasterVolume: (volume: number) => void;
    setSfxVolume: (volume: number) => void;
    setBgmVolume: (volume: number) => void;
    play: (key: string, spriteKey?: string) => void;
    playBgm: (key: string) => void;
    stopBgm: () => void;
    setPlaylist: (list: BgmDefinition[]) => void;
}

const AudioContext = createContext<AudioContextValue | null>(null);

export const AudioProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [muted, setMuted] = useState(false);
    const [masterVolume, setMasterVolumeState] = useState(1.0);
    const [sfxVolume, setSfxVolumeState] = useState(1.0);
    const [bgmVolume, setBgmVolumeState] = useState(0.6);
    const [currentBgm, setCurrentBgmState] = useState<string | null>(null);
    const [playlist, setPlaylist] = useState<BgmDefinition[]>([]);

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

    const play = useCallback((key: string, spriteKey?: string) => {
        AudioManager.play(key, spriteKey);
    }, []);

    const playBgm = useCallback((key: string) => {
        AudioManager.playBgm(key);
    }, []);

    const stopBgm = useCallback(() => {
        AudioManager.stopBgm();
    }, []);

    const value = useMemo(() => ({
        muted,
        masterVolume,
        sfxVolume,
        bgmVolume,
        currentBgm,
        playlist,
        toggleMute,
        setMasterVolume,
        setSfxVolume,
        setBgmVolume,
        play,
        playBgm,
        stopBgm,
        setPlaylist,
    }), [
        muted,
        masterVolume,
        sfxVolume,
        bgmVolume,
        currentBgm,
        playlist,
        toggleMute,
        setMasterVolume,
        setSfxVolume,
        setBgmVolume,
        play,
        playBgm,
        stopBgm,
        setPlaylist,
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
