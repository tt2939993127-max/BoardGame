## 0. Approval

- [x] 0.1 沿用已批准的 Mage Wars 配置包 / 领域实现路线，按当前会话继续推进 `3700`。

## 1. Config Package Source And Loader

- [x] 1.1 增加 `damageBarrier` 的严格配置类型和读取校验。
- [x] 1.2 为 `3700` 录入内部标识、1 颗骰、无法回避、致命伤害和每回合限制。
- [x] 1.3 将 `3700` 的 `requiresCodeSupport` 改为 `false`。

## 2. Domain Runtime

- [x] 2.1 增加屏障来源查询、来源使用状态和 `DAMAGE_BARRIER_TRIGGERED` 事件。
- [x] 2.2 在法师基础近战和场上对象近战完成攻击后接入屏障结算。
- [x] 2.3 复用伤害管线，确保致命伤害忽略护甲、对象目标可受伤害并可被击败。
- [x] 2.4 保持远程 / 攻击法术不触发、屏障不触发防御 / 反击 / 屏障递归。

## 3. Tests And Documentation

- [x] 3.1 补配置与能力目录统计测试。
- [x] 3.2 补法师近战、对象近战、护甲忽略、回合一次、来源移除和攻击者击败测试。
- [x] 3.3 同步领域建模和配置包复查文档。
- [x] 3.4 运行 Mage Wars 测试、TypeScript、定向 ESLint、OpenSpec 严格校验和 diff 检查。
