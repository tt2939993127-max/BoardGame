import React, { useEffect, useRef, useState } from 'react';
import { LoadingScreen } from '../../system/LoadingScreen';
import { preloadCriticalImages, preloadWarmImages } from '../../../core';

export interface CriticalImageGateProps {
    gameId?: string;
    gameState?: unknown;
    locale?: string;
    enabled?: boolean;
    loadingDescription?: string;
    children: React.ReactNode;
}

/**
 * 关键图片预加载门禁
 * 在关键资源加载完成前，阻塞棋盘渲染。
 */
export const CriticalImageGate: React.FC<CriticalImageGateProps> = ({
    gameId,
    gameState,
    locale,
    enabled = true,
    loadingDescription,
    children,
}) => {
    const [ready, setReady] = useState(!enabled);
    const inFlightRef = useRef(false);
    const lastReadyKeyRef = useRef<string | null>(null);

    useEffect(() => {
        if (!enabled || !gameId) {
            setReady(true);
            inFlightRef.current = false;
            lastReadyKeyRef.current = null;
            return;
        }
        if (!gameState) return;
        if (inFlightRef.current) return;

        const runKey = `${gameId}:${locale ?? ''}`;
        if (lastReadyKeyRef.current === runKey) return;

        inFlightRef.current = true;
        setReady(false);
        preloadCriticalImages(gameId, gameState, locale)
            .then((warmPaths) => {
                lastReadyKeyRef.current = runKey;
                setReady(true);
                preloadWarmImages(warmPaths);
            })
            .catch(() => {
                lastReadyKeyRef.current = runKey;
                setReady(true);
            })
            .finally(() => {
                inFlightRef.current = false;
            });
        // 不需要 cleanup 取消：inFlightRef 控制并发，
        // lastReadyKeyRef 保证同一游戏已完成后不会重复触发。
    }, [enabled, gameId, gameState, locale]);

    if (!ready) {
        return <LoadingScreen description={loadingDescription} />;
    }

    return <>{children}</>;
};
