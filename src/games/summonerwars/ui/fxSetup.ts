/**
 * 召唤师战争 — FX 注册表配置
 *
 * 职责：
 * 1. 定义游戏专属的 cue 常量
 * 2. 将底层动画组件包装为 FxRenderer
 * 3. 创建并注册 FxRegistry 单例
 *
 * 渲染器（Renderer）是轻量适配层，负责：
 * - 从 FxEvent 中提取 ctx/params
 * - 计算格坐标 → 容器定位
 * - 委托底层动画组件（SummonEffect、VortexEffect 等）
 */

import React, { useRef, useCallback } from 'react';
import { FxRegistry, type FxRendererProps } from '../../../engine/fx';
import { SummonEffect } from '../../../components/common/animations/SummonEffect';
import { VortexShaderEffect } from '../../../components/common/animations/VortexShaderEffect';
import { ConeBlast } from '../../../components/common/animations/ConeBlast';
import { DamageFlash } from '../../../components/common/animations/DamageFlash';
import { ImpactContainer } from '../../../components/common/animations/ImpactContainer';

// ============================================================================
// Cue 常量
// ============================================================================

/** 召唤师战争 FX Cue 常量 */
export const SW_FX = {
  /** 召唤光柱 */
  SUMMON: 'fx.summon',
  /** 充能旋涡 */
  CHARGE_VORTEX: 'fx.charge.vortex',
  /** 攻击气浪 */
  COMBAT_SHOCKWAVE: 'fx.combat.shockwave',
  /** 受伤闪光 */
  COMBAT_DAMAGE: 'fx.combat.damage',
} as const;

// ============================================================================
// 通用布局常量
// ============================================================================

/** 卡牌宽高比（与 CardSprite 一致） */
const CARD_ASPECT_RATIO = 1044 / 729;
/** 卡牌在格子内的宽度比例（与 UnitCell 的 w-[85%] 一致） */
const CARD_WIDTH_RATIO = 0.85;

// ============================================================================
// 通用容器工具
// ============================================================================

/** 以格子为中心，按 scale 放大容器定位 */
function scaledCellBox(
  pos: { left: number; top: number; width: number; height: number },
  scale: number,
) {
  const w = pos.width * scale;
  const h = pos.height * scale;
  const l = pos.left - (w - pos.width) / 2;
  const t = pos.top - (h - pos.height) / 2;
  return { left: `${l}%`, top: `${t}%`, width: `${w}%`, height: `${h}%` };
}

// ============================================================================
// 稳定回调 hook（避免父组件重新渲染导致动画重播）
// ============================================================================

function useStableComplete(onComplete: () => void): () => void {
  const ref = useRef(onComplete);
  ref.current = onComplete;
  return useCallback(() => ref.current(), []);
}

// ============================================================================
// 渲染器：召唤光柱
// ============================================================================

/**
 * params:
 * - color?: 'blue' | 'gold' (默认根据 intensity 自动选择)
 */
const SummonRenderer: React.FC<FxRendererProps> = ({ event, getCellPosition, onComplete }) => {
  const cell = event.ctx.cell;
  if (!cell) { onComplete(); return null; }

  const pos = getCellPosition(cell.row, cell.col);
  const isStrong = event.ctx.intensity === 'strong';
  const color = (event.params?.color as 'blue' | 'gold') ?? (isStrong ? 'gold' : 'blue');
  const stableComplete = useStableComplete(onComplete);

  const scale = 7.5;
  const box = scaledCellBox(pos, scale);

  return React.createElement('div', {
    className: 'absolute pointer-events-none z-30',
    style: box,
  },
    React.createElement(SummonEffect, {
      active: true,
      intensity: event.ctx.intensity ?? 'normal',
      color,
      originY: 0.5,
      onComplete: stableComplete,
    }),
  );
};

// ============================================================================
// 渲染器：充能旋涡
// ============================================================================

const ChargeVortexRenderer: React.FC<FxRendererProps> = ({ event, getCellPosition, onComplete }) => {
  const cell = event.ctx.cell;
  if (!cell) { onComplete(); return null; }

  const pos = getCellPosition(cell.row, cell.col);
  const stableComplete = useStableComplete(onComplete);

  const scale = 4;
  const box = scaledCellBox(pos, scale);

  return React.createElement('div', {
    className: 'absolute pointer-events-none z-30',
    style: box,
  },
    React.createElement(VortexShaderEffect, {
      active: true,
      intensity: event.ctx.intensity ?? 'normal',
      onComplete: stableComplete,
    }),
  );
};

// ============================================================================
// 渲染器：攻击气浪（远程）/ 近战受击
// ============================================================================

/**
 * params:
 * - attackType: 'melee' | 'ranged'
 * - source: { row, col }        — 攻击来源坐标
 * - damageAmount?: number
 */
