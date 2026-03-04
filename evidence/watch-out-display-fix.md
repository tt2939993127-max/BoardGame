# 看箭（Watch Out）特写描述修复完成

## 问题描述

用户反馈："看箭 投掷的额外骰子下面特写的描述"不清楚。

## 根本原因

"看箭"（Watch Out）卡牌投掷1骰时，特写只显示 `"看箭投掷：3"`，没有显示投掷结果对应的效果（弓→+2伤害，足→缠绕，月→致盲）。

**修复前**：
```
看箭投掷：3
```

用户看不出投出弓面会有什么效果。

## 卡牌效果

**看箭**（Watch Out）：
- 类型：攻击修正卡
- CP 消耗：0
- 时机：投掷阶段（roll）
- 效果：投掷1骰
  - 弓🏹 → 增加2伤害
  - 足🦶 → 施加缠绕
  - 月🌙 → 施加致盲

## 修复内容

### 1. 中文 i18n（`public/locales/zh-CN/game-dicethrone.json`）

```json
"watchOut": "看箭投掷：{{value}}",
"watchOut.bow": "弓🏹：伤害+2",
"watchOut.foot": "足🦶：施加缠绕",
"watchOut.moon": "月🌙：施加致盲"
```

### 2. 英文 i18n（`public/locales/en/game-dicethrone.json`）

```json
"watchOut": "Watch Out Roll: {{value}}",
"watchOut.bow": "Bow🏹: +2 Damage",
"watchOut.foot": "Foot🦶: Inflict Entangle",
"watchOut.moon": "Moon🌙: Inflict Blinded"
```

### 3. 代码修改（`src/games/dicethrone/domain/customActions/moon_elf.ts`）

**修改前**：
```typescript
events.push({
    type: 'BONUS_DIE_ROLLED',
    payload: { 
        value, 
        face, 
        playerId: attackerId, 
        targetPlayerId: opponentId, 
        effectKey: 'bonusDie.effect.watchOut',  // 固定的 key
        effectParams: { value } 
    },
    sourceCommandType: 'ABILITY_EFFECT',
    timestamp,
} as BonusDieRolledEvent);
```

**修改后**：
```typescript
// 根据投掷结果显示不同的效果描述
let effectKey = 'bonusDie.effect.watchOut';
if (face === FACE.BOW) {
    effectKey = 'bonusDie.effect.watchOut.bow';
} else if (face === FACE.FOOT) {
    effectKey = 'bonusDie.effect.watchOut.foot';
} else if (face === FACE.MOON) {
    effectKey = 'bonusDie.effect.watchOut.moon';
}

events.push({
    type: 'BONUS_DIE_ROLLED',
    payload: { 
        value, 
        face, 
        playerId: attackerId, 
        targetPlayerId: opponentId, 
        effectKey,  // 动态的 key
        effectParams: { value } 
    },
    sourceCommandType: 'ABILITY_EFFECT',
    timestamp,
} as BonusDieRolledEvent);
```

## 修复后效果

### 投出弓面（值 1-3）
```
看箭投掷：2
弓🏹：伤害+2
```

### 投出足面（值 4-5）
```
看箭投掷：4
足🦶：施加缠绕
```

### 投出月面（值 6）
```
看箭投掷：6
月🌙：施加致盲
```

## 改进点

1. ✅ **显示具体效果**：用户可以清楚看到投掷结果对应的效果
2. ✅ **即时反馈**：不需要等待后续事件，立即知道会发生什么
3. ✅ **符合卡牌描述**：特写描述与卡牌描述一致
4. ✅ **使用表情符号**：弓🏹、足🦶、月🌙 更直观

## 对比其他类似卡牌

### 月影袭人（Moon Shadow Strike）
已有类似的分支显示：
```json
"moonShadowStrike.moon": "月🌙：施加致盲、缠绕、锁定",
"moonShadowStrike.other": "抽1张牌"
```

### 万箭齐发（Volley）
显示统计结果：
```json
"volley.result": "{{bowCount}}个弓面：伤害+{{bonusDamage}}"
```

现在"看箭"的显示方式与这些卡牌保持一致。

## 测试建议

1. 进入游戏选择月精灵（Moon Elf）
2. 在攻击投掷阶段使用"看箭"卡牌
3. 投掷骰子后查看特写描述
4. 验证不同骰面（弓/足/月）显示不同的效果描述
5. 确认效果实际生效（弓→伤害+2，足→缠绕，月→致盲）

## 相关文件

- `public/locales/zh-CN/game-dicethrone.json`
- `public/locales/en/game-dicethrone.json`
- `src/games/dicethrone/domain/customActions/moon_elf.ts`
- `src/games/dicethrone/heroes/moon_elf/cards.ts`（卡牌定义）
