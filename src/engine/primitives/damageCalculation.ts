/**
 * 伤害计算管线
 *
 * 基于 modifier.ts 的伤害计算专用包装器，提供：
 * - 自动收集修正（Token/状态/护盾）
 * - 生成包含完整链路的 DAMAGE_DEALT 事件
 * - 生成 ActionLog 可用的 breakdown 结构
 *
 * 设计原则：
 * - 复用 modifier.ts 的核心能力，不重复造轮子
 * - 声明式 API，游戏层只需指定基础伤害和规则
 * - 纯函数，不可变，返回新对象
 * - 向后兼容，旧事件格式仍可正常工作
 */

import type { GameEvent, PlayerId } from '../types';
import type { ModifierDef, ModifierStack } from './modifier';
import {
  createModifierStack,
  addModifier,
  applyModifiers,
} from './modifier';

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 伤害来源
 */
export interface DamageSource {
  /** 来源玩家 ID */
  playerId: PlayerId;
  /** 来源技能/能力 ID */
  abilityId?: string;
}

/**
 * 伤害目标
 */
export interface DamageTarget {
  /** 目标玩家 ID */
  playerId: PlayerId;
}

/**
 * 伤害计算上下文
 */
export interface DamageContext {
  /** 伤害来源 */
  source: DamageSource;
  /** 伤害目标 */
  target: DamageTarget;
  /** 游戏状态（用于收集修正） */
  state: any;
}

/**
 * 伤害计算配置
 */
export interface DamageCalculationConfig extends DamageContext {
  /** 基础伤害值 */
  baseDamage: number;
  
  /** 额外修正（游戏层手动添加） */
  additionalModifiers?: ModifierDef<DamageContext>[];
  
  /** 是否自动收集 Token 修正（默认 true） */
  autoCollectTokens?: boolean;
  
  /** 是否自动收集状态修正（默认 true） */
  autoCollectStatus?: boolean;
  
  /** 是否自动收集护盾减免（默认 true） */
  autoCollectShields?: boolean;
  
  /** 时间戳 */
  timestamp?: number;
}

/**
 * 伤害明细步骤（用于 ActionLog 展示）
 */
export interface DamageBreakdownStep {
  /** 修正类型 */
  type: string;
  /** 修正值 */
  value: number;
  /** 来源 ID */
  sourceId: string;
  /** 来源名称（i18n key 或显示文本） */
  sourceName?: string;
  /** 是否为 i18n key */
  sourceNameIsI18n?: boolean;
  /** 应用后的累计值 */
  runningTotal: number;
}

/**
 * 伤害明细（ActionLog 展示用）
 */
export interface DamageBreakdown {
  /** 基础伤害 */
  base: {
    value: number;
    sourceId: string;
    sourceName?: string;
    sourceNameIsI18n?: boolean;
  };
  /** 修正步骤列表 */
  steps: DamageBreakdownStep[];
}

/**
 * 伤害计算结果
 */
export interface DamageResult {
  /** 基础伤害 */
  baseDamage: number;
  
  /** 应用的修正列表（不含 base） */
  modifiers: Array<{
    type: string;
    value: number;
    sourceId: string;
    sourceName?: string;
  }>;
  
  /** 最终伤害（应用所有修正后） */
  finalDamage: number;
  
  /** 实际伤害（扣除护盾后） */
  actualDamage: number;
  
  /** 计算明细（用于 ActionLog） */
  breakdown: DamageBreakdown;
}

// ============================================================================
// 伤害计算类
// ============================================================================


export class DamageCalculation {
  private config: DamageCalculationConfig;
  private modifierStack: ModifierStack<DamageContext>;

  /**
   * 统一获取核心状态。
   * - 兼容包装态：{ core, sys }
   * - 兼容直传态：DiceThroneCore / 其他游戏 core
   */
  private getCoreState(): any {
    return this.config.state?.core ?? this.config.state;
  }
  
  constructor(config: DamageCalculationConfig) {
    this.config = config;
    this.modifierStack = createModifierStack<DamageContext>();
    this.initializeModifiers();
  }
  
