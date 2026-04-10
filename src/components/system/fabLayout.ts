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
    const offset = resolvedButtonSize + resolvedButtonGap;

    let offsetY = 0;
    if (resolvedViewportHeight > 0 && totalListHeight > 0) {
        if (alignment.v === 'bottom') {
            const listTop = resolvedPosition.top - totalListHeight;
            if (listTop < topInset) {
                offsetY = topInset - listTop;
            }
        } else {
            const listBottom = resolvedPosition.top + totalListHeight + offset + resolvedButtonSize;
            const maxBottom = resolvedViewportHeight - bottomInset;
            if (listBottom > maxBottom) {
                offsetY = maxBottom - listBottom;
            }
        }
    }

    const resolvedAlignment: FabAlignment = {
        v: alignment.v,
        h: getHorizontalAlignment(resolvedPosition, resolvedButtonSize),
    };

    return {
        position: resolvedPosition,
        alignment: resolvedAlignment,
        listOffset: { x: 0, y: offsetY },
    };
};
