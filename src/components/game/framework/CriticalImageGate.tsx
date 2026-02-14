import React, { useEffect, useMemo, useRef, useState } from 'react';
import { LoadingScreen } from '../../system/LoadingScreen';
import { preloadCriticalImages, preloadWarmImages } from '../../../core';
import { resolveCriticalImages } from '../../../core/CriticalImageResolverRegistry';

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
 *
 * 通过 resolver 返回的 phaseKey 感知游戏阶段变化，
 * 阶段切换时会重新触发预加载（如 factionSelect → playing）。
 *
 * 关键设计：phaseKey 变化时同步立即阻塞（不等 useEffect），
 * 避免 Board 在资源未就绪时渲染一帧导致卡图不完整。
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
    const gameStateRef = useRef(gameState);
    const stateKey = gameState ? 'ready' : 'empty';

    const phaseKey = useMemo(() => {
        if (!enabled || !gameId || !gameState) return '';
        const resolved = resolveCriticalImages(gameId, gameState, locale);
        return resolved.phaseKey ?? '';
    }, [enabled, gameId, gameState, locale]);

    const runKey = `${gameId ?? ''}:${locale ?? ''}:${phaseKey}:${stateKey}`;

    // 同步判断：runKey 变了但还没完成预加载 → 立即阻塞
    // 这比 useEffect 里的 setReady(false) 更早生效，避免 children 渲染一帧
    const needsPreload = enabled && !!gameId && stateKey === 'ready'
        && lastReadyKeyRef.current !== runKey;

    useEffect(() => {
        gameStateRef.current = gameState;
    }, [gameState]);

    useEffect(() => {
        if (!enabled || !gameId) {
            setReady(true);
            inFlightRef.current = false;
            lastReadyKeyRef.current = null;
            return;
        }
        if (stateKey !== 'ready') {
            return;
        }
        if (inFlightRef.current) {
            return;
        }

        if (lastReadyKeyRef.current === runKey) {
            return;
        }

        const currentState = gameStateRef.current;
        if (!currentState) {
            return;
        }

        console.warn(`[CriticalImageGate] starting preload for gameId=${gameId} phaseKey=${phaseKey}`);
        inFlightRef.current = true;
        setReady(false);
        preloadCriticalImages(gameId, currentState, locale)
            .then((warmPaths) => {
                console.warn(`[CriticalImageGate] preload complete, setting ready=true`);
                lastReadyKeyRef.current = runKey;
                setReady(true);
                preloadWarmImages(warmPaths);
            })
            .catch((err) => {
                console.warn(`[CriticalImageGate] preload failed, setting ready=true anyway`, err);
                lastReadyKeyRef.current = runKey;
                setReady(true);
            })
            .finally(() => {
                inFlightRef.current = false;
            });
    }, [enabled, gameId, locale, phaseKey, runKey, stateKey]);

    // needsPreload 同步阻塞：phaseKey 变化的同一渲染帧就拦住，不泄漏一帧给 children
    if (!ready || needsPreload) {
        return <LoadingScreen description={loadingDescription} />;
    }

    return <>{children}</>;
};
