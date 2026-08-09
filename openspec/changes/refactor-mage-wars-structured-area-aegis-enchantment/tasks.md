## 1. Approval

- [x] 1.1 建立独立 change，只覆盖 `1913` 区域庇护 1。
- [x] 1.2 明确与 `1813` / `1911` 对象庇护共用最高值 owner，区域 / 墙体 / 反制边界保持 deferred。

## 2. Config Package Source And Loader

- [x] 2.1 扩展结构化结界语义，严格读取 `visible-area-enchantment` 和 `zone` 锚点。
- [x] 2.2 为 `1913` 录入区域结界语义并标记为已实现。

## 3. Runtime Migration

- [x] 3.1 让 `1913` 生成公开区域锚定结界对象。
- [x] 3.2 从同区域有效区域来源读取友方活体生物庇护。
- [x] 3.3 将区域来源与对象附属来源合并为最高庇护值，并保持最低 1 骰和免疫边界。

## 4. Verification

- [x] 4.1 增加 `1913` 配置语义、计数和 requiresCodeSupport 回归测试。
- [x] 4.2 增加施放后区域锚点、友方 / 敌方 / 区域外目标边界测试；法师不进入对象庇护查询。
- [x] 4.3 增加区域离开后不生效、移除展示文案、多来源取最高和最低骰数测试。
- [x] 4.4 运行 Mage Wars / game-config 测试、ESLint、TypeScript 和 OpenSpec 严格校验。

## 5. Explicitly Deferred

- [x] 5.1 不在本 change 中实现墙体 / 标准 12 区、隐藏结界、展示 / 反制、法师绑定、法师基础攻击生物入口或完整区域结界 UI。
