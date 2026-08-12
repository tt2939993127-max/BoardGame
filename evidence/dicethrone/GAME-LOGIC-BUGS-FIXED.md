# 游戏逻辑专项修复证据

> 2026-08-12 更正：本文关于 Pyromancer `Burn Down II` 的旧结论曾误把卡图中的“至多 4 个火焰专精”录成“任意数量”，并据此放宽实现上限。该结论已失效；当前规则与回归以卡图原文为准：获得 1 个火焰专精后，至多移除 4 个，每个造成 4 点不可防御伤害。Shadow Thief 条目不受本次更正影响。

**修复时间**: 2026-03-04  
**状态**: 当轮专项完成

---

## 修复的 Bug

### 1. Shadow Shank + Sneak Attack 伤害计算错误 ✅

**问题描述**:
- 暗影穿刺（Shadow Shank）终极技能 + 伏击（Sneak Attack）Token
- 伤害计算重复加了 `gainCp(3)` 的 3 点 CP
- 导致伤害多了 3 点

**根本原因**:
- `handleShadowShankDamage` 函数使用了 `bonusCp` 参数（值为 3）
- `gainCp(3)` 在 `preDefense` 阶段已经执行，`currentCp` 已包含这 3 点
- 伤害计算时又加了 `bonusCp`，导致重复计算

**修复方案**:
```typescript
// 修复前
const params = action.params as Record<string, unknown> | undefined;
const bonusCp = (params?.bonusCp as number) || 0;
const damageAmt = currentCp + bonusCp + 5;

// 修复后
// bonusCp 参数已废弃：gainCp(3) 在 preDefense 阶段已执行，currentCp 已包含增益
// 伤害计算：CP + 5
const damageAmt = currentCp + 5;
```

**测试结果**:
- ✅ `终极技能 shadow-shank + sneak_attack：伤害应包含伏击奖励骰` - 通过
- ✅ `复现线上场景：CP=6 + gainCp(3) = 9, damage 应为 9+5+dieValue` - 通过
- ✅ `验证 ActionLog：TOKEN_USED 显示伏击掷骰值，DAMAGE_DEALT 包含总伤害` - 通过

**影响范围**:
- 只影响 Shadow Thief 的 Shadow Shank 技能
- 修复后伤害计算正确：CP + 5 + 伏击掷骰值

---

### 2. Pyromancer Burn Down II FM 消耗上限错误（2026-08-12 更正）

**问题描述**:
- 燃烧殆尽 II（Burn Down II）技能
- 卡图原文："移除至多 4 个火焰专精"
- 因此 II 级与 I 级同样最多移除 4 个；区别是每个专精造成 4 点不可防御伤害。

**根本原因**:
- 旧录入把“至多 4 个”遗漏成“任意数量”，导致 `burn-down-2-resolve` 的上限被错误改为 99。

**技能描述对比**:
- burn-down（I 级）："移除最多 4 个火焰精通，每移除 1 个造成 3 点不可防御伤害"（上限 4）
- burn-down-2（II 级）："移除至多 4 个火焰专精，每移除 1 个造成 4 点不可防御伤害"（上限 4）

**修复方案**:
```typescript
// 错误状态
registerCustomActionHandler('burn-down-2-resolve', (ctx) => resolveBurnDown(ctx, 4, 99), { categories: ['damage', 'resource'] });

// 2026-08-12 更正后
registerCustomActionHandler('burn-down-2-resolve', (ctx) => resolveBurnDown(ctx, 4, 4), { categories: ['damage', 'resource'] });
```

**测试结果**:
- 本次回归必须覆盖“已有 5 个火焰专精时，只消耗 4 个、造成 16 点伤害，并留下 1 个”。

**影响范围**:
- 影响 Pyromancer 的 Burn Down II 技能结算与中英文规则描述。
- 更正后最多消耗 4 个火焰专精，最高造成 16 点不可防御伤害。

---

## 测试结果对比

### 修复前
```
❌ Tests: 7 failed | 4012 passed | 47 skipped (4066)
```

**失败测试**:
1. Shadow Shank + Sneak Attack（3 个测试）
2. Pyromancer Burn Down II（1 个测试）
3. Admin API（2 个测试）
4. Feedback API（1 个测试）

### 修复后
```
✅ Tests: 3 failed | 4016 passed | 47 skipped (4066)
```

**剩余失败**:
1. Admin API（2 个测试）- 服务端问题
2. Feedback API（1 个测试）- 类型不匹配

**改进**:
- 修复了 4 个游戏逻辑 bug
- 通过率从 98.8% 提升到 98.9%
- 游戏逻辑测试 100% 通过

---

## 修复文件清单

1. `src/games/dicethrone/domain/customActions/shadow_thief.ts`
   - 移除 `handleShadowShankDamage` 中的 `bonusCp` 重复计算

2. `src/games/dicethrone/domain/customActions/pyromancer.ts`
   - 2026-08-12 将 `burn-down-2-resolve` 的错误上限从 99 更正为 4

---

## 关键教训

### 1. 参数传递的隐患
- `bonusCp` 参数在技能定义中传递，但 `gainCp` 已在 `preDefense` 执行
- 导致重复计算，难以发现
- **教训**：避免在多个阶段修改同一个值，优先使用单一数据源

### 2. 技能升级的差异
- I 级和 II 级技能的参数不同（limit: 4 vs 99）
- 需要仔细对照技能描述
- **教训**：技能升级时必须检查所有参数，不能假设只有伤害值变化

### 3. 测试的价值
- 测试准确捕获了伤害计算错误
- 测试注释清晰说明了预期行为
- **教训**：测试是发现游戏逻辑 bug 的最佳工具

---

## 下一步工作

剩余 3 个失败都是 API 测试，与游戏逻辑无关：

1. **Admin API 统计查询 500 错误** - 需要查看服务端日志
2. **Admin API 删除操作失败** - 需要调查数据库操作
3. **Feedback API 匿名反馈类型不匹配** - 简单的测试更新

---

**修复负责人**: AI Assistant  
**修复日期**: 2026-03-04  
**文档版本**: v1.0

## 当前阅读说明

- 本文只覆盖两条历史游戏逻辑 bug 的专项修复，不是 DiceThrone 当前总审计出口。
- 本文不能替代新英雄默认全面审计留档所需的对象级矩阵、批次级 `L4` 判等与旧文档统一回写。
