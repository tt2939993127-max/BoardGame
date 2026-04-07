import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type CSSProperties,
    type MouseEvent as ReactMouseEvent,
    type PointerEvent as ReactPointerEvent,
    type ReactNode,
} from 'react';
import type { GameMobileBattlefieldZoom } from '../../../games/manifest.types';

interface MobileBoardShellProps {
    children: ReactNode;
    topRail?: ReactNode;
    sideDock?: ReactNode;
    bottomRail?: ReactNode;
    battlefieldZoomMode?: GameMobileBattlefieldZoom;
}

interface MobileBattlefieldViewportProps {
    children: ReactNode;
    zoomMode?: GameMobileBattlefieldZoom;
    className?: string;
    style?: CSSProperties;
    testId?: string;
}

type Point = { clientX: number; clientY: number };
type TransformState = { scale: number; x: number; y: number };
type PinchState = {
    startDistance: number;
    startScale: number;
    startX: number;
    startY: number;
    startCenterLocal: { x: number; y: number };
};
type PanState = {
    pointerId: number;
    startPointerLocal: { x: number; y: number };
    startX: number;
    startY: number;
    moved: boolean;
};

const MIN_SCALE = 1;
const MAX_SCALE = 2.5;
const PAN_THRESHOLD_LOCAL_PX = 10;
const CLICK_SUPPRESS_MS = 320;

const getDistance = (a: Point, b: Point) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);

const clampScale = (scale: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));

const getLocalPoint = (surface: HTMLDivElement, clientX: number, clientY: number) => {
    const rect = surface.getBoundingClientRect();
    const safeWidth = Math.max(rect.width, 1);
    const safeHeight = Math.max(rect.height, 1);
    const localWidth = Math.max(surface.clientWidth, 1);
    const localHeight = Math.max(surface.clientHeight, 1);

    return {
        x: ((clientX - rect.left) / safeWidth) * localWidth,
        y: ((clientY - rect.top) / safeHeight) * localHeight,
    };
};

const clampTransform = (
    surface: HTMLDivElement | null,
    next: TransformState,
): TransformState => {
    const normalizedScale = next.scale <= 1.001 ? MIN_SCALE : next.scale;
    if (!surface || normalizedScale === MIN_SCALE) {
        return { scale: MIN_SCALE, x: 0, y: 0 };
    }

    const width = Math.max(surface.clientWidth, 1);
    const height = Math.max(surface.clientHeight, 1);
    const minX = width * (1 - normalizedScale);
    const minY = height * (1 - normalizedScale);

    return {
        scale: normalizedScale,
        x: Math.min(0, Math.max(minX, next.x)),
        y: Math.min(0, Math.max(minY, next.y)),
    };
};

const useLandscapeMobileViewport = () => {
    const [isLandscapeMobileViewport, setIsLandscapeMobileViewport] = useState(() => {
        if (typeof window === 'undefined') return false;
        return window.innerWidth <= 1023 && window.innerWidth > window.innerHeight;
    });

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        const updateViewportState = () => {
            setIsLandscapeMobileViewport(window.innerWidth <= 1023 && window.innerWidth > window.innerHeight);
        };

        updateViewportState();
        window.addEventListener('resize', updateViewportState);
        window.addEventListener('orientationchange', updateViewportState);

        return () => {
            window.removeEventListener('resize', updateViewportState);
            window.removeEventListener('orientationchange', updateViewportState);
        };
    }, []);

    return isLandscapeMobileViewport;
};

export const MobileBoardShell = ({
    children,
    topRail,
    sideDock,
    bottomRail,
    battlefieldZoomMode = 'none',
}: MobileBoardShellProps) => (
    <div
        className="mobile-board-shell"
        data-battlefield-zoom-mode={battlefieldZoomMode}
    >
        {topRail ? (
            <div className="mobile-board-shell__top-rail">
                {topRail}
            </div>
        ) : null}

        <div className="mobile-board-shell__canvas">
            <div className="mobile-board-shell__content">
                {children}
            </div>
        </div>

        {sideDock ? (
            <div className="mobile-board-shell__side-dock">
                {sideDock}
            </div>
        ) : null}

        {bottomRail ? (
            <div className="mobile-board-shell__bottom-rail">
                {bottomRail}
            </div>
        ) : null}
    </div>
);

