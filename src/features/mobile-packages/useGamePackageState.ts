import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { GameManifestMobileDelivery } from '../../games/manifest.types';
import {
    buildFallbackGamePackageManifest,
    hasRemoteGamePackageManifestEndpoint,
    resolveGamePackageManifest,
} from './manifestClient';
import { resetGamePackageState, startGamePackageInstall, subscribeGamePackageState, syncGamePackageState } from './packageManagerService';
import type { GamePackageCardState, PendingGamePackageInstall } from './types';
import { createDefaultGamePackageState, toGamePackageCardState } from './types';

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
        if (!isPackageManaged) {
            setPendingInstall(null);
            setCardState(toGamePackageCardState(fallbackState));
            return;
        }

        setPendingInstall(null);
        setCardState(toGamePackageCardState(syncGamePackageState(gameId, fallbackState)));

        return subscribeGamePackageState(gameId, (state) => {
            setCardState(toGamePackageCardState(state));
        });
    }, [fallbackState, gameId, isPackageManaged]);

    useEffect(() => {
        if (!pendingInstall) {
            return;
        }

        if (cardState.status !== 'installed') {
            return;
        }

        requestSerialRef.current += 1;
        setPendingInstall(null);
        setIsConfirmingInstall(false);
    }, [cardState.status, pendingInstall]);

    const requestInstall = useCallback(() => {
        if (!isPackageManaged) {
            return;
        }

        const requestSerial = requestSerialRef.current + 1;
        requestSerialRef.current = requestSerial;
        setPendingInstall({
            gameName,
            ...fallbackManifest,
        });

        if (!hasRemoteGamePackageManifestEndpoint) {
            return;
        }

        void resolveGamePackageManifest(gameId, normalizedDelivery).then((resolvedManifest) => {
            setPendingInstall((current) => {
                if (!current || requestSerialRef.current !== requestSerial) {
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
        setPendingInstall(null);
    }, []);

    const confirmInstall = useCallback(async () => {
        if (!pendingInstall) {
            return;
        }

        const installManifest = pendingInstall;
        setIsConfirmingInstall(true);

        try {
            void startGamePackageInstall(installManifest, t('packageManager.runtimeUnsupported'));
        } finally {
            setIsConfirmingInstall(false);
        }
    }, [pendingInstall, t]);

    const retryInstall = useCallback(() => {
        if (!isPackageManaged) {
            return;
        }

        resetGamePackageState(gameId, fallbackState);
        if (pendingInstall) {
            void startGamePackageInstall(pendingInstall, t('packageManager.runtimeUnsupported'));
            return;
        }

        requestInstall();
    }, [fallbackState, gameId, isPackageManaged, pendingInstall, requestInstall, t]);

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
