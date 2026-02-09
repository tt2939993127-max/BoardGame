/**
 * 游戏音效 Hook
 * 监听游戏状态变化并自动播放对应音效
 * 支持通用注册表 + 游戏逻辑配置
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AudioManager } from './AudioManager';
import { playSynthSound, getSynthSoundKeys } from './SynthAudio';
import type { AudioRuntimeContext, BgmDefinition, BgmGroupId, GameAudioConfig, SoundKey } from './types';
import { resolveAudioEvent, resolveAudioKey, resolveBgmGroup, resolveBgmKey } from './audioRouting';
import { useAudio } from '../../contexts/AudioContext';
import { COMMON_AUDIO_BASE_PATH, loadCommonAudioRegistry } from './commonRegistry';

interface UseGameAudioOptions<G, Ctx = unknown, Meta extends Record<string, unknown> = Record<string, unknown>> {
    config: GameAudioConfig;
    gameId?: string;
    G: G;
    ctx: Ctx;
    eventEntries?: unknown[];
    meta?: Meta;
}

// 追踪哪些音效加载失败，需要使用合成音
const failedSounds = new Set<string>();

function getLogEntrySignature(entry: unknown): string | null {
    if (!entry || typeof entry !== 'object') return null;
    const maybeEventStreamEntry = entry as { id?: number; event?: { type?: string; timestamp?: number } };
    if (typeof maybeEventStreamEntry.id === 'number') {
        return `eventId:${maybeEventStreamEntry.id}`;
    }

    const maybeEntry = entry as {
        timestamp?: number;
        type?: string;
        data?: { type?: string; timestamp?: number };
    };

    const dataTimestamp = typeof maybeEntry.data === 'object' && maybeEntry.data
        ? (maybeEntry.data as { timestamp?: number }).timestamp
        : undefined;
    const signatureTimestamp = typeof dataTimestamp === 'number'
        ? dataTimestamp
        : maybeEntry.timestamp;
    if (typeof signatureTimestamp !== 'number') return null;

    const dataType = typeof maybeEntry.data === 'object' && maybeEntry.data
        ? (maybeEntry.data as { type?: string }).type ?? ''
        : '';
    return `${signatureTimestamp}|${maybeEntry.type ?? ''}|${dataType}`;
}

function findLastLogEntryIndex(entries: unknown[], signature: string): number {
    for (let i = entries.length - 1; i >= 0; i -= 1) {
        if (getLogEntrySignature(entries[i]) === signature) return i;
    }
    return -1;
}

/**
 * 播放指定音效（自动回退到合成音）
 * @param key 音效键名
 */
export function playSound(key: SoundKey): void {
    // 如果已知该音效加载失败，直接使用合成音
    const synthKeys = getSynthSoundKeys();
    const isSynthKey = synthKeys.includes(key);
    if (failedSounds.has(key)) {
        if (isSynthKey) {
            playSynthSound(key);
        }
        return;
    }

    const result = AudioManager.play(key);
    // 如果播放失败（返回 null），标记并尝试合成音
    if (result === null && isSynthKey) {
        failedSounds.add(key);
        playSynthSound(key);
    }
}

/** 操作被拒绝/失败时的反馈音效 key */
const DENIED_SOUND_KEY = 'puzzle.18.negative_pop_01';

/**
 * 播放操作被拒绝的反馈音效
 * 用于用户尝试执行不合法操作时（如不是自己的回合、条件不满足等）
 */
export function playDeniedSound(): void {
    playSound(DENIED_SOUND_KEY);
}

/**
 * 游戏音效 Hook
 * 自动监听游戏状态变化并触发音效
 */
