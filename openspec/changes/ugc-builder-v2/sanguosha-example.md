# 三国杀 UGC 验证案例

验证 UGC Builder 架构能否支持三国杀的核心机制。

---

## 1. Systems 层使用

三国杀复用以下 Systems：

| System | 用途 |
|---|---|
| **CardSystem** | 基本牌/锦囊牌/装备牌、手牌/牌堆/弃牌堆 |
| **ResourceSystem** | 体力(HP)、体力上限 |
| **TokenSystem** | 武器标记、翻面状态、铁索状态 |
| **AbilitySystem** | 武将技能（主动技/被动技/限定技/觉醒技） |

---

## 2. Definition 层配置

### 2.1 卡牌定义

```typescript
// 基本牌定义
const basicCards: CardDefinition[] = [
  {
    id: 'sha',
    name: '杀',
    type: 'basic',
    tags: ['attack', 'damage'],
    // 可视化编辑器填充
    suit: '♠',      // 花色
    number: 7,      // 点数
    // AI 生成的效果
    effects: [
      { type: 'TARGET_ONE', filter: { inAttackRange: true } },
      { type: 'REQUIRE_RESPONSE', cardType: 'shan', timeout: 10000 },
      { type: 'DEAL_DAMAGE', amount: 1, onNoResponse: true },
    ],
    playCondition: {
      phase: 'play',
      requireOwnTurn: true,
      // 限制每回合使用次数（可被技能修改）
      maxPerTurn: 1,
    },
  },
  {
    id: 'shan',
    name: '闪',
    type: 'basic',
    tags: ['defense'],
    effects: [],  // 响应牌，无主动效果
    playCondition: {
      // 只能在被要求响应时打出
      requireResponse: true,
      responseType: 'shan',
    },
  },
  {
    id: 'tao',
    name: '桃',
    type: 'basic',
    tags: ['heal'],
    effects: [
      { type: 'HEAL', amount: 1, target: 'self' },
    ],
    playCondition: {
      phase: 'play',
      requireOwnTurn: true,
      // 或者在任何人濒死时响应
      orCondition: { requireResponse: true, responseType: 'save' },
    },
  },
];
```

### 2.2 武将技能定义

```typescript
// 张飞 - 咆哮
const zhangfeiSkills: SkillDefinition[] = [
  {
    id: 'paoxiao',
    name: '咆哮',
    type: 'passive',  // 被动技
    description: '锁定技，你使用【杀】无次数限制',
    // AI 生成的效果：修改规则
    ruleModifier: {
      target: 'self',
      modify: { 'sha.maxPerTurn': Infinity },
    },
  },
];

// 诸葛亮 - 观星
const zhugeliangSkills: SkillDefinition[] = [
  {
    id: 'guanxing',
    name: '观星',
    type: 'active',
    timing: 'phase_start',
    description: '准备阶段，你可以观看牌堆顶的X张牌（X为存活角色数且至多为5），将任意数量的牌以任意顺序置于牌堆顶，其余以任意顺序置于牌堆底',
    // AI 生成的效果
    effects: [
      { type: 'PEEK_DECK', count: { min: 1, max: 5, formula: 'alivePlayerCount' } },
      { type: 'REARRANGE', zones: ['deck_top', 'deck_bottom'] },
    ],
    playCondition: {
      phase: 'prepare',
      requireOwnTurn: true,
    },
  },
  {
    id: 'kongcheng',
    name: '空城',
    type: 'passive',
    description: '锁定技，若你没有手牌，你不能被选择为【杀】或【决斗】的目标',
    // AI 生成的效果：目标过滤
    targetFilter: {
      when: { handCount: 0 },
      cannotBeTargetOf: ['sha', 'juedou'],
    },
  },
];

// 司马懿 - 反馈
const simayiSkills: SkillDefinition[] = [
  {
    id: 'fankui',
    name: '反馈',
    type: 'trigger',
    timing: 'after_damaged',
    description: '每当你受到伤害后，你可以获得伤害来源的一张牌',
    effects: [
      { 
        type: 'TAKE_CARD', 
        from: 'damageSource', 
        count: 1, 
        zones: ['hand', 'equip'],
        optional: true,  // 可选
      },
    ],
  },
];
```

### 2.3 回合阶段定义

```typescript
const turnPhases: PhaseDefinition[] = [
  { id: 'judge', name: '判定阶段', hooks: ['onJudge'] },
  { id: 'draw', name: '摸牌阶段', hooks: ['onDraw'], defaultDraw: 2 },
  { id: 'play', name: '出牌阶段', hooks: ['onPlay'], isMainPhase: true },
  { id: 'discard', name: '弃牌阶段', hooks: ['onDiscard'], handLimit: 'hp' },
  { id: 'end', name: '结束阶段', hooks: ['onTurnEnd'] },
];
```

---

## 3. Rules 层（AI 生成）

### 3.1 setup

```typescript
function setup(playerIds: string[], random: RandomFn): GameState {
  const deck = createStandardDeck(random);  // 108 张标准牌
  shuffle(deck, random);
  
  const players: Record<string, PlayerState> = {};
  for (const pid of playerIds) {
    players[pid] = {
      id: pid,
      characterId: 'unselected',
      hp: 0,
      maxHp: 0,
      hand: [],
      equip: {},
      judgeCards: [],
      skills: [],
      skillState: {},  // 限定技使用状态等
    };
  }
  
  return {
    players,
    deck,
    discard: [],
    currentPlayer: playerIds[0],
    phase: 'prepare',
    turnNumber: 1,
    pendingResponse: null,
  };
}
```

