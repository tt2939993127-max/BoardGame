import React from 'react';
import type { UISceneCompiledArtifact, UISceneCompiledNode, UISceneRect } from '../types';
import type { UISceneAuthoringMeta } from './authoringMeta';
import { getAuthoringNodeName } from './authoringMeta';
import { findCompiledNodeById, isContainerNode, listEditableCompiledNodes } from './sceneGraph';

type DragMode = 'move' | 'resize';
type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
type GuideLine = {
    orientation: 'vertical' | 'horizontal';
    position: number;
};
type CanvasDropTarget = {
    nodeId: string;
    rect: UISceneRect;
};
type ResizeModifierState = {
    preserveAspectRatio: boolean;
    fromCenter: boolean;
};

type HandleDefinition = {
    id: ResizeHandle;
    className: string;
    cursor: string;
};

const RESIZE_HANDLES: HandleDefinition[] = [
    { id: 'nw', className: 'left-0 top-0 -translate-x-1/2 -translate-y-1/2', cursor: 'nwse-resize' },
    { id: 'n', className: 'left-1/2 top-0 -translate-x-1/2 -translate-y-1/2', cursor: 'ns-resize' },
    { id: 'ne', className: 'right-0 top-0 translate-x-1/2 -translate-y-1/2', cursor: 'nesw-resize' },
    { id: 'e', className: 'right-0 top-1/2 translate-x-1/2 -translate-y-1/2', cursor: 'ew-resize' },
    { id: 'se', className: 'bottom-0 right-0 translate-x-1/2 translate-y-1/2', cursor: 'nwse-resize' },
    { id: 's', className: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2', cursor: 'ns-resize' },
    { id: 'sw', className: 'bottom-0 left-0 -translate-x-1/2 translate-y-1/2', cursor: 'nesw-resize' },
    { id: 'w', className: 'left-0 top-1/2 -translate-x-1/2 -translate-y-1/2', cursor: 'ew-resize' },
];

export interface InPageAuthoringOverlayProps {
    scene: UISceneCompiledArtifact;
    visible: boolean;
    activeState?: string;
    meta?: UISceneAuthoringMeta;
    selectedNodeId?: string | null;
    selectedNodeIds?: string[];
    rectOverrides?: Record<string, UISceneRect>;
    onSelectNode: (nodeId: string, options?: { additive?: boolean; toggle?: boolean }) => void;
    onSelectNodes?: (nodeIds: string[], options?: { additive?: boolean; primaryNodeId?: string | null }) => void;
    onPreviewRectsChange: (rects: Record<string, UISceneRect>) => void;
    onCommitRects: (rects: Record<string, UISceneRect>) => void;
    onMoveNode?: (nodeId: string, targetId: string, position: 'inside') => void;
}

type MovePointerSession = {
    mode: 'move';
    nodeIds: string[];
    primaryNodeId: string;
    startClientX: number;
    startClientY: number;
    currentClientX: number;
    currentClientY: number;
    startRectMap: Record<string, UISceneRect>;
    startGroupRect: UISceneRect;
    lastRectMap: Record<string, UISceneRect>;
    moved: boolean;
};

type ResizePointerSession = {
    mode: 'resize';
    nodeId: string;
    handle?: ResizeHandle;
    startClientX: number;
    startClientY: number;
    currentClientX: number;
    currentClientY: number;
    startRect: UISceneRect;
    lastRect: UISceneRect | null;
    moved: boolean;
};

type MarqueePointerSession = {
    mode: 'marquee';
    additive: boolean;
    startClientX: number;
    startClientY: number;
    currentClientX: number;
    currentClientY: number;
    moved: boolean;
};

type PointerSession = MovePointerSession | ResizePointerSession | MarqueePointerSession;

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

function isNodeVisible(node: UISceneCompiledNode, activeState?: string) {
    if (!node.visible) {
        return false;
    }

    if (!node.visibleIn?.length) {
        return true;
    }

    if (!activeState) {
        return false;
    }

    return node.visibleIn.includes(activeState);
}

function listRectNodes(scene: UISceneCompiledArtifact, activeState?: string): UISceneCompiledNode[] {
    return listEditableCompiledNodes(scene.root).filter((node) => Boolean(node.rect) && isNodeVisible(node, activeState));
}

function collectCompiledDescendantIds(node: UISceneCompiledNode | null): Set<string> {
    const ids = new Set<string>();
    if (!node) {
        return ids;
    }

    const visit = (current: UISceneCompiledNode) => {
        ids.add(current.id);
        current.children.forEach(visit);
    };

    visit(node);
    return ids;
}

function resolveNodeRect(node: UISceneCompiledNode, rectOverrides: Record<string, UISceneRect>) {
    return rectOverrides[node.id] ?? node.rect;
}

function findCanvasDropTarget(
    scene: UISceneCompiledArtifact,
    currentNodeId: string,
    rect: UISceneRect,
    rectOverrides: Record<string, UISceneRect>,
    activeState?: string,
): CanvasDropTarget | null {
    const movingNode = findCompiledNodeById(scene.root, currentNodeId);
    const blockedIds = collectCompiledDescendantIds(movingNode);
    const centerX = rect.x + rect.width / 2;
    const centerY = rect.y + rect.height / 2;

    const candidates = listRectNodes(scene, activeState)
        .filter((node) => isContainerNode(node) && !blockedIds.has(node.id))
        .map((node) => ({
            nodeId: node.id,
            rect: resolveNodeRect(node, rectOverrides),
        }))
        .filter((node): node is CanvasDropTarget => Boolean(node.rect))
        .filter((node) => (
            centerX >= node.rect.x
            && centerX <= node.rect.x + node.rect.width
            && centerY >= node.rect.y
            && centerY <= node.rect.y + node.rect.height
        ));

    if (!candidates.length) {
        return null;
    }

    candidates.sort((left, right) => (left.rect.width * left.rect.height) - (right.rect.width * right.rect.height));
    return candidates[0] ?? null;
}

function buildVerticalTargets(
    scene: UISceneCompiledArtifact,
    currentNodeId: string,
    rectOverrides: Record<string, UISceneRect>,
    activeState?: string,
) {
    const targets = [0, scene.artboard.width / 2, scene.artboard.width];

    listRectNodes(scene, activeState).forEach((node) => {
        const rect = resolveNodeRect(node, rectOverrides);
        if (node.id === currentNodeId || !rect) {
            return;
        }

        targets.push(rect.x, rect.x + rect.width / 2, rect.x + rect.width);
    });

    return targets;
}

function buildHorizontalTargets(
    scene: UISceneCompiledArtifact,
    currentNodeId: string,
    rectOverrides: Record<string, UISceneRect>,
    activeState?: string,
) {
    const targets = [0, scene.artboard.height / 2, scene.artboard.height];

    listRectNodes(scene, activeState).forEach((node) => {
        const rect = resolveNodeRect(node, rectOverrides);
        if (node.id === currentNodeId || !rect) {
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

function isCornerHandle(handle: ResizeHandle) {
    return (handle.includes('n') || handle.includes('s')) && (handle.includes('e') || handle.includes('w'));
}

function buildFreeformResizeRect(
    startRect: UISceneRect,
    handle: ResizeHandle,
    deltaX: number,
    deltaY: number,
    fromCenter: boolean,
): UISceneRect {
    let left = startRect.x;
    let right = startRect.x + startRect.width;
    let top = startRect.y;
    let bottom = startRect.y + startRect.height;

    if (handle.includes('w')) {
        left = startRect.x + deltaX;
        if (fromCenter) {
            right = startRect.x + startRect.width - deltaX;
        }
    }
    if (handle.includes('e')) {
        right = startRect.x + startRect.width + deltaX;
        if (fromCenter) {
            left = startRect.x - deltaX;
        }
    }
    if (handle.includes('n')) {
        top = startRect.y + deltaY;
        if (fromCenter) {
            bottom = startRect.y + startRect.height - deltaY;
        }
    }
    if (handle.includes('s')) {
        bottom = startRect.y + startRect.height + deltaY;
        if (fromCenter) {
            top = startRect.y - deltaY;
        }
    }

    return {
        x: left,
        y: top,
        width: right - left,
        height: bottom - top,
    };
}

function buildAspectLockedResizeRect(
    startRect: UISceneRect,
    handle: ResizeHandle,
    deltaX: number,
    deltaY: number,
    fromCenter: boolean,
): UISceneRect {
    const widthDelta = handle.includes('w')
        ? -deltaX * (fromCenter ? 2 : 1)
        : deltaX * (fromCenter ? 2 : 1);
    const heightDelta = handle.includes('n')
        ? -deltaY * (fromCenter ? 2 : 1)
        : deltaY * (fromCenter ? 2 : 1);
    const widthScale = (startRect.width + widthDelta) / startRect.width;
    const heightScale = (startRect.height + heightDelta) / startRect.height;
    const dominantScale = Math.abs(widthScale - 1) >= Math.abs(heightScale - 1)
        ? widthScale
        : heightScale;
    const targetWidth = startRect.width * dominantScale;
    const targetHeight = startRect.height * dominantScale;

    if (fromCenter) {
        const centerX = startRect.x + startRect.width / 2;
        const centerY = startRect.y + startRect.height / 2;
        return {
            x: centerX - targetWidth / 2,
            y: centerY - targetHeight / 2,
            width: targetWidth,
            height: targetHeight,
        };
    }

    const anchorX = handle.includes('w') ? startRect.x + startRect.width : startRect.x;
    const anchorY = handle.includes('n') ? startRect.y + startRect.height : startRect.y;

    return {
        x: handle.includes('w') ? anchorX - targetWidth : anchorX,
        y: handle.includes('n') ? anchorY - targetHeight : anchorY,
        width: targetWidth,
        height: targetHeight,
    };
}

function buildResizeRect(
    startRect: UISceneRect,
    handle: ResizeHandle,
    deltaX: number,
    deltaY: number,
    modifiers: ResizeModifierState,
): UISceneRect {
    if (modifiers.preserveAspectRatio && isCornerHandle(handle)) {
        return buildAspectLockedResizeRect(startRect, handle, deltaX, deltaY, modifiers.fromCenter);
    }

    return buildFreeformResizeRect(startRect, handle, deltaX, deltaY, modifiers.fromCenter);
}

function applySnapDelta(rect: UISceneRect, handle: ResizeHandle, verticalSnap: SnapMatch | null, horizontalSnap: SnapMatch | null) {
    let nextRect = { ...rect };
    const guides: GuideLine[] = [];

    if (verticalSnap) {
        guides.push(verticalSnap.guide);
        if (handle.includes('w')) {
            nextRect = {
                ...nextRect,
                x: nextRect.x + verticalSnap.delta,
                width: nextRect.width - verticalSnap.delta,
            };
        } else if (handle.includes('e')) {
            nextRect = {
                ...nextRect,
                width: nextRect.width + verticalSnap.delta,
            };
        }
    }

    if (horizontalSnap) {
        guides.push(horizontalSnap.guide);
        if (handle.includes('n')) {
            nextRect = {
                ...nextRect,
                y: nextRect.y + horizontalSnap.delta,
                height: nextRect.height - horizontalSnap.delta,
            };
        } else if (handle.includes('s')) {
            nextRect = {
                ...nextRect,
                height: nextRect.height + horizontalSnap.delta,
            };
        }
    }

    return { rect: nextRect, guides };
}

function applySnapping(
    scene: UISceneCompiledArtifact,
    nodeId: string,
    rect: UISceneRect,
    mode: DragMode,
    handle: ResizeHandle | undefined,
    thresholdX: number,
    thresholdY: number,
    rectOverrides: Record<string, UISceneRect>,
    activeState?: string,
) {
    const verticalTargets = buildVerticalTargets(scene, nodeId, rectOverrides, activeState);
    const horizontalTargets = buildHorizontalTargets(scene, nodeId, rectOverrides, activeState);

    if (mode === 'move') {
        const verticalCandidates = [rect.x, rect.x + rect.width / 2, rect.x + rect.width];
        const horizontalCandidates = [rect.y, rect.y + rect.height / 2, rect.y + rect.height];
        const verticalSnap = findBestSnap(verticalCandidates, verticalTargets, thresholdX, 'vertical');
        const horizontalSnap = findBestSnap(horizontalCandidates, horizontalTargets, thresholdY, 'horizontal');

        let nextRect = { ...rect };
        const guides: GuideLine[] = [];

        if (verticalSnap) {
            guides.push(verticalSnap.guide);
            nextRect = { ...nextRect, x: nextRect.x + verticalSnap.delta };
        }

        if (horizontalSnap) {
            guides.push(horizontalSnap.guide);
            nextRect = { ...nextRect, y: nextRect.y + horizontalSnap.delta };
        }

        return {
            rect: clampRect(nextRect, scene),
            guides,
        };
    }

    if (!handle) {
        return {
            rect: clampRect(rect, scene),
            guides: [],
        };
    }

    const verticalCandidates = handle.includes('w')
        ? [rect.x]
        : handle.includes('e')
            ? [rect.x + rect.width]
            : [];
    const horizontalCandidates = handle.includes('n')
        ? [rect.y]
        : handle.includes('s')
            ? [rect.y + rect.height]
            : [];

    const verticalSnap = verticalCandidates.length > 0
        ? findBestSnap(verticalCandidates, verticalTargets, thresholdX, 'vertical')
        : null;
    const horizontalSnap = horizontalCandidates.length > 0
        ? findBestSnap(horizontalCandidates, horizontalTargets, thresholdY, 'horizontal')
        : null;

    const snapped = applySnapDelta(rect, handle, verticalSnap, horizontalSnap);
    return {
        rect: clampRect(snapped.rect, scene),
        guides: snapped.guides,
    };
}

function getHandleSize(rect: UISceneRect) {
    const shortestSide = Math.min(rect.width, rect.height);
    if (shortestSide < 48) {
        return 8;
    }
    if (shortestSide < 90) {
        return 10;
    }
    return 12;
}

function getHandleShape(handle: ResizeHandle) {
    if (handle === 'n' || handle === 's') {
        return {
            width: 20,
            height: 8,
            borderRadius: 999,
        };
    }

    if (handle === 'e' || handle === 'w') {
        return {
            width: 8,
            height: 20,
            borderRadius: 999,
        };
    }

    return {
        width: 12,
        height: 12,
        borderRadius: 4,
    };
}

function buildGroupRect(rectMap: Record<string, UISceneRect>): UISceneRect | null {
    const rects = Object.values(rectMap);
    if (!rects.length) {
        return null;
    }

    const left = Math.min(...rects.map((rect) => rect.x));
    const top = Math.min(...rects.map((rect) => rect.y));
    const right = Math.max(...rects.map((rect) => rect.x + rect.width));
    const bottom = Math.max(...rects.map((rect) => rect.y + rect.height));

    return {
        x: left,
        y: top,
        width: right - left,
        height: bottom - top,
    };
}

function buildMovedRectMap(
    scene: UISceneCompiledArtifact,
    startRectMap: Record<string, UISceneRect>,
    startGroupRect: UISceneRect,
    deltaX: number,
    deltaY: number,
) {
    const clampedDeltaX = Math.min(
        Math.max(deltaX, -startGroupRect.x),
        scene.artboard.width - (startGroupRect.x + startGroupRect.width),
    );
    const clampedDeltaY = Math.min(
        Math.max(deltaY, -startGroupRect.y),
        scene.artboard.height - (startGroupRect.y + startGroupRect.height),
    );

    const nextRectMap = Object.fromEntries(
        Object.entries(startRectMap).map(([nodeId, rect]) => ([
            nodeId,
            {
                ...rect,
                x: rect.x + clampedDeltaX,
                y: rect.y + clampedDeltaY,
            },
        ])),
    ) as Record<string, UISceneRect>;

    return {
        rectMap: nextRectMap,
        groupRect: buildGroupRect(nextRectMap),
    };
}

function buildMarqueeRect(
    rootRect: DOMRect,
    scene: UISceneCompiledArtifact,
    startClientX: number,
    startClientY: number,
    currentClientX: number,
    currentClientY: number,
): UISceneRect {
    const startX = (Math.min(startClientX, currentClientX) - rootRect.left) * (scene.artboard.width / rootRect.width);
    const endX = (Math.max(startClientX, currentClientX) - rootRect.left) * (scene.artboard.width / rootRect.width);
    const startY = (Math.min(startClientY, currentClientY) - rootRect.top) * (scene.artboard.height / rootRect.height);
    const endY = (Math.max(startClientY, currentClientY) - rootRect.top) * (scene.artboard.height / rootRect.height);

    return clampRect({
        x: startX,
        y: startY,
        width: Math.max(0, endX - startX),
        height: Math.max(0, endY - startY),
    }, scene);
}

function intersectsMarquee(rect: UISceneRect, marqueeRect: UISceneRect) {
    const left = Math.max(rect.x, marqueeRect.x);
    const top = Math.max(rect.y, marqueeRect.y);
    const right = Math.min(rect.x + rect.width, marqueeRect.x + marqueeRect.width);
    const bottom = Math.min(rect.y + rect.height, marqueeRect.y + marqueeRect.height);

    if (right <= left || bottom <= top) {
        return false;
    }

    const overlapArea = (right - left) * (bottom - top);
    const nodeArea = rect.width * rect.height;
    return nodeArea > 0 && overlapArea / nodeArea >= 0.3;
}

export function InPageAuthoringOverlay({
    scene,
    visible,
    activeState,
    meta,
    selectedNodeId,
    selectedNodeIds = [],
    rectOverrides = {},
    onSelectNode,
    onSelectNodes,
    onPreviewRectsChange,
    onCommitRects,
    onMoveNode,
}: InPageAuthoringOverlayProps) {
    const dragSessionRef = React.useRef<PointerSession | null>(null);
    const rootRef = React.useRef<HTMLDivElement | null>(null);
    const modifierStateRef = React.useRef<ResizeModifierState>({
        preserveAspectRatio: false,
        fromCenter: false,
    });
    const [guides, setGuides] = React.useState<GuideLine[]>([]);
    const [dropTarget, setDropTarget] = React.useState<CanvasDropTarget | null>(null);
    const [resizeHint, setResizeHint] = React.useState<ResizeModifierState | null>(null);
    const [marqueeRect, setMarqueeRect] = React.useState<UISceneRect | null>(null);
    const dropTargetRef = React.useRef<CanvasDropTarget | null>(null);

    const editableNodes = React.useMemo(
        () => listRectNodes(scene, activeState),
        [activeState, scene],
    );
    const resolvedSelectedNodeIds = React.useMemo(() => {
        const ids = selectedNodeIds.length > 0
            ? selectedNodeIds
            : selectedNodeId
                ? [selectedNodeId]
                : [];
        return Array.from(new Set(ids));
    }, [selectedNodeId, selectedNodeIds]);
    const selectedIdSet = React.useMemo(
        () => new Set(resolvedSelectedNodeIds),
        [resolvedSelectedNodeIds],
    );

    const startMove = React.useCallback((
        nodeId: string,
        clientX: number,
        clientY: number,
        rect: UISceneRect,
    ) => {
        const nodeIds = selectedIdSet.has(nodeId) && resolvedSelectedNodeIds.length > 1
            ? resolvedSelectedNodeIds.filter((id) => editableNodes.some((node) => node.id === id))
            : [nodeId];
        const startRectMap = Object.fromEntries(
            nodeIds.map((id) => {
                const compiledNode = editableNodes.find((node) => node.id === id);
                const nextRect = compiledNode ? resolveNodeRect(compiledNode, rectOverrides) : id === nodeId ? rect : null;
                return [id, nextRect ?? rect];
            }),
        ) as Record<string, UISceneRect>;

        dragSessionRef.current = {
            mode: 'move',
            nodeIds,
            primaryNodeId: nodeId,
            startClientX: clientX,
            startClientY: clientY,
            currentClientX: clientX,
            currentClientY: clientY,
            startRectMap,
            startGroupRect: buildGroupRect(startRectMap) ?? rect,
            lastRectMap: {},
            moved: false,
        };

        if (!selectedIdSet.has(nodeId)) {
            onSelectNode(nodeId);
        }
    }, [editableNodes, onSelectNode, rectOverrides, resolvedSelectedNodeIds, selectedIdSet]);

    const startResize = React.useCallback((
        nodeId: string,
        clientX: number,
        clientY: number,
        rect: UISceneRect,
        handle: ResizeHandle,
    ) => {
        dragSessionRef.current = {
            mode: 'resize',
            nodeId,
            handle,
            startClientX: clientX,
            startClientY: clientY,
            currentClientX: clientX,
            currentClientY: clientY,
            startRect: { ...rect },
            lastRect: null,
            moved: false,
        };

        if (!selectedIdSet.has(nodeId) || resolvedSelectedNodeIds.length > 1) {
            onSelectNode(nodeId);
        }
    }, [onSelectNode, resolvedSelectedNodeIds.length, selectedIdSet]);

    const startMarquee = React.useCallback((clientX: number, clientY: number, additive: boolean) => {
        dragSessionRef.current = {
            mode: 'marquee',
            additive,
            startClientX: clientX,
            startClientY: clientY,
            currentClientX: clientX,
            currentClientY: clientY,
            moved: false,
        };
        setGuides([]);
        setDropTarget(null);
        setResizeHint(null);
        setMarqueeRect(null);
        dropTargetRef.current = null;
    }, []);

    React.useEffect(() => {
        if (!visible) {
            dragSessionRef.current = null;
            setGuides([]);
            setDropTarget(null);
            setResizeHint(null);
            setMarqueeRect(null);
            dropTargetRef.current = null;
            modifierStateRef.current = {
                preserveAspectRatio: false,
                fromCenter: false,
            };
            onPreviewRectsChange({});
        }
    }, [onPreviewRectsChange, visible]);

    React.useEffect(() => {
        if (!visible) {
            return;
        }

        const updateDragSession = (clientX: number, clientY: number, modifiers = modifierStateRef.current) => {
            const session = dragSessionRef.current;
            const rootRect = rootRef.current?.getBoundingClientRect();
            if (!session || !rootRect || rootRect.width <= 0 || rootRect.height <= 0) {
                return;
            }

            session.currentClientX = clientX;
            session.currentClientY = clientY;
            modifierStateRef.current = modifiers;

            if (session.mode === 'marquee') {
                const nextMarqueeRect = buildMarqueeRect(
                    rootRect,
                    scene,
                    session.startClientX,
                    session.startClientY,
                    clientX,
                    clientY,
                );
                session.moved = Math.abs(clientX - session.startClientX) > 3 || Math.abs(clientY - session.startClientY) > 3;
                setMarqueeRect(nextMarqueeRect);
                setGuides([]);
                setDropTarget(null);
                setResizeHint(null);
                dropTargetRef.current = null;
                onPreviewRectsChange({});
                return;
            }

            const deltaX = (clientX - session.startClientX) * (scene.artboard.width / rootRect.width);
            const deltaY = (clientY - session.startClientY) * (scene.artboard.height / rootRect.height);
            const snapThresholdX = 10 * (scene.artboard.width / rootRect.width);
            const snapThresholdY = 10 * (scene.artboard.height / rootRect.height);
            session.moved = true;

            if (session.mode === 'move') {
                if (session.nodeIds.length > 1) {
                    const movedGroup = buildMovedRectMap(
                        scene,
                        session.startRectMap,
                        session.startGroupRect,
                        deltaX,
                        deltaY,
                    );
                    session.lastRectMap = movedGroup.rectMap;
                    setGuides([]);
                    setDropTarget(null);
                    setResizeHint(null);
                    setMarqueeRect(null);
                    dropTargetRef.current = null;
                    onPreviewRectsChange(movedGroup.rectMap);
                    return;
                }

                const primaryRect = session.startRectMap[session.primaryNodeId];
                if (!primaryRect) {
                    return;
                }

                const rawRect = {
                    ...primaryRect,
                    x: primaryRect.x + deltaX,
                    y: primaryRect.y + deltaY,
                };

                const snapped = applySnapping(
                    scene,
                    session.primaryNodeId,
                    rawRect,
                    'move',
                    undefined,
                    snapThresholdX,
                    snapThresholdY,
                    rectOverrides,
                    activeState,
                );

                session.lastRectMap = {
                    [session.primaryNodeId]: snapped.rect,
                };
                setGuides(snapped.guides);
                const nextDropTarget = findCanvasDropTarget(
                    scene,
                    session.primaryNodeId,
                    snapped.rect,
                    rectOverrides,
                    activeState,
                );
                dropTargetRef.current = nextDropTarget;
                setDropTarget(nextDropTarget);
                setResizeHint(null);
                setMarqueeRect(null);
                onPreviewRectsChange(session.lastRectMap);
                return;
            }

            const rawRect = buildResizeRect(session.startRect, session.handle ?? 'se', deltaX, deltaY, modifiers);
            const snapped = applySnapping(
                scene,
                session.nodeId,
                rawRect,
                'resize',
                session.handle,
                snapThresholdX,
                snapThresholdY,
                rectOverrides,
                activeState,
            );

            session.lastRect = snapped.rect;
            setGuides(snapped.guides);
            dropTargetRef.current = null;
            setDropTarget(null);
            setResizeHint(modifiers.preserveAspectRatio || modifiers.fromCenter ? modifiers : null);
            setMarqueeRect(null);
            onPreviewRectsChange({
                [session.nodeId]: snapped.rect,
            });
        };

        const handlePointerMove = (event: PointerEvent) => {
            updateDragSession(event.clientX, event.clientY, {
                preserveAspectRatio: event.shiftKey,
                fromCenter: event.altKey,
            });
        };

        const handleMouseMove = (event: MouseEvent) => {
            updateDragSession(event.clientX, event.clientY, {
                preserveAspectRatio: event.shiftKey,
                fromCenter: event.altKey,
            });
        };

        const syncModifierState = (key: 'shift' | 'alt', pressed: boolean) => {
            const nextModifiers: ResizeModifierState = {
                preserveAspectRatio: key === 'shift' ? pressed : modifierStateRef.current.preserveAspectRatio,
                fromCenter: key === 'alt' ? pressed : modifierStateRef.current.fromCenter,
            };
            modifierStateRef.current = nextModifiers;

            const session = dragSessionRef.current;
            if (session?.mode === 'resize') {
                updateDragSession(session.currentClientX, session.currentClientY, nextModifiers);
            }
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Shift') {
                syncModifierState('shift', true);
            }
            if (event.key === 'Alt') {
                syncModifierState('alt', true);
            }
        };

        const handleKeyUp = (event: KeyboardEvent) => {
            if (event.key === 'Shift') {
                syncModifierState('shift', false);
            }
            if (event.key === 'Alt') {
                syncModifierState('alt', false);
            }
        };

        const finishDrag = () => {
            const session = dragSessionRef.current;
            dragSessionRef.current = null;
            setGuides([]);
            setResizeHint(null);
            setMarqueeRect(null);
            const activeDropTarget = dropTargetRef.current;
            dropTargetRef.current = null;
            setDropTarget(null);
            modifierStateRef.current = {
                preserveAspectRatio: false,
                fromCenter: false,
            };
            onPreviewRectsChange({});

            if (!session) {
                return;
            }

            if (session.mode === 'marquee') {
                if (!session.moved) {
                    onSelectNodes?.([], { additive: false, primaryNodeId: null });
                    return;
                }

                const rootRect = rootRef.current?.getBoundingClientRect();
                if (!rootRect) {
                    return;
                }

                const nextMarqueeRect = buildMarqueeRect(
                    rootRect,
                    scene,
                    session.startClientX,
                    session.startClientY,
                    session.currentClientX,
                    session.currentClientY,
                );
                const nextSelectedIds = editableNodes
                    .map((node) => ({
                        nodeId: node.id,
                        rect: resolveNodeRect(node, rectOverrides),
                    }))
                    .filter((item) => intersectsMarquee(item.rect, nextMarqueeRect))
                    .sort((left, right) => (left.rect.width * left.rect.height) - (right.rect.width * right.rect.height))
                    .map((item) => item.nodeId);

                if (onSelectNodes) {
                    onSelectNodes(nextSelectedIds, {
                        additive: session.additive,
                        primaryNodeId: nextSelectedIds[0] ?? null,
                    });
                } else if (nextSelectedIds[0]) {
                    onSelectNode(nextSelectedIds[0]);
                }
                return;
            }

            if (session.mode === 'move') {
                if (session.moved && Object.keys(session.lastRectMap).length > 0) {
                    if (session.nodeIds.length === 1 && activeDropTarget && onMoveNode) {
                        onMoveNode(session.primaryNodeId, activeDropTarget.nodeId, 'inside');
                        return;
                    }
                    onCommitRects(session.lastRectMap);
                }
                return;
            }

            if (session.moved && session.lastRect) {
                onCommitRects({
                    [session.nodeId]: session.lastRect,
                });
            }
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', finishDrag);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', finishDrag);
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', finishDrag);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', finishDrag);
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [activeState, editableNodes, onCommitRects, onMoveNode, onPreviewRectsChange, onSelectNode, onSelectNodes, rectOverrides, scene, visible]);

    if (!visible) {
        return null;
    }

    return (
        <div ref={rootRef} className="absolute inset-0 z-[120]" data-testid="home-v2-authoring-overlay">
            <div
                data-testid="home-v2-overlay-background"
                className="absolute inset-0 pointer-events-auto"
                onPointerDown={(event) => {
                    if (event.button !== 0) {
                        return;
                    }
                    startMarquee(event.clientX, event.clientY, event.shiftKey);
                }}
                onMouseDown={(event) => {
                    if (event.button !== 0) {
                        return;
                    }
                    startMarquee(event.clientX, event.clientY, event.shiftKey);
                }}
            />
            {resolvedSelectedNodeIds.length > 1 ? (
                <div
                    data-testid="home-v2-overlay-selection-summary"
                    className="pointer-events-none absolute left-1/2 top-4 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full border border-cyan-200/25 bg-[#140d08]/88 px-3 py-1.5 text-[11px] font-semibold tracking-[0.08em] text-cyan-50 shadow-[0_10px_30px_rgba(0,0,0,0.24)]"
                >
                    已选 {resolvedSelectedNodeIds.length} 个节点
                    <span className="rounded-full border border-cyan-200/25 bg-cyan-300/10 px-2 py-0.5 text-[10px]">拖动任一选中节点可群组移动</span>
                </div>
            ) : null}
            {resizeHint ? (
                <div
                    data-testid="home-v2-overlay-modifier-hud"
                    className={`absolute left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full border border-amber-200/25 bg-[#140d08]/88 px-3 py-1.5 text-[11px] font-semibold tracking-[0.08em] text-amber-50 shadow-[0_10px_30px_rgba(0,0,0,0.24)] ${
                        resolvedSelectedNodeIds.length > 1 ? 'top-14' : 'top-4'
                    }`}
                >
                    {resizeHint.preserveAspectRatio ? (
                        <span className="rounded-full border border-amber-200/25 bg-amber-200/10 px-2 py-0.5">锁比例</span>
                    ) : null}
                    {resizeHint.fromCenter ? (
                        <span className="rounded-full border border-cyan-200/25 bg-cyan-300/10 px-2 py-0.5 text-cyan-50">中心缩放</span>
                    ) : null}
                </div>
            ) : null}
            {marqueeRect ? (
                <div
                    data-testid="home-v2-overlay-marquee"
                    className="pointer-events-none absolute rounded-[16px] border border-cyan-200/80 bg-cyan-300/10 shadow-[0_0_0_1px_rgba(125,211,252,0.18)]"
                    style={{
                        left: `${(marqueeRect.x / scene.artboard.width) * 100}%`,
                        top: `${(marqueeRect.y / scene.artboard.height) * 100}%`,
                        width: `${(marqueeRect.width / scene.artboard.width) * 100}%`,
                        height: `${(marqueeRect.height / scene.artboard.height) * 100}%`,
                    }}
                />
            ) : null}
            {dropTarget ? (
                <div
                    data-testid={`home-v2-overlay-drop-target-${dropTarget.nodeId}`}
                    className="pointer-events-none absolute rounded-[18px] border-2 border-cyan-200 bg-cyan-300/10 shadow-[0_0_0_1px_rgba(125,211,252,0.28),0_0_26px_rgba(34,211,238,0.18)]"
                    style={{
                        left: `${(dropTarget.rect.x / scene.artboard.width) * 100}%`,
                        top: `${(dropTarget.rect.y / scene.artboard.height) * 100}%`,
                        width: `${(dropTarget.rect.width / scene.artboard.width) * 100}%`,
                        height: `${(dropTarget.rect.height / scene.artboard.height) * 100}%`,
                    }}
                >
                    <div className="absolute left-3 top-3 rounded-full border border-cyan-200/35 bg-[#07242a]/92 px-3 py-1 text-[11px] font-semibold tracking-[0.08em] text-cyan-50">
                        放入容器：{getAuthoringNodeName(meta, dropTarget.nodeId)}
                    </div>
                </div>
            ) : null}
            {guides.map((guide, index) => (
                <div
                    key={`${guide.orientation}:${guide.position}:${index}`}
                    className="pointer-events-none absolute bg-amber-200/80 shadow-[0_0_0_1px_rgba(253,230,138,0.22)]"
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
            {editableNodes.map((node) => {
                const rect = resolveNodeRect(node, rectOverrides);
                if (!rect) {
                    return null;
                }

                const isSelected = selectedIdSet.has(node.id);
                const isPrimarySelected = selectedNodeId === node.id;
                const handleSize = getHandleSize(rect);

                return (
                    <div
                        key={node.id}
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
                            data-testid={`home-v2-overlay-node-${node.id}`}
                            data-selected={isSelected ? 'true' : 'false'}
                            className={`pointer-events-auto absolute inset-0 rounded-[12px] border text-left transition-colors ${
                                isSelected
                                    ? isPrimarySelected
                                        ? 'border-amber-300 bg-amber-200/8 shadow-[0_0_0_1px_rgba(253,224,71,0.32),0_0_24px_rgba(251,191,36,0.16)]'
                                        : 'border-cyan-200 bg-cyan-300/10 shadow-[0_0_0_1px_rgba(125,211,252,0.24)]'
                                    : 'border-cyan-300/65 bg-cyan-400/6 hover:bg-cyan-400/12'
                            }`}
                            onPointerDown={(event) => {
                                event.stopPropagation();
                                if (event.button !== 0 || event.shiftKey) {
                                    return;
                                }
                                const button = event.currentTarget;
                                button.setPointerCapture(event.pointerId);
                                startMove(node.id, event.clientX, event.clientY, rect);
                            }}
                            onMouseDown={(event) => {
                                event.stopPropagation();
                                if (event.button !== 0 || event.shiftKey) {
                                    return;
                                }
                                startMove(node.id, event.clientX, event.clientY, rect);
                            }}
                            onClick={(event) => {
                                event.stopPropagation();
                                if (event.shiftKey) {
                                    onSelectNode(node.id, { additive: true, toggle: true });
                                    return;
                                }
                                onSelectNode(node.id);
                            }}
                        >
                            <span className={`absolute left-2 top-2 rounded-full px-2 py-1 text-[10px] font-semibold tracking-[0.12em] ${
                                isPrimarySelected
                                    ? 'bg-[#22170d]/88 text-amber-50'
                                    : isSelected
                                        ? 'bg-[#07242a]/88 text-cyan-50'
                                    : 'bg-[#0d1117]/70 text-cyan-100'
                            }`}>
                                {getAuthoringNodeName(meta, node.id)}
                            </span>
                        </button>

                        {isPrimarySelected && resolvedSelectedNodeIds.length === 1 ? (
                            <>
                                {RESIZE_HANDLES.map((handle) => {
                                    const handleShape = getHandleShape(handle.id);
                                    return (
                                        <button
                                            key={handle.id}
                                            type="button"
                                            data-testid={`home-v2-overlay-handle-${node.id}-${handle.id}`}
                                            className={`pointer-events-auto absolute border border-amber-200 bg-[#1d130c] shadow-[0_4px_10px_rgba(0,0,0,0.24)] ${handle.className}`}
                                            style={{
                                                width: Math.max(handleShape.width, handleSize),
                                                height: Math.max(handleShape.height, handleSize),
                                                borderRadius: handleShape.borderRadius,
                                                cursor: handle.cursor,
                                            }}
                                            onPointerDown={(event) => {
                                                event.stopPropagation();
                                                if (event.button !== 0) {
                                                    return;
                                                }
                                                const button = event.currentTarget;
                                                button.setPointerCapture(event.pointerId);
                                                startResize(node.id, event.clientX, event.clientY, rect, handle.id);
                                            }}
                                            onMouseDown={(event) => {
                                                event.stopPropagation();
                                                if (event.button !== 0) {
                                                    return;
                                                }
                                                startResize(node.id, event.clientX, event.clientY, rect, handle.id);
                                            }}
                                        />
                                    );
                                })}
                                <div className="pointer-events-none absolute inset-0 rounded-[12px] border border-amber-100/55" />
                            </>
                        ) : null}
                    </div>
                );
            })}
        </div>
    );
}
