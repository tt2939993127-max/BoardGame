## 1. Approval

- [x] 1.1 建立独立 change，只覆盖 `1813` / `1911` 附属生物庇护 1。
- [x] 1.2 明确区域版 `1913`、法师绑定和其它结界响应保持 deferred。

## 2. Config Package Source And Loader

- [x] 2.1 扩展结构化授予特性枚举，严格读取 `aegis`。
- [x] 2.2 为 `1813` / `1911` 录入可见附属结界语义并标记为已实现。

## 3. Runtime Migration

- [x] 3.1 从目标对象附属来源读取最高庇护值，不叠加来源。
- [x] 3.2 将庇护减骰接入对象攻击和攻击法术；当前法师基础攻击没有攻击生物入口，保持 deferred。
- [x] 3.3 保持最低 1 骰和伤害类型免疫边界。

## 4. Verification

- [x] 4.1 增加 `1813` / `1911` 配置语义和 ability catalog 计数回归测试。
- [x] 4.2 增加对象攻击和攻击法术减骰测试；当前法师基础攻击没有攻击生物入口，边界已在 Spec 中保持 deferred。
- [x] 4.3 增加多来源取最高、移除展示文案后仍生效和最低骰数边界测试。
- [x] 4.4 增加 `1913` deferred 和法师绑定 deferred 回归断言。
- [x] 4.5 运行 Mage Wars / game-config 测试、ESLint、TypeScript 和 OpenSpec 严格校验。

## 5. Explicitly Deferred

- [x] 5.1 不在本 change 中实现 `1913` 区域庇护光环、法师绑定、隐藏结界、展示 / 反制或完整结界 UI。
