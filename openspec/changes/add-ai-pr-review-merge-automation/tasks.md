## 1. 设计与接入
- [ ] 1.1 定义 `pr-automation` 能力 spec，明确触发方式、输出格式、阻断规则、自动 merge 条件
- [ ] 1.2 设计 workflow 与 skill 的职责边界
- [ ] 1.3 明确权限模型：审查、自动修复、自动 merge 分别使用何种 token

## 2. Workflow 实现
- [ ] 2.1 新增 AI PR 审查 workflow
- [ ] 2.2 新增自动 merge workflow
- [ ] 2.3 接入仓库 `AGENTS.md` 与相关规则文档
- [ ] 2.4 将审查结果回写为 PR comment 或 check summary

## 3. 修复与验证
- [ ] 3.1 支持低风险自动修复并推回原 PR head 分支
- [ ] 3.2 接入质量门和 AI 审查的联合放行逻辑
- [ ] 3.3 补充 workflow 级验证与文档

## 4. 启用策略
- [ ] 4.1 先以只审查模式灰度启用
- [ ] 4.2 验证稳定后再开启自动 merge
