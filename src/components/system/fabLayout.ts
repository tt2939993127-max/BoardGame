type FabAlignment = { v: 'top' | 'bottom'; h: 'left' | 'right' };
type FabPosition = { left: number; top: number };

export interface ExpandedFabLayout {
    position: FabPosition;
    alignment: FabAlignment;
    listOffset: { x: number; y: number };
}

export const resolveExpandedFabLayout = ({
    position,
    alignment,
    satelliteCount,
    buttonSize,
    buttonGap,
    viewportHeight,
    safeAreaTop,
    safeAreaBottom,
    getHorizontalAlignment,
}: {
    position: FabPosition;
    alignment: FabAlignment;
    satelliteCount: number;
    buttonSize: number;
    buttonGap: number;
    viewportHeight: number;
    safeAreaTop: number;
    safeAreaBottom: number;
    getHorizontalAlignment: (resolvedPosition: FabPosition, resolvedButtonSize: number) => FabAlignment['h'];
}): ExpandedFabLayout => {
    const resolvedPosition = {
        left: Number.isFinite(position.left) ? position.left : 0,
        top: Number.isFinite(position.top) ? position.top : 0,
    };
    const resolvedButtonSize = Number.isFinite(buttonSize) && buttonSize > 0 ? buttonSize : 0;
    const resolvedButtonGap = Number.isFinite(buttonGap) ? buttonGap : 0;
    const totalListHeight = Math.max(satelliteCount, 0) * (resolvedButtonSize + resolvedButtonGap);
    const resolvedViewportHeight = Number.isFinite(viewportHeight) ? viewportHeight : 0;
    const topInset = Number.isFinite(safeAreaTop) ? safeAreaTop : 0;
    const bottomInset = Number.isFinite(safeAreaBottom) ? safeAreaBottom : 0;
    const maxBottom = resolvedViewportHeight - bottomInset;

    let resolvedTop = resolvedPosition.top;
    if (resolvedViewportHeight > 0 && resolvedButtonSize > 0) {
        if (alignment.v === 'bottom') {
            const minTop = topInset + totalListHeight;
            const maxTop = maxBottom - resolvedButtonSize;
            resolvedTop = Math.min(Math.max(resolvedTop, minTop), maxTop);
        } else {
            const minTop = topInset;
            const maxTop = maxBottom - (resolvedButtonSize + totalListHeight);
            resolvedTop = Math.min(Math.max(resolvedTop, minTop), maxTop);
        }
    }

    const resolvedPositionWithOffset = {
        left: resolvedPosition.left,
        top: resolvedTop,
    };

    const resolvedAlignment: FabAlignment = {
        v: alignment.v,
        h: getHorizontalAlignment(resolvedPositionWithOffset, resolvedButtonSize),
    };

    return {
        position: resolvedPositionWithOffset,
        alignment: resolvedAlignment,
        listOffset: { x: 0, y: 0 },
    };
};
