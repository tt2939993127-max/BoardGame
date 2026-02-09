/**
 * 召唤师战争 - 棋盘特效层
 *
 * 所有视觉特效已抽离为通用组件（SummonEffect/ConeBlast/DamageFlash），
 * 本文件仅负责棋盘坐标适配和效果调度。
 */

import React, { useState, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { SummonEffect } from '../../../components/common/animations/SummonEffect';
import { ConeBlast } from '../../../components/common/animations/ConeBlast';
import { DamageFlash } from '../../../components/common/animations/DamageFlash';
import { ImpactContainer } from '../../../components/common/animations/ImpactContainer';

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
// 召唤效果（委托通用 SummonEffect 组件）
// ============================================================================

/** 卡牌宽高比（与 CardSprite 一致） */
const CARD_ASPECT_RATIO = 1044 / 729;
/** 卡牌在格子内的宽度比例（与 UnitCell 的 w-[85%] 一致） */
const CARD_WIDTH_RATIO = 0.85;

/**
 * 特效容器：以格子为定位基准，内部用与卡牌相同的 aspectRatio 约束尺寸。
 * overflowScale 控制容器相对于格子的放大倍数（用于需要溢出的特效如召唤光柱）。
 */
const EffectCellContainer: React.FC<{
  pos: { left: number; top: number; width: number; height: number };
  overflowScale?: number;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ pos, overflowScale = 1, className = '', style, children }) => {
  // 容器定位到格子（或放大后居中）
  const w = pos.width * overflowScale;
  const h = pos.height * overflowScale;
  const l = pos.left - (w - pos.width) / 2;
  const t = pos.top - (h - pos.height) / 2;

  return (
    <div
      className={`absolute pointer-events-none flex items-center justify-center ${className}`}
      style={{ left: `${l}%`, top: `${t}%`, width: `${w}%`, height: `${h}%`, overflow: 'visible', ...style }}
    >
      {/* 内层：与卡牌相同的宽度比例 + 宽高比，确保特效与卡牌大小一致 */}
      <div
        className="relative"
        style={{ width: `${CARD_WIDTH_RATIO * 100}%`, aspectRatio: `${CARD_ASPECT_RATIO}`, maxHeight: '100%' }}
      >
        {children}
      </div>
    </div>
  );
};

const SummonEffectAdapter: React.FC<{
  effect: BoardEffectData;
  getCellPosition: (row: number, col: number) => { left: number; top: number; width: number; height: number };
  onComplete: (id: string) => void;
}> = ({ effect, getCellPosition, onComplete }) => {
  const pos = getCellPosition(effect.position.row, effect.position.col);
  const isStrong = effect.intensity === 'strong';

  // 召唤光柱需要比卡牌大得多的 canvas 空间，不走卡牌大小约束
  // 容器以格子为中心放大 7.5 倍（1.5x 原始 5 倍），canvas 铺满整个容器
  const scale = 7.5;
  const w = pos.width * scale;
  const h = pos.height * scale;
  const l = pos.left - (w - pos.width) / 2;
  const t = pos.top - (h - pos.height) / 2;

  return (
    <div
      className="absolute pointer-events-none z-30"
      style={{ left: `${l}%`, top: `${t}%`, width: `${w}%`, height: `${h}%` }}
    >
      <SummonEffect
        active
        intensity={effect.intensity}
        color={isStrong ? 'gold' : 'blue'}
        originY={0.5}
        onComplete={() => onComplete(effect.id)}
      />
    </div>
  );
};

// ============================================================================
// 攻击气浪（委托通用 ConeBlast 组件）
// ============================================================================

