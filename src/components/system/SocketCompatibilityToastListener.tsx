import { useEffect, useRef } from 'react';
import { useToast } from '../../contexts/ToastContext';
import { lobbySocket } from '../../services/lobbySocket';
import { socialSocket } from '../../services/socialSocket';
import {
    canToggleSocketCompatibilityMode,
    isSocketCompatibilityModeEnabled,
    setSocketCompatibilityModeEnabled,
} from '../../services/socketConnectionConfig';

const COMPATIBILITY_ERROR_PATTERNS = [
    'websocket',
    'transport',
    'handshake',
    'timeout',
    'ping timeout',
];

const isLikelyCompatibilityError = (message?: string): boolean => {
    if (!message) {
        return false;
    }

    const normalizedMessage = message.toLowerCase();
    return COMPATIBILITY_ERROR_PATTERNS.some((pattern) => normalizedMessage.includes(pattern));
};

export const SocketCompatibilityToastListener = () => {
    const { info, warning } = useToast();
    const hasAutoEnabledRef = useRef(false);

    useEffect(() => {
        if (!canToggleSocketCompatibilityMode()) {
            return;
        }

        const reconnectSockets = () => {
            lobbySocket.reconnectWithCurrentSettings();
            socialSocket.reconnectWithCurrentSettings();
        };

        const handleAutoEnableCompatibilityMode = () => {
            hasAutoEnabledRef.current = true;
            setSocketCompatibilityModeEnabled(true);
            reconnectSockets();
            warning(
                { kind: 'i18n', ns: 'common', key: 'socketCompatibility.description' },
                { kind: 'i18n', ns: 'common', key: 'socketCompatibility.title' },
                {
                    dedupeKey: 'socketCompatibility.autoEnabled',
                    ttlMs: 15_000,
                    actions: [{
                        label: { kind: 'i18n', ns: 'common', key: 'socketCompatibility.disable' },
                        variant: 'secondary',
                        onClick: () => {
                            setSocketCompatibilityModeEnabled(false);
                            reconnectSockets();
                            info(
                                { kind: 'i18n', ns: 'common', key: 'socketCompatibility.disabledDescription' },
                                { kind: 'i18n', ns: 'common', key: 'socketCompatibility.disabledTitle' },
                                { dedupeKey: 'socketCompatibility.disabled' }
                            );
                        },
                    }],
                }
            );
        };

        const unsubscribe = lobbySocket.subscribeStatus((status) => {
            if (
                status.connected
                || isSocketCompatibilityModeEnabled()
                || hasAutoEnabledRef.current
                || !isLikelyCompatibilityError(status.lastError)
            ) {
                return;
            }

            handleAutoEnableCompatibilityMode();
        });

        return unsubscribe;
    }, [info, warning]);

    return null;
};
