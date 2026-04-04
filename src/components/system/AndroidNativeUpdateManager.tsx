import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../contexts/ToastContext';
import {
    HIDDEN_ANDROID_NATIVE_UPDATE_STATE,
    checkAndroidNativeUpdateAvailability,
    continueAndroidNativeUpdateInstall,
    mapNativeUpdateEventToState,
    openAndroidUnknownSourcesSettings,
    prepareAndroidNativeUpdateInstall,
    requestAndroidNativeUpdateCheck,
    type AndroidNativeUpdateManifest,
    type AndroidNativeUpdateState,
    readAndroidNativeUpdateConfig,
    subscribeAndroidNativeUpdateRequests,
    subscribeAndroidNativeUpdateState,
} from '../../lib/mobile/androidNativeUpdates';
import { isNativeAndroidRuntime } from '../../lib/mobile/androidRuntime';
import { AndroidNativeUpdateGate } from './AndroidNativeUpdateGate';

let hasAutoStartedAndroidNativeUpdateCheck = false;

export const AndroidNativeUpdateManager = () => {
    const toast = useToast();
    const { t } = useTranslation('lobby');
    const isNativeAndroid = isNativeAndroidRuntime();
    const [state, setState] = useState<AndroidNativeUpdateState>(HIDDEN_ANDROID_NATIVE_UPDATE_STATE);
    const pendingManifestRef = useRef<AndroidNativeUpdateManifest | null>(null);
    const interactiveRef = useRef(false);
    const toastRef = useRef(toast);
    const tRef = useRef(t);

    useEffect(() => {
        toastRef.current = toast;
        tRef.current = t;
    }, [toast, t]);

    useEffect(() => {
        if (!isNativeAndroid) {
            return;
        }

        let disposed = false;
        let listenerHandlePromise: Promise<{ remove(): Promise<void> } | null> | null = null;

        const applyCheck = async (interactive = false) => {
            interactiveRef.current = interactive;
            const config = readAndroidNativeUpdateConfig();
            if (!config.enabled) {
                setState(HIDDEN_ANDROID_NATIVE_UPDATE_STATE);
                if (interactive) {
                    toastRef.current.warning(tRef.current('nativeUpdate.toast.disabled'));
                }
                return;
            }

            const availability = await checkAndroidNativeUpdateAvailability();
            if (disposed) {
                return;
            }

            if (!availability.available || !availability.manifest) {
                pendingManifestRef.current = null;
                setState(HIDDEN_ANDROID_NATIVE_UPDATE_STATE);
                if (interactive && availability.reason === 'up-to-date') {
                    toastRef.current.success(tRef.current('nativeUpdate.toast.upToDate'), '应用更新', {
                        dedupeKey: 'android-native-update:up-to-date',
                        ttlMs: 4000,
                    });
                }
                return;
            }

            pendingManifestRef.current = availability.manifest;
            const shouldBlock = availability.manifest.forceUpdate === true || interactive;

            if (!interactive && availability.manifest.forceUpdate !== true) {
                setState(HIDDEN_ANDROID_NATIVE_UPDATE_STATE);
                return;
            }

            setState({
                phase: 'checking',
                blocking: shouldBlock,
                version: availability.manifest.version,
                title: availability.manifest.forceUpdateTitle || undefined,
                message: availability.manifest.forceUpdateMessage || undefined,
            });

            try {
                const result = await prepareAndroidNativeUpdateInstall(availability.manifest);
                if (disposed) {
                    return;
                }
                if (result.status === 'installer-launched' && availability.manifest.forceUpdate !== true) {
                    toastRef.current.info(tRef.current('nativeUpdate.toast.installerOpened'), '应用更新', {
                        dedupeKey: `android-native-update:installer:${availability.manifest.version}`,
                        ttlMs: 5000,
                    });
                }
            } catch (error) {
                if (disposed) {
                    return;
                }
                setState({
                    phase: 'error',
                    blocking: shouldBlock,
                    version: availability.manifest.version,
                    reason: error instanceof Error ? error.message : String(error),
                    title: availability.manifest.forceUpdateTitle || undefined,
                    message: availability.manifest.forceUpdateMessage || undefined,
                });
            }
        };

        listenerHandlePromise = subscribeAndroidNativeUpdateState((event) => {
            if (disposed || !pendingManifestRef.current) {
                return;
            }

            const manifest = pendingManifestRef.current;
            setState(mapNativeUpdateEventToState(event, {
                blocking: manifest.forceUpdate === true || interactiveRef.current,
                title: manifest.forceUpdateTitle || undefined,
                message: manifest.forceUpdateMessage || undefined,
            }));
        });

        const unsubscribeRequest = subscribeAndroidNativeUpdateRequests((request) => {
            void applyCheck(request.interactive !== false);
        });

        if (!hasAutoStartedAndroidNativeUpdateCheck) {
            hasAutoStartedAndroidNativeUpdateCheck = true;
            void applyCheck(false);
        }

        return () => {
            disposed = true;
            unsubscribeRequest();
            if (listenerHandlePromise) {
                void listenerHandlePromise.then((handle) => handle?.remove());
            }
        };
    }, [isNativeAndroid]);

    if (!isNativeAndroid) {
        return null;
    }

    const handleRetry = () => {
        requestAndroidNativeUpdateCheck({ interactive: true });
    };

    const handleOpenSettings = () => {
        void openAndroidUnknownSourcesSettings().catch((error) => {
            toastRef.current.error(error instanceof Error ? error.message : tRef.current('nativeUpdate.toast.openSettingsFailed'));
        });
    };

    const handleContinueInstall = () => {
        const manifest = pendingManifestRef.current;
        if (!manifest) {
            toastRef.current.warning(tRef.current('nativeUpdate.toast.missingPreparedUpdate'));
            return;
        }

        void continueAndroidNativeUpdateInstall(manifest.version).catch((error) => {
            setState({
                phase: 'error',
                blocking: true,
                version: manifest.version,
                reason: error instanceof Error ? error.message : String(error),
                title: manifest.forceUpdateTitle || undefined,
                message: manifest.forceUpdateMessage || undefined,
            });
        });
    };

    return (
        <AndroidNativeUpdateGate
            state={state}
            onRetry={handleRetry}
            onOpenSettings={handleOpenSettings}
            onContinueInstall={handleContinueInstall}
        />
    );
};

export default AndroidNativeUpdateManager;
