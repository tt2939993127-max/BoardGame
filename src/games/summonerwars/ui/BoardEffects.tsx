/**
 * 召唤师战争 - 棋盘特效层
 *
 * 效果概览：
 * - 召唤（游戏王风格）：光柱坠落 + 冲击波 + 碎片粒子(tsParticles) + 地裂线
 * - 攻击气浪（通用）：白色锥形冲击波从攻击者→目标方向扩散（远程含通用气浪投射物）
 * - 受伤：SlashEffect 斜切 + 红色脉冲 + 伤害数字飞出
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SlashEffect, getSlashPresetByDamage } from '../../../components/common/animations/SlashEffect';
import { BurstParticles } from '../../../components/common/animations/BurstParticles';
import { ShockwaveProjectile } from '../../../components/common/animations/ShockwaveProjectile';

// ============================================================================
// 效果类型
// ============================================================================

export interface BoardEffectData {
  id: string;
  type: 'summon' | 'shockwave' | 'damage';
  position: { row: number; col: number };
  intensity: 'normal' | 'strong';
  /** 伤害值（damage 效果时使用） */
  damageAmount?: number;
  /** 攻击类型（shockwave 使用） */
  attackType?: 'melee' | 'ranged';
  /** 攻击源位置（shockwave 使用） */
  sourcePosition?: { row: number; col: number };
}

// ============================================================================
// 召唤碎片粒子颜色
// ============================================================================

const SUMMON_COLORS = {
  normal: ['#93c5fd', '#60a5fa', '#3b82f6', '#bfdbfe', '#fff'],
  strong: ['#fbbf24', '#f59e0b', '#d97706', '#fcd34d', '#fff'],
};

// ============================================================================
// 召唤效果（游戏王风格：砸下去 + 冲击波 + 碎片 + 地裂）
// ============================================================================

const SummonEffect: React.FC<{
  effect: BoardEffectData;
  getCellPosition: (row: number, col: number) => { left: number; top: number; width: number; height: number };
  onComplete: (id: string) => void;
}> = ({ effect, getCellPosition, onComplete }) => {
  const pos = getCellPosition(effect.position.row, effect.position.col);
  const isStrong = effect.intensity === 'strong';

  return (
    <motion.div
      className="absolute pointer-events-none z-30"
      style={{ left: `${pos.left}%`, top: `${pos.top}%`, width: `${pos.width}%`, height: `${pos.height}%` }}
    >
      {/* 光柱坠落 */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        initial={{ y: '-300%', scaleX: 0.6, scaleY: 2, opacity: 0.8 }}
        animate={{ y: '0%', scaleX: 1, scaleY: 1, opacity: [0.8, 1, 0] }}
        transition={{ duration: 0.2, ease: [0.36, 0, 0.66, -0.56] }}
      >
        <div className="w-[90%] h-[90%] rounded" style={{
          background: isStrong
            ? 'radial-gradient(circle, rgba(251,191,36,0.8) 0%, rgba(245,158,11,0.3) 50%, transparent 80%)'
            : 'radial-gradient(circle, rgba(147,197,253,0.7) 0%, rgba(59,130,246,0.2) 50%, transparent 80%)',
        }} />
      </motion.div>

      {/* 落地白闪 */}
      <motion.div
        className="absolute inset-0 rounded"
        style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.9) 0%, transparent 70%)' }}
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 1.5] }}
        transition={{ duration: 0.15, delay: 0.18, ease: 'easeOut' }}
      />

      {/* 冲击波环 x2 */}
      {[{ s: isStrong ? 3.5 : 2, d: isStrong ? 0.4 : 0.3, dl: 0.18 },
        { s: isStrong ? 5 : 3, d: isStrong ? 0.6 : 0.45, dl: 0.25 }].map((ring, i) => (
        <motion.div key={`ring-${i}`}
          className="absolute inset-0 flex items-center justify-center"
          initial={{ scale: 0.2, opacity: 0 }}
          animate={{ scale: ring.s, opacity: [0, i === 0 ? 1 : 0.6, 0] }}
          transition={{ duration: ring.d, delay: ring.dl, ease: 'easeOut' }}
        >
          <div className="w-full h-full rounded-full" style={{
            border: `${2 - i}px solid ${isStrong ? 'rgba(251,191,36,0.8)' : 'rgba(147,197,253,0.7)'}`,
            boxShadow: isStrong ? `0 0 ${2 - i}vw 0.5vw rgba(251,191,36,0.4)` : `0 0 ${1.5 - i * 0.5}vw 0.3vw rgba(147,197,253,0.3)`,
          }} />
        </motion.div>
      ))}

      {/* 地裂纹 */}
      {[0, 45, 90, 135, 180, 225, 270, 315].slice(0, isStrong ? 8 : 4).map((angle, i) => (
        <motion.div key={`crack-${i}`} className="absolute" style={{
          left: '50%', top: '50%',
          width: isStrong ? '180%' : '120%', height: '2px',
          transformOrigin: '0% 50%',
          transform: `rotate(${angle}deg)`,
          background: `linear-gradient(to right, ${isStrong ? 'rgba(251,191,36,0.8)' : 'rgba(147,197,253,0.6)'} 0%, transparent 100%)`,
        }}
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: [0, 1, 1], opacity: [0, 0.8, 0] }}
          transition={{ duration: 0.4, delay: 0.2 + i * 0.02, ease: 'easeOut' }}
        />
      ))}

      {/* 碎片粒子 — tsParticles */}
      <motion.div className="absolute inset-0"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        transition={{ delay: 0.18 }}
        onAnimationComplete={() => onComplete(effect.id)}
      >
        <BurstParticles
          active
          preset={isStrong ? 'summonDebrisStrong' : 'summonDebris'}
          color={isStrong ? SUMMON_COLORS.strong : SUMMON_COLORS.normal}
        />
      </motion.div>

      {/* 冠军金色光晕 */}
      {isStrong && (
        <motion.div className="absolute inset-0 flex items-center justify-center"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: [0.8, 2, 2.5], opacity: [0, 0.5, 0] }}
          transition={{ duration: 0.8, delay: 0.15, ease: 'easeOut' }}
        >
          <div className="w-full h-full rounded-full" style={{
            background: 'radial-gradient(circle, rgba(251,191,36,0.3) 0%, rgba(245,158,11,0.1) 50%, transparent 70%)',
          }} />
        </motion.div>
      )}
    </motion.div>
  );
};