### 3.2 Commands

```typescript
const commands = {
  // 使用杀
  USE_SHA: {
    validate: (state, { targetId }) => {
      const player = getCurrentPlayer(state);
      const shaCount = state.turnContext?.shaUsed ?? 0;
      const maxSha = getMaxShaPerTurn(player);  // 考虑咆哮等技能
      
      if (state.phase !== 'play') return { valid: false, reason: '非出牌阶段' };
      if (shaCount >= maxSha) return { valid: false, reason: '杀次数用尽' };
      if (!inAttackRange(state, player.id, targetId)) {
        return { valid: false, reason: '不在攻击范围' };
      }
      return { valid: true };
    },
    execute: (state, { targetId, cardId }) => {
      // 打出杀
      playCard(state, cardId);
      // 设置待响应
      state.pendingResponse = {
        type: 'shan',
        from: state.currentPlayer,
        to: targetId,
        onTimeout: () => dealDamage(state, targetId, 1),
      };
      state.turnContext.shaUsed = (state.turnContext.shaUsed ?? 0) + 1;
    },
  },
  
  // 响应闪
  RESPOND_SHAN: {
    validate: (state, { cardId }) => {
      if (!state.pendingResponse || state.pendingResponse.type !== 'shan') {
        return { valid: false, reason: '无需响应' };
      }
      const card = findCard(state, cardId);
      if (!card || card.id !== 'shan') {
        return { valid: false, reason: '必须打出闪' };
      }
      return { valid: true };
    },
    execute: (state, { cardId }) => {
      playCard(state, cardId);
      state.pendingResponse = null;  // 响应成功，清除
    },
  },
  
  // 使用技能
  USE_SKILL: {
    validate: (state, { skillId }) => {
      const player = getCurrentPlayer(state);
      const skill = player.skills.find(s => s.id === skillId);
      if (!skill) return { valid: false, reason: '技能不存在' };
      if (skill.type === 'limited' && player.skillState[skillId]?.used) {
        return { valid: false, reason: '限定技已使用' };
      }
      // 检查技能的 playCondition
      return validateSkillCondition(state, player, skill);
    },
    execute: (state, { skillId, params }) => {
      const player = getCurrentPlayer(state);
      const skill = player.skills.find(s => s.id === skillId);
      
      // 执行技能效果
      executeEffects(state, skill.effects, params);
      
      // 标记限定技已使用
      if (skill.type === 'limited') {
        player.skillState[skillId] = { used: true };
      }
    },
  },
};
```

---

## 4. UI 生成提示词示例

### 4.1 技能按钮生成

**输入提示词**：
```
## 当前组件
- 武将：张飞
- 技能：咆哮（被动，锁定技，无按钮）

## 当前组件
- 武将：诸葛亮
- 技能：
  - 观星（主动，准备阶段可用）→ 需要按钮
  - 空城（被动，锁定技）→ 无按钮

## 要求
生成技能区域 UI，包含可用技能的按钮，点击触发 USE_SKILL 命令
```

**AI 生成的 UI 代码**：
```tsx
function SkillPanel({ player, phase, onUseSkill }) {
  const activeSkills = player.skills.filter(s => 
    s.type === 'active' && 
    s.playCondition?.phase === phase
  );
  
  return (
    <div className="skill-panel">
      {activeSkills.map(skill => (
        <Button
          key={skill.id}
          onClick={() => onUseSkill(skill.id)}
          disabled={!canUseSkill(player, skill)}
        >
          {skill.name}
        </Button>
      ))}
      {/* 被动技能只显示图标，不可点击 */}
      {player.skills.filter(s => s.type === 'passive').map(skill => (
        <Tooltip key={skill.id} content={skill.description}>
          <span className="passive-skill-icon">{skill.name}</span>
        </Tooltip>
      ))}
    </div>
  );
}
```

---

## 5. 可视化编辑器生成

根据 `CardDefinition` Schema 自动生成编辑器：

```typescript
const CardDefinitionSchema = {
  id: { type: 'string', required: true, editable: false },
  name: { type: 'string', required: true },
  type: { type: 'enum', options: ['basic', 'trick', 'equip'] },
  suit: { type: 'enum', options: ['♠', '♥', '♣', '♦'] },
  number: { type: 'number', min: 1, max: 13 },
  tags: { type: 'array', of: 'string' },
  description: { type: 'text', multiline: true },
  // 复杂字段 → AI 生成
  effects: { type: 'effects', aiGenerated: true },
  playCondition: { type: 'object', aiGenerated: true },
};

// 自动生成编辑器组件
<SchemaEditor
  schema={CardDefinitionSchema}
  value={currentCard}
  onChange={setCurrentCard}
  onAIGenerate={(field) => generateWithAI(field, currentCard)}
/>
```

---

## 6. 验证结论

| 验证项 | 结果 |
|---|---|
| Systems 复用 | ✅ CardSystem/ResourceSystem/TokenSystem/AbilitySystem |
| Definition 配置 | ✅ 卡牌/技能/阶段可声明式配置 |
| Rules AI 生成 | ✅ setup/commands/effects 可由 AI 生成 |
| 可视化编辑 | ✅ Schema → 编辑器，复杂字段 AI 生成 |
| 技能按钮 UI | ✅ 提示词包含技能数据，AI 生成可用按钮 |
| 跨组件交互 | ✅ 卡牌→技能→状态 通过 Command 串联 |

**架构可行**，可进入实现阶段。
