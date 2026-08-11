# 测试与审计

本路由处理“如何证明结果正确”，包括测试编写、E2E、截图、审计、回归和不可复现问题。测试入口必须回到用户原始业务位点。

## 测试与 E2E

- 编写或修复 Vitest/Playwright 测试：读项目 [`自动化测试`](../../../docs/automated-testing.md) 与 [`e2e-verification`](../standards/e2e-verification.md)。
- 本地联机或单人同步调试：读 [`本地测试模式`](../../../docs/test-mode.md)；若涉及真实开房、状态注入和截图，再读 [`e2e-verification`](../standards/e2e-verification.md)。
- E2E 交互、真实入口、截图证据、视觉验收或用户直接要截图：读 [`e2e-verification`](../standards/e2e-verification.md)、[`自动化测试`](../../../docs/automated-testing.md)、项目 [`screenshot-delivery`](../../skills/screenshot-delivery/SKILL.md) 和系统 `show-image-to-user`。
- E2E 太慢、长链拆分、主页起跑或“测试驱动一直写测试没推进实现”：先读 [`e2e-verification`](../standards/e2e-verification.md)，再读 [`自动化测试`](../../../docs/automated-testing.md)，不要自行换成另一套验证链。

## 审计与回归

- 新增功能/技能/API、规则 bug 或实现完整性审查：读 [`testing-audit`](../standards/testing-audit.md)、[`testing-audit-core-principles`](../standards/testing-audit-core-principles.md)、[`testing-audit-dimensions`](../standards/testing-audit-dimensions.md) 和 [`audit-evidence-template`](../standards/audit-evidence-template.md)。
- 只命中某类高风险维度：先读 [`维度入口`](../standards/testing-audit-dimensions.md)，再进入对应分卷（延迟交互、资源时序、语义交互、状态管线等）。
- 用户说“以前好的现在坏了、审计漏了、为什么又回归”：读 [`regression-closeout`](../standards/regression-closeout.md) 和 [`testing-audit`](../standards/testing-audit.md)。
- 用户反馈不可复现、线上已恢复但需要判断是否继续：读 [`自动化测试`](../../../docs/automated-testing.md) 的证据式收口，再按具体业务回到本路由的对应合同。
- UI 审计不能只用 E2E 绿灯收口：转 [`UI 与截图交付`](ui.md)，补读系统 `ui-audit-loop` 和 [`ui-change-gates`](../standards/ui-change-gates.md)。
- 修改共享层、通用 helper、watchdog、transport、response-window 或跨游戏状态：读 [`shared-refactor-guard`](../standards/shared-refactor-guard.md)，并完成本路由的审计与回归入口。
