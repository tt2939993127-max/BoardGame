/**
 * 游戏玩法类特效预览卡片
 *
 * 包含与游戏机制相关的特效（基地占领、得分等）。
 */
/* eslint-disable react-refresh/only-export-components -- devtools preview cards */

import React, { useState, useCallback } from 'react';
import { Castle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { BaseCaptureEffect } from '../../../components/common/animations/BaseCaptureEffect';
import { BurstParticles } from '../../../components/common/animations/BurstParticles';
import {
  type PreviewCardProps, type EffectEntryMeta,
  EffectCard, TriggerButton, ToggleChip,
  useEffectTrigger,
} from './shared';

// ============================================================================
// 基地占领特效
// ============================================================================

/** 模拟基地卡牌 */
const FakeBaseCard: React.FC<{
  label: string;
  color: string;
  visible: boolean;
}> = ({ label, color, visible }) => (
  <motion.div
    className={`absolute inset-0 rounded-lg border-2 flex flex-col items-center justify-center ${color}`}
    initial={false}
    animate={{
      opacity: visible ? 1 : 0,
      scale: visible ? 1 : 0.3,
    }}
    transition={{ duration: 0.4, ease: 'easeOut' }}
  >
    <span className="text-xs font-bold text-white drop-shadow">{label}</span>
    <span className="text-[9px] text-white/60 mt-0.5">突破点: 20</span>
  </motion.div>
);

export const BaseCaptureCard: React.FC<PreviewCardProps> = ({ iconColor }) => {
  const [phase, setPhase] = useState<'idle' | 'capturing' | 'done'>('idle');
  const [showOld, setShowOld] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [showParticles, setShowParticles] = useState(true);
  const [showGlow, setShowGlow] = useState(true);
  const { stats, startMeasure } = useEffectTrigger(2000);

  const trigger = useCallback(() => {
    // 重置状态
    setPhase('idle');
    setShowOld(true);
    setShowNew(false);
    requestAnimationFrame(() => {
      setPhase('capturing');
      startMeasure();
    });
  }, [startMeasure]);

  const handleTransition = useCallback(() => {
    // 碎裂完成，切换到新基地
    setShowOld(false);
    setShowNew(true);
  }, []);

  const handleComplete = useCallback(() => {
    setPhase('done');
  }, []);

  const reset = useCallback(() => {
    setPhase('idle');
    setShowOld(true);
    setShowNew(false);
  }, []);

  return (
    <EffectCard
      title="基地占领"
      icon={Castle}
      iconColor={iconColor}
      desc="旧基地碎裂 → 能量汇聚 → 新基地出现"
      stats={stats}
      buttons={<>
        <TriggerButton label="触发占领" onClick={trigger} color="bg-amber-700 hover:bg-amber-600" />
        <TriggerButton label="重置" onClick={reset} color="bg-slate-600 hover:bg-slate-500" />
        <div className="flex flex-wrap gap-1">
          <ToggleChip label="粒子" active={showParticles} onClick={() => setShowParticles(v => !v)} />
          <ToggleChip label="光晕" active={showGlow} onClick={() => setShowGlow(v => !v)} />
        </div>
      </>}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        {/* 基地容器 */}
        <div className="relative w-40 h-28 rounded-lg">
          {/* 旧基地 */}
          <FakeBaseCard
            label="罗兹 9 号"
            color="bg-gradient-to-br from-slate-700 to-slate-800 border-slate-500/50"
            visible={showOld}
          />

          {/* 新基地 */}
          <FakeBaseCard
            label="中央指挥部"
            color="bg-gradient-to-br from-amber-700 to-orange-800 border-amber-400/50"
            visible={showNew}
          />

          {/* 占领特效 */}
          {phase === 'capturing' && (
            <>
              <BaseCaptureEffect
                active
                showParticles={showParticles}
                showGlow={showGlow}
                onTransition={handleTransition}
                onComplete={handleComplete}
              />
              {/* 额外爆发粒子（可选） */}
              {showParticles && (
                <BurstParticles
                  active
                  preset="explosion"
                  color={['#94a3b8', '#64748b', '#475569']}
                  onComplete={() => {}}
                />
              )}
            </>
          )}

          {/* 新基地出现时的庆祝粒子 */}
          <AnimatePresence>
            {showNew && phase === 'capturing' && showParticles && (
              <BurstParticles
                active
                preset="summonGlow"
                color={['#fbbf24', '#f59e0b', '#fcd34d', '#fff']}
                onComplete={() => {}}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </EffectCard>
  );
};

// ============================================================================
// 自动注册元数据
// ============================================================================

export const meta: EffectEntryMeta[] = [
  {
    id: 'baseCapture',
    label: '基地占领',
    icon: Castle,
    component: BaseCaptureCard,
    group: 'gameplay',
    usageDesc: '大杀四方·基地被占领后的替换动画',
  },
];
