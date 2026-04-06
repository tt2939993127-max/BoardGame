import React from 'react';
import type { UISceneCompiledArtifact, UISceneRect } from '../types';

type DragMode = 'move' | 'resize';
type GuideLine = {
    orientation: 'vertical' | 'horizontal';
    position: number;
};

export interface InPageAuthoringOverlayProps {
    scene: UISceneCompiledArtifact;
    visible: boolean;
    selectedZoneId?: string | null;
    onSelectZone: (zoneId: string) => void;
    onChangeZone: (zoneId: string, rect: UISceneRect) => void;
}

type PointerSession = {
    zoneId: string;
    mode: DragMode;
    pointerId: number;
    startClientX: number;
    startClientY: number;
    startRect: UISceneRect;
};

type SnapMatch = {
    delta: number;
    guide: GuideLine;
};

function clampRect(rect: UISceneRect, scene: UISceneCompiledArtifact): UISceneRect {
    const width = Math.max(24, rect.width);
    const height = Math.max(24, rect.height);
    const x = Math.min(Math.max(0, rect.x), scene.artboard.width - width);
    const y = Math.min(Math.max(0, rect.y), scene.artboard.height - height);
    return {
        x,
        y,
        width: Math.min(width, scene.artboard.width - x),
        height: Math.min(height, scene.artboard.height - y),
    };
}

function buildVerticalTargets(scene: UISceneCompiledArtifact, currentZoneId: string) {
    const targets = [0, scene.artboard.width / 2, scene.artboard.width];

    Object.entries(scene.artboard.zones).forEach(([zoneId, rect]) => {
        if (zoneId === currentZoneId) {
            return;
        }

        targets.push(rect.x, rect.x + rect.width / 2, rect.x + rect.width);
    });

    return targets;
}

function buildHorizontalTargets(scene: UISceneCompiledArtifact, currentZoneId: string) {
    const targets = [0, scene.artboard.height / 2, scene.artboard.height];

    Object.entries(scene.artboard.zones).forEach(([zoneId, rect]) => {
        if (zoneId === currentZoneId) {
            return;
        }

        targets.push(rect.y, rect.y + rect.height / 2, rect.y + rect.height);
    });

    return targets;
}

function findBestSnap(
    candidatePositions: number[],
    targets: number[],
    threshold: number,
    orientation: GuideLine['orientation'],
): SnapMatch | null {
    let best: SnapMatch | null = null;

    candidatePositions.forEach((candidate) => {
        targets.forEach((target) => {
            const delta = target - candidate;
            if (Math.abs(delta) > threshold) {
                return;
            }

            if (!best || Math.abs(delta) < Math.abs(best.delta)) {
                best = {
                    delta,
                    guide: {
                        orientation,
                        position: target,
                    },
                };
            }
        });
    });

    return best;
}

function applySnapping(
    scene: UISceneCompiledArtifact,
    zoneId: string,
    rect: UISceneRect,
    mode: DragMode,
    thresholdX: number,
    thresholdY: number,
) {
    const verticalTargets = buildVerticalTargets(scene, zoneId);
    const horizontalTargets = buildHorizontalTargets(scene, zoneId);

    const verticalCandidates = mode === 'move'
        ? [rect.x, rect.x + rect.width / 2, rect.x + rect.width]
        : [rect.x + rect.width];
    const horizontalCandidates = mode === 'move'
        ? [rect.y, rect.y + rect.height / 2, rect.y + rect.height]
        : [rect.y + rect.height];

    const verticalSnap = findBestSnap(verticalCandidates, verticalTargets, thresholdX, 'vertical');
    const horizontalSnap = findBestSnap(horizontalCandidates, horizontalTargets, thresholdY, 'horizontal');

    let nextRect = { ...rect };
    const guides: GuideLine[] = [];

    if (verticalSnap) {
        guides.push(verticalSnap.guide);
        if (mode === 'move') {
            nextRect = {
                ...nextRect,
                x: nextRect.x + verticalSnap.delta,
            };
        } else {
            nextRect = {
                ...nextRect,
                width: nextRect.width + verticalSnap.delta,
            };
        }
    }

    if (horizontalSnap) {
        guides.push(horizontalSnap.guide);
        if (mode === 'move') {
            nextRect = {
                ...nextRect,
                y: nextRect.y + horizontalSnap.delta,
            };
        } else {
            nextRect = {
                ...nextRect,
                height: nextRect.height + horizontalSnap.delta,
            };
        }
    }

    return {
        rect: clampRect(nextRect, scene),
        guides,
    };
}

