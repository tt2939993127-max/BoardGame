import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { GameManifestMobileDelivery } from '../../games/manifest.types';
import { logMobileRuntime, logMobileRuntimeCritical } from '../../lib/mobile/mobileRuntimeDebug';
import {
    buildFallbackGamePackageManifest,
    hasRemoteGamePackageManifestEndpoint,
    resolveGamePackageManifest,
} from './manifestClient';
import { resetGamePackageState, startGamePackageInstall, subscribeGamePackageState, syncGamePackageState } from './packageManagerService';
import type { GamePackageCardState, PendingGamePackageInstall } from './types';
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
    }, [
        delivery?.assetPackBytes,
        delivery?.assetPackId,
        delivery?.mode,
        delivery?.modulePackBytes,
        delivery?.modulePackId,
        delivery?.runtimeChannel,
    ]);
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
    const requestSerialRef = useRef(0);

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

        return subscribeGamePackageState(gameId, (state) => {
            logMobileRuntime('UseGamePackageState', 'subscribe-state-changed', {
                gameId,
                state,
            });
            setCardState(toGamePackageCardState(state));
        });
    }, [fallbackState, gameId, isPackageManaged]);

    useEffect(() => {
        if (!pendingInstall) {
            return;
        }

        if (cardState.status !== 'installed' || !hasUsableInstalledGamePackageVersion(cardState.installedVersion)) {
            return;
        }

        requestSerialRef.current += 1;
        setPendingInstall(null);
        setIsConfirmingInstall(false);
    }, [cardState.status, pendingInstall]);

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
        });
        setPendingInstall({
            gameName,
            ...fallbackManifest,
        });

        if (!hasRemoteGamePackageManifestEndpoint) {
            logMobileRuntime('UseGamePackageState', 'request-install-no-remote-endpoint', {
                gameId,
                requestSerial,
            }, 'warn');
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
    }, [fallbackManifest, gameId, gameName, isPackageManaged, normalizedDelivery]);

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
        });
        if (isConfirmingInstall) {
            logMobileRuntimeCritical('UseGamePackageState', 'confirm-install-ignored', {
                gameId,
                reason: 'already-confirming',
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
        cardState,
        pendingInstall,
        isConfirmingInstall,
        requestInstall,
        cancelInstall,
        confirmInstall,
        retryInstall,
    };
};