export function useGameAudio<G, Ctx = unknown, Meta extends Record<string, unknown> = Record<string, unknown>>({
    config,
    gameId,
    G,
    ctx,
    eventEntries,
    meta,
}: UseGameAudioOptions<G, Ctx, Meta>): void {
    const initializedRef = useRef(false);
    const prevRuntimeRef = useRef<AudioRuntimeContext<G, Ctx, Meta> | null>(null);
    const lastLogSignatureRef = useRef<string | null>(null);
    const currentBgmKeyRef = useRef<string | null>(null);
    const currentBgmGroupRef = useRef<BgmGroupId | null>(null);
    const { setPlaylist, playBgm, stopBgm, bgmSelections, setActiveBgmContext } = useAudio();
    const [registryLoaded, setRegistryLoaded] = useState(false);
    const eventEntriesVersion = (() => {
        if (!eventEntries || eventEntries.length === 0) return 0;
        const lastSignature = getLogEntrySignature(eventEntries[eventEntries.length - 1]);
        return lastSignature ?? eventEntries.length;
    })();

    const runtimeContext: AudioRuntimeContext<G, Ctx, Meta> = { G, ctx, meta };

    const bgmDefinitionMap = useMemo(() => {
        return new Map((config.bgm ?? []).map((def) => [def.key, def]));
    }, [config.bgm]);

    const resolveFallbackGroup = useCallback((): BgmGroupId => {
        if (config.bgmGroups) {
            if (config.bgmGroups.normal) return 'normal';
            const firstGroup = Object.keys(config.bgmGroups)[0];
            if (firstGroup) return firstGroup as BgmGroupId;
        }
        return 'normal';
    }, [config.bgmGroups]);

    const resolveBgmPlan = useCallback(() => {
        const allBgm = config.bgm ?? [];
        if (allBgm.length === 0) {
            return {
                activeGroup: null as BgmGroupId | null,
                playlist: [] as BgmDefinition[],
                targetKey: null as string | null,
            };
        }

        const allKeys = allBgm.map((def) => def.key);
        const fallbackGroup = resolveFallbackGroup();
        const activeGroup = resolveBgmGroup(runtimeContext, config.bgmRules, fallbackGroup);
        const groupKeys = config.bgmGroups?.[activeGroup] ?? allKeys;
        const effectiveKeys = groupKeys.length > 0 ? groupKeys : allKeys;
        const playlist = effectiveKeys
            .map((key) => bgmDefinitionMap.get(key))
            .filter((entry): entry is BgmDefinition => !!entry);
        const fallbackKeyFromGroup = effectiveKeys.find((key) => allKeys.includes(key)) ?? allKeys[0] ?? null;
        const resolvedKey = resolveBgmKey(runtimeContext, config.bgmRules, null);
        const safeFallbackKey = resolvedKey && effectiveKeys.includes(resolvedKey)
            ? resolvedKey
            : fallbackKeyFromGroup;
        const selection = gameId ? bgmSelections?.[gameId]?.[activeGroup] : undefined;
        const candidateKey = selection && effectiveKeys.includes(selection) ? selection : safeFallbackKey;
        const targetKey = candidateKey && allKeys.includes(candidateKey)
            ? candidateKey
            : fallbackKeyFromGroup;

        return { activeGroup, playlist, targetKey };
    }, [bgmDefinitionMap, bgmSelections, config.bgm, config.bgmGroups, config.bgmRules, gameId, resolveFallbackGroup, runtimeContext]);

    useEffect(() => {
        let active = true;
        loadCommonAudioRegistry()
            .then((registry) => {
                if (!active) return;
                AudioManager.registerRegistryEntries(registry.entries, COMMON_AUDIO_BASE_PATH);
                setRegistryLoaded(true);

                // P1: 立即预加载关键音效，消除首次播放延迟
                if (config.criticalSounds && config.criticalSounds.length > 0) {
                    AudioManager.preloadKeys(config.criticalSounds);
                }
            })
            .catch((error) => {
                console.error('[AudioRegistry] 通用音频注册表加载失败', error);
            });

        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        if (!registryLoaded) return;
        if (!initializedRef.current) {
            AudioManager.initialize();

            // 仅登记游戏层配置（BGM/自定义音效）
            AudioManager.registerAll(config, config.basePath || '');

            // 刷新后跳过历史事件，避免重放所有历史音效
            if (eventEntries && eventEntries.length > 0) {
                const lastSignature = getLogEntrySignature(eventEntries[eventEntries.length - 1]);
                if (lastSignature) {
                    lastLogSignatureRef.current = lastSignature;
                }
            }

            const { activeGroup, playlist, targetKey } = resolveBgmPlan();
            setPlaylist(playlist);
            if (gameId && activeGroup) {
                setActiveBgmContext(gameId, activeGroup);
                currentBgmGroupRef.current = activeGroup;
            }
            if (targetKey) {
                playBgm(targetKey);
                currentBgmKeyRef.current = targetKey;
            } else {
                stopBgm();
            }

            initializedRef.current = true;
        }
    }, [
        registryLoaded,
        config,
        runtimeContext,
        setPlaylist,
        playBgm,
        stopBgm,
        eventEntriesVersion,
        resolveBgmPlan,
        gameId,
        setActiveBgmContext,
    ]);

    useEffect(() => {
        if (!initializedRef.current || !registryLoaded) return;
        if (!config.bgm || config.bgm.length === 0) return;

        const { activeGroup, playlist, targetKey } = resolveBgmPlan();
        if (gameId && activeGroup && currentBgmGroupRef.current !== activeGroup) {
            setActiveBgmContext(gameId, activeGroup);
            currentBgmGroupRef.current = activeGroup;
        }
        if (playlist.length > 0) {
            setPlaylist(playlist);
        }

        if (!targetKey) {
            stopBgm();
            currentBgmKeyRef.current = null;
            return;
        }

        if (currentBgmKeyRef.current !== targetKey) {
            playBgm(targetKey);
            currentBgmKeyRef.current = targetKey;
        }
    }, [
        registryLoaded,
        config.bgm,
        config.bgmRules,
        runtimeContext,
        playBgm,
        stopBgm,
        resolveBgmPlan,
        gameId,
        setActiveBgmContext,
        setPlaylist,
    ]);

    useEffect(() => {
        if (!registryLoaded) return;
        const safeEntries = eventEntries ?? [];
        const totalEntries = safeEntries.length;
        if (totalEntries === 0) {
            return;
        }

        let startIndex = 0;
        if (lastLogSignatureRef.current) {
            const lastIndex = findLastLogEntryIndex(safeEntries, lastLogSignatureRef.current);
            if (lastIndex >= 0) {
                startIndex = lastIndex + 1;
            }
        }

        const newEntries = safeEntries.slice(startIndex);
        if (safeEntries.length > 0) {
            lastLogSignatureRef.current = getLogEntrySignature(safeEntries[safeEntries.length - 1]);
        }

        for (const entry of newEntries) {
            const event = resolveAudioEvent(entry, config.eventSelector);
            if (!event) {
                continue;
            }
            const key = resolveAudioKey(
                event,
                runtimeContext,
                config,
                (category) => AudioManager.resolveCategoryKey(category)
            );
            if (key) {
                playSound(key);
            }
        }
    }, [registryLoaded, eventEntriesVersion, config, runtimeContext]);

    useEffect(() => {
        if (!registryLoaded) return;
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
    }, [registryLoaded, config.stateTriggers, runtimeContext]);

    useEffect(() => (
        () => {
            setPlaylist([]);
            stopBgm();
            AudioManager.stopBgm();
            currentBgmKeyRef.current = null;
            currentBgmGroupRef.current = null;
            setActiveBgmContext(null, null);
        }
    ), [setPlaylist, stopBgm, setActiveBgmContext]);
}
