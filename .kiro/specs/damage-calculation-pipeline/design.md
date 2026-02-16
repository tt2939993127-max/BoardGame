# 伤害计算管线 - 设计文档

## 1. 架构概览

### 1.1 三层架构

```
┌─────────────────────────────────────────────────────┐
│ 游戏层 (Game Layer)                                  │
│ - Custom Actions 调用 createDamageCalculation()     │
│ - 声明基础伤害和修正规则                              │
│ - 接收包含完整链路的事件                              │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ 引擎层 (Engine Layer)                                │
│ - DamageCalculation 核心类                           │
│ - 自动收集修正（Token/状态/护盾）                     │
│ - 按优先级应用修正                                    │
│ - 生成 DamageResult + DAMAGE_DEALT 事件              │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ 表现层 (Presentation Layer)                          │
│ - ActionLog 读取 payload.breakdown                   │
│ - 渲染伤害明细（基础 → 修正 → 最终）                  │
└─────────────────────────────────────────────────────┘
```

### 1.2 核心组件

1. **DamageCalculation**：伤害计算管线核心类
2. **ModifierCollector**：自动收集状态/Token/护盾修正
3. **ModifierApplier**：按优先级应用修正
4. **DamageResult**：包含完整链路的结果对象
5. **EventBuilder**：生成标准 DAMAGE_DEALT 事件

## 2. 数据结构设计

### 2.1 核心类型


```typescript
/**
 * 伤害修正器（单个修正项）
 */
interface DamageModifier {
  /** 修正类型（决定应用顺序） */
  type: 'base' | 'additive' | 'multiplicative' | 'shield' | 'ceiling' | 'floor';
  
  /** 修正值（加法为绝对值，乘法为倍数） */
  value: number;
  
  /** 来源 ID（技能/Token/状态 ID） */
  sourceId: string;
  
  /** 来源名称（i18n key 或显示文本） */
  sourceName?: string;
  
  /** 是否为 i18n key */
  sourceNameIsI18n?: boolean;
  
  /** 应用条件（可选） */
  condition?: ModifierCondition;
  
  /** 优先级（同类型内排序，数字越小越先执行） */
  priority?: number;
}

/**
 * 修正条件
 */
interface ModifierCondition {
  type: 'target_has_status' | 'source_has_token' | 'turn_number' | 'custom';
  params?: {
    statusId?: string;
    tokenId?: string;
    minTurn?: number;
    maxTurn?: number;
  };
  check?: (context: DamageContext) => boolean;
}

/**
 * 伤害计算上下文
 */
interface DamageContext {
  source: {
    playerId: string;
    abilityId?: string;
  };
  target: {
    playerId: string;
  };
  state: any;  // MatchState<GameCore>
  timestamp?: number;
}

/**
 * 伤害计算结果
 */
interface DamageResult {
  /** 基础伤害 */
  baseDamage: number;
  
  /** 应用的修正列表（按执行顺序） */
  modifiers: DamageModifier[];
  
  /** 最终伤害（应用所有修正后） */
  finalDamage: number;
  
  /** 实际伤害（扣除护盾后） */
  actualDamage: number;
  
  /** 计算明细（用于 ActionLog） */
  breakdown: DamageBreakdown;
}

/**
 * 伤害明细（ActionLog 展示用）
 */
interface DamageBreakdown {
  base: {
    value: number;
    sourceId: string;
    sourceName?: string;
    sourceNameIsI18n?: boolean;
  };
  steps: Array<{
    type: string;
    value: number;
    sourceId: string;
    sourceName?: string;
    sourceNameIsI18n?: boolean;
    runningTotal: number;
  }>;
}
```

### 2.2 配置接口

```typescript
/**
 * 创建伤害计算的配置
 */
interface DamageCalculationConfig {
  /** 伤害来源 */
  source: {
    playerId: string;
    abilityId?: string;
  };
  
  /** 伤害目标 */
  target: {
    playerId: string;
  };
  
  /** 基础伤害值 */
  baseDamage: number;
  
  /** 游戏状态（用于收集修正） */
  state: any;
  
  /** 额外修正（游戏层手动添加） */
  additionalModifiers?: DamageModifier[];
  
  /** 是否自动收集状态修正 */
  autoCollectStatus?: boolean;
  
  /** 是否自动收集 Token 修正 */
  autoCollectTokens?: boolean;
  
  /** 是否自动收集护盾减免 */
  autoCollectShields?: boolean;
  
  /** 时间戳 */
  timestamp?: number;
}
```

