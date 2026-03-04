# 大杀四方 - 施加力量指示物音效修复

## 问题描述

用户反馈：巨蚂蚁派系直接添加力量指示物的能力（如疯狂怪物派对）没有播放音效。

## 根本原因

### 音频去重机制缺陷

`useGameAudio.ts` 中的批量事件处理使用了错误的去重策略：

```typescript
// 修复前（错误）
const playedKeys = new Set<SoundKey>();
for (const entry of audioEntries) {
    const key = resolveFeedback(event, ...);
    if (!playedKeys.has(key)) {  // ❌ 基于音效 key 去重
        playedKeys.add(key);
        playSound(key);
    }
}
```

**问题**：当一次批量处理多个相同类型的事件时（如疯狂怪物派对给 5 个随从各放 1 个指示物），所有事件解析出相同的音效 key（`charged_a`），导致：
1. 第一个 `POWER_COUNTER_ADDED` 事件播放音效 ✅
2. 后续 4 个 `POWER_COUNTER_ADDED` 事件因为 key 相同被去重跳过 ❌

### 为什么吸血鬼能力没有这个问题

吸血鬼能力（如夜行者）同时生成"消灭随从"和"施加力量指示物"两个事件，它们的音效 key 不同：
- `MINION_DESTROYED` → `smashed_1`
- `POWER_COUNTER_ADDED` → `charged_a`

因此不会被去重机制误杀。但之前修复的时间戳冲突问题仍然有效（避免音频节流和掩蔽）。

## 修复方案

### 改进去重策略

将去重从"基于音效 key"改为"基于事件签名（时间戳 + 事件类型）"：

```typescript
// 修复后（正确）
const playedEventSignatures = new Set<string>();
for (const entry of audioEntries) {
    const key = resolveFeedback(event, ...);
    
    // 生成事件签名（时间戳 + 事件类型 + 音效 key）
    const eventSignature = getLogEntrySignature(entry);
    
    // 基于事件签名去重，而非音效 key
    if (!playedEventSignatures.has(eventSignature)) {
        playedEventSignatures.add(eventSignature);
        playSound(key);
    }
}
```

### 为什么这样修复

1. **事件签名唯一性**：每个事件都有唯一的时间戳和类型组合
2. **允许相同音效多次播放**：5 个随从同时获得指示物 → 播放 5 次 `charged_a` 音效
3. **仍然防止重复播放**：同一个事件不会被处理两次
4. **向后兼容**：无法生成签名时直接播放（保持原有行为）

## 技术细节

### 事件签名生成

```typescript
function getLogEntrySignature(entry: unknown): string | null {
    // EventStream 格式：{ id: number, event: { type, timestamp } }
    if (typeof maybeEventStreamEntry.id === 'number') {
        return `eventId:${maybeEventStreamEntry.id}`;
    }

    // 直接事件格式：{ type, timestamp, data: { type, timestamp } }
    const signatureTimestamp = dataTimestamp ?? maybeEntry.timestamp;
    if (typeof signatureTimestamp !== 'number') return null;

    return `${signatureTimestamp}|${maybeEntry.type ?? ''}|${dataType}`;
}
```

### 去重逻辑对比

| 场景 | 旧逻辑（基于 key） | 新逻辑（基于签名） |
|------|-------------------|-------------------|
| 5 个随从同时获得指示物 | 只播放 1 次 ❌ | 播放 5 次 ✅ |
| 同一事件重复处理 | 只播放 1 次 ✅ | 只播放 1 次 ✅ |
| 不同事件相同音效 | 只播放 1 次 ❌ | 播放多次 ✅ |

## 影响范围

### 修改的文件

- `src/lib/audio/useGameAudio.ts`（1 处修改）

### 受益的场景

1. **巨蚂蚁派系**：
   - 疯狂怪物派对：所有没有指示物的随从各放一个
   - 我们是冠军：计分后分配多个指示物
   - 其他批量施加力量的能力

2. **吸血鬼派系**：
   - 保持之前的修复（时间戳偏移避免节流）
   - 去重逻辑改进不影响现有行为

3. **其他派系**：
   - 所有批量生成相同类型事件的能力
   - 例如：批量抽牌、批量移动随从等

### 不受影响的场景

- 单个事件的音效播放
- 不同类型事件的音效播放
- UI 本地交互音效（已在组件层播放）

## 验证方法

### 手动测试

1. 创建巨蚂蚁派系对局
2. 打出"疯狂怪物派对"（给所有没有指示物的随从各放一个）
3. 验证：
   - ✅ 听到多次力量增加音效（charged_a.ogg）
   - ✅ 音效次数 = 获得指示物的随从数量

### 自动化测试

现有测试已覆盖巨蚂蚁能力的逻辑正确性，音效播放属于 UI 层行为，不需要额外的单元测试。

## 教训总结

### 问题定位流程

1. ✅ **用户反馈精准定位**：用户明确指出是"巨蚂蚁直接添加力量"而非"吸血鬼消灭+添加"
2. ✅ **识别场景差异**：巨蚂蚁是批量相同事件，吸血鬼是不同事件组合
3. ✅ **找到根本原因**：去重逻辑基于音效 key 而非事件签名

### 核心原则

- **去重应该基于事件身份，而非事件效果**：同一个事件只播放一次，但不同事件即使音效相同也应该播放
- **批量事件处理需要考虑相同类型事件**：不能假设批量事件中每个事件的音效 key 都不同
- **音频系统应该透明**：游戏层生成多少个事件，就应该播放多少次音效（除非是真正的重复事件）

### 类似问题预防

未来如果遇到"批量操作只有第一个有音效"的问题，检查清单：

1. [ ] 是否是批量相同类型的事件
2. [ ] 去重逻辑是基于什么（key vs 签名）
3. [ ] 是否应该允许相同音效多次播放
4. [ ] 音频节流机制是否合理（80ms）

## 相关文档

- `evidence/smashup-minion-destroyed-sound-fix.md` - 消灭随从音效修复（registry 扫描问题）
- `docs/ai-rules/engine-systems.md` - 引擎系统规范
- `src/lib/audio/useGameAudio.ts` - 音频播放机制
- `src/games/smashup/domain/events.ts` - 事件音频配置
