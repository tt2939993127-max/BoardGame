# DiceThrone 枪手 / 武士复审记录（2026-04-05）

## 审计范围

- 游戏：`dicethrone`
- 角色：`gunslinger`、`samurai`
- 目标：复核这两个新角色的“真相源 -> 数据定义 -> 执行链 -> 状态 -> 测试”闭环，确认旧“已收口”结论是否仍成立。

## 权威来源

- 枪手规则文档：
  - `src/games/dicethrone/rule/枪手真相源表.md`
  - `src/games/dicethrone/rule/枪手录入核对.md`
  - `src/games/dicethrone/rule/枪手卡牌录入核对.md`
- 武士规则文档：
  - `src/games/dicethrone/rule/武士真相源表.md`
  - `src/games/dicethrone/rule/武士录入核对.md`
  - `src/games/dicethrone/rule/武士卡牌录入核对.md`
- 当前运行时代码：
  - `src/games/dicethrone/heroes/gunslinger/*`
  - `src/games/dicethrone/heroes/samurai/*`
  - `src/games/dicethrone/domain/flowHooks.ts`
  - `src/games/dicethrone/domain/customActions/gunslinger.ts`
  - `src/games/dicethrone/domain/customActions/samurai.ts`
  - `src/games/dicethrone/domain/characters.ts`

## 审计方法

1. 先按角色文档逐项核“应该存在的能力/状态/卡牌”。
2. 再追源码闭环：定义 -> 注册 -> 流程钩子 / custom action / reducer -> 测试。
3. 对高风险点重点搜索：
   - `type: 'passive'`
   - `trigger: { type: 'phaseStart' }`
   - `bushido`
   - `samurai-back-strike-use`
   - `gunslinger-bounty-reward`
4. 最后复跑直接相关回归，确认当前基线。

## 逐项结论

### 1. 枪手 `Quick Draw / 快速拔枪` 旧审计结论已失效，问题已在本轮修复

- 真相源要求：
  - `src/games/dicethrone/rule/枪手录入核对.md` 明确写的是“维持阶段获得 `loaded`”。
- 复审前代码状态：
  - `src/games/dicethrone/heroes/gunslinger/abilities.ts` 里 `quick-draw` 使用 `trigger: { type: 'phaseStart', phase: 'upkeep' }`
  - 但此前仓库没有任何执行链消费 `AbilityDef.trigger.type === 'phaseStart'`
- 根因：
  - 这是典型 `D3 数据流闭环` + `D8 时序正确` 漏项：定义存在，但 `flowHooks` 未执行。
- 本轮修复：
  - `src/games/dicethrone/domain/combat/conditions.ts` 补 `PhaseStartCondition`
  - `src/games/dicethrone/domain/flowHooks.ts` 在进入 `upkeep` 时执行 `passive + phaseStart(upkeep)` 能力
  - 且先应用 `exitEvents`，保证首回合 `setup -> upkeep` 也能拿到 `loaded`
- 当前验证：
  - `src/games/dicethrone/__tests__/cross-hero.test.ts` 新增断言：枪手初始化后 `tokens.loaded === 1`
- 判定：
  - 旧“枪手线当前不再保留 `Loaded` 时机冲突为 residual”的口径在修复前不成立，现已修正。

### 2. 武士 `Bushido / 武士道` 当前仍未实装

- 真相源要求：
  - `src/games/dicethrone/rule/武士录入核对.md` 写明：
    - 起始玩家开局获得 `1 honor`
    - 若本回合攻击掷骰少于 `3` 次，回合结束再得 `1 honor`
- 当前代码状态：
  - `src/games/dicethrone/heroes/samurai/abilities.ts` 中 `BUSHIDO` 定义为 `type: 'passive'`
  - 但 `effects: []`
  - 全仓搜索 `bushido`，只有：
    - `abilities.ts` 定义
    - `characters.ts` 初始等级
    - UI 槽位映射
    - 规则文档
  - 没有任何：
    - `flowHooks`
    - `customActions`
    - `passiveAbilities`
    - `测试断言`
    去消费这条被动
- 直接结论：
  - 武士 `Bushido` 现在只是“展示层存在”，不是“规则层已实现”。
- 命中维度：
  - `D3 数据流闭环`
  - `D8 时序正确`
  - `D21 触发频率门控`
  - `D47 测试覆盖完整性`

## 已验证测试

```powershell
npm run test -- src/games/dicethrone/__tests__/token-execution.test.ts src/games/dicethrone/__tests__/cross-hero.test.ts
```

结果：

- `token-execution.test.ts` 通过
- `cross-hero.test.ts` 通过
- 总计 `106 passed`

说明：

- 现有回归能覆盖枪手 `loaded`、武士 `honor/shame/retribution`、`stand-tall`、`masamune`、`righteousness` 等主链路
- 但当前没有任何用例覆盖 `Bushido` 的“开局 +1 honor”与“回合结束少于 3 次攻击掷骰再 +1 honor”

## 失效结论 / 修订说明

- 枪手：
  - 旧文档曾把 `Loaded` 时机视为已收口，但复审发现 `quick-draw` 的 `phaseStart` 实际未执行。
  - 该问题现已修复，旧结论必须视为已失效并已在本轮回写。
- 武士：
  - `src/games/dicethrone/rule/武士录入核对.md` 中“当前未再保留武士角色级 residual”的结论已失效。
  - 至少 `Bushido` 仍是明确未闭环缺口，不能继续宣称“角色级 residual = 0”。

## 未覆盖风险

1. 枪手 `Bounty` 的 Wiki 补充裁定（如“伤害被完全防止时是否仍给 CP”）本轮只做代码路径核读，尚未补专门行为回归。
2. 武士 `Bushido` 缺口尚未修复；若继续推进“武士已收口”的口径，会误导后续测试和联机验收。
3. 武士当前主链路测试通过，不代表角色完整；被动技能漏实现说明“已有测试覆盖”仍不足以代替逐项复审。