const ShockwaveRenderer: React.FC<FxRendererProps> = ({ event, getCellPosition, onComplete }) => {
  const cell = event.ctx.cell;
  const source = event.params?.source as { row: number; col: number } | undefined;
  if (!cell || !source) { onComplete(); return null; }

  const isRanged = event.params?.attackType === 'ranged';
  const stableComplete = useStableComplete(onComplete);

  if (!isRanged) {
    // 近战：目标位置播放受击反馈
    const tgtPos = getCellPosition(cell.row, cell.col);
    const dmg = (event.params?.damageAmount as number) ?? (event.ctx.intensity === 'strong' ? 3 : 1);

    // EffectCellContainer 逻辑内联
    const w = tgtPos.width;
    const h = tgtPos.height;
    return React.createElement('div', {
      className: 'absolute pointer-events-none flex items-center justify-center z-30',
      style: { left: `${tgtPos.left}%`, top: `${tgtPos.top}%`, width: `${w}%`, height: `${h}%`, overflow: 'visible' },
    },
      React.createElement('div', {
        className: 'relative',
        style: { width: `${CARD_WIDTH_RATIO * 100}%`, aspectRatio: `${CARD_ASPECT_RATIO}`, maxHeight: '100%' },
      },
        React.createElement(ImpactContainer, {
          isActive: true,
          damage: dmg,
          effects: { shake: true, hitStop: false },
          className: 'absolute inset-0',
          style: { overflow: 'visible' },
          onComplete: stableComplete,
        },
          React.createElement(DamageFlash, {
            active: true,
            damage: dmg,
            intensity: event.ctx.intensity ?? 'normal',
          }),
        ),
      ),
    );
  }

  // 远程：旋风锥形气浪从源飞向目标
  const srcPos = getCellPosition(source.row, source.col);
  const tgtPos = getCellPosition(cell.row, cell.col);

  const srcCx = srcPos.left + srcPos.width / 2;
  const srcCy = srcPos.top + srcPos.height / 2;
  const tgtCx = tgtPos.left + tgtPos.width / 2;
  const tgtCy = tgtPos.top + tgtPos.height / 2;

  return React.createElement(ConeBlast, {
    start: { xPct: srcCx, yPct: srcCy },
    end: { xPct: tgtCx, yPct: tgtCy },
    intensity: event.ctx.intensity ?? 'normal',
    onComplete: stableComplete,
    className: 'z-30',
  });
};

// ============================================================================
// 渲染器：受伤闪光
// ============================================================================

/**
 * params:
 * - damageAmount?: number
 */
const DamageRenderer: React.FC<FxRendererProps> = ({ event, getCellPosition, onComplete }) => {
  const cell = event.ctx.cell;
  if (!cell) { onComplete(); return null; }

  const pos = getCellPosition(cell.row, cell.col);
  const isStrong = event.ctx.intensity === 'strong';
  const dmg = (event.params?.damageAmount as number) ?? (isStrong ? 3 : 1);
  const stableComplete = useStableComplete(onComplete);

  return React.createElement('div', {
    className: 'absolute pointer-events-none flex items-center justify-center z-30',
    style: { left: `${pos.left}%`, top: `${pos.top}%`, width: `${pos.width}%`, height: `${pos.height}%`, overflow: 'visible' },
  },
    React.createElement('div', {
      className: 'relative',
      style: { width: `${CARD_WIDTH_RATIO * 100}%`, aspectRatio: `${CARD_ASPECT_RATIO}`, maxHeight: '100%' },
    },
      React.createElement(ImpactContainer, {
        isActive: true,
        damage: dmg,
        effects: { shake: true, hitStop: false },
        className: 'absolute inset-0',
        style: { overflow: 'visible' },
        onComplete: stableComplete,
      },
        React.createElement(DamageFlash, {
          active: true,
          damage: dmg,
          intensity: event.ctx.intensity ?? 'normal',
        }),
      ),
    ),
  );
};

// ============================================================================
// 注册表工厂
// ============================================================================

/** 创建召唤师战争 FX 注册表（模块级单例） */
function createRegistry(): FxRegistry {
  const registry = new FxRegistry();

  registry.register(SW_FX.SUMMON, SummonRenderer, {
    timeoutMs: 4000,
  });

  registry.register(SW_FX.CHARGE_VORTEX, ChargeVortexRenderer, {
    timeoutMs: 3000,
  });

  registry.register(SW_FX.COMBAT_SHOCKWAVE, ShockwaveRenderer, {
    timeoutMs: 3000,
  });

  registry.register(SW_FX.COMBAT_DAMAGE, DamageRenderer, {
    timeoutMs: 3000,
  });

  return registry;
}

/** 模块级单例 — 整个应用生命周期共享 */
export const summonerWarsFxRegistry = createRegistry();
