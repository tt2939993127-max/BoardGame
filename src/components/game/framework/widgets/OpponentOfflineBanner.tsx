import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { UI_Z_INDEX } from '../../../../core';

interface OpponentOfflineBannerProps {
    /** 对手是否在线 */
    connected: boolean;
    /** 对手名称 */
    name?: string | null;
}

/**
 * 对手离线倒计时横幅
 *
 * 当对手 WebSocket 断开后，显示"对手已离线 Xs"的浮动提示。
 * 重连后自动消失。设置 3 秒延迟避免短暂网络抖动误触发。
 */
export const OpponentOfflineBanner = ({ connected, name }: OpponentOfflineBannerProps) => {
    const { t } = useTranslation('game');
    const [visible, setVisible] = useState(false);
    const [elapsed, setElapsed] = useState(0);
    const disconnectTimeRef = useRef<number | null>(null);
    const delayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const tickTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (!connected) {
            // 记录断线时间，延迟 3 秒后才显示（过滤短暂抖动）
            disconnectTimeRef.current = Date.now();
            delayTimerRef.current = setTimeout(() => {
                setVisible(true);
                // 每秒更新计时
                tickTimerRef.current = setInterval(() => {
                    if (disconnectTimeRef.current) {
                        setElapsed(Math.floor((Date.now() - disconnectTimeRef.current) / 1000));
                    }
                }, 1000);
            }, 3000);
        } else {
            // 重连：清理所有定时器，隐藏横幅
            if (delayTimerRef.current) clearTimeout(delayTimerRef.current);
            if (tickTimerRef.current) clearInterval(tickTimerRef.current);
            delayTimerRef.current = null;
            tickTimerRef.current = null;
            disconnectTimeRef.current = null;
            setVisible(false);
            setElapsed(0);
        }

        return () => {
            if (delayTimerRef.current) clearTimeout(delayTimerRef.current);
            if (tickTimerRef.current) clearInterval(tickTimerRef.current);
        };
    }, [connected]);

    if (!visible) return null;

    const label = name || t('hud.status.opponent');
    const timeText = elapsed < 60
        ? t('hud.offlineBanner.seconds', { count: elapsed })
        : t('hud.offlineBanner.minutes', { count: Math.floor(elapsed / 60) });

    return (
        <div
            className="fixed top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg
                bg-red-900/80 backdrop-blur-sm border border-red-500/40
                text-red-200 text-sm font-medium shadow-lg
                animate-in fade-in slide-in-from-top-2 duration-300"
            style={{ zIndex: UI_Z_INDEX.overlayRaised }}
            role="status"
            aria-live="polite"
        >
            <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span>{t('hud.offlineBanner.message', { name: label, time: timeText })}</span>
            </div>
        </div>
    );
};
