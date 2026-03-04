# 外星人（Aliens）全链路审查（修复后）

> 对应任务：`tasks.md` 2.1 + 2.4（基础派系逐张审查 + 六层矩阵）
>
> 描述源：`public/locales/zh-CN/game-smashup.json` 的 `alien_*`

## 1. 独立交互链拆分

1. `alien_supreme_overlord.return_minion`
2. `alien_collector.return_power_le3`
3. `alien_invader.gain_vp`
4. `alien_invasion.move_minion`
5. `alien_crop_circles.choose_base_then_choose_any_number`
6. `alien_disintegrator.to_deck_bottom`
7. `alien_probe.choose_target_reveal`
8. `alien_probe.deck_choice_top_or_bottom`
9. `alien_beam_up.return_minion`
10. `alien_terraform.choose_base_then_choose_replacement`
11. `alien_abduction.return_minion_and_extra_minion`
12. `alien_scout.after_scoring_optional_return`
13. `alien_jammed_signal.suppress_base_abilities`

## 2. 修复结论（关键链路）

| 交互链 | 当前实现结论 | 备注 |
|---|---|---|
| `alien_supreme_overlord.return_minion` | ✅ 允许任意随从目标 | 已移除“仅对手”限制 |
| `alien_collector.return_power_le3` | ✅ 允许本基地任意力量≤3随从目标 | 已移除“仅对手”限制 |
| `alien_disintegrator.to_deck_bottom` | ✅ 允许任意力量≤3随从，并放置到拥有者牌库底 | 事件为 `CARD_TO_DECK_BOTTOM` |
| `alien_beam_up.return_minion` | ✅ 单段交互：选择随从返回拥有者手牌 | 事件为 `MINION_RETURNED` |
| `alien_invasion.move_minion` | ✅ 两段交互：选随从 → 选目标基地 | 事件为 `MINION_MOVED` |
| `alien_crop_circles.choose_base_then_choose_any_number` | ✅ 两段交互：先选基地，再可重复选随从+done | 符合“任意数量”语义 |
| `alien_terraform.choose_base_then_choose_replacement` | ✅ 两段交互：先选被替换基地，再从 `baseDeck` 选替换基地 | 同步分离基地上的持续行动并给予额外随从 |
| `alien_scout.after_scoring_optional_return` | ✅ 记分后逐个可选回手（可循环） | `sourceId=alien_scout_return` 已纳入交互审计 |
| `alien_jammed_signal.suppress_base_abilities` | ✅ 压制所在基地能力（含扩展触发） | `triggerBaseAbility` 与 `triggerExtendedBaseAbility` 均受压制检查 |
| `interactionCompletenessAudit` 外星人映射 | ✅ 已与当前 source/chain 同步 | 包含 `crop_circles` 与 `terraform` 的链式声明 |

## 3. 当前遗留项

无。