## 3. 核心实现

### 3.1 DamageCalculation 类


```typescript
/**
 * 伤害计算管线
 * 位置：src/engine/primitives/damageCalculation.ts
 */
export class DamageCalculation {
  private config: DamageCalculationConfig;
  private modifiers: DamageModifier[] = [];
  
  constructor(config: DamageCalculationConfig) {
    this.config = config;
    this.initializeModifiers();
  }
  
  /**
   * 初始化修正列表
   */
  private initializeModifiers(): void {
    // 1. 添加基础伤害修正
    this.modifiers.push({
      type: 'base',
      value: this.config.baseDamage,
      sourceId: this.config.source.abilityId || 'unknown',
      sourceName: this.resolveAbilityName(this.config.source.abilityId),
      sourceNameIsI18n: true,
      priority: 0,
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
      this.modifiers.push(...this.config.additionalModifiers);
    }
    
    // 4. 按优先级排序
    this.sortModifiers();
  }
  
  /**
   * 收集 Token 修正
   */
  private collectTokenModifiers(): void {
    const { state, source, target } = this.config;
    
    // 从攻击方收集加伤 Token（如火焰精通）
    const sourcePlayer = state.core.players[source.playerId];
    if (sourcePlayer?.tokens) {
      Object.entries(sourcePlayer.tokens).forEach(([tokenId, amount]) => {
        const tokenDef = this.getTokenDefinition(tokenId);
        if (tokenDef?.damageBonus && amount > 0) {
          this.modifiers.push({
            type: 'additive',
            value: tokenDef.damageBonus * amount,
            sourceId: tokenId,
            sourceName: tokenDef.name,
            sourceNameIsI18n: tokenDef.name?.includes('.'),
            priority: 10,
          });
        }
      });
    }
  }
  
  /**
   * 收集状态修正
   */
  private collectStatusModifiers(): void {
    const { state, target } = this.config;
    
    // 从目标收集减伤状态
    const targetPlayer = state.core.players[target.playerId];
    if (targetPlayer?.statusEffects) {
      Object.entries(targetPlayer.statusEffects).forEach(([statusId, stacks]) => {
        const statusDef = this.getStatusDefinition(statusId);
        if (statusDef?.damageReduction && stacks > 0) {
          this.modifiers.push({
            type: 'additive',
            value: -statusDef.damageReduction * stacks,
            sourceId: statusId,
            sourceName: statusDef.name,
            sourceNameIsI18n: statusDef.name?.includes('.'),
            priority: 20,
          });
        }
      });
    }
  }
  
  /**
   * 收集护盾修正
   */
  private collectShieldModifiers(): void {
    const { state, target } = this.config;
    
    const targetPlayer = state.core.players[target.playerId];
    if (targetPlayer?.damageShields) {
      const totalShield = targetPlayer.damageShields.reduce(
        (sum, shield) => sum + shield.value,
        0
      );
      if (totalShield > 0) {
        this.modifiers.push({
          type: 'shield',
          value: -totalShield,
          sourceId: 'shield',
          sourceName: 'actionLog.damageSource.shield',
          sourceNameIsI18n: true,
          priority: 100,  // 护盾最后应用
        });
      }
    }
  }
  
  /**
   * 按优先级排序修正
   */
  private sortModifiers(): void {
    const typeOrder = {
      base: 0,
      additive: 1,
      multiplicative: 2,
      shield: 3,
      ceiling: 4,
      floor: 5,
    };
    
    this.modifiers.sort((a, b) => {
      const typeA = typeOrder[a.type] ?? 99;
      const typeB = typeOrder[b.type] ?? 99;
      if (typeA !== typeB) return typeA - typeB;
      return (a.priority ?? 0) - (b.priority ?? 0);
    });
  }
  
  /**
   * 计算最终伤害
   */
  public resolve(): DamageResult {
    let runningTotal = 0;
    const breakdown: DamageBreakdown = {
      base: {
        value: this.config.baseDamage,
        sourceId: this.config.source.abilityId || 'unknown',
        sourceName: this.resolveAbilityName(this.config.source.abilityId),
        sourceNameIsI18n: true,
      },
      steps: [],
    };
    
    // 应用所有修正
    for (const modifier of this.modifiers) {
      // 检查条件
      if (modifier.condition && !this.checkCondition(modifier.condition)) {
        continue;
      }
      
      // 应用修正
      if (modifier.type === 'base') {
        runningTotal = modifier.value;
      } else if (modifier.type === 'additive') {
        runningTotal += modifier.value;
      } else if (modifier.type === 'multiplicative') {
        runningTotal *= modifier.value;
      } else if (modifier.type === 'shield') {
        runningTotal = Math.max(0, runningTotal + modifier.value);
      } else if (modifier.type === 'ceiling') {
        runningTotal = Math.min(runningTotal, modifier.value);
      } else if (modifier.type === 'floor') {
        runningTotal = Math.max(runningTotal, modifier.value);
      }
      
      // 记录步骤
      if (modifier.type !== 'base') {
        breakdown.steps.push({
          type: modifier.type,
          value: modifier.value,
          sourceId: modifier.sourceId,
          sourceName: modifier.sourceName,
          sourceNameIsI18n: modifier.sourceNameIsI18n,
          runningTotal: Math.round(runningTotal),
        });
      }
    }
    
    const finalDamage = Math.max(0, Math.round(runningTotal));
    
    return {
      baseDamage: this.config.baseDamage,
      modifiers: this.modifiers.filter(m => m.type !== 'base'),
      finalDamage,
      actualDamage: finalDamage,  // 护盾已在修正中处理
      breakdown,
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
  
  // 辅助方法
  private resolveAbilityName(abilityId?: string): string | undefined {
    // 从游戏状态中查找技能名称
    // 实现细节省略
    return abilityId;
  }
  
  private getTokenDefinition(tokenId: string): any {
    return this.config.state.core.tokenDefinitions?.find(
      (t: any) => t.id === tokenId
    );
  }
  
  private getStatusDefinition(statusId: string): any {
    // 从游戏配置中查找状态定义
    return null;
  }
  
  private checkCondition(condition: ModifierCondition): boolean {
    if (condition.check) {
      return condition.check(this.config as any);
    }
    // 实现内置条件检查
    return true;
  }
}
```

