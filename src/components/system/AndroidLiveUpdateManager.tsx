import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useToast } from '../../contexts/ToastContext';
import { AndroidForceUpdateGate } from './AndroidForceUpdateGate';
import { isNativeAndroidRuntime } from '../../lib/mobile/androidRuntime';
import {
    type AndroidForceUpdateState,
    registerAndroidLiveUpdateListeners,
    subscribeAndroidLiveUpdateRequests,
    startAndroidLiveUpdateBackgroundCheck,
} from '../../lib/mobile/androidLiveUpdates';

const autoNotifiedBackgroundOtaVersions = new Set<string>();

export const AndroidLiveUpdateManager = () => {
    const toast = useToast();
    const isNativeAndroid = isNativeAndroidRuntime();
    const location = useLocation();
    const [forceUpdateState, setForceUpdateState] = useState<AndroidForceUpdateState>({
        phase: 'hidden',
        blocking: false,
    });
    const toastRef = useRef(toast);
    const isGamePageRef = useRef(location.pathname.startsWith('/play/'));

    useEffect(() => {
        toastRef.current = toast;
        isGamePageRef.current = location.pathname.startsWith('/play/');
    }, [location.pathname, toast]);

    useEffect(() => {
        if (!isNativeAndroid) {
            return;
        }

        let disposed = false;

        void registerAndroidLiveUpdateListeners();

        const handleResult = (
            result: Awaited<ReturnType<typeof startAndroidLiveUpdateBackgroundCheck>>,
            options?: { interactive?: boolean; suppressReadyToast?: boolean },
        ) => {
            if (disposed) return;

            if (result.status === 'queued') {
                if (result.mode === 'immediate') {
                    return;
                }
                if (!options?.suppressReadyToast && !autoNotifiedBackgroundOtaVersions.has(result.version)) {
                    autoNotifiedBackgroundOtaVersions.add(result.version);
                    toastRef.current.info(
                        `新版本 ${result.version} 已在后台下载完成，将在下次启动 App 时生效。`,
                        '应用更新',
                        {
                            dedupeKey: `android-ota-ready:${result.version}`,
                            ttlMs: 6000,
                        },
                    );
                }
                return;
            }

            if (result.status === 'up-to-date' && options?.interactive) {
                toastRef.current.success('当前已经是最新版本。', '应用更新', {
                    dedupeKey: 'android-ota-up-to-date',
                    ttlMs: 3000,
                });
                return;
            }

            if (result.status === 'error') {
                console.warn('[OTA] 后台检查失败', result.reason);
                if (options?.interactive) {
                    toastRef.current.error(result.reason, '应用更新');
                }
                return;
            }

            if (result.status === 'incompatible') {
                console.info('[OTA] 检测到不兼容更新，已跳过', result.reason);
            }
        };

        void startAndroidLiveUpdateBackgroundCheck({
            onForceStateChange: (state) => {
                if (disposed) return;
                setForceUpdateState(state);
            },
            applyMode: 'background',
        }).then((result) => {
            handleResult(result, { suppressReadyToast: isGamePageRef.current });
        });

        const unsubscribeRequest = subscribeAndroidLiveUpdateRequests((request) => {
            void startAndroidLiveUpdateBackgroundCheck({
                force: true,
                applyMode: request.applyMode ?? 'immediate',
                onForceStateChange: (state) => {
                    if (disposed) return;
                    setForceUpdateState(state);
                },
            }).then((result) => {
                handleResult(result, { interactive: request.interactive, suppressReadyToast: false });
            });
        });

        return () => {
            disposed = true;
            unsubscribeRequest();
        };
    }, [isNativeAndroid]);

    if (!isNativeAndroid) {
        return null;
    }

    return (
        <AndroidForceUpdateGate
            state={forceUpdateState}
            onRetry={() => {
                void startAndroidLiveUpdateBackgroundCheck({
                    force: true,
                    applyMode: 'immediate',
                    onForceStateChange: (state) => {
                        setForceUpdateState(state);
                    },
                });
            }}
        />
    );
};
