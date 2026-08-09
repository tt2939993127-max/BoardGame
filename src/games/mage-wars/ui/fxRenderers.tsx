import React, { useEffect, useLayoutEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { DamageFlash } from '../../../components/common/animations/DamageFlash';
import { OptimizedImage } from '../../../components/common/media/OptimizedImage';
import { ImpactContainer } from '../../../components/common/animations/ImpactContainer';
import type { FxCellCoord, FxRendererProps } from '../../../engine/fx';

type AttackDieFaceId = 'burst' | 'hit2' | 'hit1' | 'blank';

const ATTACK_DIE_TEXTURE_SIZE = 1280;
const ATTACK_DIE_FACES: Record<AttackDieFaceId, { x: number; y: number; rotate: string }> = {
    burst: { x: 164, y: 318, rotate: '-7deg' },
    hit2: { x: 480, y: 318, rotate: '5deg' },
    hit1: { x: 480, y: 948, rotate: '-4deg' },
    blank: { x: 794, y: 318, rotate: '4deg' },
};

function getAttackDieFace(result: number): AttackDieFaceId {
    if (result >= 3) return 'burst';
    if (result === 2) return 'hit2';
    if (result === 1) return 'hit1';
    return 'blank';
}

function AttackDieResult({ result }: { result: number }) {
    const crop = ATTACK_DIE_FACES[getAttackDieFace(result)];
    const scale = ATTACK_DIE_TEXTURE_SIZE / 320;

    return (
        <span
            className="relative block h-9 w-9 shrink-0 overflow-hidden rounded-[0.18rem] bg-black/35 shadow-[0_6px_12px_rgba(0,0,0,0.46)]"
            style={{ transform: `rotate(${crop.rotate})` }}
            data-testid="mage-wars-fx-attack-die-face"
            aria-label={`攻击骰 ${result}`}
        >
            <OptimizedImage
                src="mage-wars/dice/attack-die-texture"
                alt={`攻击骰 ${result}`}
                className="absolute max-w-none select-none"
                style={{
                    width: `${scale * 100}%`,
                    height: `${scale * 100}%`,
                    left: `${-(crop.x / 320) * 100}%`,
                    top: `${-(crop.y / 320) * 100}%`,
                }}
                placeholder={false}
            />
        </span>
    );
}

function AttackDiceFeedback({
    source,
    target,
    diceResults,
    effectDieResult,
    getCellPosition,
}: {
    source?: FxCellCoord;
    target: FxCellCoord;
    diceResults: number[];
    effectDieResult?: number;
    getCellPosition: FxRendererProps['getCellPosition'];
}) {
    if (diceResults.length === 0) return null;

    const sourceBox = source ? getCellPosition(source.row, source.col) : getCellPosition(target.row, target.col);
    const targetBox = getCellPosition(target.row, target.col);
    const left = (sourceBox.left + sourceBox.width / 2 + targetBox.left + targetBox.width / 2) / 2;
    const top = (sourceBox.top + sourceBox.height / 2 + targetBox.top + targetBox.height / 2) / 2;

    return (
        <motion.div
            className="absolute z-40 flex max-w-[11rem] items-center justify-center gap-1"
            data-testid="mage-wars-fx-attack-dice"
            style={{ left: `${left}%`, top: `${top}%`, transform: 'translate(-50%, -50%)' }}
            initial={{ opacity: 0, scale: 0.68, y: 10 }}
            animate={{ opacity: [0, 1, 1, 0], scale: [0.68, 1, 1, 1.04], y: [10, 0, 0, -6] }}
            transition={{ duration: 0.68, ease: 'easeOut' }}
        >
            {diceResults.slice(0, 6).map((result, index) => (
                <AttackDieResult key={`${index}-${result}`} result={result} />
            ))}
            {effectDieResult !== undefined ? (
                <span
                    className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-black/42 shadow-[0_6px_12px_rgba(0,0,0,0.46)]"
                    data-testid="mage-wars-fx-effect-die-face"
                    aria-label={`效果骰 ${effectDieResult}`}
                >
                    <OptimizedImage
                        src="mage-wars/dice/effect-die-d12-face"
                        alt={`效果骰 ${effectDieResult}`}
                        className="h-full w-full object-contain"
                        placeholder={false}
                    />
                </span>
            ) : null}
        </motion.div>
    );
}

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
            data-testid="mage-wars-fx-spell-cast"
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

export const SpellPushRenderer: React.FC<FxRendererProps> = ({
    event,
    getCellPosition,
    onComplete,
    onImpact,
}) => {
    const cell = event.ctx.cell;
    useTimedImpactAndComplete(cell, onImpact, onComplete, 80, 780);

    if (!cell) return null;

    return (
        <div
            className="absolute pointer-events-none z-30 grid place-items-center"
            data-testid="mage-wars-fx-spell-push"
            style={{ ...cellBox(getCellPosition, cell), overflow: 'visible' }}
        >
            {[0, 1, 2].map((index) => (
                <motion.div
                    key={index}
                    className="absolute h-3 rounded-full"
                    style={{
                        width: `${72 - index * 12}px`,
                        background: 'linear-gradient(90deg, transparent, rgba(186,230,253,.88), rgba(125,211,252,.28), transparent)',
                        filter: 'blur(.5px)',
                    }}
                    initial={{ opacity: 0, x: -42, y: -16 + index * 16, scaleX: 0.35 }}
                    animate={{ opacity: [0, 1, 0], x: 46, scaleX: [0.35, 1, 0.65] }}
                    transition={{ duration: 0.52, delay: index * 0.08, ease: 'easeOut' }}
                />
            ))}
            <motion.div
                className="absolute h-16 w-16 rounded-full border border-sky-100/65"
                initial={{ opacity: 0, scale: 0.45 }}
                animate={{ opacity: [0, 0.8, 0], scale: [0.45, 1.05, 1.35] }}
                transition={{ duration: 0.66, ease: 'easeOut' }}
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
    const source = event.params?.source as FxCellCoord | undefined;
    const diceResults = Array.isArray(event.params?.diceResults)
        ? event.params.diceResults.filter((result): result is number => typeof result === 'number')
        : [];
    const effectDieResult = typeof event.params?.effectDieResult === 'number'
        ? event.params.effectDieResult
        : undefined;

    return (
        <>
            <div
                className="absolute pointer-events-none z-30 grid place-items-center"
                data-testid="mage-wars-fx-attack-impact"
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
            <AttackDiceFeedback
                source={source}
                target={cell}
                diceResults={diceResults}
                effectDieResult={effectDieResult}
                getCellPosition={getCellPosition}
            />
        </>
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
            data-testid="mage-wars-fx-damage-impact"
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
