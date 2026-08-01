# 法师战争规则对象素材矩阵

> 状态：`historical-intake-snapshot / superseded-for-foundation-completion-by-runtime-resource-chain-audit`。本文件是阶段 0 规则对象素材矩阵，保留早期“哪些对象需要素材链”的判断；它不再作为当前 foundation 完成状态的唯一证据。当前资源链完成证据见 `docs/games/mage-wars/design/generated/runtime-resource-chain-audit.md` 与 `docs/games/mage-wars/foundation-completion-self-audit.md`。

## 状态说明

| 状态 | 含义 |
| --- | --- |
| `pass` | 源素材已锁定、语义命名、正式落盘、压缩/manifest 和运行时引用均完成。本阶段 0 intake 快照中暂无此状态；当前 foundation 资源链以后续审计文件为准。 |
| `local-asset-ready` | 源素材已锁定、语义命名、正式落盘、压缩/manifest 或 atlas config 已完成，可作为设计稿正式素材输入；但运行时代码引用尚未闭合，不等于 `pass`。 |
| `partial-local-asset-ready` | 复合对象中已有部分素材完成 `local-asset-ready`，但仍有子对象缺正式资源链或替代裁定。不得整体视为 `pass`。 |
| `source-locked-programmatic` | Workshop 或规则源明确为内置对象、颜色、尺寸或算法表达，没有独立贴图；可按来源程序化渲染，但不等于运行时完成。 |
| `coordinate-contract-ready` | 区域、轨道或槽位坐标已建立设计合同；仍需运行时引用或交互接线。 |
| `approved-programmatic` | 规则不需要图片，或用户明确批准程序化替代。本阶段 0 intake 快照中暂无此状态；当前 foundation 的自制运行态 UI 裁定以后续设计 / 实现审计为准。 |
| `out-of-scope` | 明确不属于首轮基础版或本体范围。 |
| `blocked` | 基础版需要该对象，但尚未完成正式资源链或仍缺语义裁定。源候选已找到也仍算 blocked。 |

## 基础版对象矩阵