### 3.2 工厂函数

```typescript
/**
 * 创建伤害计算实例
 */
export function createDamageCalculation(
  config: DamageCalculationConfig
): DamageCalculation {
  return new DamageCalculation(config);
}
```

## 4. 游戏层集成

### 4.1 DiceThrone 集成示例


**旧代码（手动构建）**：
```typescript
// src/games/dicethrone/domain/customActions/pyromancer.ts
export const pyromancerFlameStrike: CustomActionHandler = (ctx) => {
  const opponentId = ctx.ctx.defenderId;
  const fm = getFireMasteryCount(ctx);
  const dmg = 5 + fm;
  const modifiers: DamageModifier[] = fm > 0 ? [
    { type: 'token', value: fm, sourceId: TOKEN_IDS.FIRE_MASTERY, sourceName: 'tokens.fire_mastery.name' },
  ] : [];
  
  return [{
    type: 'DAMAGE_DEALT',
    payload: { 
      targetId: opponentId, 
      amount: dmg, 
      actualDamage: dmg, 
      sourceAbilityId: ctx.sourceAbilityId, 
      modifiers 
    },
    sourceCommandType: 'ABILITY_EFFECT',
    timestamp: ctx.timestamp,
  }];
};
```

**新代码（使用管线）**：
```typescript
import { createDamageCalculation } from '../../../engine/primitives/damageCalculation';

export const pyromancerFlameStrike: CustomActionHandler = (ctx) => {
  const damageCalc = createDamageCalculation({
    source: { 
      playerId: ctx.playerId, 
      abilityId: ctx.sourceAbilityId 
    },
    target: { 
      playerId: ctx.ctx.defenderId 
    },
    baseDamage: 5,
    state: ctx.state,
    timestamp: ctx.timestamp,
    // 火焰精通会自动收集（autoCollectTokens: true）
  });
  
  return damageCalc.toEvents();
};
```

