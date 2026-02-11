/**
 * Vortex Fragment Shader — 流体旋涡特效
 *
 * 核心算法：
 * 1. UV → 极坐标 (r, θ)
 * 2. 螺旋扭曲：twist = θ + r × tightness − time × speed
 * 3. sin() 定义 3 条旋臂基础结构
 * 4. FBM 噪声叠加有机流体细节
 * 5. 双层旋涡（不同臂数/速度）增加深度
 * 6. 三阶段时间控制：聚拢 → 脉冲 → 消散
 * 7. density → 颜色梯度映射（base → accent → bright → white）
 *
 * 自动注入 uniform（由 ShaderCanvas 提供）：
 * - uTime       (float)
 * - uResolution (vec2)
 * - uProgress   (float)
 *
 * 自定义 uniform：
 * - uDuration        (float) — 总时长（秒）
 * - uBaseColor       (vec3)  — 主色调（归一化 0-1）
 * - uAccentColor     (vec3)  — 副色调
 * - uBrightColor     (vec3)  — 高光色
 * - uSpiralTightness (float) — 螺旋紧密度（推荐 3.0 ~ 6.0）
 * - uRotationSpeed   (float) — 旋转速度（弧度/秒，推荐 1.5 ~ 3.0）
 * - uIntensity       (float) — 整体强度系数（0.8=normal, 1.2=strong）
 */

import { NOISE_GLSL } from '../glsl/noise.glsl';

const VORTEX_MAIN = /* glsl */ `

// ---- Varying ----
varying vec2 vUv;

// ---- Built-in uniform (ShaderCanvas) ----
uniform float uTime;
uniform vec2  uResolution;
uniform float uProgress;

// ---- Custom uniform ----
uniform float uDuration;
uniform vec3  uBaseColor;
uniform vec3  uAccentColor;
uniform vec3  uBrightColor;
uniform float uSpiralTightness;
uniform float uRotationSpeed;
uniform float uIntensity;

// ---- Constants ----
const float PI = 3.14159265359;
const float TAU = 6.28318530718;

// ---- Easing ----
float easeOutExpo(float t) {
  return t >= 1.0 ? 1.0 : 1.0 - pow(2.0, -10.0 * t);
}

void main() {
  // ---- 坐标系 ----
  vec2 uv = vUv - 0.5;
  float aspect = uResolution.x / uResolution.y;
  uv.x *= aspect;

  float r = length(uv);
  float theta = atan(uv.y, uv.x);
  float t = uProgress;

  // ---- 阶段分界 ----
  float gatherEnd = 0.55;
  float pulseEnd  = 0.78;

  // ================================================================
  // 主旋涡层（3 臂）
  // ================================================================
  float twist1 = theta + r * uSpiralTightness - uTime * uRotationSpeed;
  float numArms1 = 3.0;

  // 旋臂基础结构：sin() 产生周期分布，pow() 收窄臂宽
  float spiral1 = 0.5 + 0.5 * sin(twist1 * numArms1);
  spiral1 = pow(spiral1, 1.8);

  // FBM 有机细节
  vec2 noiseCoord1 = vec2(twist1 * numArms1 / TAU, r * 5.0);
  float noise1 = fbm(noiseCoord1 + uTime * 0.25);

  float density = spiral1 * (0.45 + 0.55 * noise1);

  // ================================================================
  // 副旋涡层（4 臂，反向慢速）— 增加深度和非对称感
  // ================================================================
  float twist2 = theta - r * uSpiralTightness * 1.3 + uTime * uRotationSpeed * 0.6;
  float numArms2 = 4.0;

  float spiral2 = 0.5 + 0.5 * sin(twist2 * numArms2);
  spiral2 = pow(spiral2, 2.2);

  float noise2 = fbm3(vec2(twist2 * numArms2 / TAU, r * 3.5) - uTime * 0.15);
  density += spiral2 * (0.3 + 0.4 * noise2) * 0.35;

  // ================================================================
  // 中心核心辉光（指数衰减）
  // ================================================================
  density += exp(-r * 14.0) * 0.6;

  // ================================================================
  // 阶段 1：聚拢（0 ~ gatherEnd）
  //   旋涡淡入 + 径向收缩
  // ================================================================
  float maxR = 0.45;

  if (t < gatherEnd) {
    float gt = t / gatherEnd;
    // 淡入
    density *= smoothstep(0.0, 0.25, gt);
    // 径向收缩：外边界从 0.45 缩至 0.18
    maxR = mix(0.45, 0.18, gt * gt);
  } else {
    maxR = 0.18;
  }

  // 径向衰减（柔和裁剪）
  density *= smoothstep(maxR, maxR * 0.1, r);

  // ================================================================
  // 阶段 2：脉冲爆发（gatherEnd ~ pulseEnd）
  //   中心白闪 + 冲击波环 + 旋涡衰减
  // ================================================================
  float flashContrib = 0.0;
  float ringContrib = 0.0;

  if (t >= gatherEnd && t < pulseEnd) {
    float pt = (t - gatherEnd) / (pulseEnd - gatherEnd);
    float eased = easeOutExpo(pt);

    // 中心白闪
    flashContrib = exp(-r * 28.0) * (1.0 - pt) * 2.5;

    // 冲击波环（Gaussian 环）
    float ringR = 0.35 * eased;
    float ringWidth = 40.0;
    ringContrib = exp(-pow((r - ringR) * ringWidth, 2.0)) * (1.0 - pt) * 0.8;

    // 旋涡在脉冲期间衰减
    density *= mix(1.0, 0.15, pt);
  }

  // ================================================================
  // 阶段 3：消散（pulseEnd ~ 1.0）
  //   整体淡出 + 残余辉光
  // ================================================================
  if (t >= pulseEnd) {
    float ft = (t - pulseEnd) / (1.0 - pulseEnd);
    density *= 1.0 - ft * ft;
    // 残余中心辉光
    density += exp(-r * 18.0) * (1.0 - ft) * 0.25;
  }

  // ================================================================
  // 颜色映射
  // ================================================================
  // density 梯度 → 颜色梯度
  vec3 col = uBaseColor;
  col = mix(col, uAccentColor, smoothstep(0.08, 0.35, density));
  col = mix(col, uBrightColor, smoothstep(0.35, 0.65, density));
  col = mix(col, vec3(1.0),    smoothstep(0.65, 0.95, density));

  // 脉冲闪光颜色（白偏高光色）
  col = mix(col, uBrightColor, ringContrib);
  col = mix(col, vec3(1.0),    flashContrib * 0.8);

  // ================================================================
  // 最终输出
  // ================================================================
  float alpha = clamp(
    (density + flashContrib + ringContrib) * uIntensity,
    0.0, 1.0
  );

  gl_FragColor = vec4(col * alpha, alpha);
}
`;

/**
 * 完整的旋涡 Fragment Shader 源码
 * （Simplex Noise + FBM + Vortex Main）
 */
export const VORTEX_FRAG =
  'precision mediump float;\n' +
  NOISE_GLSL + '\n' +
  VORTEX_MAIN;