| 规则对象 | 基础版必要性 | 素材需求 | 已锁来源 | 正式命名/落点 | 当前状态 | 下一步 |
| --- | --- | --- | --- | --- | --- | --- |
| 竞技场版图 | 基础版必需 | 需要主棋盘图；还需要 12 区域/2x3 半场坐标合同 | 规则 p4、p7；Workshop `标准竞技场` 包；本地 `httpcloud3steamusercontentcomugc1702910670704188662A394920C000036951DA1D3F7A636CC61ECFC9445.jpg`；坐标见 `docs/games/mage-wars/design/implementable/board-coordinate-contract.md` | `public/assets/i18n/zh-CN/mage-wars/board/standard-arena.jpg` | local-asset-ready / coordinate-contract-ready | 接入区域 ID、命中区、学徒半场方向和运行时引用 |
| 法师牌 | 基础版必需 | 需要法师牌正面；学徒可先用 4 名基础法师 | 规则 p5、p7；Workshop `法师` 包 28 项；本地 `mages-core-atlas` 已定位 | `public/assets/i18n/zh-CN/mage-wars/cards/mages/mages-core-atlas.png` + `public/assets/atlas-configs/mage-wars/mages-core-atlas.json` | local-asset-ready | 接入 atlas loader / 运行时引用；状态板仍需单独裁定 |
| 法师能力牌 | 基础版后续/标准模式必需 | 标准模式需要；学徒模式不使用 | 规则 p6-p7；Workshop `法师` 包 | `cards/mage-abilities/*` 待定 | blocked | 首轮若只做学徒，需在 proposal 中显式跳过能力牌规则 |
| 法师状态板 | 基础版必需 | 需要状态板图、轨道坐标和红 / 黑状态方块 | 规则 p6-p7；Workshop `Custom_Board` 玩家状态板；本地 `httpcloud3steamusercontentcomugc16274784517920313953F5AE90D6DBBD8CCA4F25724A93E2ECD386561E2.png`；轨道和方块见 `board-coordinate-contract.md` | `public/assets/i18n/zh-CN/mage-wars/boards/mage-status/mage-status-board.png` + Workshop 内置 `BlockSquare` | local-asset-ready / coordinate-contract-ready / source-locked-programmatic | 接入状态板、状态方块和运行时引用 |
| 法术书 | 基础版必需 | 需要私有牌库/计划区 UI；实体书本图片可选但需裁定 | 规则 p4-p5、p37；Workshop `法术书` 包 14 项、`新手法术书` 包 14 项 | `ui/spellbook` 或 `cards/spellbooks/*` 待定 | blocked | 先锁学徒预设法术书；不要直接全量构筑 |
| 学徒法术牌 | 基础版必需 | 需要卡面图与结构化规则文本 | 规则 p5 学徒清单；Workshop deck `17/18/19/22/28/29/34/35/36/37` | `public/assets/i18n/zh-CN/mage-wars/cards/spells/*.png` + `public/assets/atlas-configs/mage-wars/apprentice-spell-atlases.json` | local-asset-ready | 接入 atlas loader / 运行时引用；正式对局只用 atlas frame，不用临时裁图 |
| 全 322 张法术牌 | 扩展后续 | 需要全卡表、全文、atlas/crop | 规则 p6；Workshop 卡牌对象充足 | 待后续 change | out-of-scope | 拆 `card-catalog` change，不阻塞首轮学徒闭环 |
| 攻击骰 | 基础版必需 | 需要骰面/模型或程序化骰面批准 | 规则 p6；Workshop `攻击骰` 无限袋；本地贴图 `https40mediatumblrcomc6fcb742b9b66d90bef404852e09a317tumblrnvh8swsaWv1uhjh6fo11280png.png` | `public/assets/i18n/zh-CN/mage-wars/dice/attack-die-texture.png` | local-asset-ready | 裁定 2D 骰面或简化 3D 方案，并接入运行时骰子组件 |
| 效果骰 | 基础版必需 | 需要 12 面骰面或来源锁定程序化骰 | 规则 p6-p7；Workshop `效果骰` 无限袋，Contained `Die_12`，蓝色 `ColorDiffuse`，见 `board-coordinate-contract.md` | Workshop 内置 `Die_12`；无独立贴图 | source-locked-programmatic | 建立 12 面骰渲染组件和结果显示；不得用普通 D6 或文本替代 |
| 行动标记 | 基础版必需 | 需要标记正反面 | 规则 p6-p8；Workshop `行动标记` 无限袋；两人设置使用红色 / 蓝色 | `public/assets/i18n/zh-CN/mage-wars/tokens/action/action-marker-red-front.png` / `action-marker-red-back.png` / `action-marker-blue-front.png` / `action-marker-blue-back.png` | local-asset-ready | 接入行动状态翻面；黄 / 绿行动标记仅作四人模式候选，不进入本轮 |
| 快速施法标记 | 基础版必需 | 需要黑色独立标记正反面 | 规则 p6-p8；规则说明每名法师拿取 1 个黑色快速施法标记；Workshop `Custom_Tile` 快速施法候选 | `public/assets/i18n/zh-CN/mage-wars/tokens/quickcast/quickcast-marker-front.png` / `quickcast-marker-back.jpg` | local-asset-ready | 接入快速施法 ready / spent 翻面；红 / 蓝行动标记仍不得替代快速施法语义 |
| 就绪/冷却标记 | 基础版必需 | 需要正反面 | 规则 p6-p8；Workshop `就绪` 无限袋 | `public/assets/i18n/zh-CN/mage-wars/tokens/action/ready-token-front.png` / `ready-token-back.png` | local-asset-ready | 绑定行动状态；快速施法独立标记仍需定位 |
| 守卫标记 | 基础版必需 | 需要守卫标记 | 规则 p6、p29、p45；状态包 deck `206`；本地 `httpcloud3steamusercontentcomugc162747845179219110241FD9978DBED6A7FA3C3773D64C9B7BB20728A93.png` | `public/assets/i18n/zh-CN/mage-wars/tokens/status/guard-token.png` | local-asset-ready | 建立守卫视觉、规则状态和反击特性关联，并接入运行时 |
| 伤害/法力/聚魔指示物 | 基础版必需 | 需要计数标记、状态板轨道坐标和状态方块；独立法力指示物仍需裁定 | 规则 p6-p9；Workshop `伤害`、`聚魔`、状态板、`BlockSquare`；Workshop `聚魔` 袋 / deck `203` 已命中 | 伤害：`public/assets/i18n/zh-CN/mage-wars/tokens/damage/damage-token-front.png` / `damage-token-back.png`；聚魔：`public/assets/i18n/zh-CN/mage-wars/tokens/channeling/channeling-token-front.png` / `channeling-token-back.png`；状态板：`boards/mage-status/mage-status-board.png`；状态方块：Workshop 内置 `BlockSquare`；独立法力指示物待定 | partial-local-asset-ready / coordinate-contract-ready / source-locked-programmatic | 法师自身法力池走状态板黑色状态方块；独立法力指示物仍需定位或避开展示 |
| 状态标记 | 基础版必需 | 需要常见状态 token 图 | 规则 p6、p28-p29、p44-p46；Workshop `状态` 包 34 项；燃烧/腐化/眩晕/昏迷/沉睡等本地文件已定位 | `public/assets/i18n/zh-CN/mage-wars/tokens/status/{burn,rot,daze,stun,sleep}-token.png` | local-asset-ready | 接入运行时；其余状态如进入基础版再补素材矩阵 |
| 装备栏 | 基础版必需 | 槽位本身可 UI 绘制，但卡牌素材必须真实 | Workshop 顶层和四人包均有 `装备栏` 槽位 | `layout/equipment-slots` 待定 | blocked | 抽取槽位数量、左右玩家镜像和装备类型限制 |
| 结界栏/隐性结界 | 基础版必需 | 需要卡背/面朝下展示、附属层 UI；真实结界卡图 | 规则 p18、p46；Workshop `结界栏`、`友方结界`、`敌方结界` | `layout/enchantments` 待定 | blocked | 设计私密信息和展示费用流程，不能简化成公开状态 |
| 法术书 / 已计划法术 / 弃牌堆 | 基础版必需 | 需要卡牌背面、法术书入口、已计划法术槽和弃牌堆区域 UI | 规则 p5、p7、FAQ p6-p7；Workshop `弃牌堆`、`法术书` / `新手法术书`；`HandTrigger` 只作座位方向参考 | `layout/spellbook-prepared-discard` 待定 | blocked | 设定 playerView：自己的法术书入口与已计划法术可见；对手已计划法术、未公开法术书内容和隐性结界隐藏 |
| 墙体/魔物/再生点 | 基础版可分层 | 需要对象卡图、边界/区域放置规则 | 规则 p10、FAQ p7、p10；学徒范围已含 `缠绕藤蔓` 魔物 | 魔物卡已在学徒法术 atlas config；墙体待后续细分 | blocked | `缠绕藤蔓` 走学徒 atlas；若基础牌引入墙体，必须建放置和视线/通行合同 |
| 法术释放特效 | 用户明确要求首轮硬需求 | 需要规则事件驱动 FX；不一定需要图片素材 | 用户明确要求；`tech-selection.md` 已记录 | `engine/fx` 事件映射待定 | blocked | 在 design/tasks 中建立施法来源、目标、路径、命中结果 FX 合同 |

## 阶段 0 结论

- 本矩阵已覆盖基础版主要规则对象；标准竞技场、法师状态板、法师牌 atlas、学徒法术 atlas、卡背、攻击骰贴图、红/蓝行动标记、快速施法标记、就绪 / 伤害 / 聚魔 / 基础状态 token 已完成正式落盘、压缩、manifest 或 atlas config；标准竞技场 12 区域、状态板轨道、红 / 黑状态方块和效果骰已补来源锁定或坐标合同。
- 本文件中的 `blocked` / `local-asset-ready` 等状态是阶段 0 intake 快照，不得单独用来反证当前 foundation 完成状态。
- 当前 foundation 资源链、运行时引用、远端发布和 Android 游戏素材包完成口径，以 `docs/games/mage-wars/design/generated/runtime-resource-chain-audit.md`、`test-results/evidence-screenshots/mage-wars/foundation-board-runtime/evidence.md` 和 `docs/games/mage-wars/foundation-completion-self-audit.md` 为准。
