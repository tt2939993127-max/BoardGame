/**
 * 召唤师战争 - 能量条组件
 * 保持图标、分段和数值在移动端按比例缩放。
 */

import React from 'react';

type EnergyBarSize = 'normal' | 'compact';

interface EnergyBarSizing {
  rootGap: string;
  iconSize: string;
  segmentGap: string;
  segmentWidth: string;
  segmentHeight: string;
  textSize: string;
  valueWidth: string;
}

const ENERGY_BAR_SIZES: Record<EnergyBarSize, EnergyBarSizing> = {
  normal: {
    rootGap: 'calc(var(--sw-board-reference-width, 1280px) * 0.006875)',
    iconSize: 'calc(var(--sw-board-reference-width, 1280px) * 0.015625)',
    segmentGap: 'calc(var(--sw-board-reference-width, 1280px) * 0.0015625)',
    segmentWidth: 'calc(var(--sw-board-reference-width, 1280px) * 0.009375)',
    segmentHeight: 'calc(var(--sw-board-reference-width, 1280px) * 0.0125)',
    textSize: 'calc(var(--sw-board-reference-width, 1280px) * 0.0125)',
    valueWidth: 'calc(var(--sw-board-reference-width, 1280px) * 0.021875)',
  },
  compact: {
    rootGap: 'calc(var(--sw-board-reference-width, 1280px) * 0.005625)',
    iconSize: 'calc(var(--sw-board-reference-width, 1280px) * 0.013125)',
    segmentGap: 'calc(var(--sw-board-reference-width, 1280px) * 0.0015625)',
    segmentWidth: 'calc(var(--sw-board-reference-width, 1280px) * 0.007)',
    segmentHeight: 'calc(var(--sw-board-reference-width, 1280px) * 0.0095)',
    textSize: 'calc(var(--sw-board-reference-width, 1280px) * 0.0115)',
    valueWidth: 'calc(var(--sw-board-reference-width, 1280px) * 0.018125)',
  },
};

export interface EnergyBarProps {
  current: number;
  max?: number;
  isOpponent?: boolean;
  testId?: string;
  className?: string;
  size?: EnergyBarSize;
}

export const EnergyBar: React.FC<EnergyBarProps> = ({
  current,
  max = 15,
  testId,
  className = '',
  size = 'normal',
}) => {
  const total = Math.max(0, max);
  const sizing = ENERGY_BAR_SIZES[size];

  return (
    <div
      className={`flex items-center ${className}`}
      data-testid={testId}
      style={{ gap: sizing.rootGap }}
    >
      <svg
        className="shrink-0 text-purple-400"
        viewBox="0 0 24 24"
        fill="currentColor"
        style={{ width: sizing.iconSize, height: sizing.iconSize }}
      >
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" fill="none" />
      </svg>

      <div className="flex" style={{ gap: sizing.segmentGap }}>
        {Array.from({ length: total + 1 }, (_, value) => {
          const isActive = value <= current;
          const isCurrent = value === current;
          return (
            <div
              key={value}
              className={`rounded-sm transition-all ${isCurrent
                ? 'bg-amber-400 shadow-sm shadow-amber-400/50'
                : isActive
                  ? 'bg-amber-500'
                  : 'bg-slate-700/60'
              }`}
              style={{
                width: sizing.segmentWidth,
                height: sizing.segmentHeight,
              }}
            />
          );
        })}
      </div>

      <span
        className="font-bold text-white"
        style={{
          fontSize: sizing.textSize,
          minWidth: sizing.valueWidth,
        }}
      >
        {current}
      </span>
    </div>
  );
};

export default EnergyBar;
