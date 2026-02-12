/**
 * UI 类特效预览卡片
 */

import React, { useCallback, useRef } from 'react';
import { MessageCircle, Sun } from 'lucide-react';
import { FloatingTextLayer, useFloatingText } from '../../../components/common/animations/FloatingText';
import { PulseGlow } from '../../../components/common/animations/PulseGlow';
import {
  type PreviewCardProps,
  EffectCard, TriggerButton,
  usePerfCounter,
} from './shared';

// ============================================================================
// 飘字
// ============================================================================

export const FloatingTextCard: React.FC<PreviewCardProps> = ({ iconColor }) => {
  const { texts, pushText, removeText } = useFloatingText();
  const containerRef = useRef<HTMLDivElement>(null);
  const { stats, startMeasure } = usePerfCounter();

  const trigger = useCallback((type: 'damage' | 'heal', value: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    pushText({ type, content: type === 'damage' ? `-${value}` : `+${value}`, position: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }, intensity: value });
    const stop = startMeasure();
    setTimeout(stop, 900);
  }, [pushText, startMeasure]);

  return (
    <EffectCard title="飘字" icon={MessageCircle} iconColor={iconColor} desc="弹出 → 弹性缩回 → 上浮淡出" stats={stats}
      buttons={<>
        <TriggerButton label="-1" onClick={() => trigger('damage', 1)} color="bg-red-700 hover:bg-red-600" />
        <TriggerButton label="-5" onClick={() => trigger('damage', 5)} color="bg-red-700 hover:bg-red-600" />
        <TriggerButton label="-10" onClick={() => trigger('damage', 10)} color="bg-red-700 hover:bg-red-600" />
        <TriggerButton label="+3" onClick={() => trigger('heal', 3)} color="bg-emerald-700 hover:bg-emerald-600" />
        <TriggerButton label="+8" onClick={() => trigger('heal', 8)} color="bg-emerald-700 hover:bg-emerald-600" />
      </>}
    >
      <div ref={containerRef} className="absolute inset-0" />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[10px] text-slate-600">飘字区域</span>
      </div>
      <FloatingTextLayer texts={texts} onComplete={removeText} />
    </EffectCard>
  );
};

// ============================================================================
// 脉冲发光
// ============================================================================

export const PulseGlowCard: React.FC<PreviewCardProps> = ({ iconColor }) => {
  const [isGlowing, setIsGlowing] = React.useState(false);
  const [loop, setLoop] = React.useState(false);
  const [effect, setEffect] = React.useState<'glow' | 'ripple'>('glow');

  const triggerOnce = useCallback(() => {
    setLoop(false);
    setIsGlowing(false);
    requestAnimationFrame(() => setIsGlowing(true));
    setTimeout(() => setIsGlowing(false), 1200);
  }, []);

  return (
    <EffectCard title="脉冲发光" icon={Sun} iconColor={iconColor} desc="发光/涟漪，单次或循环"
      buttons={<>
        <TriggerButton label="发光" onClick={() => { setEffect('glow'); triggerOnce(); }} color="bg-amber-700 hover:bg-amber-600" />
        <TriggerButton label="发光·循环" onClick={() => { setEffect('glow'); setLoop(true); setIsGlowing(true); }} color="bg-amber-700 hover:bg-amber-600" />
        <TriggerButton label="涟漪" onClick={() => { setEffect('ripple'); triggerOnce(); }} color="bg-teal-700 hover:bg-teal-600" />
        <TriggerButton label="停止" onClick={() => { setIsGlowing(false); setLoop(false); }} color="bg-slate-600 hover:bg-slate-500" />
      </>}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <PulseGlow isGlowing={isGlowing} glowColor="rgba(251, 191, 36, 0.6)" loop={loop} effect={effect}
          className="w-14 h-14 rounded-xl bg-amber-900/40 border border-amber-600/50 flex items-center justify-center"
        >
          <span className="text-lg">⚡</span>
        </PulseGlow>
      </div>
    </EffectCard>
  );
};
