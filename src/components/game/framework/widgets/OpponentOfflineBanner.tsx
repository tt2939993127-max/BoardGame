import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { UI_Z_INDEX } from '../../../../core';

interface OpponentOfflineBannerProps {
    /** 对手是否在线 */
    connected: boolean;
    /** 对手名称（null 表示座位空着，尚未加入） */
    name?: string | null;
}

/**
 * 对手状态横幅
 *
 * 两种模式：
 * 1. 对手未加入（name 为空）→ 黄色"等待对手加入"，无倒计时，无延迟
 * 2. 对手已加入但断线（name 有值 + connected=false）→ 红色"已离线 Xs"，3 秒延迟
 */
export const OpponentOfflineBanner = ({ connected, name }: OpponentOfflineBannerProps) => {
    const { t } = useTranslation('game');
    const [offlineVisible, setOfflineVisible] = useState(false);
    const [elapsed, setElapsed] = useState(0);
    const disconnectTimeRef = useRef<number | null>(null);
    const delayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const tickTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // 对手是否已加入房间（座位上有玩家）
    const hasJoined = !!name;

    // 离线倒计时逻辑（仅对手已加入时生效）
    useEffect(() => {
        if (!hasJoined) {
            // 对手未加入，清理离线相关状态
            if (delayTimerRef.current) clearTimeout(delayTimerRef.current);
            if (tickTimerRef.current) clearInterval(tickTimerRef.current);
            delayTimerRef.current = null;
            tickTimerRef.current = null;
            disconnectTimeRef.current = null;
            setOfflineVisible(false);
            setElapsed(0);
            return;
        }

        if (!connected) {
            // 已加入但断线，延迟 3 秒后显示（过滤短暂抖动）
            disconnectTimeRef.current = Date.now();
            delayTimerRef.current = setTimeout(() => {
                setOfflineVisible(true);
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
            setOfflineVisible(false);
            setElapsed(0);
        }

        return () => {
            if (delayTimerRef.current) clearTimeout(delayTimerRef.current);
            if (tickTimerRef.current) clearInterval(tickTimerRef.current);
        };
    }, [connected, hasJoined]);

    // 模式 1：对手未加入 → 黄色等待横幅
    if (!hasJoined) {
        return (
            <div
                className="fixed top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg
                    bg-yellow-900/80 backdrop-blur-sm border border-yellow-500/40
                    text-yellow-200 text-sm font-medium shadow-lg
                    animate-in fade-in slide-in-from-top-2 duration-300"
                style={{ zIndex: UI_Z_INDEX.overlayRaised }}
                role="status"
                aria-live="polite"
            >
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                    <span>{t('hud.offlineBanner.waitingOpponent')}</span>
                </div>
            </div>
        );
    }

    // 模式 2：对手已加入但断线 → 红色离线横幅（3 秒延迟后显示）
    if (!offlineVisible) return null;

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
                <span>{t('hud.offlineBanner.message', { name, time: timeText })}</span>
            </div>
        </div>
    );
};