**优势**：
- 代码量减少 60%
- 自动收集火焰精通 Token
- 自动处理护盾减免
- 自动生成完整 breakdown

### 4.2 条件修正示例

```typescript
// 燃烧目标额外伤害
export const pyromancerInferno: CustomActionHandler = (ctx) => {
  const damageCalc = createDamageCalculation({
    source: { playerId: ctx.playerId, abilityId: ctx.sourceAbilityId },
    target: { playerId: ctx.ctx.defenderId },
    baseDamage: 3,
    state: ctx.state,
    additionalModifiers: [
      {
        type: 'additive',
        value: 2,
        sourceId: 'inferno-burn-bonus',
        sourceName: 'abilities.inferno.burnBonus',
        sourceNameIsI18n: true,
        condition: {
          type: 'target_has_status',
          params: { statusId: STATUS_IDS.BURN },
        },
      },
    ],
  });
  
  return damageCalc.toEvents();
};
```

### 4.3 SummonerWars 集成示例

```typescript
// src/games/summonerwars/domain/execute.ts
function handleAttack(state, attackerPos, targetPos) {
  const attacker = state.core.board[attackerPos.row][attackerPos.col].unit;
  const target = state.core.board[targetPos.row][targetPos.col].unit;
  
  const damageCalc = createDamageCalculation({
    source: { 
      playerId: attacker.owner, 
      abilityId: 'melee-attack' 
    },
    target: { 
      playerId: target.owner 
    },
    baseDamage: attacker.attack,
    state: { core: state },
    additionalModifiers: [
      // 力量修正
      {
        type: 'multiplicative',
        value: attacker.strengthMultiplier || 1,
        sourceId: 'strength-modifier',
        sourceName: 'actionLog.strengthModifier',
        sourceNameIsI18n: true,
      },
    ],
  });
  
  return damageCalc.toEvents();
}
```

## 5. ActionLog 集成

### 5.1 事件格式扩展

**扩展 DAMAGE_DEALT payload**：
```typescript
interface DamageDealtEvent extends GameEvent<'DAMAGE_DEALT'> {
  payload: {
    targetId: PlayerId;
    amount: number;
    actualDamage: number;
    sourceAbilityId?: string;
    modifiers?: DamageModifier[];  // 已有字段
    breakdown?: DamageBreakdown;   // 新增字段
  };
}
```

### 5.2 ActionLog 格式化

**DiceThrone 格式化（简化版）**：
```typescript
if (event.type === 'DAMAGE_DEALT') {
  const { targetId, actualDamage, breakdown } = event.payload;
  
  // 优先使用 breakdown（新格式）
  if (breakdown) {
    const breakdownLines: BreakdownLine[] = [
      {
        label: breakdown.base.sourceName || breakdown.base.sourceId,
        labelIsI18n: breakdown.base.sourceNameIsI18n,
        labelNs: DT_NS,
        value: breakdown.base.value,
        color: 'neutral',
      },
      ...breakdown.steps.map(step => ({
        label: step.sourceName || step.sourceId,
        labelIsI18n: step.sourceNameIsI18n,
        labelNs: DT_NS,
        value: step.value,
        color: step.value > 0 ? 'positive' : 'negative',
      })),
    ];
    
    const breakdownSeg: ActionLogSegment = {
      type: 'breakdown',
      displayText: String(actualDamage),
      lines: breakdownLines,
    };
    
    segments = [
      i18nSeg('actionLog.damageBefore.dealt', { targetPlayerId: targetId }),
      breakdownSeg,
      i18nSeg('actionLog.damageAfter.dealt', { targetPlayerId: targetId }),
    ];
  } else {
    // 降级处理旧格式（向后兼容）
    segments = [
      i18nSeg('actionLog.damageDealt', { 
        targetPlayerId: targetId, 
        amount: actualDamage 
      }),
    ];
  }
  
  entries.push({ id, timestamp, actorId, kind: 'DAMAGE_DEALT', segments });
}
```

## 6. 迁移策略

### 6.1 渐进式迁移

**阶段 1：试点迁移（1 周）**
- 选择 5 个代表性技能：
  1. 基础伤害（无修正）
  2. Token 加成（火焰精通）
  3. 状态修正（燃烧额外伤害）
  4. 护盾减免
  5. 复杂组合（多重修正）
