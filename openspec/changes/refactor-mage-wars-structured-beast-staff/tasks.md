## 0. Approval

- [x] 0.1 当前会话已确认继续 Mage Wars 结构化领域实现，并沿用已批准的配置包 / 领域事件路线。

## 1. Configuration

- [x] 1.1 为 `combatTraits` 增加 `beastStaff` 严格类型与读取校验。
- [x] 1.2 为 `3710` 录入能力参数并将 `requiresCodeSupport` 改为 `false`。
- [x] 1.3 增加稳定群兽法杖能力 ID，并让能力目录统计 `3710` 为 implemented。

## 2. Domain Runtime

- [x] 2.1 扩展现有竞技场对象能力命令 / 事件，支持 `melee-bonus` 与 `heal`，不新增重复命令 owner。
- [x] 2.2 增加附着装备、兽王、距离、每回合一次和行动轨道校验。
- [x] 2.3 实现强化事件、2 颗攻击骰治疗事件、法力与行动消耗、每回合使用记录。
- [x] 2.4 将 `3417` 和 `3710` 的近战修正标记为回合有效，并在新回合统一清理。

## 3. Tests And Verification

- [x] 3.1 补配置与能力目录测试。
- [x] 3.2 补强化 / 治疗成功路径和骰数、治疗上限测试。
- [x] 3.3 补兽王、附着来源、范围、法力、行动标记、重复回合使用拒绝测试。
- [x] 3.4 补临时近战修正跨阶段保留和新回合清理测试，并运行 Mage Wars 定向测试、TypeScript、ESLint、OpenSpec 严格校验。
