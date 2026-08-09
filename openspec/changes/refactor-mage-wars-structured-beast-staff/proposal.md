# Change: 将群兽法杖特殊能力迁入结构化领域执行

## Why

`3710` 群兽法杖已经完成学徒法术书字段录入，但仍依赖 `requiresCodeSupport`，其“限定兽王、每回合一次、快速法术、动物目标、近战 +2 或 2 颗攻击骰治疗”无法由当前装备施放与临时特性模型完整表达。

## What Changes

- 在配置包中为 `3710` 增加稳定的群兽法杖能力参数，并将该卡标记为已实现。
- 复用现有竞技场对象能力命令和事件，支持装备能力的强化 / 治疗两种模式，不新增重复的传输协议。
- 校验兽王限制、附着装备来源、快速施法窗口、法力、每回合一次、目标为己方活体动物生物和最多 1 格距离。
- 强化模式通过领域事件赋予目标本回合近战 +2；治疗模式投掷 2 颗攻击骰，并通过既有治疗事件应用实际治疗量。
- 将临时近战修正的生命周期从“生物行动阶段结束”修正为可明确区分“本行动”和“本回合”，同步修正 `3417` 荒野呼唤的规则生命周期。
- 补配置、能力目录、命令校验、事件执行、状态 reducer、回合清理和领域测试。

## Scope

本 change 只覆盖 `3710` 群兽法杖及其共享的临时近战修正生命周期。不扩展到 `3716` 法术绑定、`1901` 法术反制、`1904` 攻击逆转、装备栏、完整职业系统或 UI。

## Impact

- Affected specs: `mage-wars` card-effect runtime
- Affected code:
  - `src/games/mage-wars/data/mage-wars.config.json`
  - `src/games/mage-wars/data/configPackage.ts`
  - `src/games/mage-wars/domain/ids.ts`
  - `src/games/mage-wars/domain/commands.ts`
  - `src/games/mage-wars/domain/events.ts`
  - `src/games/mage-wars/domain/core-types.ts`
  - `src/games/mage-wars/domain/spellRules.ts`
  - `src/games/mage-wars/domain/validate.ts`
  - `src/games/mage-wars/domain/execute.ts`
  - `src/games/mage-wars/domain/reducer.ts`
  - `src/games/mage-wars/domain/flowHooks.ts`
  - `src/games/mage-wars/domain/spellAbilityExecutors.ts`
  - `src/games/mage-wars/__tests__/`