- 验证数值结果一致性
- 验证 ActionLog 显示正确

**阶段 2：批量迁移（2 周）**
- 使用脚本批量替换模式代码
- 人工审查特殊情况
- 运行完整测试套件

**阶段 3：清理旧代码（1 周）**
- 删除手动构建 modifiers 的代码
- 统一使用新管线
- 更新文档和示例

### 6.2 迁移脚本

```typescript
// scripts/migrate-damage-calculation.ts
/**
 * 自动迁移脚本
 * 识别模式：
 * 1. 手动构建 modifiers 数组
 * 2. 手动计算 dmg = base + modifier
 * 3. 手动构建 DAMAGE_DEALT 事件
 * 
 * 替换为：
 * createDamageCalculation({ ... }).toEvents()
 */
```

### 6.3 兼容性保证

- 新旧事件格式共存（通过 `breakdown` 字段区分）
- ActionLog 格式化支持降级渲染
- Reducer 逻辑不变（`handleDamageDealt` 仍正常工作）
- 测试覆盖新旧两种格式

## 7. 测试策略

### 7.1 单元测试


**测试文件**：`src/engine/primitives/__tests__/damageCalculation.test.ts`

```typescript
describe('DamageCalculation', () => {
  describe('基础功能', () => {
    it('无修正时返回基础伤害', () => {
      const calc = createDamageCalculation({
        source: { playerId: '0', abilityId: 'test' },
        target: { playerId: '1' },
        baseDamage: 5,
        state: mockState(),
        autoCollectTokens: false,
        autoCollectStatus: false,
        autoCollectShields: false,
      });
      
      const result = calc.resolve();
      expect(result.finalDamage).toBe(5);
      expect(result.modifiers).toHaveLength(0);
    });
    
    it('加法修正正确应用', () => {
      const calc = createDamageCalculation({
        source: { playerId: '0', abilityId: 'test' },
        target: { playerId: '1' },
        baseDamage: 5,
        state: mockState(),
        additionalModifiers: [
          { type: 'additive', value: 3, sourceId: 'token1' },
          { type: 'additive', value: 2, sourceId: 'token2' },
        ],
        autoCollectTokens: false,
        autoCollectStatus: false,
        autoCollectShields: false,
      });
      
      const result = calc.resolve();
      expect(result.finalDamage).toBe(10); // 5 + 3 + 2
      expect(result.breakdown.steps).toHaveLength(2);
    });
    
    it('乘法修正在加法后应用', () => {
      const calc = createDamageCalculation({
        source: { playerId: '0', abilityId: 'test' },
        target: { playerId: '1' },
        baseDamage: 5,
        state: mockState(),
        additionalModifiers: [
          { type: 'additive', value: 3, sourceId: 'token' },
          { type: 'multiplicative', value: 2, sourceId: 'status' },
        ],
        autoCollectTokens: false,
        autoCollectStatus: false,
        autoCollectShields: false,
      });
      
      const result = calc.resolve();
      expect(result.finalDamage).toBe(16); // (5 + 3) * 2
    });
    
    it('护盾减免在最后应用', () => {
      const calc = createDamageCalculation({
        source: { playerId: '0', abilityId: 'test' },
        target: { playerId: '1' },
        baseDamage: 10,
        state: mockStateWithShield(3),
        autoCollectShields: true,
      });
      
      const result = calc.resolve();
      expect(result.finalDamage).toBe(7); // 10 - 3
      expect(result.actualDamage).toBe(7);
    });
    
    it('伤害不会为负数', () => {
      const calc = createDamageCalculation({
        source: { playerId: '0', abilityId: 'test' },
        target: { playerId: '1' },
        baseDamage: 3,
        state: mockStateWithShield(10),
        autoCollectShields: true,
      });
      
      const result = calc.resolve();
      expect(result.finalDamage).toBe(0);
    });
  });
  
  describe('自动收集', () => {
    it('自动收集 Token 修正', () => {
      const state = mockStateWithTokens('0', { fire_mastery: 3 });
      const calc = createDamageCalculation({
        source: { playerId: '0', abilityId: 'test' },
        target: { playerId: '1' },
        baseDamage: 5,
        state,
        autoCollectTokens: true,
      });
      
      const result = calc.resolve();
      expect(result.finalDamage).toBe(8); // 5 + 3
      expect(result.modifiers.some(m => m.sourceId === 'fire_mastery')).toBe(true);
    });
    
    it('自动收集状态修正', () => {
      const state = mockStateWithStatus('1', { armor: 2 });
      const calc = createDamageCalculation({
        source: { playerId: '0', abilityId: 'test' },
        target: { playerId: '1' },
        baseDamage: 10,
        state,
        autoCollectStatus: true,
      });
      
      const result = calc.resolve();
      expect(result.finalDamage).toBe(8); // 10 - 2
    });
  });
  
  describe('条件修正', () => {
    it('条件满足时应用修正', () => {
      const state = mockStateWithStatus('1', { burn: 1 });
      const calc = createDamageCalculation({
        source: { playerId: '0', abilityId: 'test' },
        target: { playerId: '1' },
        baseDamage: 5,
        state,
        additionalModifiers: [
          {
            type: 'additive',
            value: 2,
            sourceId: 'burn-bonus',
            condition: {
              type: 'target_has_status',
              params: { statusId: 'burn' },
            },
          },
        ],
        autoCollectStatus: false,
      });
      
      const result = calc.resolve();
      expect(result.finalDamage).toBe(7); // 5 + 2
    });
    
    it('条件不满足时跳过修正', () => {
      const state = mockState();
      const calc = createDamageCalculation({
        source: { playerId: '0', abilityId: 'test' },
        target: { playerId: '1' },
        baseDamage: 5,
        state,
        additionalModifiers: [
          {
            type: 'additive',
            value: 2,
            sourceId: 'burn-bonus',
            condition: {
              type: 'target_has_status',
              params: { statusId: 'burn' },
            },
          },
        ],
      });
      
      const result = calc.resolve();
      expect(result.finalDamage).toBe(5); // 条件不满足，不加成
    });
  });
  
  describe('事件生成', () => {
    it('生成标准 DAMAGE_DEALT 事件', () => {
      const calc = createDamageCalculation({
        source: { playerId: '0', abilityId: 'test' },
        target: { playerId: '1' },
        baseDamage: 5,
        state: mockState(),
        timestamp: 1000,
      });
      
      const events = calc.toEvents();
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('DAMAGE_DEALT');
      expect(events[0].payload.targetId).toBe('1');
      expect(events[0].payload.amount).toBe(5);
      expect(events[0].payload.breakdown).toBeDefined();
      expect(events[0].timestamp).toBe(1000);
    });
    
    it('breakdown 包含完整计算链路', () => {
      const calc = createDamageCalculation({
        source: { playerId: '0', abilityId: 'flame-strike' },
        target: { playerId: '1' },
        baseDamage: 5,
        state: mockState(),
        additionalModifiers: [
          { type: 'additive', value: 3, sourceId: 'fire_mastery', sourceName: 'tokens.fire_mastery.name' },
        ],
      });
      
      const events = calc.toEvents();
      const breakdown = events[0].payload.breakdown;
      
      expect(breakdown.base.value).toBe(5);
      expect(breakdown.base.sourceId).toBe('flame-strike');
      expect(breakdown.steps).toHaveLength(1);
      expect(breakdown.steps[0].value).toBe(3);
      expect(breakdown.steps[0].sourceId).toBe('fire_mastery');
      expect(breakdown.steps[0].runningTotal).toBe(8);
    });
  });
});
```

