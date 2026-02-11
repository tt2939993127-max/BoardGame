/**
 * VortexShaderEffect — WebGL Shader 版旋涡充能特效
 *
 * 与 VortexEffect 拥有相同的 Props 接口，可直接替换。
 * 内部使用 ShaderCanvas + vortex.frag 实现逐像素的流体旋涡渲染，
 * 视觉质量远超 Canvas 2D 粒子方案。
 *
 * 降级策略：若浏览器不支持 WebGL，ShaderCanvas 会自动触发 onComplete，
 * 调用方可搭配 Canvas 2D 版本做回退。
 *
 * @example
 * ```tsx
 * <div className="relative" style={{ minHeight: 120 }}>
 *   <VortexShaderEffect active intensity="normal" />
 * </div>
 * ```
 */

import React from 'react';
import { ShaderCanvas } from '../../../engine/fx/shader/ShaderCanvas';
import { VORTEX_FRAG } from '../../../engine/fx/shader/shaders/vortex.frag';
import type { VortexIntensity, VortexColorTheme, VortexColorSet } from './VortexEffect';

// ============================================================================
// Props
// ============================================================================

export interface VortexShaderEffectProps {
  active: boolean;
  intensity?: VortexIntensity;
  color?: VortexColorTheme;
  customColors?: VortexColorSet;
  onComplete?: () => void;
  className?: string;
}

// ============================================================================
// 颜色预设（归一化到 0-1 供 GLSL 使用）
// ============================================================================

type NormalizedColorSet = {
  main: [number, number, number];
  sub: [number, number, number];
  bright: [number, number, number];
};

const COLOR_PRESETS: Record<'blue' | 'purple' | 'green', NormalizedColorSet> = {
  blue: {
    main:   [96 / 255, 165 / 255, 250 / 255],   // blue-400
    sub:    [59 / 255, 130 / 255, 246 / 255],    // blue-500
    bright: [191 / 255, 219 / 255, 254 / 255],   // blue-200
  },
  purple: {
    main:   [168 / 255, 85 / 255, 247 / 255],
    sub:    [124 / 255, 58 / 255, 237 / 255],
    bright: [232 / 255, 200 / 255, 255 / 255],
  },
  green: {
    main:   [74 / 255, 222 / 255, 128 / 255],
    sub:    [34 / 255, 197 / 255, 94 / 255],
    bright: [200 / 255, 255 / 255, 220 / 255],
  },
};

function resolveNormColors(
  color: VortexColorTheme,
  custom?: VortexColorSet,
): NormalizedColorSet {
  if (color === 'custom' && custom) {
    return {
      main: [custom.main[0] / 255, custom.main[1] / 255, custom.main[2] / 255],
      sub: [custom.sub[0] / 255, custom.sub[1] / 255, custom.sub[2] / 255],
      bright: [custom.bright[0] / 255, custom.bright[1] / 255, custom.bright[2] / 255],
    };
  }
  return COLOR_PRESETS[color === 'custom' ? 'blue' : color];
}

// ============================================================================
// 组件
// ============================================================================

export const VortexShaderEffect: React.FC<VortexShaderEffectProps> = ({
  active,
  intensity = 'normal',
  color = 'blue',
  customColors,
  onComplete,
  className = '',
}) => {
  if (!active) return null;

  const isStrong = intensity === 'strong';
  const c = resolveNormColors(color, customColors);
  const dur = isStrong ? 1.1 : 0.85;

  return (
    <ShaderCanvas
      fragmentShader={VORTEX_FRAG}
      uniforms={{
        uDuration: dur,
        uBaseColor: c.main,
        uAccentColor: c.sub,
        uBrightColor: c.bright,
        uSpiralTightness: 4.5,
        uRotationSpeed: 2.2,
        uIntensity: isStrong ? 1.3 : 0.9,
      }}
      duration={dur}
      onComplete={onComplete}
      className={`absolute inset-0 ${className}`}
    />
  );
};
