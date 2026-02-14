## 1. 审查基线与映射（前置）
- [x] 1.1 建立派系/基地审查清单：`<i18n key 前缀> -> <能力实现文件> -> <交互处理器/持续效果注册点>`
- [x] 1.2 固化“独立交互链”拆分规则与六层检查模板（定义层、执行层、状态层、验证层、UI 层、测试层）
- [x] 1.3 约定审查证据格式：每个交叉点必须记录 `文件路径 + 函数名 + ✅/❌ + 备注`

## 2. 16 个派系审查执行（可并行）
- [x] 2.1 基础 8 派系逐张审查：Aliens / Dinosaurs / Ninjas / Pirates / Robots / Tricksters / Wizards / Zombies
- [x] 2.2 Awesome Level 9000 扩展 4 派系逐张审查：Bear Cavalry / Steampunks / Killer Plants / Ghosts（含扩展条目）
- [x] 2.3 克苏鲁扩展 4 派系逐张审查：Cthulhu / Elder Things / Innsmouth / Miskatonic University
- [x] 2.4 每个派系输出“独立交互链 × 六层”矩阵，并记录缺失实现/实现偏差/测试缺失

## 3. 基地卡全链路审查
- [x] 3.1 对照 `base_*` 能力文本与 `baseAbilities.ts`/`baseAbilities_expansion.ts` 实现逐张比对
- [x] 3.2 核对计分触发、持续触发、限制拦截三类机制在执行层与验证层的覆盖完整性
- [x] 3.3 输出基地能力“独立交互链 × 六层”矩阵并附修复建议

## 4. 缺陷修复与回归验证
- [x] 4.1 对 ❌ 无代码与 ⚠️ 行为偏差项完成修复（优先影响规则正确性的项）
- [x] 4.2 为新增/修复行为补充对应测试（正常 + 异常/边界）（本轮无新增修复行为，未触发新增测试）
- [x] 4.3 运行 SmashUp 相关测试集并确认通过（含交互完整性、能力行为、i18n 完整性）

## 5. 汇总报告交付
- [x] 5.1 生成总报告：列出所有问题并按严重度分组（❌ 缺失实现 / ⚠️ 实现偏差 / 📝 测试缺失）
- [x] 5.2 统计每个派系审查通过率（✅ 数量 / 总交互链数量）
- [x] 5.3 产出按修复优先级排序的行动清单（规则正确性优先于测试补全）

## 6. OpenSpec 校验
- [x] 6.1 运行 `openspec validate add-smashup-full-chain-audit --strict --no-interactive`
- [x] 6.2 若校验失败，使用 `openspec show add-smashup-full-chain-audit --json --deltas-only` 定位并修复（本次校验通过，未触发）