export const MobileBattlefieldViewport = ({
    children,
    zoomMode = 'none',
    className = '',
    style,
    testId = 'mobile-battlefield-viewport',
}: MobileBattlefieldViewportProps) => {
    const surfaceRef = useRef<HTMLDivElement | null>(null);
    const pointersRef = useRef(new Map<number, Point>());
    const pinchRef = useRef<PinchState | null>(null);
    const panRef = useRef<PanState | null>(null);
    const suppressClickUntilRef = useRef(0);
    const initialTransform: TransformState = { scale: MIN_SCALE, x: 0, y: 0 };
    const transformRef = useRef<TransformState>(initialTransform);

    const [transform, setTransform] = useState<TransformState>(initialTransform);
    const isLandscapeMobileViewport = useLandscapeMobileViewport();
    const isEnabled = zoomMode === 'shell-pinch-pan' && isLandscapeMobileViewport;
    const shouldLockTouchGestures = isEnabled && transform.scale > MIN_SCALE;

    const updateTransform = useCallback((updater: TransformState | ((current: TransformState) => TransformState)) => {
        setTransform((current) => {
            const resolved = typeof updater === 'function' ? updater(current) : updater;
            const clamped = clampTransform(surfaceRef.current, resolved);
            transformRef.current = clamped;
            return clamped;
        });
    }, []);

    useEffect(() => {
        if (isEnabled) {
            return;
        }

        pointersRef.current.clear();
        pinchRef.current = null;
        panRef.current = null;
        suppressClickUntilRef.current = 0;
        transformRef.current = { scale: MIN_SCALE, x: 0, y: 0 };
        setTransform(transformRef.current);
    }, [isEnabled]);

    const beginPanFromPointer = useCallback((pointerId: number, point: Point) => {
        if (!surfaceRef.current || transformRef.current.scale <= MIN_SCALE) {
            panRef.current = null;
            return;
        }

        panRef.current = {
            pointerId,
            startPointerLocal: getLocalPoint(surfaceRef.current, point.clientX, point.clientY),
            startX: transformRef.current.x,
            startY: transformRef.current.y,
            moved: false,
        };
    }, []);

    const onPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
        if (!isEnabled || event.pointerType !== 'touch') {
            return;
        }

        const point = { clientX: event.clientX, clientY: event.clientY };
        pointersRef.current.set(event.pointerId, point);

        if (pointersRef.current.size >= 2 && surfaceRef.current) {
            const [first, second] = Array.from(pointersRef.current.values());
            pinchRef.current = {
                startDistance: Math.max(getDistance(first, second), 1),
                startScale: transformRef.current.scale,
                startX: transformRef.current.x,
                startY: transformRef.current.y,
                startCenterLocal: getLocalPoint(
                    surfaceRef.current,
                    (first.clientX + second.clientX) / 2,
                    (first.clientY + second.clientY) / 2,
                ),
            };
            panRef.current = null;
            return;
        }

        if (pointersRef.current.size === 1) {
            beginPanFromPointer(event.pointerId, point);
        }
    }, [beginPanFromPointer, isEnabled]);

    const onPointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
        if (!isEnabled || event.pointerType !== 'touch' || !surfaceRef.current) {
            return;
        }

        if (!pointersRef.current.has(event.pointerId)) {
            return;
        }

        pointersRef.current.set(event.pointerId, { clientX: event.clientX, clientY: event.clientY });

        if (pointersRef.current.size >= 2) {
            const [first, second] = Array.from(pointersRef.current.values());
            const pinch = pinchRef.current ?? {
                startDistance: Math.max(getDistance(first, second), 1),
                startScale: transformRef.current.scale,
                startX: transformRef.current.x,
                startY: transformRef.current.y,
                startCenterLocal: getLocalPoint(
                    surfaceRef.current,
                    (first.clientX + second.clientX) / 2,
                    (first.clientY + second.clientY) / 2,
                ),
            };
            pinchRef.current = pinch;

            const currentCenterLocal = getLocalPoint(
                surfaceRef.current,
                (first.clientX + second.clientX) / 2,
                (first.clientY + second.clientY) / 2,
            );
            const nextScale = clampScale(pinch.startScale * (getDistance(first, second) / pinch.startDistance));
            const scaleRatio = nextScale / pinch.startScale;

            updateTransform({
                scale: nextScale,
                x: currentCenterLocal.x - (pinch.startCenterLocal.x - pinch.startX) * scaleRatio,
                y: currentCenterLocal.y - (pinch.startCenterLocal.y - pinch.startY) * scaleRatio,
            });

            suppressClickUntilRef.current = Date.now() + CLICK_SUPPRESS_MS;
            event.preventDefault();
            event.stopPropagation();
            return;
        }

        const pan = panRef.current;
        if (!pan || pan.pointerId !== event.pointerId || transformRef.current.scale <= MIN_SCALE) {
            return;
        }

        const currentLocal = getLocalPoint(surfaceRef.current, event.clientX, event.clientY);
        const deltaX = currentLocal.x - pan.startPointerLocal.x;
        const deltaY = currentLocal.y - pan.startPointerLocal.y;
        const distance = Math.hypot(deltaX, deltaY);

        if (!pan.moved && distance < PAN_THRESHOLD_LOCAL_PX) {
            return;
        }

        pan.moved = true;
        suppressClickUntilRef.current = Date.now() + CLICK_SUPPRESS_MS;
        updateTransform({
            scale: transformRef.current.scale,
            x: pan.startX + deltaX,
            y: pan.startY + deltaY,
        });
        event.preventDefault();
        event.stopPropagation();
    }, [isEnabled, updateTransform]);

    const finishPointer = useCallback((pointerId: number) => {
        const point = pointersRef.current.get(pointerId);
        pointersRef.current.delete(pointerId);

        const pan = panRef.current;
        if (pan?.pointerId === pointerId && pan.moved) {
            suppressClickUntilRef.current = Date.now() + CLICK_SUPPRESS_MS;
        }

        if (pointersRef.current.size >= 2) {
            if (!surfaceRef.current) {
                return;
            }
            const [first, second] = Array.from(pointersRef.current.values());
            pinchRef.current = {
                startDistance: Math.max(getDistance(first, second), 1),
                startScale: transformRef.current.scale,
                startX: transformRef.current.x,
                startY: transformRef.current.y,
                startCenterLocal: getLocalPoint(
                    surfaceRef.current,
                    (first.clientX + second.clientX) / 2,
                    (first.clientY + second.clientY) / 2,
                ),
            };
            panRef.current = null;
            return;
        }

        pinchRef.current = null;

        if (pointersRef.current.size === 1) {
            const [remainingPointerId, remainingPoint] = Array.from(pointersRef.current.entries())[0];
            beginPanFromPointer(remainingPointerId, remainingPoint);
            return;
        }

        if (point) {
            panRef.current = null;
        }
    }, [beginPanFromPointer]);

    const onPointerUp = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
        if (!isEnabled || event.pointerType !== 'touch') {
            return;
        }
        finishPointer(event.pointerId);
    }, [finishPointer, isEnabled]);

    const onPointerCancel = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
        if (!isEnabled || event.pointerType !== 'touch') {
            return;
        }
        finishPointer(event.pointerId);
    }, [finishPointer, isEnabled]);

    const onClickCapture = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
        if (Date.now() < suppressClickUntilRef.current) {
            event.preventDefault();
            event.stopPropagation();
        }
    }, []);

    const stageStyle = useMemo<CSSProperties>(() => ({
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.scale})`,
        transformOrigin: '0 0',
        willChange: transform.scale > MIN_SCALE ? 'transform' : undefined,
    }), [transform.x, transform.y, transform.scale]);

    return (
        <div
            ref={surfaceRef}
            className={`mobile-battlefield-viewport${isEnabled ? ' mobile-battlefield-viewport--zoom-enabled' : ''}${shouldLockTouchGestures ? ' mobile-battlefield-viewport--gesture-lock' : ''}${className ? ` ${className}` : ''}`}
            style={style}
            data-testid={testId}
            data-battlefield-zoom-enabled={isEnabled ? 'true' : 'false'}
            data-battlefield-zoom-scale={transform.scale.toFixed(3)}
            data-battlefield-touch-mode={shouldLockTouchGestures ? 'gesture-lock' : 'native-pan'}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerCancel}
            onPointerLeave={onPointerCancel}
            onClickCapture={onClickCapture}
        >
            <div
                className="mobile-battlefield-viewport__stage"
                data-testid={`${testId}-stage`}
                style={stageStyle}
            >
                {children}
            </div>
        </div>
    );
};

export type { MobileBattlefieldViewportProps, MobileBoardShellProps };
