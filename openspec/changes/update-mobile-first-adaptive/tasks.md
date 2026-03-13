## 1. 规范与能力规格（mobile-adaptive）
- [ ] 1.1 新增 `openspec/specs/mobile-adaptive/spec.md`（需求 + 场景）
- [ ] 1.2 新增 `openspec/specs/mobile-adaptive/design.md`（断点/布局/热区/资源加载的实现约定）

## 2. 项目级 Skill（AI 移植流程）
- [ ] 2.1 新增 `skills/mobile-adaptive/SKILL.md`（移动端移植工作流）
- [ ] 2.2 在 Skill 中定义“Cardia 作为模板”的执行步骤与验收门禁（E2E + 截图）

## 3. Cardia 迁移（参考实现）
- [ ] 3.1 审查 Cardia 对局页容器：移除/禁止整页缩放路径（如有）
- [ ] 3.2 按规范修复溢出/滚动：确保核心区不被手牌区遮挡
- [ ] 3.3 触控热区：卡牌/按钮 hit-area 至少满足规范下限
- [ ] 3.4 横竖屏：实现明确的布局切换策略（同一套断点/方向规则）
- [ ] 3.5 资源分级加载：移动端首屏预算达标（延迟加载非关键资源）

## 4. 测试与证据
- [ ] 4.1 更新/补充 `e2e/cardia-smoke-test.e2e.ts`：覆盖规范定义的 viewport 组
- [ ] 4.2 运行 `npm run test:e2e:ci -- e2e/cardia-smoke-test.e2e.ts`
- [ ] 4.3 产出证据文档：`evidence/cardia-mobile-adaptive-e2e.md`

