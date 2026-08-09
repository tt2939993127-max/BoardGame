## 0. Approval

- [x] 0.1 用户已批准继续实现本提案。

## 1. Engine Response Contract

- [x] 1.1 为响应窗口增加可选的强制交互 / 不可跳过状态，保持默认可选响应行为不变。
- [x] 1.2 允许 `createBaseSystems` 为游戏注入响应窗口配置，避免 Mage Wars 注册第二个并行响应系统。
- [x] 1.3 补响应窗口强制阻塞、普通 pass 和已有可选响应回归测试。

## 2. Mage Wars Resolution Context

- [x] 2.1 建立带 schema 校验的 Mage Wars 施法 / 攻击 resolution context，并绑定所属 frame。
- [x] 2.2 增加法术反制时机事件和响应窗口事件映射，不把上下文写入交互 payload 作为唯一真相。
- [x] 2.3 增加旧窗口、旧交互、错误来源和重复响应的拒绝路径；响应提交按当前 interaction、响应者、active resolution frame、响应对象和响应卡牌实时校验，失效时保留交互与响应窗口并拒绝继续结算。

## 3. Card Runtime

- [x] 3.1 为 `1825` 增加快速法术反制、法术书返还、全额法力返还和来源结界摧毁。
- [x] 3.2 为 `1901` 增加对手咒语 / 结界目标判定、反制和来源结界摧毁。
- [x] 3.3 为 `1904` 增加 `reverse-attack` 防御 profile、可回避逆转和不可回避只摧毁分支。
- [x] 3.4 保持 `1804` 的 `needsCode`，并在文档中记录它需要独立的非玩家生物施法者来源建模。

## 4. Tests And Closeout

- [x] 4.1 补三张卡的合法触发、错误触发、强制展示、重复响应和恢复顺序测试。
- [x] 4.2 补法术书、法力、弃牌堆、隐藏结界和攻击来源 / 目标交换边界测试。
- [x] 4.3 只有所有执行测试通过后才更新配置统计、领域建模文档和 OpenSpec 任务状态。
- [x] 4.4 运行当前切片的 Mage Wars 定向 Vitest、引擎响应窗口测试、TypeScript、ESLint 与 OpenSpec 严格校验；响应切片收口后已完成旧交互、错误来源和失效 frame 回归。

> 当前状态（2026-08-04）：引擎强制响应窗口、`1825`、`1901`、`1904` 的运行时切片已完成。`1825` 使用 `creature` 锚点同时覆盖竞技场生物和法师，响应前记录支付状态，强制展示后按规则返还法力 / 准备牌或进入弃牌堆；`1804` 仍需要独立的非玩家生物施法者来源建模。配置包当前为 `90 implemented / 1 needsCodeSupport`，仅保留 `1804` 为 `needsCodeSupport=true`。`2.3` 已补齐当前 interaction、响应者、active resolution frame、响应对象和响应卡牌的实时校验，并通过错误来源与 frame 删除回归；本 change 的任务项已完成，最终 OpenSpec 严格校验已通过。
