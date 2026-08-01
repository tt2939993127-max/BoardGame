# 法师战争 Step 1 素材化布局候选审计

> 状态：`internal-layout-candidate / not-imagegen-final / human-review-not-allowed`。本文件审计 `temp/mage-wars/design-redesign/step1-material-layout-candidate-v2.png`。该图只用于验证“规则对象是否已由正式素材承担、边框是否退让、下一版 imagegen 应该如何约束”，不是用户人工验收设计稿。

## 候选图

| 项 | 内容 |
| --- | --- |
| 候选图 | `temp/mage-wars/design-redesign/step1-material-layout-candidate-v2.png` |
| 生成方式 | 本地 `sharp` 素材拼接；未调用 imagegen；未调用 Open Design 设计 agent |
| 输入包 | `docs/games/mage-wars/design/reference/step1-runtime-board-imagegen-brief.md` |
| 当前结论 | 可作为 Step 1 布局 / prompt 参考；不能作为正式设计稿交付 |

## 相对第一版修正

| 问题 | 第一版表现 | 第二版修正 | 当前结论 |
| --- | --- | --- | --- |
| 棋盘主体 | 正式竞技场已居中，但顶部标题和底部过程文字抢注意力 | 删除大标题和底部过程声明，竞技场扩展到更大主画布 | `improved` |
| 法师位置 | 棋盘上用小黄点代替法师 | 两名法师牌裁片放回候选半场对角，并贴行动 / 快速施法标记 | `improved` |
| 状态板 | 使用正式状态板，导致玩家状态仍像直接贴原板面 | 降级为失败点：状态板只能 `reference-only`，下一版必须改为贴近法师牌的自制生命 / 法力 / 聚魔 HUD | `failed-candidate` |
| 隐藏信息 | 对手隐藏区使用正式卡背 | 保持正式卡背，不公开对手私有卡名 | `pass-for-candidate` |
| 边框感 | 按钮和候选区仍有底板 / 高亮 | 只保留按钮底板和对象附着高亮；无大面板分栏框 | `pass-for-candidate` |

## AI 图面核验

| 检查项 | 结论 | 证据 / 说明 |
| --- | --- | --- |
| 规则证据 | `partial` | 候选图依据第 4 / 6 / 7 页：2x3 学徒半场、行动 / 快速施法标记、法师牌、骰子和 token；但把状态板当主界面可见面板，已与最新裁定冲突。 |
| 正式素材承担主体 | `partial` | 主体对象来自正式竞技场、法师 atlas、法术 atlas、卡背、行动 / 快速施法 token、状态 token、攻击骰贴图；状态板不应再算主界面主体。 |
| 禁止替代 | `pass-for-candidate` | 未使用 CSS 棋盘、通用头像、文字卡、普通 D6 或普通数字状态栏替代主体对象。 |
| 少边框 | `pass-for-candidate` | 仍有按钮底板和半场候选高亮，但没有大侧栏面板、玻璃板、多层卡壳或框体分舱。 |
| 隐藏信息 | `pass-for-candidate` | 对手卡区只用正式法术卡背，未公开卡名。 |
| 阻塞对象 | `pass-for-candidate` | 未展示独立法力指示物、墙体、四人模式或豪华竞技场对象。 |
| 正式位图设计稿资格 | `fail` | 该图是本地素材拼接图，且仍把状态板作为主界面可见玩家面板；不能作为 imagegen / Open Design 的正向布局参考。 |
| 人工验收资格 | `fail` | 未经过正式 imagegen 出图和 AI 设计稿 PASS，不得打开给用户作为验收图。 |

## 下一步约束

- 下一版正式 Step 1 位图稿必须使用 `step1-runtime-board-imagegen-brief.md` 作为输入，不得回到旧 `board-ui-preview.html`。
- 正式稿只允许保留第二版中仍正确的结构：竞技场是第一主体，法师牌在候选半场对角，行动 / 快速施法 token 贴法师牌，隐藏信息用卡背。状态板必须移出主界面可见主体，玩家生命 / 法力 / 聚魔改为自制运行态 HUD。
- 正式稿必须继续减少框体：按钮只保留 `施法`、`移动`、`守卫`、`结束` 这类短标签；不得出现规则说明正文、日志栏、帮助正文、黑色分栏面板。
- Open Design MCP 当前工具通道返回 `transport closed`，但 daemon HTTP health 和项目列表可达；若恢复 MCP 或使用正式 imagegen 工具后，才能继续生成可验收位图。
