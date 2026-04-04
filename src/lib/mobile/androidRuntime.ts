import { Capacitor } from '@capacitor/core';

type CapacitorRuntimeLike = {
    getPlatform?: () => string;
    isNativePlatform?: () => boolean;
};

type AndroidRuntimeWindowLike = {
    Capacitor?: CapacitorRuntimeLike;
    androidBridge?: unknown;
};

const safeInvoke = <T,>(fn: () => T): T | undefined => {
    try {
        return fn();
    } catch {
        return undefined;
    }
};

export const isAndroidShellBuildMode = (env: Partial<ImportMetaEnv> = import.meta.env) => env.MODE === 'android';

export const detectNativeAndroidRuntime = (options?: {
    capacitor?: CapacitorRuntimeLike;
    windowObject?: AndroidRuntimeWindowLike | undefined;
}) => {
    const capacitorRuntime = options?.capacitor ?? Capacitor;
    const runtimeWindow = options?.windowObject ?? (
        typeof window !== 'undefined'
            ? window as typeof window & AndroidRuntimeWindowLike
            : undefined
    );

    const importCapacitorPlatform = safeInvoke(() => capacitorRuntime.getPlatform?.());
    const importCapacitorNative = safeInvoke(() => capacitorRuntime.isNativePlatform?.());
    const windowCapacitorPlatform = safeInvoke(() => runtimeWindow?.Capacitor?.getPlatform?.());
    const windowCapacitorNative = safeInvoke(() => runtimeWindow?.Capacitor?.isNativePlatform?.());
    const hasAndroidBridge = Boolean(runtimeWindow?.androidBridge);

    return Boolean(
        hasAndroidBridge
        || (importCapacitorNative && importCapacitorPlatform === 'android')
        || (windowCapacitorNative && windowCapacitorPlatform === 'android'),
    );
};

export const isNativeAndroidRuntime = () => detectNativeAndroidRuntime();