const ShockwaveEffect: React.FC<{
  effect: BoardEffectData;
  getCellPosition: (row: number, col: number) => { left: number; top: number; width: number; height: number };
  onComplete: (id: string) => void;
}> = ({ effect, getCellPosition, onComplete }) => {
  const src = effect.sourcePosition;
  if (!src) { onComplete(effect.id); return null; }

  const isRanged = effect.attackType === 'ranged';

  // 近战：不需要气浪投射，直接在目标位置播放受击反馈
  if (!isRanged) {
    const tgtPos = getCellPosition(effect.position.row, effect.position.col);
    const dmg = effect.damageAmount ?? (effect.intensity === 'strong' ? 3 : 1);
    return (
      <EffectCellContainer pos={tgtPos} className="z-30">
        <ImpactContainer
          isActive
          damage={dmg}
          effects={{ shake: true, hitStop: false }}
          className="absolute inset-0"
          style={{ overflow: 'visible' }}
          onComplete={() => onComplete(effect.id)}
        >
          <DamageFlash
            active
            damage={dmg}
            intensity={effect.intensity}
          />
        </ImpactContainer>
      </EffectCellContainer>
    );
  }

  // 远程：旋风锥形气浪从源飞向目标
  const srcPos = getCellPosition(src.row, src.col);
  const tgtPos = getCellPosition(effect.position.row, effect.position.col);

  const srcCx = srcPos.left + srcPos.width / 2;
  const srcCy = srcPos.top + srcPos.height / 2;
  const tgtCx = tgtPos.left + tgtPos.width / 2;
  const tgtCy = tgtPos.top + tgtPos.height / 2;

  return (
    <ConeBlast
      start={{ xPct: srcCx, yPct: srcCy }}
      end={{ xPct: tgtCx, yPct: tgtCy }}
      intensity={effect.intensity}
      onComplete={() => onComplete(effect.id)}
      className="z-30"
    />
  );
};

// ============================================================================
// 受伤效果（委托通用 DamageFlash 组件）
// ============================================================================

const DamageEffectAdapter: React.FC<{
  effect: BoardEffectData;
  getCellPosition: (row: number, col: number) => { left: number; top: number; width: number; height: number };
  onComplete: (id: string) => void;
}> = ({ effect, getCellPosition, onComplete }) => {
  const pos = getCellPosition(effect.position.row, effect.position.col);
  const isStrong = effect.intensity === 'strong';
  const dmg = effect.damageAmount ?? (isStrong ? 3 : 1);

  return (
    <EffectCellContainer pos={pos} className="z-30">
      <ImpactContainer
        isActive
        damage={dmg}
        effects={{ shake: true, hitStop: false }}
        className="absolute inset-0"
        style={{ overflow: 'visible' }}
        onComplete={() => onComplete(effect.id)}
      >
        <DamageFlash
          active
          damage={dmg}
          intensity={effect.intensity}
        />
      </ImpactContainer>
    </EffectCellContainer>
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
}> = ({ effects, getCellPosition, onEffectComplete }) => {
  const hasSummon = effects.some((e) => e.type === 'summon');

  return (
    <div className="absolute inset-0 pointer-events-none z-20" style={{ overflow: 'visible' }}>
      {/* 召唤暗角遮罩：召唤时场景变暗，聚焦光柱 */}
      <AnimatePresence>
        {hasSummon && (
          <motion.div
            key="summon-dim"
            className="absolute inset-0 z-10"
            style={{ background: 'radial-gradient(circle, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.5) 60%, rgba(0,0,0,0.7) 100%)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />
        )}
      </AnimatePresence>

      {/* 特效层（在遮罩之上） */}
      <AnimatePresence>
        {effects.map((effect) => {
          switch (effect.type) {
            case 'summon':
              return <SummonEffectAdapter key={effect.id} effect={effect} getCellPosition={getCellPosition} onComplete={onEffectComplete} />;
            case 'shockwave':
              return <ShockwaveEffect key={effect.id} effect={effect} getCellPosition={getCellPosition} onComplete={onEffectComplete} />;
            case 'damage':
              return <DamageEffectAdapter key={effect.id} effect={effect} getCellPosition={getCellPosition} onComplete={onEffectComplete} />;
            default:
              return null;
          }
        })}
      </AnimatePresence>
    </div>
  );
};

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