### 7.2 集成测试

**测试文件**：`src/games/dicethrone/__tests__/damageCalculation.integration.test.ts`

```typescript
describe('DiceThrone 伤害计算集成', () => {
  it('火焰精通 + 燃烧状态 + 护盾的完整链路', () => {
    const state = createTestState({
      players: {
        '0': { tokens: { fire_mastery: 3 } },
        '1': { 
          statusEffects: { burn: 1 },
          damageShields: [{ value: 2, sourceId: 'shield' }],
        },
      },
    });
    
    const calc = createDamageCalculation({
      source: { playerId: '0', abilityId: 'flame-strike' },
      target: { playerId: '1' },
      baseDamage: 5,
      state,
      additionalModifiers: [
        {
          type: 'additive',
          value: 2,
          sourceId: 'burn-bonus',
          condition: { type: 'target_has_status', params: { statusId: 'burn' } },
        },
      ],
    });
    
    const result = calc.resolve();
    
    // 5 (base) + 3 (fire_mastery) + 2 (burn_bonus) - 2 (shield) = 8
    expect(result.finalDamage).toBe(8);
    expect(result.breakdown.steps).toHaveLength(3);
  });
  
  it('迁移前后数值结果一致', () => {
    // 旧实现
    const oldResult = pyromancerFlameStrikeOld(mockContext());
    const oldDamage = oldResult[0].payload.amount;
    
    // 新实现
    const newResult = pyromancerFlameStrikeNew(mockContext());
    const newDamage = newResult[0].payload.amount;
    
    expect(newDamage).toBe(oldDamage);
  });
});
```