// ============================================================================
// 白色锥形气浪（通用攻击效果：从攻击者向目标方向扩散）
// ============================================================================

const ShockwaveEffect: React.FC<{
  effect: BoardEffectData;
  getCellPosition: (row: number, col: number) => { left: number; top: number; width: number; height: number };
  onComplete: (id: string) => void;
}> = ({ effect, getCellPosition, onComplete }) => {
  const src = effect.sourcePosition;
  if (!src) { onComplete(effect.id); return null; }

  const srcPos = getCellPosition(src.row, src.col);
  const tgtPos = getCellPosition(effect.position.row, effect.position.col);
  const isStrong = effect.intensity === 'strong';

  // 源→目标的方向和距离
  const srcCx = srcPos.left + srcPos.width / 2;
  const srcCy = srcPos.top + srcPos.height / 2;
  const tgtCx = tgtPos.left + tgtPos.width / 2;
  const tgtCy = tgtPos.top + tgtPos.height / 2;
  const dx = tgtCx - srcCx;
  const dy = tgtCy - srcCy;
  const angleDeg = Math.atan2(dy, dx) * 180 / Math.PI;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // 气浪容器覆盖源→目标区域（加上溢出空间）
  const padding = 6; // 百分比
  const minX = Math.min(srcCx, tgtCx) - padding;
  const minY = Math.min(srcCy, tgtCy) - padding;
  const maxX = Math.max(srcCx, tgtCx) + padding;
  const maxY = Math.max(srcCy, tgtCy) + padding;
  const coneW = maxX - minX;
  const coneH = maxY - minY;
  const coreWidth = Math.max(dist * (isStrong ? 2.6 : 2.2), isStrong ? 22 : 18);
  const coreHeight = Math.max(dist * (isStrong ? 1.6 : 1.3), isStrong ? 16 : 12);
  const auraWidth = Math.max(dist * (isStrong ? 3.4 : 2.8), isStrong ? 28 : 22);
  const auraHeight = Math.max(dist * (isStrong ? 2.4 : 1.9), isStrong ? 20 : 15);
  // 锥形起始点在容器内的相对位置
  const originXPct = ((srcCx - minX) / coneW) * 100;
  const originYPct = ((srcCy - minY) / coneH) * 100;
  const targetXPct = ((tgtCx - minX) / coneW) * 100;
  const targetYPct = ((tgtCy - minY) / coneH) * 100;
  const showProjectile = effect.attackType === 'ranged';
  const projectileSize = Math.max(6, Math.min(12, dist * 0.4));

  return (
    <div
      className="absolute pointer-events-none z-30"
      style={{
        left: `${minX}%`, top: `${minY}%`,
        width: `${coneW}%`, height: `${coneH}%`,
        mixBlendMode: 'screen',
      }}
    >
      {/* 锥形气浪主体（白色半透明锥形，从源点向目标方向扩散） */}
      <motion.div
        className="absolute"
        style={{
          left: `${originXPct}%`,
          top: `${originYPct}%`,
          width: `${coreWidth}%`,
          height: `${coreHeight}%`,
          transformOrigin: '0% 50%',
          transform: `translate(0, -50%) rotate(${angleDeg}deg)`,
          background: `linear-gradient(90deg, 
            rgba(255,255,255,${isStrong ? 0.95 : 0.85}) 0%, 
            rgba(255,255,255,${isStrong ? 0.7 : 0.55}) 30%, 
            rgba(220,230,255,${isStrong ? 0.4 : 0.25}) 60%, 
            transparent 100%)`,
          clipPath: 'polygon(0% 40%, 0% 60%, 100% 100%, 100% 0%)',
          filter: `blur(${isStrong ? 4 : 3}px)`,
          boxShadow: isStrong
            ? '0 0 2.2vw 0.8vw rgba(255,255,255,0.55)'
            : '0 0 1.6vw 0.6vw rgba(255,255,255,0.45)',
        }}
        initial={{ scaleX: 0, scaleY: 0.3, opacity: 0 }}
        animate={{
          scaleX: [0, 1, 1.15],
          scaleY: [0.3, 1, 1.25],
          opacity: [0, 1, 0],
        }}
        transition={{ duration: isStrong ? 0.35 : 0.26, ease: [0.25, 0, 0.3, 1] }}
      />

      {/* 外层扩散轮廓 */}
      <motion.div
        className="absolute"
        style={{
          left: `${originXPct}%`,
          top: `${originYPct}%`,
          width: `${auraWidth}%`,
          height: `${auraHeight}%`,
          transformOrigin: '0% 50%',
          transform: `translate(0, -50%) rotate(${angleDeg}deg)`,
          background: `linear-gradient(90deg, 
            rgba(255,255,255,0.45) 0%, 
            rgba(200,220,255,0.22) 40%, 
            transparent 100%)`,
          clipPath: 'polygon(0% 35%, 0% 65%, 100% 100%, 100% 0%)',
          filter: `blur(${isStrong ? 6 : 4}px)`,
        }}
        initial={{ scaleX: 0, scaleY: 0.2, opacity: 0 }}
        animate={{
          scaleX: [0, 1.2, 1.35],
          scaleY: [0.2, 1.2, 1.45],
          opacity: [0, 0.75, 0],
        }}
        transition={{ duration: isStrong ? 0.4 : 0.3, delay: 0.03, ease: 'easeOut' }}
      />

      {/* 速度线（3-5 条从源点向外的白色细线） */}
      {Array.from({ length: isStrong ? 5 : 3 }, (_, i) => {
        const spread = isStrong ? 25 : 18;
        const lineAngle = angleDeg + (i - (isStrong ? 2 : 1)) * (spread / (isStrong ? 4 : 2));
        return (
          <motion.div
            key={`line-${i}`}
            className="absolute"
            style={{
              left: `${originXPct}%`,
              top: `${originYPct}%`,
              width: `${dist * (1.4 + Math.random() * 0.7)}%`,
              height: '3px',
              transformOrigin: '0% 50%',
              transform: `rotate(${lineAngle}deg)`,
              background: `linear-gradient(90deg, rgba(255,255,255,${0.85 - i * 0.1}) 0%, rgba(255,255,255,0.3) 60%, transparent 100%)`,
              filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.4))',
            }}
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: [0, 1, 1], opacity: [0, 0.8, 0] }}
            transition={{ duration: 0.25, delay: 0.02 + i * 0.02, ease: 'easeOut' }}
          />
        );
      })}

      {/* 远程气浪投射物（通用气流形态） */}
      {showProjectile && (
        <ShockwaveProjectile
          start={{ xPct: originXPct, yPct: originYPct }}
          end={{ xPct: targetXPct, yPct: targetYPct }}
          intensity={effect.intensity}
          sizePct={projectileSize}
        />
      )}

      {/* 源点发射闪光 */}
      <motion.div
        className="absolute rounded-full"
        style={{
          left: `${originXPct}%`, top: `${originYPct}%`,
          width: isStrong ? '20%' : '15%',
          height: isStrong ? '20%' : '15%',
          transform: 'translate(-50%, -50%)',
          background: 'radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(220,230,255,0.4) 50%, transparent 80%)',
        }}
        initial={{ scale: 0.3, opacity: 0 }}
        animate={{ scale: [0.3, 1.5, 0.5], opacity: [0, 1, 0] }}
        transition={{ duration: 0.15 }}
      />

      {/* 目标点命中闪光 */}
      <motion.div
        className="absolute rounded-full"
        style={{
          left: `${targetXPct}%`,
          top: `${targetYPct}%`,
          width: isStrong ? '32%' : '24%',
          height: isStrong ? '32%' : '24%',
          transform: 'translate(-50%, -50%)',
          background: 'radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(200,220,255,0.45) 50%, transparent 80%)',
          boxShadow: isStrong
            ? '0 0 2vw 0.8vw rgba(255,255,255,0.6)'
            : '0 0 1.4vw 0.6vw rgba(255,255,255,0.5)',
        }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 1.8, 2.5], opacity: [0, 1, 0] }}
        transition={{ duration: 0.22, delay: isStrong ? 0.18 : 0.12 }}
        onAnimationComplete={() => onComplete(effect.id)}
      />
    </div>
  );
};

