import React from 'react';
import { motion } from 'framer-motion';

export interface ShockwaveProjectileProps {
  start: { xPct: number; yPct: number };
  end: { xPct: number; yPct: number };
  intensity?: 'normal' | 'strong';
  durationMs?: number;
  sizePct?: number;
  className?: string;
  testId?: string;
  onComplete?: () => void;
}

const DEFAULT_DURATION_MS = 220;
const STRONG_DURATION_MS = 260;

export const ShockwaveProjectile: React.FC<ShockwaveProjectileProps> = ({
  start,
  end,
  intensity = 'normal',
  durationMs,
  sizePct,
  className = '',
  testId,
  onComplete,
}) => {
  const dx = end.xPct - start.xPct;
  const dy = end.yPct - start.yPct;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const angleDeg = Math.atan2(dy, dx) * 180 / Math.PI;
  const isStrong = intensity === 'strong';
  const duration = (durationMs ?? (isStrong ? STRONG_DURATION_MS : DEFAULT_DURATION_MS)) / 1000;
  const baseSize = sizePct ?? Math.max(6, Math.min(12, dist * 0.4));
  const length = baseSize * (isStrong ? 3.4 : 3);
  const thickness = baseSize * (isStrong ? 1.4 : 1.1);
  const swirlDuration = Math.max(0.12, duration * 0.8);

  return (
    <motion.div
      data-testid={testId}
      className={`absolute pointer-events-none ${className}`}
      style={{
        width: `${length}%`,
        height: `${thickness}%`,
        transform: `translate(-50%, -50%) rotate(${angleDeg}deg)`,
        transformOrigin: '50% 50%',
      }}
      initial={{ left: `${start.xPct}%`, top: `${start.yPct}%`, opacity: 0, scale: 0.6 }}
      animate={{
        left: `${end.xPct}%`,
        top: `${end.yPct}%`,
        opacity: [0, 1, 0.2],
        scale: [0.6, 1, 0.85],
      }}
      transition={{ duration, ease: 'easeOut' }}
      onAnimationComplete={onComplete}
    >
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(90deg,
            rgba(210,225,255,${isStrong ? 0.2 : 0.15}) 0%,
            rgba(235,245,255,${isStrong ? 0.75 : 0.6}) 55%,
            rgba(255,255,255,${isStrong ? 0.95 : 0.8}) 100%)`,
          clipPath: 'polygon(0% 0%, 0% 100%, 100% 50%)',
          filter: `blur(${isStrong ? 3 : 2}px)`,
          boxShadow: isStrong
            ? '0 0 1.6vw 0.6vw rgba(255,255,255,0.5)'
            : '0 0 1.1vw 0.5vw rgba(255,255,255,0.4)',
        }}
      />
      <motion.div
        className="absolute inset-0"
        style={{
          backgroundImage: `repeating-linear-gradient(90deg,
            rgba(255,255,255,${isStrong ? 0.55 : 0.4}) 0%,
            rgba(255,255,255,${isStrong ? 0.2 : 0.15}) 12%,
            rgba(255,255,255,0) 24%)`,
          backgroundSize: '40% 100%',
          backgroundPosition: '0% 50%',
          clipPath: 'polygon(0% 6%, 0% 94%, 100% 50%)',
          mixBlendMode: 'screen',
          opacity: isStrong ? 0.85 : 0.7,
        }}
        animate={{ backgroundPosition: ['0% 50%', '100% 50%'] }}
        transition={{ duration: swirlDuration, ease: 'linear' }}
      />
    </motion.div>
  );
};

export default ShockwaveProjectile;
