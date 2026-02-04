import type { AudioEvent, AudioRuntimeContext, BgmRule, GameAudioConfig, SoundKey } from './types';

export function resolveEventSoundKey<
    G = unknown,
    Ctx = unknown,
    Meta extends Record<string, unknown> = Record<string, unknown>
>(
    event: AudioEvent,
    context: AudioRuntimeContext<G, Ctx, Meta>,
    config: GameAudioConfig
): SoundKey | null {
    if (event.sfxKey) return event.sfxKey;

    const resolved = config.eventSoundResolver?.(event, context);
    if (resolved !== undefined) {
        return resolved ?? null;
    }

    return config.eventSoundMap?.[event.type] ?? null;
}

export function resolveBgmKey<
    G = unknown,
    Ctx = unknown,
    Meta extends Record<string, unknown> = Record<string, unknown>
>(
    context: AudioRuntimeContext<G, Ctx, Meta>,
    rules: Array<BgmRule<G, Ctx, Meta>> | undefined,
    fallbackKey: string | null
): string | null {
    if (rules && rules.length > 0) {
        for (const rule of rules) {
            if (rule.when(context)) return rule.key;
        }
    }

    return fallbackKey ?? null;
}

export function resolveAudioEvent(
    entry: unknown,
    selector?: (entry: unknown) => AudioEvent | null | undefined
): AudioEvent | null {
    if (selector) return selector(entry) ?? null;
    if (!entry || typeof entry !== 'object') return null;

    const maybeEntry = entry as { type?: string; data?: unknown };
    if (maybeEntry.type === 'event' && maybeEntry.data && typeof maybeEntry.data === 'object') {
        const data = maybeEntry.data as { type?: string };
        if (typeof data.type === 'string') {
            return data as AudioEvent;
        }
    }

    return null;
}
