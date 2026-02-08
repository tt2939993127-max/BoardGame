/**
 * 特效音频预览工具
 *
 * 独立页面，可在 /dev/fx 访问。
 * 用于预览项目中所有通用动画特效和音频资源，方便调参和验收。
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  FlyingEffectsLayer,
  useFlyingEffects,
  type FlyingEffectData,
} from '../../components/common/animations/FlyingEffect';
import { ShakeContainer, useShake } from '../../components/common/animations/ShakeContainer';
import { HitStopContainer, useHitStop, HIT_STOP_PRESETS } from '../../components/common/animations/HitStopContainer';
import { SlashEffect, useSlashEffect, SLASH_PRESETS } from '../../components/common/animations/SlashEffect';
import { BurstParticles, BURST_PRESETS } from '../../components/common/animations/BurstParticles';
import { usePulseGlow } from '../../components/common/animations/PulseGlow';
import { shakeVariants } from '../../components/common/animations/variants';
import { AudioManager } from '../../lib/audio/AudioManager';
import {
  loadCommonAudioRegistry,
  COMMON_AUDIO_BASE_PATH,
  type AudioRegistryEntry,
} from '../../lib/audio/commonRegistry';

// ============================================================================
// 通用 UI 小组件
// ============================================================================

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h2 className="text-lg font-bold text-slate-100 border-b border-slate-700 pb-1 mb-3">{children}</h2>
);

const TriggerButton: React.FC<{
  label: string;
  onClick: () => void;
  color?: string;
}> = ({ label, onClick, color = 'bg-indigo-600 hover:bg-indigo-500' }) => (
  <button
    onClick={onClick}
    className={`px-3 py-1.5 rounded text-xs font-bold text-white transition-[background-color] ${color}`}
  >
    {label}
  </button>
);

// ============================================================================
// 特效预览区块
// ============================================================================

/** 飞行特效预览 */
const FlyingEffectSection: React.FC = () => {
  const { effects, pushEffect, removeEffect } = useFlyingEffects();
  const containerRef = useRef<HTMLDivElement>(null);

  const fire = useCallback((type: FlyingEffectData['type'], intensity: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    // 从左侧随机位置飞到右侧随机位置
    const startX = rect.left + rect.width * 0.15;
    const startY = rect.top + rect.height * (0.3 + Math.random() * 0.4);
    const endX = rect.left + rect.width * 0.85;
    const endY = rect.top + rect.height * (0.3 + Math.random() * 0.4);
    const content = type === 'damage' ? `-${intensity}` : type === 'heal' ? `+${intensity}` : '✨';
    pushEffect({ type, content, startPos: { x: startX, y: startY }, endPos: { x: endX, y: endY }, intensity });
  }, [pushEffect]);

  return (
    <div>
      <SectionTitle>飞行特效 (FlyingEffect)</SectionTitle>
      <p className="text-xs text-slate-400 mb-2">恒定速度 800px/s，粒子尾迹密度随 intensity 增加</p>
      <div ref={containerRef} className="relative h-40 bg-slate-800/60 rounded-lg border border-slate-700 mb-2 overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-between px-8 pointer-events-none">
          <div className="w-10 h-10 rounded-full bg-indigo-500/30 border border-indigo-400/50 flex items-center justify-center text-xs text-indigo-300">起</div>
          <div className="w-10 h-10 rounded-full bg-red-500/30 border border-red-400/50 flex items-center justify-center text-xs text-red-300">终</div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <TriggerButton label="伤害 x1" onClick={() => fire('damage', 1)} color="bg-red-700 hover:bg-red-600" />
        <TriggerButton label="伤害 x5" onClick={() => fire('damage', 5)} color="bg-red-700 hover:bg-red-600" />
        <TriggerButton label="伤害 x10" onClick={() => fire('damage', 10)} color="bg-red-700 hover:bg-red-600" />
        <TriggerButton label="治疗 x3" onClick={() => fire('heal', 3)} color="bg-emerald-700 hover:bg-emerald-600" />
        <TriggerButton label="Buff" onClick={() => fire('buff', 1)} color="bg-amber-700 hover:bg-amber-600" />
      </div>
      <FlyingEffectsLayer effects={effects} onEffectComplete={removeEffect} />
    </div>
  );
};

