# POD 系统架构与最佳实践

> 当前规则、运行时入口和新增卡牌最低要求以 `src/games/smashup/rule/POD-SYSTEM.md` 为主源。
> 本文只补充架构理由、注册层边界、数据审计和深度工作流，不复制主源的完整规则正文。

## 职责分层

POD 系统把卡牌数据定义和能力注册分成两种职责：

| 层级 | 处理方式 | 原因 |
| --- | --- | --- |
| 卡牌数据 | 每个 `_pod` 卡牌完整定义 | 数据字段可能与基础版不同，不能靠隐式继承猜测语义。 |
| 能力注册 | 基础版自动映射，POD 差异显式覆盖 | 注册按 `defId` 精确索引，能建立唯一映射并保留差异。 |

不要把数据层的“完整定义”误解成能力层也必须复制一套注册代码；也不要把能力层 alias 机制扩展成数据层继承。

## 注册层约束

初始化顺序必须是“所有基础版和显式 POD 覆盖注册完成，再执行 alias”：

```typescript
registerPodAbilityAliases();
registerPodInteractionAliases();
registerPodOngoingAliases();
registerPodPowerModifierAliases();
```

显式注册的 POD 目标必须在 alias 执行前进入 registry。alias 只补齐尚未注册的 `_pod` 目标，不能覆盖显式差异，也不能反向影响基础版。

能力 alias 的覆盖边界包括 ability、interaction、trigger、restriction、protection 和力量修正；数据字段如 `power`、`abilityTags`、`specialLimitGroup`、`count`、`previewRef` 仍由 POD 数据文件完整提供。

## 力量修正的双模式

一个力量修正只能选择一种归属：

1. 精确匹配基础 `defId`，由 `registerPodPowerModifierAliases()` 创建 POD alias。
2. 回调内部主动识别 `_pod`，并用 `{ handlesPodInternally: true }` 声明自管；alias 必须跳过它。

当前采用第二种模式的修正包括：

- `dino_armor_stego`：POD 版需要 `talentUsed` 标记。
- `dino_war_raptor`：需要统计基础版和 POD 版的总数。
- `robot_microbot_alpha`：需要统计基础版和 POD 版的总数。
- `steampunk_steam_man`：需要统计基础版和 POD 版的总数。

同一个修正不能同时走两种模式，否则会重复调用。若基础版和 POD 版行为确实不同，应显式注册 POD 版本，而不是在 alias 后再加第二层补丁。

## 选择性覆盖示例

```typescript
// 基础版与 POD 版相同：只注册基础版，POD 自动映射
registerTrigger('alien_scout', 'afterScoring', alienScoutAfterScoring);

// POD 版不同：在 alias 之前显式注册，自动映射会跳过它
registerAbility('dino_laser_triceratops', 'onPlay', dinoLaserTriceratops);
registerAbility('dino_laser_triceratops_pod', 'onPlay', dinoLaserTriceratopsPod);

// 只有部分能力不同：相同能力继续自动映射，不同能力单独覆盖
registerAbility('wizard_archmage', 'onPlay', wizardArchmage);
registerTrigger('wizard_archmage', 'onTurnStart', wizardArchmageTurnStart);
registerTrigger('wizard_archmage_pod', 'onTurnStart', wizardArchmagePodTurnStart);
```

验证至少覆盖：基础版单独触发、POD 版自动映射、显式覆盖不被 alias 覆盖，以及两个版本同时存在时不重复触发。详细实现历史见 `pod-auto-mapping.md`，当前运行时合同不要回写到历史文档。

## 数据一致性审计

手动维护 POD 数据时，容易漏字段或写错字段。审计脚本用于发现需要人工确认的差异，不把“与基础版不同”自动判定为错误。

脚本：`scripts/audit-pod-data-consistency.mjs`

检查字段：`power`、`abilityTags`、`specialLimitGroup`、`beforeScoringPlayable`、`ongoingTarget`、`subtype`。

```bash
node scripts/audit-pod-data-consistency.mjs
```

若差异是有意规则变化，应在数据来源或专项记录中说明原因，并把它列入审计例外；不能静默忽略报告，也不能用自动映射掩盖数据缺失。

项目可以把审计脚本接入 CI：

```json
{
  "scripts": {
    "audit:pod": "node scripts/audit-pod-data-consistency.mjs"
  }
}
```

## 新增 POD 卡牌工作流

1. 在 `src/games/smashup/data/factions/<faction>_pod.ts` 完整定义所有卡牌字段，并核对正式资料与图集索引。
2. 能力与基础版相同时，不新增注册代码；不同时，在所有 alias 执行前显式注册 POD 版本。
3. 运行 `node scripts/audit-pod-data-consistency.mjs` 和对应的领域 / 交互测试。
4. 回到 `POD-SYSTEM.md` 的新增入口检查数据、能力、验证和发布边界；真实玩法问题不能用审计脚本通过替代。

## 相关历史

- `pod-auto-mapping.md`：自动映射重构的历史实现记录。
- `pod-stub-cleanup.md`：占位注册覆盖正确 alias 的历史问题和修复记录。
- `pod-system-summary.md`：多项 POD 修复、测试和教训的历史汇总。
- `docs/bugs/ninja-acolyte-pod-ability-tags-fix.md`：数据字段不一致案例。
- `docs/bugs/power-modifier-pod-duplicate-fix.md`：力量修正重复调用案例。