// ============================================================================
// 受伤效果（SlashEffect + 红色脉冲 + 伤害数字飞出）
// ============================================================================

const DamageEffect: React.FC<{
  effect: BoardEffectData;
  getCellPosition: (row: number, col: number) => { left: number; top: number; width: number; height: number };
  onComplete: (id: string) => void;
}> = ({ effect, getCellPosition, onComplete }) => {
  const pos = getCellPosition(effect.position.row, effect.position.col);
  const isStrong = effect.intensity === 'strong';
  const dmg = effect.damageAmount ?? (isStrong ? 3 : 1);
  const shakeX = isStrong ? [-8, 8, -6, 6, -3, 3, 0] : [-4, 4, -3, 3, -1, 0];
  const shakeY = isStrong ? [0, -4, 2, -2, 1, 0] : [0, -2, 1, 0];
  const [slashActive, setSlashActive] = useState(true);
  const timerRef = useRef<number>(0);

  const preset = isStrong ? getSlashPresetByDamage(6) : getSlashPresetByDamage(2);

  useEffect(() => {
    timerRef.current = window.setTimeout(() => setSlashActive(false), 100);
    return () => window.clearTimeout(timerRef.current);
  }, []);

  return (
    <motion.div
      className="absolute pointer-events-none z-30"
      style={{ left: `${pos.left}%`, top: `${pos.top}%`, width: `${pos.width}%`, height: `${pos.height}%` }}
      initial={{ x: 0, y: 0 }}
      animate={{ x: shakeX, y: shakeY }}
      transition={{ duration: isStrong ? 0.4 : 0.3 }}
      onAnimationComplete={() => onComplete(effect.id)}
    >
      {/* 复用通用斜切效果 */}
      <SlashEffect isActive={slashActive} {...preset} />

      {/* 白闪（钝帧感） */}
      <motion.div className="absolute inset-0 rounded bg-white/50"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.7, 0] }}
        transition={{ duration: 0.08 }}
      />

      {/* 红色脉冲 */}
      <motion.div className="absolute inset-0 rounded"
        style={{ backgroundColor: 'rgba(220, 38, 38, 0.6)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: isStrong ? [0, 0.7, 0.1, 0.5, 0] : [0, 0.6, 0, 0.3, 0] }}
        transition={{ duration: isStrong ? 0.45 : 0.3, delay: 0.05 }}
      />

      {/* 伤害数字飞出 */}
      <motion.div
        className="absolute left-1/2 top-0 -translate-x-1/2"
        initial={{ y: 0, opacity: 0, scale: 0.5 }}
        animate={{ y: '-120%', opacity: [0, 1, 1, 0], scale: [0.5, 1.3, 1.1, 0.8] }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      >
        <span className="font-black text-red-400 whitespace-nowrap" style={{
          fontSize: isStrong ? '2vw' : '1.4vw',
          textShadow: '0 0 0.5vw rgba(220,38,38,0.8), 0 2px 4px rgba(0,0,0,0.6)',
        }}>
          -{dmg}
        </span>
      </motion.div>
    </motion.div>
  );
};

// ============================================================================
// 全屏震动 Hook（rAF 驱动，指数衰减）
// ============================================================================

export const useScreenShake = () => {
  const [shakeStyle, setShakeStyle] = useState<React.CSSProperties>({});
  const rafRef = useRef<number>(0);

  const triggerShake = useCallback((
    intensity: 'normal' | 'strong',
    type: 'impact' | 'hit' = 'impact',
  ) => {
    cancelAnimationFrame(rafRef.current);
    const isImpact = type === 'impact';
    const ampX = intensity === 'strong' ? (isImpact ? 4 : 5) : (isImpact ? 2 : 3);
    const ampY = intensity === 'strong' ? (isImpact ? 8 : 4) : (isImpact ? 4 : 2);
    const totalMs = intensity === 'strong' ? 400 : 250;
    const start = performance.now();

    const step = () => {
      const elapsed = performance.now() - start;
      if (elapsed >= totalMs) {
        setShakeStyle({ transform: 'translate3d(0,0,0)' });
        return;
      }
      const decay = Math.pow(1 - elapsed / totalMs, 2.5);
      const freq = isImpact ? 25 : 20;
      const phase = elapsed * freq / 1000 * Math.PI * 2;
      const x = Math.sin(phase * 1.3) * ampX * decay;
      const y = Math.cos(phase) * ampY * decay;
      setShakeStyle({ transform: `translate3d(${x}px, ${y}px, 0)` });
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
  }, []);

  return { shakeStyle, triggerShake };
};

// ============================================================================
// 效果层
// ============================================================================

export const BoardEffectsLayer: React.FC<{
  effects: BoardEffectData[];
  getCellPosition: (row: number, col: number) => { left: number; top: number; width: number; height: number };
  onEffectComplete: (id: string) => void;
}> = ({ effects, getCellPosition, onEffectComplete }) => (
  <AnimatePresence>
    {effects.map((effect) => {
      switch (effect.type) {
        case 'summon':
          return <SummonEffect key={effect.id} effect={effect} getCellPosition={getCellPosition} onComplete={onEffectComplete} />;
        case 'shockwave':
          return <ShockwaveEffect key={effect.id} effect={effect} getCellPosition={getCellPosition} onComplete={onEffectComplete} />;
        case 'damage':
          return <DamageEffect key={effect.id} effect={effect} getCellPosition={getCellPosition} onComplete={onEffectComplete} />;
        default:
          return null;
      }
    })}
  </AnimatePresence>
);

// ============================================================================
// Hook：管理棋盘效果状态
// ============================================================================

export const useBoardEffects = () => {
  const [effects, setEffects] = useState<BoardEffectData[]>([]);

  const pushEffect = useCallback((effect: Omit<BoardEffectData, 'id'>) => {
    const id = `fx-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setEffects((prev) => [...prev, { ...effect, id }]);
  }, []);

  const removeEffect = useCallback((id: string) => {
    setEffects((prev) => prev.filter((e) => e.id !== id));
  }, []);

  return { effects, pushEffect, removeEffect };
};