  /**
   * 初始化修正列表
   */
  private initializeModifiers(): void {
    // 1. 添加基础伤害（作为 flat 修正，priority=0）
    this.modifierStack = addModifier(this.modifierStack, {
      id: '__base__',
      type: 'flat',
      value: this.config.baseDamage,
      priority: 0,
      source: this.config.source.abilityId || 'unknown',
      description: 'Base damage',
    });
    
    // 2. 自动收集修正
    if (this.config.autoCollectTokens !== false) {
      this.collectTokenModifiers();
    }
    if (this.config.autoCollectStatus !== false) {
      this.collectStatusModifiers();
    }
    if (this.config.autoCollectShields !== false) {
      this.collectShieldModifiers();
    }
    
    // 3. 添加游戏层手动指定的修正
    if (this.config.additionalModifiers) {
      for (const mod of this.config.additionalModifiers) {
        this.modifierStack = addModifier(this.modifierStack, mod);
      }
    }
  }
  
  /**
   * 收集 Token 修正
   * 
   * 从攻击方收集加伤 Token（如 DiceThrone 的火焰精通）
   */
  private collectTokenModifiers(): void {
    const { source } = this.config;
    const coreState = this.getCoreState();
    
    // 兼容包装态（state.core.players）与直传态（state.players）
    const sourcePlayer = coreState?.players?.[source.playerId];
    if (!sourcePlayer?.tokens) return;
    
    // 从 tokenDefinitions 查找有 damageBonus 的 Token
    const tokenDefs = coreState?.tokenDefinitions || [];
    
    Object.entries(sourcePlayer.tokens).forEach(([tokenId, amount]) => {
      if (typeof amount !== 'number' || amount <= 0) return;
      
      const tokenDef = tokenDefs.find((t: any) => t.id === tokenId);
      if (!tokenDef?.damageBonus) return;
      
      this.modifierStack = addModifier(this.modifierStack, {
        id: `token-${tokenId}`,
        type: 'flat',
        value: tokenDef.damageBonus * amount,
        priority: 10,
        source: tokenId,
        description: `Token: ${tokenDef.name || tokenId}`,
      });
    });
  }
  
  /**
   * 收集状态修正
   * 
   * 从目标收集减伤状态（如护甲）
   */
  private collectStatusModifiers(): void {
    const { target } = this.config;
    const coreState = this.getCoreState();
    
    const targetPlayer = coreState?.players?.[target.playerId];
    if (!targetPlayer?.statusEffects) return;
    
    // 从 tokenDefinitions 查找有 damageReduction 的状态
    const tokenDefs = coreState?.tokenDefinitions || [];
    
    Object.entries(targetPlayer.statusEffects).forEach(([statusId, stacks]) => {
      if (typeof stacks !== 'number' || stacks <= 0) return;
      
      const statusDef = tokenDefs.find((t: any) => t.id === statusId);
      if (!statusDef?.damageReduction) return;
      
      this.modifierStack = addModifier(this.modifierStack, {
        id: `status-${statusId}`,
        type: 'flat',
        value: -statusDef.damageReduction * stacks,
        priority: 20,
        source: statusId,
        description: `Status: ${statusDef.name || statusId}`,
      });
    });
  }
  
  /**
   * 收集护盾修正
   * 
   * 从目标收集护盾减免（DiceThrone 的 damageShields）
   */
  private collectShieldModifiers(): void {
    const { target } = this.config;
    const coreState = this.getCoreState();
    
    const targetPlayer = coreState?.players?.[target.playerId];
    if (!targetPlayer?.damageShields) return;
    
    const totalShield = targetPlayer.damageShields.reduce(
      (sum: number, shield: any) => sum + (shield.value || 0),
      0
    );
    
    if (totalShield > 0) {
      this.modifierStack = addModifier(this.modifierStack, {
        id: '__shield__',
        type: 'flat',
        value: -totalShield,
        priority: 100,  // 护盾最后应用
        source: 'shield',
        description: 'Shield reduction',
      });
    }
  }
  
