/**
 * 特效预览工具
 *
 * 独立页面，可在 /dev/fx 访问。
 * 左侧分类导航（按特效类型分组） + 右侧网格展示该分类下所有特效。
 */

import React, { useState, useEffect } from 'react';
import {
  Flame, Swords, Send, Sparkles, Hourglass,
  Skull, Trophy, Wand2, Zap, RotateCw,
  Bomb, Aperture, Hammer, Droplets,
  Rocket, Wind,
  MessageCircle, Sun,
  CircleCheckBig, Star, WandSparkles, Globe, Clock,
} from 'lucide-react';
import type { IconComponent } from './cards/shared';
import {
  BurstCard, ShatterCard, VictoryCard, SummonCard, SummonShaderCard, VortexCard, CombatShockwaveCard,
  ShakeHitStopCard, SlashCard, RiftSlashCard, ImpactCard, DamageFlashCard,
  FlyingCard, ConeBlastCard,
  FloatingTextCard, PulseGlowCard,
  ArcaneQualifiedCard, ArcaneGrandmasterCard, MagicCardsCard, OrreryCard, GrandClockCard,
} from './cards';
import { AudioManager } from '../../lib/audio/AudioManager';
import { loadCommonAudioRegistry } from '../../lib/audio/commonRegistry';

// ============================================================================
// 分类注册表 — 按特效类型分组
// ============================================================================

interface EffectEntry {
  id: string;
  label: string;
  icon: IconComponent;
  component: React.FC<{ useRealCards?: boolean; iconColor?: string }>;
  usageDesc?: string;
}

interface EffectGroup {
  id: string;
  label: string;
  icon: IconComponent;
  colorClass: string;
  entries: EffectEntry[];
}

const EFFECT_GROUPS: EffectGroup[] = [
  {
    id: 'particle', label: '粒子类', icon: Flame, colorClass: 'text-purple-400',
    entries: [
      { id: 'burst', label: '爆发粒子', icon: Sparkles, component: BurstCard, usageDesc: '召唤师战争·单位被消灭' },
      { id: 'shatter', label: '碎裂消散', icon: Skull, component: ShatterCard, usageDesc: '召唤师战争·单位/建筑死亡碎裂' },
      { id: 'victory', label: '胜利彩带', icon: Trophy, component: VictoryCard, usageDesc: '通用·对局胜利结算' },
      { id: 'summon', label: '召唤特效', icon: Wand2, component: SummonCard, usageDesc: '召唤师战争·召唤单位入场' },
      { id: 'summonShader', label: '召唤混合特效', icon: Zap, component: SummonShaderCard, usageDesc: '召唤师战争·召唤单位入场（Shader + 粒子混合版）' },
      { id: 'vortex', label: '充能旋涡', icon: RotateCw, component: VortexCard, usageDesc: '召唤师战争·单位充能' },
      { id: 'combatShockwave', label: '攻击气浪', icon: Zap, component: CombatShockwaveCard, usageDesc: '召唤师战争·攻击受击反馈（FX 系统完整反馈）' },
    ],
  },
  {
    id: 'impact', label: '打击类', icon: Swords, colorClass: 'text-rose-400',
    entries: [
      { id: 'shake', label: '震动+钝帧', icon: Bomb, component: ShakeHitStopCard, usageDesc: '骰铸王座·受击震动 / 召唤师战争·棋格受击' },
      { id: 'slash', label: '弧形刀光', icon: Swords, component: SlashCard, usageDesc: '暂未接入业务' },
      { id: 'rift', label: '次元裂隙', icon: Aperture, component: RiftSlashCard, usageDesc: '受伤反馈·斜切视觉（DamageFlash 内部）' },
      { id: 'impactCombo', label: '打击感组合', icon: Hammer, component: ImpactCard, usageDesc: '测试台·自由组合各效果' },
      { id: 'dmgflash', label: '受伤反馈', icon: Droplets, component: DamageFlashCard, usageDesc: '召唤师战争·伤害反馈覆盖层' },
    ],
  },
  {
    id: 'projectile', label: '投射类', icon: Send, colorClass: 'text-cyan-400',
    entries: [
      { id: 'flying', label: '飞行特效', icon: Rocket, component: FlyingCard, usageDesc: '骰铸王座·伤害/治疗/增益飞行数字' },
      { id: 'coneblast', label: '锥形气浪', icon: Wind, component: ConeBlastCard, usageDesc: '召唤师战争·远程攻击投射' },
    ],
  },
  {
    id: 'ui', label: 'UI 类', icon: Sparkles, colorClass: 'text-amber-400',
    entries: [
      { id: 'floating', label: '飘字', icon: MessageCircle, component: FloatingTextCard, usageDesc: '暂未接入业务' },
      { id: 'pulseglow', label: '脉冲发光', icon: Sun, component: PulseGlowCard, usageDesc: '骰铸王座·技能高亮 / 悬浮球菜单' },
    ],
  },
  {
    id: 'loading', label: '加载类', icon: Hourglass, colorClass: 'text-emerald-400',
    entries: [
      { id: 'arcane_qualified', label: '过审法阵', icon: CircleCheckBig, component: ArcaneQualifiedCard },
      { id: 'arcane_grandmaster', label: '究极法阵', icon: Star, component: ArcaneGrandmasterCard },
      { id: 'magic_cards', label: '魔术飞牌', icon: WandSparkles, component: MagicCardsCard },
      { id: 'solar_system', label: '太阳系 Pro', icon: Globe, component: OrreryCard },
      { id: 'grand_clock', label: '机械神域', icon: Clock, component: GrandClockCard },
    ],
  },
];

