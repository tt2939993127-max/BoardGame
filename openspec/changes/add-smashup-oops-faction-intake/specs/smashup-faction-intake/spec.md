# smashup-faction-intake Specification (delta)

## ADDED Requirements
### Requirement: Smash Up 新派系 intake 必须先锁定权威来源
系统 SHALL 在录入 Smash Up 新派系前，先记录图片来源、Wiki 抓取来源、适用派系列表、atlas 几何信息与不确定项，并形成可审计的核对契约。

#### Scenario: 开始 intake 新派系图片包
- **WHEN** 开始录入一批新的 Smash Up 派系图片
- **THEN** 系统 MUST 记录图片路径、获取时间、目标派系列表与图片用途（cards/base/titan）
- **AND** 系统 MUST 记录对应的 Wiki 抓取结果作为规则与名称核对来源
- **AND** 系统 MUST 在代码实现前产出可复查的核对契约

### Requirement: 图片内容与目标派系不一致时必须阻断流程
系统 SHALL 在图片内容、目标派系列表或 Wiki/TTS 元信息不一致时阻断正式接入，禁止把错误图集压缩进运行时资源。

#### Scenario: cards 原图与目标派系不匹配
- **GIVEN** 用户声明图片属于某一组 Smash Up 派系
- **WHEN** 系统核对到图面内容实际上对应另一组派系
- **THEN** 系统 MUST 停止正式 atlas 注册、previewRef 写入与运行时资源替换
- **AND** 系统 MUST 在文档或规划文件中记录 blocker 与具体错配事实

### Requirement: 新派系 atlas 接入不得覆盖既有 Smash Up atlas
系统 SHALL 为新录入的 Smash Up 派系分配新的 card/base atlas 槽位，并同步接入 atlas catalog、preview 映射与关键图片预加载。

#### Scenario: 录入 Oops 四派系资源
- **WHEN** `Ancient Egyptians / Cowboys / Samurai / Vikings` 的资源来源已校验通过
- **THEN** 系统 MUST 为其分配新的 card/base atlas 标识与图片路径
- **AND** 系统 MUST 不覆盖现有 `cards1-5` 与 `base1-4`
- **AND** Smash Up 的 preview 与 critical image resolver MUST 能解析这些新 atlas

### Requirement: Smash Up 数据录入必须同时使用图片索引与 Wiki 抓取结果
系统 SHALL 将图片作为裁片/索引来源，将 Wiki 抓取结果作为名称/效果/规则来源，并在必要时记录 TTS 源数据作为英文 deck provenance。

#### Scenario: 写入四派系 card/base 数据
- **WHEN** 系统录入新的 Smash Up faction/card/base 元数据
- **THEN** 图片 MUST 用于确定 atlas、index、资源路径与图面对应关系
- **AND** Wiki 抓取结果 MUST 用于核对名称、数量、类型与效果描述
- **AND** 若引用 TTS 数据，系统 MUST 明确其仅作为来源补充而非替代图片校验

### Requirement: 新派系 intake 必须交付可复刻工作流与验证证据
系统 SHALL 为每次 Smash Up 新派系 intake 交付可复刻文档，并完成审计、自动化测试、E2E 与 evidence 留档。

#### Scenario: intake 完成并准备交付
- **WHEN** 一次 Smash Up 新派系 intake 完成
- **THEN** 系统 MUST 提供可复刻工作流文档
- **AND** 系统 MUST 运行相关审计与 Vitest
- **AND** 若涉及 UI/资源接入，系统 MUST 运行相关 E2E 并保存截图证据
