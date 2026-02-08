/**
 * BurstParticles - 通用爆发粒子特效组件
 *
 * 用于一次性爆发 → 衰减消散的粒子效果（爆炸碎片、召唤碎片、烟尘等）。
 * 基于 tsParticles，动态加载避免首屏体积膨胀。
 *
 * 替代场景：当你需要 >8 个随机散射/衰减的 <motion.div> 时，用这个组件。
 *
 * @example
 * ```tsx
 * <BurstParticles
 *   active={isExploding}
 *   preset="explosion"
 *   color={['#f87171', '#fb923c', '#fbbf24']}
 *   onComplete={() => setIsExploding(false)}
 * />
 * ```
 */

import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import type { ISourceOptions } from '@tsparticles/engine';
import { getParticlesComponent, type ParticlesComponent } from './particleEngine';
import { useParticlePool } from './particlePool';
import type { ParticleLease } from './particlePoolStore';

// ============================================================================
// 预设配置
// ============================================================================

export interface BurstConfig {
  /** 粒子数量 */
  count: number;
  /** 粒子速度范围 */
  speed: { min: number; max: number };
  /** 粒子大小范围 */
  size: { min: number; max: number };
  /** 粒子生命周期（秒） */
  life: { min: number; max: number };
  /** 是否启用重力 */
  gravity: boolean;
  /** 重力加速度（默认 1） */
  gravityAcceleration?: number;
  /** 粒子形状 */
  shapes: string[];
  /** 是否启用旋转 */
  rotate: boolean;
  /** 透明度衰减 */
  opacityDecay: boolean;
  /** 大小衰减 */
  sizeDecay: boolean;
  /** 扩散方向（'none' = 全方向） */
  direction: 'none' | 'top' | 'bottom';
}

export const BURST_PRESETS: Record<string, BurstConfig> = {
  /** 爆炸碎片 - 用于单位/建筑摧毁 */
  explosion: {
    count: 20,
    speed: { min: 8, max: 18 },
    size: { min: 2, max: 6 },
    life: { min: 0.4, max: 0.8 },
    gravity: true,
    gravityAcceleration: 2,
    shapes: ['circle', 'square'],
    rotate: true,
    opacityDecay: true,
    sizeDecay: true,
    direction: 'none',
  },
  /** 强力爆炸 - 用于建筑/冠军摧毁 */
  explosionStrong: {
    count: 30,
    speed: { min: 12, max: 24 },
    size: { min: 3, max: 8 },
    life: { min: 0.5, max: 1.0 },
    gravity: true,
    gravityAcceleration: 1.5,
    shapes: ['circle', 'square'],
    rotate: true,
    opacityDecay: true,
    sizeDecay: true,
    direction: 'none',
  },
  /** 召唤碎片 - 用于单位召唤落地 */
  summonDebris: {
    count: 15,
    speed: { min: 6, max: 14 },
    size: { min: 2, max: 5 },
    life: { min: 0.3, max: 0.6 },
    gravity: true,
    gravityAcceleration: 3,
    shapes: ['square'],
    rotate: true,
    opacityDecay: true,
    sizeDecay: false,
    direction: 'none',
  },
  /** 强力召唤碎片 - 用于冠军召唤 */
  summonDebrisStrong: {
    count: 25,
    speed: { min: 10, max: 20 },
    size: { min: 2, max: 6 },
    life: { min: 0.3, max: 0.7 },
    gravity: true,
    gravityAcceleration: 2.5,
    shapes: ['square', 'circle'],
    rotate: true,
    opacityDecay: true,
    sizeDecay: false,
    direction: 'none',
  },
  /** 烟尘 - 用于摧毁后的烟雾扩散 */
  smoke: {
    count: 8,
    speed: { min: 2, max: 5 },
    size: { min: 8, max: 16 },
    life: { min: 0.5, max: 1.0 },
    gravity: false,
    shapes: ['circle'],
    rotate: false,
    opacityDecay: true,
    sizeDecay: false,
    direction: 'top',
  },
};

// ============================================================================
// 组件
// ============================================================================

export interface BurstParticlesProps {
  /** 是否激活 */
  active: boolean;
  /** 预设名称 */
  preset?: keyof typeof BURST_PRESETS;
  /** 自定义配置（覆盖预设） */
  config?: Partial<BurstConfig>;
  /** 粒子颜色 */
  color?: string[];
  /** 效果完成回调（所有粒子消散后） */
  onComplete?: () => void;
  /** 额外类名 */
  className?: string;
}

