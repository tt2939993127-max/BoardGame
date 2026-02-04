/**
 * 游戏音效 Hook
 * 监听游戏状态变化并自动播放对应音效
 */
import { useEffect, useRef } from 'react';
import { AudioManager } from './AudioManager';
import { playSynthSound, getSynthSoundKeys } from './SynthAudio';
import type { AudioRuntimeContext, GameAudioConfig, SoundKey } from './types';
import { resolveAudioEvent, resolveBgmKey, resolveEventSoundKey } from './audioRouting';
import { useAudio } from '../../contexts/AudioContext';

interface UseGameAudioOptions<G, Ctx = unknown, Meta extends Record<string, unknown> = Record<string, unknown>> {
    config: GameAudioConfig;
    G: G;
    ctx: Ctx;
    eventEntries?: unknown[];
    meta?: Meta;
}

// 追踪哪些音效加载失败，需要使用合成音
const failedSounds = new Set<string>();

/**
 * 播放指定音效（自动回退到合成音）
 * @param key 音效键名
 */
export function playSound(key: SoundKey): void {
    // 如果已知该音效加载失败，直接使用合成音
    if (failedSounds.has(key)) {
        if (getSynthSoundKeys().includes(key)) {
            playSynthSound(key);
        }
        return;
    }

    const result = AudioManager.play(key);
    // 如果播放失败（返回 null），标记并尝试合成音
    if (result === null) {
        failedSounds.add(key);
        if (getSynthSoundKeys().includes(key)) {
            playSynthSound(key);
        }
    }
}

/**
 * 游戏音效 Hook
 * 自动监听游戏状态变化并触发音效
 */
export function useGameAudio<G, Ctx = unknown, Meta extends Record<string, unknown> = Record<string, unknown>>({
    config,
    G,
    ctx,
    eventEntries,
    meta,
}: UseGameAudioOptions<G, Ctx, Meta>): void {
    const initializedRef = useRef(false);
    const prevRuntimeRef = useRef<AudioRuntimeContext<G, Ctx, Meta> | null>(null);
    const prevLogIndexRef = useRef(0);
    const currentBgmKeyRef = useRef<string | null>(null);
    const { setPlaylist, playBgm, stopBgm } = useAudio();

    const runtimeContext: AudioRuntimeContext<G, Ctx, Meta> = { G, ctx, meta };

    useEffect(() => {
        if (!initializedRef.current) {
            AudioManager.initialize();
            AudioManager.registerAll(config, config.basePath || '');

            if (config.bgm && config.bgm.length > 0) {
                const fallbackKey = config.bgm[0]?.key ?? null;
                const initialBgm = resolveBgmKey(runtimeContext, config.bgmRules, fallbackKey);
                setPlaylist(config.bgm);
                if (initialBgm) {
                    playBgm(initialBgm);
                    currentBgmKeyRef.current = initialBgm;
                } else {
                    stopBgm();
                }
            } else {
                setPlaylist([]);
                stopBgm();
            }

            initializedRef.current = true;
        }
    }, [config, runtimeContext, setPlaylist, playBgm, stopBgm]);

    useEffect(() => {
        if (!initializedRef.current) return;
        if (!config.bgm || config.bgm.length === 0) return;

        const fallbackKey = config.bgm[0]?.key ?? null;
        const targetBgm = resolveBgmKey(runtimeContext, config.bgmRules, fallbackKey);

        if (!targetBgm) {
            stopBgm();
            currentBgmKeyRef.current = null;
            return;
        }

        if (currentBgmKeyRef.current !== targetBgm) {
            playBgm(targetBgm);
            currentBgmKeyRef.current = targetBgm;
        }
    }, [config.bgm, config.bgmRules, runtimeContext, playBgm, stopBgm]);

    useEffect(() => {
        if (!eventEntries || eventEntries.length === 0) return;

        let startIndex = prevLogIndexRef.current;
        if (eventEntries.length < startIndex) {
            startIndex = 0;
        }

        const newEntries = eventEntries.slice(startIndex);
        prevLogIndexRef.current = eventEntries.length;

        for (const entry of newEntries) {
            const event = resolveAudioEvent(entry, config.eventSelector);
            if (!event) continue;
            const key = resolveEventSoundKey(event, runtimeContext, config);
            if (key) {
                playSound(key);
            }
        }
    }, [eventEntries, config, runtimeContext]);

    useEffect(() => {
        if (!prevRuntimeRef.current) {
            prevRuntimeRef.current = runtimeContext;
            return;
        }

        if (!config.stateTriggers || config.stateTriggers.length === 0) {
            prevRuntimeRef.current = runtimeContext;
            return;
        }

        for (const trigger of config.stateTriggers) {
            if (!trigger.condition(prevRuntimeRef.current, runtimeContext)) continue;
            const resolvedKey = trigger.resolveSound?.(prevRuntimeRef.current, runtimeContext);
            const key = resolvedKey ?? trigger.sound;
            if (key) {
                playSound(key);
            }
        }

        prevRuntimeRef.current = runtimeContext;
    }, [config.stateTriggers, runtimeContext]);

    useEffect(() => (
        () => {
            setPlaylist([]);
            stopBgm();
            AudioManager.stopBgm();
            currentBgmKeyRef.current = null;
        }
    ), [setPlaylist, stopBgm]);
}