/** 震动 + 钝帧预览 */
const ShakeHitStopSection: React.FC = () => {
  const { isShaking, triggerShake } = useShake(500);
  const { isActive: hitLight, triggerHitStop: triggerLight } = useHitStop(80);
  const { isActive: hitHeavy, triggerHitStop: triggerHeavy } = useHitStop(80);
  const { isActive: hitCrit, triggerHitStop: triggerCrit } = useHitStop(80);

  return (
    <div>
      <SectionTitle>震动 + 钝帧 (Shake + HitStop)</SectionTitle>
      <div className="flex gap-4 mb-3">
        <ShakeContainer isShaking={isShaking} className="w-32 h-20 bg-slate-700 rounded-lg flex items-center justify-center border border-slate-600">
          <span className="text-sm text-slate-300">震动目标</span>
        </ShakeContainer>
        <div className="flex flex-col gap-1">
          <HitStopContainer isActive={hitLight} {...HIT_STOP_PRESETS.light} className="w-32 h-5 bg-red-900/50 rounded flex items-center justify-center border border-red-700/50">
            <span className="text-[10px] text-red-300">轻击</span>
          </HitStopContainer>
          <HitStopContainer isActive={hitHeavy} {...HIT_STOP_PRESETS.heavy} className="w-32 h-5 bg-red-900/50 rounded flex items-center justify-center border border-red-700/50">
            <span className="text-[10px] text-red-300">重击</span>
          </HitStopContainer>
          <HitStopContainer isActive={hitCrit} {...HIT_STOP_PRESETS.critical} className="w-32 h-5 bg-red-900/50 rounded flex items-center justify-center border border-red-700/50">
            <span className="text-[10px] text-red-300">暴击</span>
          </HitStopContainer>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <TriggerButton label="震动" onClick={triggerShake} />
        <TriggerButton label="钝帧·轻" onClick={() => triggerLight(HIT_STOP_PRESETS.light)} color="bg-rose-700 hover:bg-rose-600" />
        <TriggerButton label="钝帧·重" onClick={() => triggerHeavy(HIT_STOP_PRESETS.heavy)} color="bg-rose-700 hover:bg-rose-600" />
        <TriggerButton label="钝帧·暴击" onClick={() => triggerCrit(HIT_STOP_PRESETS.critical)} color="bg-rose-700 hover:bg-rose-600" />
      </div>
    </div>
  );
};

/** 斜切特效预览 */
const SlashSection: React.FC = () => {
  const { isActive, triggerSlash } = useSlashEffect();
  const [currentPreset, setCurrentPreset] = useState<string>('normal');

  return (
    <div>
      <SectionTitle>斜切特效 (SlashEffect)</SectionTitle>
      <div className="relative w-48 h-32 bg-slate-700 rounded-lg border border-slate-600 mb-2 overflow-visible flex items-center justify-center">
        <span className="text-sm text-slate-400">受击区域</span>
        <SlashEffect isActive={isActive} {...(SLASH_PRESETS[currentPreset as keyof typeof SLASH_PRESETS] ?? SLASH_PRESETS.normal)} />
      </div>
      <div className="flex flex-wrap gap-2">
        {Object.keys(SLASH_PRESETS).map((name) => (
          <TriggerButton
            key={name}
            label={name}
            onClick={() => {
              setCurrentPreset(name);
              triggerSlash(SLASH_PRESETS[name as keyof typeof SLASH_PRESETS]);
            }}
            color="bg-orange-700 hover:bg-orange-600"
          />
        ))}
      </div>
    </div>
  );
};