export function InPageAuthoringOverlay({
    scene,
    visible,
    selectedZoneId,
    onSelectZone,
    onChangeZone,
}: InPageAuthoringOverlayProps) {
    const dragSessionRef = React.useRef<PointerSession | null>(null);
    const rootRef = React.useRef<HTMLDivElement | null>(null);
    const [guides, setGuides] = React.useState<GuideLine[]>([]);

    React.useEffect(() => {
        if (!visible) {
            dragSessionRef.current = null;
            setGuides([]);
        }
    }, [visible]);

    React.useEffect(() => {
        if (!visible) {
            return;
        }

        const handlePointerMove = (event: PointerEvent) => {
            const session = dragSessionRef.current;
            const rootRect = rootRef.current?.getBoundingClientRect();
            if (!session) {
                return;
            }
            if (!rootRect || rootRect.width <= 0 || rootRect.height <= 0) {
                return;
            }

            const deltaX = event.clientX - session.startClientX;
            const deltaY = event.clientY - session.startClientY;
            const scaleX = scene.artboard.width / rootRect.width;
            const scaleY = scene.artboard.height / rootRect.height;
            const snapThresholdX = 10 * scaleX;
            const snapThresholdY = 10 * scaleY;

            const rawRect = session.mode === 'move'
                ? {
                    ...session.startRect,
                    x: session.startRect.x + deltaX * scaleX,
                    y: session.startRect.y + deltaY * scaleY,
                }
                : {
                    ...session.startRect,
                    width: session.startRect.width + deltaX * scaleX,
                    height: session.startRect.height + deltaY * scaleY,
                };

            const snapped = applySnapping(
                scene,
                session.zoneId,
                rawRect,
                session.mode,
                snapThresholdX,
                snapThresholdY,
            );

            setGuides(snapped.guides);
            onChangeZone(session.zoneId, snapped.rect);
        };

        const handlePointerUp = () => {
            dragSessionRef.current = null;
            setGuides([]);
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        };
    }, [onChangeZone, scene, visible]);

    if (!visible) {
        return null;
    }

    return (
        <div ref={rootRef} className="pointer-events-none absolute inset-0 z-[120]">
            {guides.map((guide, index) => (
                <div
                    key={`${guide.orientation}:${guide.position}:${index}`}
                    className="absolute bg-amber-200/80 shadow-[0_0_0_1px_rgba(253,230,138,0.22)]"
                    style={guide.orientation === 'vertical'
                        ? {
                            left: `${(guide.position / scene.artboard.width) * 100}%`,
                            top: 0,
                            width: 1,
                            height: '100%',
                        }
                        : {
                            left: 0,
                            top: `${(guide.position / scene.artboard.height) * 100}%`,
                            width: '100%',
                            height: 1,
                        }}
                />
            ))}
            {Object.entries(scene.artboard.zones).map(([zoneId, rect]) => {
                const isSelected = selectedZoneId === zoneId;
                return (
                    <div
                        key={zoneId}
                        className="pointer-events-none absolute"
                        style={{
                            left: `${(rect.x / scene.artboard.width) * 100}%`,
                            top: `${(rect.y / scene.artboard.height) * 100}%`,
                            width: `${(rect.width / scene.artboard.width) * 100}%`,
                            height: `${(rect.height / scene.artboard.height) * 100}%`,
                        }}
                    >
                        <button
                            type="button"
                            className={`pointer-events-auto absolute inset-0 rounded-[14px] border text-left transition-colors ${
                                isSelected
                                    ? 'border-amber-300 bg-amber-200/10 shadow-[0_0_0_1px_rgba(253,224,71,0.28),0_0_28px_rgba(251,191,36,0.16)]'
                                    : 'border-cyan-300/75 bg-cyan-400/8 hover:bg-cyan-400/14'
                            }`}
                            onPointerDown={(event) => {
                                event.stopPropagation();
                                dragSessionRef.current = {
                                    zoneId,
                                    mode: 'move',
                                    pointerId: event.pointerId,
                                    startClientX: event.clientX,
                                    startClientY: event.clientY,
                                    startRect: { ...rect },
                                };
                                onSelectZone(zoneId);
                            }}
                            onClick={(event) => {
                                event.stopPropagation();
                                onSelectZone(zoneId);
                            }}
                        >
                            <span className="absolute left-2 top-2 rounded-full bg-[#0d1117]/78 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-100">
                                {zoneId}
                            </span>
                        </button>
                        <button
                            type="button"
                            className="pointer-events-auto absolute bottom-0 right-0 h-4 w-4 translate-x-1/2 translate-y-1/2 rounded-full border border-amber-200 bg-[#1d130c] shadow-[0_6px_12px_rgba(0,0,0,0.25)]"
                            onPointerDown={(event) => {
                                event.stopPropagation();
                                dragSessionRef.current = {
                                    zoneId,
                                    mode: 'resize',
                                    pointerId: event.pointerId,
                                    startClientX: event.clientX,
                                    startClientY: event.clientY,
                                    startRect: { ...rect },
                                };
                                onSelectZone(zoneId);
                            }}
                        />
                    </div>
                );
            })}
        </div>
    );
}