  /**
   * 计算最终伤害
   */
  public resolve(): DamageResult {
    // 应用所有修正（从 0 开始累加）
    const result = applyModifiers(this.modifierStack, 0, this.config);
    
    // 构建 breakdown
    const breakdown = this.buildBreakdown(result.appliedIds);
    
    // 最终伤害不能为负
    const finalDamage = Math.max(0, Math.round(result.finalValue));
    
    // 提取非 base 的修正
    const modifiers = result.appliedIds
      .filter(id => id !== '__base__')
      .map(id => {
        const mod = this.modifierStack.entries.find(e => e.def.id === id)?.def;
        return {
          type: mod?.type || 'flat',
          value: mod?.value || 0,
          sourceId: mod?.source || id,
          sourceName: this.resolveModifierName(mod),
        };
      });
    
    return {
      baseDamage: this.config.baseDamage,
      modifiers,
      finalDamage,
      actualDamage: finalDamage,
      breakdown,
    };
  }
  
  /**
   * 构建 breakdown 结构
   */
  private buildBreakdown(appliedIds: string[]): DamageBreakdown {
    const steps: DamageBreakdownStep[] = [];
    let runningTotal = 0;
    
    for (const id of appliedIds) {
      const entry = this.modifierStack.entries.find(e => e.def.id === id);
      if (!entry) continue;
      
      const { def } = entry;
      
      if (def.id === '__base__') {
        // 基础伤害
        runningTotal = def.value || 0;
      } else {
        // 修正
        if (def.type === 'flat') {
          runningTotal += def.value || 0;
        } else if (def.type === 'percent') {
          runningTotal *= 1 + (def.value || 0) / 100;
        }
        
        steps.push({
          type: def.type,
          value: def.value || 0,
          sourceId: def.source || def.id,
          sourceName: this.resolveModifierName(def),
          sourceNameIsI18n: this.isI18nKey(this.resolveModifierName(def)),
          runningTotal: Math.round(runningTotal),
        });
      }
    }
    
    return {
      base: {
        value: this.config.baseDamage,
        sourceId: this.config.source.abilityId || 'unknown',
        sourceName: this.resolveAbilityName(this.config.source.abilityId),
        sourceNameIsI18n: this.isI18nKey(this.resolveAbilityName(this.config.source.abilityId)),
      },
      steps,
    };
  }
  
  /**
   * 生成 DAMAGE_DEALT 事件
   */
  public toEvents(): GameEvent[] {
    const result = this.resolve();
    
    return [{
      type: 'DAMAGE_DEALT',
      payload: {
        targetId: this.config.target.playerId,
        amount: result.finalDamage,
        actualDamage: result.actualDamage,
        sourceAbilityId: this.config.source.abilityId,
        modifiers: result.modifiers.map(m => ({
          type: m.type as any,
          value: m.value,
          sourceId: m.sourceId,
          sourceName: m.sourceName,
        })),
        breakdown: result.breakdown,
      },
      sourceCommandType: 'ABILITY_EFFECT',
      timestamp: this.config.timestamp || Date.now(),
    }];
  }
  
  // ========================================================================
  // 辅助方法
  // ========================================================================
  
  /**
   * 解析技能名称
   */
  private resolveAbilityName(abilityId?: string): string | undefined {
    if (!abilityId) return undefined;
    
    // 尝试从游戏状态中查找技能定义
    // 这里简化处理，游戏层可以通过 additionalModifiers 提供更准确的名称
    return abilityId;
  }
  
  /**
   * 解析修正器名称
   */
  private resolveModifierName(mod?: ModifierDef<DamageContext>): string | undefined {
    if (!mod) return undefined;
    
    // 优先使用 description
    if (mod.description) return mod.description;
    
    // 尝试从 tokenDefinitions 查找
    const tokenDefs = this.getCoreState()?.tokenDefinitions || [];
    const tokenDef = tokenDefs.find((t: any) => t.id === mod.source);
    if (tokenDef?.name) return tokenDef.name;
    
    return mod.source;
  }
  
  /**
   * 判断是否为 i18n key
   */
  private isI18nKey(text?: string): boolean {
    return !!text?.includes('.');
  }
}

// ============================================================================
// 工厂函数
// ============================================================================

/**
 * 创建伤害计算实例
 */
export function createDamageCalculation(
  config: DamageCalculationConfig
): DamageCalculation {
  return new DamageCalculation(config);
}

/**
 * 批量计算多个目标的伤害（AOE 技能优化）
 */
export function createBatchDamageCalculation(
  config: Omit<DamageCalculationConfig, 'target'> & {
    targets: DamageTarget[];
  }
): DamageCalculation[] {
  return config.targets.map(target => 
    new DamageCalculation({
      ...config,
      target,
    })
  );
}