### 7.3 E2E 测试

**测试文件**：`e2e/dicethrone-damage-calculation.e2e.ts`

```typescript
test('ActionLog 显示完整伤害明细', async ({ page }) => {
  // 1. 进入游戏
  await page.goto('/play/dicethrone/local');
  
  // 2. 选择火焰法师
  await page.click('[data-testid="select-pyromancer"]');
  
  // 3. 获得火焰精通 Token
  // ... 游戏操作 ...
  
  // 4. 使用烈焰冲击
  await page.click('[data-testid="ability-flame-strike"]');
  
  // 5. 验证 ActionLog
  const actionLog = page.locator('[data-testid="action-log-entry"]').last();
  await expect(actionLog).toContainText('造成 8 点伤害');
  
  // 6. 展开明细
  await actionLog.click();
  await expect(actionLog).toContainText('基础伤害：5');
  await expect(actionLog).toContainText('+3 火焰精通');
  await expect(actionLog).toContainText('最终伤害：8');
});
```

## 8. 性能优化

### 8.1 缓存策略

```typescript
class DamageCalculation {
  private modifierCache: Map<string, DamageModifier[]> = new Map();
  
  private collectTokenModifiers(): void {
    const cacheKey = `tokens-${this.config.source.playerId}`;
    
    if (this.modifierCache.has(cacheKey)) {
      this.modifiers.push(...this.modifierCache.get(cacheKey)!);
      return;
    }
    
    // 收集逻辑...
    this.modifierCache.set(cacheKey, collectedModifiers);
  }
}
```

### 8.2 批处理优化

```typescript
/**
 * 批量计算多个目标的伤害（AOE 技能）
 */
export function createBatchDamageCalculation(
  config: Omit<DamageCalculationConfig, 'target'> & {
    targets: Array<{ playerId: string }>;
  }
): DamageCalculation[] {
  // 共享修正收集结果
  const sharedModifiers = collectSharedModifiers(config);
  
  return config.targets.map(target => 
    new DamageCalculation({
      ...config,
      target,
      additionalModifiers: [
        ...sharedModifiers,
        ...(config.additionalModifiers || []),
      ],
    })
  );
}
```

## 9. 文档与示例

### 9.1 迁移指南

**文档位置**：`docs/migration/damage-calculation-pipeline.md`

内容包括：
- 迁移动机和收益
- 新旧代码对比
- 常见模式迁移示例
- 特殊情况处理
- 测试验证方法

### 9.2 API 文档

**文档位置**：`docs/api/damage-calculation.md`

内容包括：
- `createDamageCalculation()` 完整 API
- 所有配置选项说明
- 修正类型列表
- 条件系统使用
- 最佳实践

### 9.3 新游戏模板

更新 `docs/create-new-game.md`，添加伤害计算管线使用示例。

## 10. 风险缓解

### 10.1 回滚机制

- 保留旧代码分支（`legacy-damage-calculation`）
- 新管线通过 feature flag 控制（`USE_DAMAGE_PIPELINE`）
- 迁移失败时可快速回退

### 10.2 监控指标

- 伤害计算耗时（目标 < 1ms）
- 事件大小（目标 < 2KB）
- ActionLog 渲染性能（目标 < 16ms）

---

**文档版本**：v1.0  
**创建日期**：2025-02-15  
**负责人**：AI Agent  
**状态**：待审核