/** 将 BurstConfig 转换为 tsParticles ISourceOptions */
function buildOptions(cfg: BurstConfig, colors: string[]): ISourceOptions {
  return {
    fullScreen: { enable: false, zIndex: 0 },
    fpsLimit: 60,
    detectRetina: true,
    particles: {
      number: { value: cfg.count },
      color: { value: colors },
      shape: { type: cfg.shapes },
      opacity: {
        value: { min: 0.7, max: 1 },
        ...(cfg.opacityDecay ? {
          animation: { enable: true, speed: 1.5, startValue: 'max' as const, destroy: 'min' as const },
        } : {}),
      },
      size: {
        value: cfg.size,
        ...(cfg.sizeDecay ? {
          animation: { enable: true, speed: 4, startValue: 'max' as const, destroy: 'min' as const },
        } : {}),
      },
      rotate: cfg.rotate ? {
        value: { min: 0, max: 360 },
        direction: 'random' as const,
        animation: { enable: true, speed: 60 },
      } : undefined,
      move: {
        enable: true,
        speed: cfg.speed,
        direction: cfg.direction === 'none' ? 'none' as const : cfg.direction as 'top' | 'bottom',
        outModes: { default: 'destroy' as const },
        gravity: cfg.gravity ? {
          enable: true,
          acceleration: cfg.gravityAcceleration ?? 1,
        } : { enable: false },
      },
      life: {
        duration: { value: cfg.life },
        count: 1,
      },
    },
  };
}

export const BurstParticles: React.FC<BurstParticlesProps> = ({
  active,
  preset = 'explosion',
  config,
  color = ['#f87171', '#fb923c', '#fbbf24', '#fff'],
  onComplete,
  className = '',
}) => {
  const pool = useParticlePool();
  const [Comp, setComp] = useState<ParticlesComponent | null>(null);
  const [ready, setReady] = useState(false);
  const completeTimerRef = useRef<number>(0);
  const idRef = useRef(`burst-${Math.random().toString(16).slice(2)}`);
  const containerRef = useRef<HTMLDivElement>(null);
  const leaseRef = useRef<ParticleLease | null>(null);

  // 合并预设 + 自定义配置
  const mergedConfig = useMemo<BurstConfig>(() => {
    const base = BURST_PRESETS[preset] ?? BURST_PRESETS.explosion;
    return config ? { ...base, ...config } : base;
  }, [preset, config]);

  const options = useMemo(() => buildOptions(mergedConfig, color), [mergedConfig, color]);

  const releaseLease = useCallback(() => {
    if (!pool || !leaseRef.current) return;
    pool.release(leaseRef.current);
    leaseRef.current = null;
  }, [pool]);

  useEffect(() => {
    if (!active) {
      releaseLease();
      return;
    }
    if (!pool || typeof window === 'undefined') return;
    if (!containerRef.current) return;
    releaseLease();
    const { lease } = pool.acquire({
      target: containerRef.current,
      options,
      label: preset,
    });
    leaseRef.current = lease;
    return () => {
      releaseLease();
    };
  }, [active, options, pool, preset, releaseLease]);

  // 动态加载 tsParticles（fallback：未启用对象池时）
  useEffect(() => {
    if (!active || typeof window === 'undefined') return;
    if (pool) return;
    let mounted = true;

    void getParticlesComponent().then((P) => {
      if (mounted) {
        setComp(() => P);
        setReady(true);
      }
    });

    return () => { mounted = false; };
  }, [active, pool]);

  // 效果完成回调（基于最大生命周期）
  const handleComplete = useCallback(() => {
    const maxLife = mergedConfig.life.max * 1000 + 200; // 加 200ms 缓冲
    completeTimerRef.current = window.setTimeout(() => {
      if (onComplete) onComplete();
      releaseLease();
    }, maxLife);
  }, [mergedConfig.life.max, onComplete, releaseLease]);

  useEffect(() => {
    const canRun = pool ? active : (active && ready);
    if (canRun) {
      handleComplete();
    }
    return () => window.clearTimeout(completeTimerRef.current);
  }, [active, handleComplete, pool, ready]);

  if (!active || typeof window === 'undefined') return null;

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 pointer-events-none ${className}`}
      data-burst-particles
      aria-hidden
    >
      {!pool && Comp && ready ? (
        <Comp
          id={idRef.current}
          options={options}
        />
      ) : null}
    </div>
  );
};

export default BurstParticles;
