# Summoner Wars Phase B 增量证据：simple-choice presenter 去镜像

## 范围
- 文件：`src/games/summonerwars/ui/useEventCardModes.ts`
- OpenSpec：`openspec/changes/refactor-summonerwars-local-ui-interactions/`
- 目标：把已经由 `sys.interaction` 表达的 `simple-choice` 事件卡链路，从本地 `useState` 镜像 mode 收回到“直接由当前交互派生 presenter”

## 本轮结论
- `event_target`、`funeral_pyre`、`mind_control_select_targets`、`hypnotic_lure_select_target`、`chant_entanglement_select_targets` 不再各自维护独立本地真相源。
- `mind_control` 与 `chant_entanglement` 仍需要本地“已选项”缓存，但缓存对象改为当前交互的 `optionIds`，不再维护游戏专属 `selectedTargets` 真相源；真正的候选来源仍以 `swInteraction.options` 为准。
- `blood_summon`、`annihilate`、`sneak`、`glacial_shift` 等跨步累计链路仍保留在后续批次，不在本轮硬抽成新的 `multistep-choice`。

## 直接证据
- `useEventCardModes` 中已删除以下本地 `useState` 真相源：
  - `eventTargetMode`
  - `funeralPyreMode`
  - `mindControlMode`
  - `hypnoticLureMode`
  - `chantEntanglementMode`
- 上述 mode 现改为从 `swInteraction.type/meta/options` 直接 `useMemo` 派生。
- `mind_control` / `chant_entanglement` 的棋盘点击逻辑改为切换当前交互 `optionId` 选择集，再由确认动作统一发 `RESPOND optionIds`。

## 校验
- 命令：`npm run test -- src/games/summonerwars/__tests__/interaction-chain-comprehensive.test.ts`
- 结果：通过（83 tests passed）

## 仍未收口的风险
- `magic_event_choice`、`stun`、`withdraw`、`after_attack_*`、`telekinesis_*` 仍有 simple-choice presenter 镜像，属于下一批。
- `blood_summon`、`annihilate`、`sneak`、`glacial_shift`、`revive_undead` 仍保存跨步累计结果，后续需要继续收敛到通用多步建模。
- `hidden interaction` 的 Summoner Wars 专属 owner/guest UI 级证据、以及 Phase B 代表链路 cancel/skip / 不重触发回归，仍待补齐。