/** 爆发粒子预览 */
const BurstSection: React.FC = () => {
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const timerRef = useRef<number>(0);

  const trigger = useCallback((preset: string) => {
    setActivePreset(null);
    window.clearTimeout(timerRef.current);
    // 下一帧重新激活，确保 BurstParticles 重新挂载
    requestAnimationFrame(() => setActivePreset(preset));
    timerRef.current = window.setTimeout(() => setActivePreset(null), 2000);
  }, []);

  return (
    <div>
      <SectionTitle>爆发粒子 (BurstParticles)</SectionTitle>
      <div className="relative w-48 h-32 bg-slate-700 rounded-lg border border-slate-600 mb-2 flex items-center justify-center">
        <span className="text-sm text-slate-400">爆发区域</span>
        {activePreset && (
          <BurstParticles
            active
            preset={activePreset as keyof typeof BURST_PRESETS}
            color={activePreset.includes('summon') ? ['#a78bfa', '#c084fc', '#e9d5ff'] : undefined}
            onComplete={() => setActivePreset(null)}
          />
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {Object.keys(BURST_PRESETS).map((name) => (
          <TriggerButton
            key={name}
            label={name}
            onClick={() => trigger(name)}
            color="bg-purple-700 hover:bg-purple-600"
          />
        ))}
      </div>
    </div>
  );
};

/** 飘字预览 */
const FloatingTextSection: React.FC = () => {
  const { effects, pushEffect, removeEffect } = useFlyingEffects();
  const containerRef = useRef<HTMLDivElement>(null);

  const trigger = useCallback((type: 'damage' | 'heal', value: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    // 起点和终点相同（飘字在原地出现）
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const content = type === 'damage' ? `-${value}` : `+${value}`;
    pushEffect({ type, content, startPos: { x: cx, y: cy }, endPos: { x: cx, y: cy }, intensity: value });
  }, [pushEffect]);

  return (
    <div>
      <SectionTitle>飘字 (FloatingText)</SectionTitle>
      <p className="text-xs text-slate-400 mb-2">斜向上抛出 → 重力下落 → 淡出，2.4s 贝塞尔曲线</p>
      <div ref={containerRef} className="relative h-32 bg-slate-800/60 rounded-lg border border-slate-700 mb-2 flex items-center justify-center">
        <span className="text-sm text-slate-500">飘字出现区域</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <TriggerButton label="-1 伤害" onClick={() => trigger('damage', 1)} color="bg-red-700 hover:bg-red-600" />
        <TriggerButton label="-5 伤害" onClick={() => trigger('damage', 5)} color="bg-red-700 hover:bg-red-600" />
        <TriggerButton label="-10 伤害" onClick={() => trigger('damage', 10)} color="bg-red-700 hover:bg-red-600" />
        <TriggerButton label="+3 治疗" onClick={() => trigger('heal', 3)} color="bg-emerald-700 hover:bg-emerald-600" />
        <TriggerButton label="+8 治疗" onClick={() => trigger('heal', 8)} color="bg-emerald-700 hover:bg-emerald-600" />
      </div>
      <FlyingEffectsLayer effects={effects} onEffectComplete={removeEffect} />
    </div>
  );
};

// ============================================================================
// 音频预览区块
// ============================================================================

/** 音频浏览器 */
const AudioSection: React.FC = () => {
  const [entries, setEntries] = useState<AudioRegistryEntry[]>([]);
  const [filter, setFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'sfx' | 'bgm'>('all');
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    loadCommonAudioRegistry()
      .then((payload) => {
        setEntries(payload.entries);
        // 确保 AudioManager 已注册
        if (!initialized) {
          AudioManager.registerRegistryEntries(payload.entries, COMMON_AUDIO_BASE_PATH);
          AudioManager.initialize();
          setInitialized(true);
        }
      })
      .catch((err) => console.error('加载音频注册表失败', err))
      .finally(() => setLoading(false));
  }, [initialized]);

  const filtered = entries.filter((e) => {
    if (typeFilter !== 'all' && e.type !== typeFilter) return false;
    if (filter && !e.key.toLowerCase().includes(filter.toLowerCase())) return false;
    return true;
  });

  const playEntry = useCallback((entry: AudioRegistryEntry) => {
    if (entry.type === 'bgm') {
      AudioManager.playBgm(entry.key);
    } else {
      AudioManager.play(entry.key);
    }
  }, []);

  return (
    <div>
      <SectionTitle>音频浏览器 ({entries.length} 条)</SectionTitle>
      <div className="flex gap-2 mb-2">
        <input
          type="text"
          placeholder="搜索 key..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="flex-1 px-2 py-1 rounded bg-slate-800 border border-slate-600 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-indigo-500"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as 'all' | 'sfx' | 'bgm')}
          className="px-2 py-1 rounded bg-slate-800 border border-slate-600 text-sm text-slate-200 outline-none"
        >
          <option value="all">全部</option>
          <option value="sfx">SFX</option>
          <option value="bgm">BGM</option>
        </select>
        <TriggerButton label="停止 BGM" onClick={() => AudioManager.stopBgm()} color="bg-slate-600 hover:bg-slate-500" />
      </div>
      {loading ? (
        <div className="text-slate-400 text-sm py-4 text-center">加载中...</div>
      ) : (
        <div className="max-h-80 overflow-y-auto rounded border border-slate-700 bg-slate-800/40">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-slate-800 z-10">
              <tr className="text-slate-400 border-b border-slate-700">
                <th className="text-left px-2 py-1.5 font-medium">Key</th>
                <th className="text-left px-2 py-1.5 font-medium w-16">类型</th>
                <th className="px-2 py-1.5 w-16">操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 200).map((entry) => (
                <tr key={entry.key} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                  <td className="px-2 py-1 text-slate-300 font-mono truncate max-w-[400px]" title={entry.key}>{entry.key}</td>
                  <td className="px-2 py-1">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${entry.type === 'bgm' ? 'bg-emerald-900 text-emerald-300' : 'bg-indigo-900 text-indigo-300'}`}>
                      {entry.type.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-2 py-1 text-center">
                    <button
                      onClick={() => playEntry(entry)}
                      className="px-2 py-0.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold transition-[background-color]"
                    >
                      ▶
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length > 200 && (
            <div className="text-center text-slate-500 text-xs py-2">显示前 200 条，共 {filtered.length} 条匹配</div>
          )}
          {filtered.length === 0 && (
            <div className="text-center text-slate-500 text-xs py-4">无匹配结果</div>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 主页面
// ============================================================================

const EffectAudioPreview: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <a href="/" className="text-slate-400 hover:text-slate-200 text-sm">← 返回首页</a>
          <h1 className="text-xl font-black text-slate-100">特效音频预览工具</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左列：视觉特效 */}
          <div className="space-y-6">
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <FlyingEffectSection />
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <ShakeHitStopSection />
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <SlashSection />
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <BurstSection />
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <FloatingTextSection />
            </div>
          </div>

          {/* 右列：音频 */}
          <div className="space-y-6">
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <AudioSection />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EffectAudioPreview;
