## 0. Approval

- [x] 0.1 用户批准本 change 的“学徒模式真实运行链”范围；批准不等于批准全 322 张法术或整套 Mage Wars。

## 1. Spec and Boundary

- [x] 1.1 建立 `openspec/specs/mage-wars/spec.md` 作为 Mage Wars 唯一主 spec。
- [x] 1.2 记录 foundation 与本 change 的边界，明确状态注入 E2E 不能宣称玩法完成。
- [x] 1.3 建立规则对象到真实交互入口的覆盖表。

## 2. Runtime Interaction

- [x] 2.1 从配置包提供可选的学徒法术书分页、分类和可计划卡牌。
- [x] 2.2 通过真实点击发出计划法术命令并显示计划区变化。
- [x] 2.3 通过场地直选完成来源、目标区域、目标法师或目标对象选择。
- [x] 2.4 接通已实现的基础施法链，观察法力、弃牌、场地对象和法术 FX。
- [x] 2.5 接通移动、守卫、基础攻击和攻击结算链，观察骰子、伤害和状态 token。
- [x] 2.6 接通阶段推进、快速施法窗口和回合切换的产品入口。
- [x] 2.7 保持对手计划牌和未揭示信息的隐藏边界。

## 3. E2E

- [x] 3.1 新增从正式入口初始状态开始的桌面核心玩法 E2E。
- [x] 3.2 新增移动端真实点击链，不只验证截图和无溢出。
- [x] 3.3 验证计划、施法、攻击、骰子、伤害、状态、弃牌、法力和回合状态的真实变化。
- [x] 3.4 验证正式素材、法术 FX 和隐藏信息边界。
- [x] 3.5 保留并区分状态注入布局 E2E，禁止把它们当作核心玩法 E2E。

## 4. Verification

- [x] 4.1 补领域层测试并通过 Mage Wars 定向 Vitest。
- [x] 4.2 通过 TypeScript 和 ESLint。
- [x] 4.3 通过 `openspec validate add-mage-wars-runtime-gameplay-closeout --strict --no-interactive`。
- [x] 4.4 更新 Mage Wars 完成自审，按证据报告已完成、部分完成和后续范围。
