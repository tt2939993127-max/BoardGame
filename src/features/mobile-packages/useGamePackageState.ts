import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { GameManifestMobileDelivery } from '../../games/manifest.types';
import { logMobileRuntime, logMobileRuntimeCritical } from '../../lib/mobile/mobileRuntimeDebug';
import { onAppVisible } from '../../lib/mobile/appVisibility';
import {
    buildFallbackGamePackageManifest,
    hasRemoteGamePackageManifestEndpoint,
    resolveGamePackageManifest,
} from './manifestClient';
import {
    refreshGamePackageStateFromNativeTask,
    resetGamePackageState,
    startGamePackageInstall,
    subscribeGamePackageState,
    syncGamePackageState,
} from './packageManagerService';
import type { GamePackageCardState, PendingGamePackageInstall, ResolvedGamePackageManifest } from './types';
import { createDefaultGamePackageState, hasUsableInstalledGamePackageVersion, toGamePackageCardState } from './types';

interface UseGamePackageStateOptions {
    gameId: string;
    gameName: string;
    delivery?: GameManifestMobileDelivery;
    enabled?: boolean;
}

interface UseGamePackageStateResult {
    isPackageManaged: boolean;
    cardState: GamePackageCardState;
    pendingInstall: PendingGamePackageInstall | null;
    isConfirmingInstall: boolean;
    requestInstall: () => void;
    cancelInstall: () => void;
    confirmInstall: () => Promise<void>;
    retryInstall: () => void;
}

const mergeManifestIntoCardState = (
    state: GamePackageCardState,
    manifest?: ResolvedGamePackageManifest | null,
): GamePackageCardState => {
    if (!manifest) {
        return state;
    }

    return {
        ...state,
        modulePackId: state.modulePackId ?? manifest.modulePackId,
        assetPackId: state.assetPackId ?? manifest.assetPackId,
        manifestSource: manifest.source,
        modulePackUrl: state.modulePackUrl ?? manifest.modulePackUrl,
        assetPackUrl: state.assetPackUrl ?? manifest.assetPackUrl,
        modulePackBytes: state.modulePackBytes ?? manifest.modulePackBytes,
        assetPackBytes: state.assetPackBytes ?? manifest.assetPackBytes,
    };
};

