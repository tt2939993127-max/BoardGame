# 设计：非玩家生物施法者来源

## Owner 边界

- `MageWarsCastSpellCommand` 只表达“由哪个控制玩家提交施法请求”，不能以玩家 ID 代替实际施法者。
- `MageWarsArenaObjectState` 只在配置明确声明施法能力时成为合法非玩家施法者；对象能力来源由配置包负责，不能从中文规则正文临时解析。
- `SPELL_CAST_STARTED` / `SPELL_CAST_RESOLVED` 负责携带实际施法者引用。
- `systems.ts` 负责在法术成功结算事件之后查找施法者身上的 `1804`，并生成直接伤害事件；反制或取消路径不会经过该成功结算触发。
- `reducer.ts` 只消费结构化伤害事件，不直接读取 `1804` 文本。

## 施法者引用

```ts
type MageWarsSpellCasterRef =
  | { kind: 'mage'; playerId: PlayerId }
  | { kind: 'arena-object'; objectId: string; ownerId: PlayerId };
```

控制玩家和实际施法者分开保存：控制玩家用于权限、法力和法术书；施法者用于范围、来源、响应和 `1804` 触发。法师施法默认使用 `{ kind: 'mage' }`，只有带配置施法能力的 `creature` 才能使用 `{ kind: 'arena-object' }`。

## 1804 触发时序

1. 施法校验先确认控制玩家、法术书、法力、阶段和施法者来源合法。
2. 若目标施法者生物附属隐藏 `1804`，响应窗口仍按已有响应 frame 处理；展示 / 反制发生在法术成功结算之前，不产生 `1804` 伤害。
3. 只有 `SPELL_CAST_RESOLVED` 成功事件产生后，系统才查找该实际施法者的 `1804` 来源。
4. 生成 1 点直接伤害事件，目标为实际施法者生物；非活体 / 免疫规则由通用直接伤害路径裁定。
5. 若施法者、结界或法术在成功事件前离场，按当前状态查询结果不产生陈旧伤害。

## 不做的事情

- 不为任何现有生物臆造施法能力。
- 不把 `targetObjectId`、`sourceObjectId` 或 `playerId` 猜作实际施法者。
- 不把被 `1901` / `1825` / 其它窗口反制的施法视为成功结算。
- 不在本 change 中把 `1804` 提前标记为最终 `implemented`；只有真实生物施法来源可执行并通过回归后才更新配置统计。

规则书第 5 页列出的四套学徒法术书不包含魔宠或再生点来源卡；因此当前 change 只保留可验证的施法者引用与成功结算触发模型。对象独立计划、对象法力和真实魔宠 / 再生点施法入口转入 `add-mage-wars-familiar-spellcasting`，不在基础学徒配置中伪造来源。