// ============================================================================
// 主页面
// ============================================================================

/** 所有特效条目打平索引 */
const ALL_ENTRIES = EFFECT_GROUPS.flatMap(g => g.entries);

const EffectPreview: React.FC = () => {
  const [activeEffectId, setActiveEffectId] = useState(ALL_ENTRIES[0].id);
  const [useRealCards, setUseRealCards] = useState(true);
  /** 被折叠的分类 ID 集合 */
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const totalCount = ALL_ENTRIES.length;

  // 初始化音频系统
  useEffect(() => {
    const initAudio = async () => {
      try {
        console.log('[EffectPreview] 开始初始化音频系统');
        await loadCommonAudioRegistry();
        console.log('[EffectPreview] 音频注册表加载完成');
        AudioManager.initialize();
        console.log('[EffectPreview] AudioManager 初始化完成');
      } catch (error) {
        console.error('[EffectPreview] 音频初始化失败:', error);
      }
    };
    initAudio();
  }, []);

  const activeGroup = EFFECT_GROUPS.find(g => g.entries.some(e => e.id === activeEffectId)) ?? EFFECT_GROUPS[0];
  const activeEntry = activeGroup.entries.find(e => e.id === activeEffectId) ?? activeGroup.entries[0];
  const Comp = activeEntry.component;

  const allCollapsed = collapsedGroups.size === EFFECT_GROUPS.length;
  const toggleAll = () => {
    setCollapsedGroups(allCollapsed ? new Set() : new Set(EFFECT_GROUPS.map(g => g.id)));
  };
  const toggleGroup = (id: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="h-screen bg-slate-900 text-slate-200 flex overflow-hidden">
      {/* 左侧：两级导航（分类 + 特效条目） */}
      <nav className="w-52 shrink-0 min-h-0 bg-slate-800/80 border-r border-slate-700 flex flex-col overflow-y-auto">
        <div className="p-3 pb-2 border-b border-slate-700/50">
          <a href="/" className="text-slate-400 hover:text-slate-200 text-xs mb-1 block">← 返回首页</a>
          <div className="flex items-center justify-between">
            <h1 className="text-sm font-black text-slate-100">特效预览 <span className="text-[10px] font-normal text-slate-500">({totalCount})</span></h1>
            <button
              onClick={toggleAll}
              className="cursor-pointer text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
              title={allCollapsed ? '全部展开' : '全部折叠'}
            >
              {allCollapsed ? '▶ 展开' : '▼ 折叠'}
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {EFFECT_GROUPS.map(group => {
            const isCollapsed = collapsedGroups.has(group.id);
            return (
              <div key={group.id} className="mb-2">
                <button
                  onClick={() => toggleGroup(group.id)}
                  className="cursor-pointer w-full text-left text-xs font-bold text-slate-500 px-2 py-1.5 flex items-center gap-1.5 hover:text-slate-300 transition-colors"
                >
                  <span className="text-[9px]">{isCollapsed ? '▶' : '▼'}</span>
                  <group.icon size={14} className={`shrink-0 ${group.colorClass}`} />
                  {group.label}
                  <span className="ml-auto text-[10px] font-normal">{group.entries.length}</span>
                </button>
                {!isCollapsed && group.entries.map(entry => (
                  <button
                    key={entry.id}
                    onClick={() => setActiveEffectId(entry.id)}
                    className={`cursor-pointer w-full text-left px-2.5 py-1.5 rounded-md text-[11px] transition-[background-color] flex items-center gap-1.5 ${
                      entry.id === activeEffectId
                        ? 'bg-indigo-600/40 text-indigo-200'
                        : 'text-slate-400 hover:bg-slate-700/60 hover:text-slate-200'
                    }`}
                  >
                    <entry.icon size={14} className={`shrink-0 ${entry.id === activeEffectId ? group.colorClass : ''}`} />
                    <span className="truncate">{entry.label}</span>
                  </button>
                ))}
              </div>
            );
          })}
        </div>
        {/* 底部开关 */}
        <div className="p-2 border-t border-slate-700/50">
          <button
            onClick={() => setUseRealCards(v => !v)}
            className={`cursor-pointer w-full px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-[background-color] ${
              useRealCards
                ? 'bg-emerald-600/30 text-emerald-300 hover:bg-emerald-600/40'
                : 'bg-slate-700/40 text-slate-500 hover:bg-slate-700/60'
            }`}
          >
            {useRealCards ? '实际卡图' : '占位区域'}
          </button>
        </div>
      </nav>

      {/* 右侧：单一特效预览区（填满屏幕） */}
      <main className="flex-1 flex flex-col min-h-0 min-w-0">
        <Comp key={activeEntry.id} useRealCards={useRealCards} iconColor={activeGroup.colorClass} />
      </main>
    </div>
  );
};

export default EffectPreview;