export const useGamePackageState = ({
    gameId,
    gameName,
    delivery,
    enabled = true,
}: UseGamePackageStateOptions): UseGamePackageStateResult => {
    const { t } = useTranslation('lobby');
    const normalizedDelivery = useMemo(() => {
        if (!delivery) {
            return undefined;
        }

        return {
            mode: delivery.mode,
            runtimeChannel: delivery.runtimeChannel?.trim(),
            modulePackId: delivery.modulePackId?.trim(),
            assetPackId: delivery.assetPackId?.trim(),
            modulePackBytes: delivery.modulePackBytes,
            assetPackBytes: delivery.assetPackBytes,
        } satisfies GameManifestMobileDelivery;
    }, [delivery]);
    const isPackageManaged = enabled && normalizedDelivery?.mode === 'package-managed';
    const fallbackState = useMemo(
        () => createDefaultGamePackageState(gameId, normalizedDelivery),
        [gameId, normalizedDelivery],
    );
    const fallbackManifest = useMemo(
        () => buildFallbackGamePackageManifest(gameId, normalizedDelivery),
        [gameId, normalizedDelivery],
    );
    const [cardState, setCardState] = useState<GamePackageCardState>(() =>
        toGamePackageCardState(
            isPackageManaged
                ? syncGamePackageState(gameId, fallbackState)
                : fallbackState,
        ),
    );
    const [pendingInstall, setPendingInstall] = useState<PendingGamePackageInstall | null>(null);
    const [isConfirmingInstall, setIsConfirmingInstall] = useState(false);
    const [previewManifest, setPreviewManifest] = useState<ResolvedGamePackageManifest | null>(null);
    const requestSerialRef = useRef(0);
    const confirmInFlightRef = useRef(false);

    useEffect(() => {
        logMobileRuntime('UseGamePackageState', 'hook-init', {
            gameId,
            gameName,
            enabled,
            isPackageManaged,
            delivery: normalizedDelivery,
            fallbackManifest,
        });
    }, [enabled, fallbackManifest, gameId, gameName, isPackageManaged, normalizedDelivery]);

    useEffect(() => {
        if (!isPackageManaged) {
            logMobileRuntime('UseGamePackageState', 'disable-package-managed', {
                gameId,
                fallbackState,
            });
            setPreviewManifest(null);
            setPendingInstall(null);
            setCardState(toGamePackageCardState(fallbackState));
            return;
        }

        logMobileRuntime('UseGamePackageState', 'sync-package-state', {
            gameId,
            fallbackState,
        });
        setPendingInstall(null);
        setCardState(toGamePackageCardState(syncGamePackageState(gameId, fallbackState)));
        void refreshGamePackageStateFromNativeTask(gameId, fallbackState).catch((error) => {
            logMobileRuntime('UseGamePackageState', 'refresh-native-state-failed', {
                gameId,
                error: error instanceof Error ? error.message : String(error),
            }, 'warn');
        });

        const cleanupVisible = onAppVisible(() => {
            void refreshGamePackageStateFromNativeTask(gameId, fallbackState).catch((error) => {
                logMobileRuntime('UseGamePackageState', 'refresh-native-state-on-visible-failed', {
                    gameId,
                    error: error instanceof Error ? error.message : String(error),
                }, 'warn');
            });
        });

        const unsubscribeState = subscribeGamePackageState(gameId, (state) => {
            logMobileRuntime('UseGamePackageState', 'subscribe-state-changed', {
                gameId,
                state,
            });
            setCardState(toGamePackageCardState(state));
        });

        return () => {
            cleanupVisible();
            unsubscribeState();
        };
    }, [fallbackState, gameId, isPackageManaged]);

    useEffect(() => {
        if (!isPackageManaged || !hasRemoteGamePackageManifestEndpoint) {
            setPreviewManifest(null);
            return;
        }

        let isDisposed = false;
        setPreviewManifest(null);

        void resolveGamePackageManifest(gameId, normalizedDelivery).then((resolvedManifest) => {
            if (isDisposed) {
                return;
            }

            logMobileRuntime('UseGamePackageState', 'preview-manifest-resolved', {
                gameId,
                resolvedManifest,
            });
            setPreviewManifest(resolvedManifest);
        });

        return () => {
            isDisposed = true;
        };
    }, [gameId, isPackageManaged, normalizedDelivery]);

    useEffect(() => {
        if (!pendingInstall) {
            return;
        }

        if (cardState.status !== 'installed' || !hasUsableInstalledGamePackageVersion(cardState.installedVersion)) {
            return;
        }

        requestSerialRef.current += 1;
        setPendingInstall(null);
        confirmInFlightRef.current = false;
        setIsConfirmingInstall(false);
    }, [cardState.installedVersion, cardState.status, pendingInstall]);

    const displayCardState = useMemo(
        () => ({
            ...mergeManifestIntoCardState(cardState, previewManifest ?? fallbackManifest),
            previewResolved: Boolean(previewManifest),
        }),
        [cardState, fallbackManifest, previewManifest],
    );

    const requestInstall = useCallback(() => {
        logMobileRuntimeCritical('UseGamePackageState', 'request-install-clicked', {
            gameId,
            isPackageManaged,
        });
        if (!isPackageManaged) {
            logMobileRuntime('UseGamePackageState', 'request-install-skipped', {
                gameId,
                reason: 'not-package-managed',
            }, 'warn');
            return;
        }

        const requestSerial = requestSerialRef.current + 1;
        requestSerialRef.current = requestSerial;
        logMobileRuntime('UseGamePackageState', 'request-install', {
            gameId,
            requestSerial,
            fallbackManifest,
            previewManifest,
        });
        const initialInstallManifest = previewManifest ?? fallbackManifest;
        setPendingInstall({
            gameName,
            ...initialInstallManifest,
        });

        if (!hasRemoteGamePackageManifestEndpoint) {
            logMobileRuntime('UseGamePackageState', 'request-install-no-remote-endpoint', {
                gameId,
                requestSerial,
            }, 'warn');
            return;
        }

        if (previewManifest?.source === 'remote') {
            logMobileRuntime('UseGamePackageState', 'request-install-use-preview-manifest', {
                gameId,
                requestSerial,
                hasAssetPackUrl: Boolean(previewManifest.assetPackUrl),
            });
            return;
        }

        void resolveGamePackageManifest(gameId, normalizedDelivery).then((resolvedManifest) => {
            logMobileRuntime('UseGamePackageState', 'request-install-remote-manifest-resolved', {
                gameId,
                requestSerial,
                resolvedManifest,
            });
            setPendingInstall((current) => {
                if (!current || requestSerialRef.current !== requestSerial) {
                    logMobileRuntime('UseGamePackageState', 'request-install-remote-manifest-stale', {
                        gameId,
                        requestSerial,
                        currentExists: Boolean(current),
                        latestRequestSerial: requestSerialRef.current,
                    }, 'warn');
                    return current;
                }

                return {
                    gameName,
                    ...resolvedManifest,
                };
            });
        });
    }, [fallbackManifest, gameId, gameName, isPackageManaged, normalizedDelivery, previewManifest]);

    const cancelInstall = useCallback(() => {
        requestSerialRef.current += 1;
        logMobileRuntime('UseGamePackageState', 'cancel-install', {
            gameId,
            latestRequestSerial: requestSerialRef.current,
        });
        setPendingInstall(null);
    }, [gameId]);

    const confirmInstall = useCallback(async () => {
        logMobileRuntimeCritical('UseGamePackageState', 'confirm-install-clicked', {
            gameId,
            hasPendingInstall: Boolean(pendingInstall),
            isConfirmingInstall,
            confirmInFlight: confirmInFlightRef.current,
        });
        if (confirmInFlightRef.current || isConfirmingInstall) {
            logMobileRuntimeCritical('UseGamePackageState', 'confirm-install-ignored', {
                gameId,
                reason: confirmInFlightRef.current ? 'confirm-ref-locked' : 'already-confirming',
            });
            return;
        }
        if (!pendingInstall) {
            logMobileRuntime('UseGamePackageState', 'confirm-install-skipped', {
                gameId,
                reason: 'no-pending-install',
            }, 'warn');
            return;
        }

        confirmInFlightRef.current = true;
        setIsConfirmingInstall(true);
        let installManifest = pendingInstall;

        try {
            logMobileRuntimeCritical('UseGamePackageState', 'confirm-install-started', {
                gameId,
                manifestSource: installManifest.source,
                hasAssetPackUrl: Boolean(installManifest.assetPackUrl),
            });

            if (!installManifest.assetPackUrl && hasRemoteGamePackageManifestEndpoint) {
                logMobileRuntimeCritical('UseGamePackageState', 'confirm-install-re-resolve', {
                    gameId,
                    reason: 'missing-asset-pack-url',
                });
                try {
                    const resolved = await resolveGamePackageManifest(gameId, normalizedDelivery);
                    installManifest = { ...installManifest, ...resolved };
                    setPendingInstall(installManifest);
                    logMobileRuntimeCritical('UseGamePackageState', 'confirm-install-manifest-resolved', {
                        gameId,
                        manifestSource: installManifest.source,
                        hasAssetPackUrl: Boolean(installManifest.assetPackUrl),
                        assetPackVersion: installManifest.assetPackVersion,
                    });
                } catch {
                    logMobileRuntimeCritical('UseGamePackageState', 'confirm-install-re-resolve-failed', { gameId });
                }
            }

            if (!installManifest.assetPackUrl) {
                logMobileRuntimeCritical('UseGamePackageState', 'confirm-install-manifest-still-missing-url', {
                    gameId,
                    manifestSource: installManifest.source,
                    assetPackId: installManifest.assetPackId,
                    assetPackVersion: installManifest.assetPackVersion,
                });
            }

            logMobileRuntimeCritical('UseGamePackageState', 'confirm-install-start-install', {
                gameId,
                manifestSource: installManifest.source,
                hasAssetPackUrl: Boolean(installManifest.assetPackUrl),
            });
            const state = await startGamePackageInstall(installManifest, t('packageManager.runtimeUnsupported'));
            logMobileRuntimeCritical('UseGamePackageState', 'confirm-install-finished', {
                gameId,
                resultStatus: state.status,
                errorMessage: state.errorMessage,
                installedVersion: state.installedVersion,
            });
        } catch (error) {
            logMobileRuntimeCritical('UseGamePackageState', 'confirm-install-rejected', {
                gameId,
                error: error instanceof Error ? error.message : String(error),
            });
        } finally {
            confirmInFlightRef.current = false;
            setIsConfirmingInstall(false);
        }
    }, [gameId, isConfirmingInstall, normalizedDelivery, pendingInstall, t]);

    const retryInstall = useCallback(() => {
        if (!isPackageManaged) {
            logMobileRuntime('UseGamePackageState', 'retry-install-skipped', {
                gameId,
                reason: 'not-package-managed',
            }, 'warn');
            return;
        }

        logMobileRuntime('UseGamePackageState', 'retry-install', {
            gameId,
            pendingInstall,
            fallbackState,
        });
        resetGamePackageState(gameId, fallbackState);
        if (pendingInstall) {
            void confirmInstall();
            return;
        }

        requestInstall();
    }, [confirmInstall, fallbackState, gameId, isPackageManaged, pendingInstall, requestInstall]);

    return {
        isPackageManaged,
        cardState: displayCardState,
        pendingInstall,
        isConfirmingInstall,
        requestInstall,
        cancelInstall,
        confirmInstall,
        retryInstall,
    };
};
