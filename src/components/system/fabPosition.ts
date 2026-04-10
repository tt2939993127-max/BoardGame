export type FabPosition = { left: number; top: number };
export type FabPositionPercent = { left: number; top: number };

type ResolveFabStoredPositionInput = {
    savedPosition?: string | null;
    legacyOffset?: string | null;
    viewportWidth: number;
    viewportHeight: number;
    basePosition: FabPosition;
    normalizePosition: (target: FabPosition) => FabPosition;
    clampPosition: (target: FabPosition, options?: { allowOverflow?: boolean; resolvedButtonSize?: number }) => FabPosition;
    resolvedButtonSize: number;
};

type ResolveFabStoredPositionResult = {
    position: FabPosition;
    percent: FabPositionPercent;
    shouldPersist: boolean;
    clearLegacyOffset: boolean;
};

const clampPercent = (value: number) => Math.min(1, Math.max(0, value));

const parseJson = <T,>(value?: string | null): T | null => {
    if (!value) return null;
    try {
        return JSON.parse(value) as T;
    } catch {
        return null;
    }
};

const isPercentLike = (value: number | undefined) => (
    typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1
);

const resolvePositionFromPercent = (
    percent: FabPositionPercent,
    viewportWidth: number,
    viewportHeight: number,
): FabPosition => ({
    left: percent.left * viewportWidth,
    top: percent.top * viewportHeight,
});

export const serializeFabPositionPercent = (
    position: FabPosition,
    viewportWidth: number,
    viewportHeight: number,
): FabPositionPercent => {
    if (viewportWidth <= 0 || viewportHeight <= 0) {
        return { left: 0, top: 0 };
    }
    return {
        left: clampPercent(position.left / viewportWidth),
        top: clampPercent(position.top / viewportHeight),
    };
};

export const resolveFabStoredPosition = ({
    savedPosition,
    legacyOffset,
    viewportWidth,
    viewportHeight,
    basePosition,
    normalizePosition,
    clampPosition,
    resolvedButtonSize,
}: ResolveFabStoredPositionInput): ResolveFabStoredPositionResult => {
    let position = normalizePosition(basePosition);
    let shouldPersist = false;
    let clearLegacyOffset = false;

    const parsed = parseJson<Partial<FabPositionPercent & FabPosition & { mode?: 'percent' | 'absolute' }>>(savedPosition);
    if (parsed) {
        if (
            parsed.mode === 'percent'
            || (isPercentLike(parsed.left) && isPercentLike(parsed.top))
        ) {
            position = resolvePositionFromPercent({
                left: clampPercent(parsed.left ?? 0),
                top: clampPercent(parsed.top ?? 0),
            }, viewportWidth, viewportHeight);
        } else if (typeof parsed.left === 'number' && typeof parsed.top === 'number') {
            position = { left: parsed.left, top: parsed.top };
            shouldPersist = true;
        }
    } else {
        const legacy = parseJson<{ x?: number; y?: number; left?: number; top?: number }>(legacyOffset);
        if (legacy && (typeof legacy.x === 'number' || typeof legacy.left === 'number')) {
            const offsetX = Number.isFinite(legacy.x ?? legacy.left) ? (legacy.x ?? legacy.left ?? 0) : 0;
            const offsetY = Number.isFinite(legacy.y ?? legacy.top) ? (legacy.y ?? legacy.top ?? 0) : 0;
            position = {
                left: basePosition.left + offsetX,
                top: basePosition.top + offsetY,
            };
            shouldPersist = true;
            clearLegacyOffset = true;
        }
    }

    const normalized = normalizePosition(position);
    const clamped = clampPosition(normalized, {
        allowOverflow: false,
        resolvedButtonSize,
    });
    const percent = serializeFabPositionPercent(clamped, viewportWidth, viewportHeight);

    return {
        position: clamped,
        percent,
        shouldPersist,
        clearLegacyOffset,
    };
};

export default {
    resolveFabStoredPosition,
    serializeFabPositionPercent,
};
