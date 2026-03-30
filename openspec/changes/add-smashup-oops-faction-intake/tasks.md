## 1. 来源锁定与工作流
- [ ] 1.1 记录本次图片来源、TTS 元数据来源、Wiki 抓取来源与适用范围，建立 Markdown 核对契约
- [ ] 1.2 将“Smash Up 新派系图片录入”沉淀为可复刻文档/工作流，覆盖压缩、atlas、录入、审计、测试、证据
- [ ] 1.3 若图片内容与目标派系列表不一致，显式登记 blocker，并禁止进入运行时代码接入

## 2. 运行时接入
- [ ] 2.1 为 Oops 四派系新增 card/base atlas 槽位与资源路径，禁止覆盖现有 atlas
- [ ] 2.2 接入 Smash Up atlas catalog、previewRef 映射与关键图片预加载解析器
- [ ] 2.3 完成四派系的基础数据录入（至少包含 faction/base/card 元数据与图片索引）；涉及规则文本必须来自 Wiki 抓取结果
- [ ] 2.4 若 cards 原图缺失，流程停在“待补正确原图”状态，只保留可验证的非运行时产物，不写入错误 atlas

## 3. 验证
- [ ] 3.1 运行 Smash Up 相关审计 / Vitest
- [ ] 3.2 补充并运行相关 E2E，使用新框架与状态注入
- [ ] 3.3 产出 evidence 文档，嵌入截图并记录绝对路径
- [ ] 3.4 运行 `openspec validate add-smashup-oops-faction-intake --strict --no-interactive`
