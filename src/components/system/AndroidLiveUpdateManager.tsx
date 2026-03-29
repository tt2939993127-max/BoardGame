import { useEffect } from 'react';
import { useToast } from '../../contexts/ToastContext';
import {
    registerAndroidLiveUpdateListeners,
    startAndroidLiveUpdateBackgroundCheck,
} from '../../lib/mobile/androidLiveUpdates';

export const AndroidLiveUpdateManager = () => {
    const toast = useToast();

    useEffect(() => {
        let disposed = false;

        void registerAndroidLiveUpdateListeners();

        void startAndroidLiveUpdateBackgroundCheck().then((result) => {
            if (disposed) return;

            if (result.status === 'queued') {
                toast.info(
                    `新版本 ${result.version} 已在后台准备完成，切到后台或重启 App 后生效。`,
                    '应用更新',
                    {
                        dedupeKey: `android-ota-ready:${result.version}`,
                        ttlMs: 6000,
                    },
                );
                return;
            }

            if (result.status === 'error') {
                console.warn('[OTA] 后台检查失败', result.reason);
                return;
            }

            if (result.status === 'incompatible') {
                console.info('[OTA] 检测到不兼容更新，已跳过', result.reason);
            }
        });

        return () => {
            disposed = true;
        };
    }, [toast]);

    return null;
};
