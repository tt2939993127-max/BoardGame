import React, { useEffect, useLayoutEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { DamageFlash } from '../../../components/common/animations/DamageFlash';
import { ImpactContainer } from '../../../components/common/animations/ImpactContainer';
import type { FxCellCoord, FxRendererProps } from '../../../engine/fx';

function useStableComplete(onComplete: () => void): () => void {
    const ref = useRef(onComplete);
    useLayoutEffect(() => {
        ref.current = onComplete;
    }, [onComplete]);
    return React.useCallback(() => ref.current(), []);
}

function useTimedImpactAndComplete(
    cell: FxCellCoord | undefined,
    onImpact: () => void,
    onComplete: () => void,
    impactMs: number,
    completeMs: number,
): void {
    const impactRef = useRef(false);
    const stableComplete = useStableComplete(onComplete);

    useEffect(() => {
        if (!cell) {
            stableComplete();
            return undefined;
        }

        const impactTimer = window.setTimeout(() => {
            if (impactRef.current) return;
            impactRef.current = true;
            onImpact();
        }, impactMs);
        const completeTimer = window.setTimeout(stableComplete, completeMs);
        return () => {
            window.clearTimeout(impactTimer);
            window.clearTimeout(completeTimer);
        };
    }, [cell, completeMs, impactMs, onImpact, stableComplete]);
}

function cellBox(getCellPosition: FxRendererProps['getCellPosition'], cell: FxCellCoord) {
    const pos = getCellPosition(cell.row, cell.col);
    return {
        left: `${pos.left}%`,
        top: `${pos.top}%`,
        width: `${pos.width}%`,
        height: `${pos.height}%`,
    };
}

export const SpellCastRenderer: React.FC<FxRendererProps> = ({
    event,
    getCellPosition,
    onComplete,
    onImpact,
}) => {
    const cell = event.ctx.cell;
    useTimedImpactAndComplete(cell, onImpact, onComplete, 180, 950);

    if (!cell) return null;
    const strong = event.ctx.intensity === 'strong';

    return (
        <div
            className="absolute pointer-events-none z-30 grid place-items-center"
            style={{ ...cellBox(getCellPosition, cell), overflow: 'visible' }}
        >
            <motion.div
                className="absolute h-24 w-24 rounded-full"
                style={{
                    background: strong
                        ? 'radial-gradient(circle, rgba(251,191,36,.72) 0%, rgba(249,115,22,.32) 38%, transparent 72%)'
                        : 'radial-gradient(circle, rgba(125,211,252,.68) 0%, rgba(59,130,246,.28) 38%, transparent 72%)',
                    filter: 'blur(2px)',
                }}
                initial={{ opacity: 0, scale: 0.2, rotate: -20 }}
                animate={{ opacity: [0, 1, 0], scale: [0.2, 1.15, 1.55], rotate: 28 }}
                transition={{ duration: 0.9, ease: 'easeOut' }}
            />
            <motion.div
                className="absolute h-16 w-16 rounded-full"
                style={{
                    boxShadow: strong
                        ? '0 0 34px rgba(251,191,36,.82), inset 0 0 24px rgba(249,115,22,.4)'
                        : '0 0 30px rgba(125,211,252,.76), inset 0 0 20px rgba(59,130,246,.35)',
                }}
                initial={{ opacity: 0, scale: 0.35 }}
                animate={{ opacity: [0, 0.9, 0], scale: [0.35, 1.05, 1.42] }}
                transition={{ duration: 0.78, ease: 'easeOut' }}
            />
            <motion.div
                className="absolute h-2 w-2 rounded-full bg-amber-100"
                initial={{ opacity: 0, scale: 0.4 }}
                animate={{ opacity: [0, 1, 0], scale: [0.4, strong ? 3.2 : 2.4, 0.6] }}
                transition={{ duration: 0.62, ease: 'easeOut' }}
            />
        </div>
    );
};

export const AttackImpactRenderer: React.FC<FxRendererProps> = ({
    event,
    getCellPosition,
    onComplete,
    onImpact,
}) => {
    const cell = event.ctx.cell;
    useTimedImpactAndComplete(cell, onImpact, onComplete, 0, 700);

    if (!cell) return null;
    const damage = (event.params?.damageAmount as number | undefined) ?? 1;

    return (
        <div
            className="absolute pointer-events-none z-30 grid place-items-center"
            style={{ ...cellBox(getCellPosition, cell), overflow: 'visible' }}
        >
            <motion.div
                className="h-20 w-20 rounded-full"
                style={{
                    background: 'radial-gradient(circle, rgba(248,113,113,.56) 0%, rgba(127,29,29,.26) 42%, transparent 74%)',
                    boxShadow: '0 0 32px rgba(248,113,113,.48)',
                }}
                initial={{ opacity: 0, scale: 0.55 }}
                animate={{ opacity: [0, 1, 0], scale: [0.55, 1.12, 1.45] }}
                transition={{ duration: 0.55, ease: 'easeOut' }}
            />
            <div className="absolute h-16 w-16">
                <DamageFlash
                    active
                    damage={damage}
                    intensity={event.ctx.intensity ?? 'normal'}
                    showNumber={false}
                    completeMs={620}
                />
            </div>
        </div>
    );
};

export const DamageImpactRenderer: React.FC<FxRendererProps> = ({
    event,
    getCellPosition,
    onComplete,
    onImpact,
}) => {
    const cell = event.ctx.cell;
    useTimedImpactAndComplete(cell, onImpact, onComplete, 0, 850);

    if (!cell) return null;
    const damage = (event.params?.damageAmount as number | undefined) ?? 1;
    const pos = cellBox(getCellPosition, cell);

    return (
        <div
            className="absolute pointer-events-none z-30 flex items-center justify-center"
            style={{ ...pos, overflow: 'visible' }}
        >
            <div className="relative h-20 w-20">
                <ImpactContainer
                    isActive
                    damage={damage}
                    effects={{ shake: true, hitStop: false }}
                    className="absolute inset-0"
                    onComplete={onComplete}
                >
                    <DamageFlash
                        active
                        damage={damage}
                        intensity={event.ctx.intensity ?? 'normal'}
                        completeMs={780}
                    />
                </ImpactContainer>
            </div>
        </div>
    );
};
