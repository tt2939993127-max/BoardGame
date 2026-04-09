export type FabAlignment = { v: 'top' | 'bottom'; h: 'left' | 'right' };
export type FabPosition = { left: number; top: number };

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
    getHorizontalAlignment: (target: FabPosition, resolvedButtonSize: number) => FabAlignment['h'];
}) => {
    const offset = buttonSize + buttonGap;
    const safeBottom = Math.max(safeAreaTop + buttonSize, viewportHeight - safeAreaBottom);
    const preferredDirection = alignment.v === 'bottom' ? 'above' : 'below';

    if (satelliteCount <= 0) {
        return {
            position,
            alignment: {
                v: preferredDirection === 'above' ? 'bottom' : 'top',
                h: getHorizontalAlignment(position, buttonSize),
            } as FabAlignment,
            listOffset: { x: 0, y: 0 },
        };
    }

    let resolvedTop = position.top;
    if (preferredDirection === 'above') {
        const minTop = safeAreaTop + satelliteCount * offset;
        const maxTop = Math.max(minTop, safeBottom - buttonSize);
        resolvedTop = Math.min(Math.max(position.top, minTop), maxTop);
    } else {
        const minTop = safeAreaTop;
        const maxTop = Math.max(minTop, safeBottom - buttonSize - satelliteCount * offset);
        resolvedTop = Math.min(Math.max(position.top, minTop), maxTop);
    }

    const resolvedPosition = {
        left: position.left,
        top: resolvedTop,
    };

    return {
        position: resolvedPosition,
        alignment: {
            v: preferredDirection === 'above' ? 'bottom' : 'top',
            h: getHorizontalAlignment(resolvedPosition, buttonSize),
        } as FabAlignment,
        listOffset: { x: 0, y: 0 },
    };
};
