## ADDED Requirements

### Requirement: 多语言支持基础设施
系统 SHALL 提供基于 react-i18next 的国际化基础设施，支持：
- 语言自动检测（浏览器偏好）
- 语言手动切换
- 语言偏好持久化（localStorage）
- 翻译文件按需加载

#### Scenario: 首次访问自动检测语言
- **WHEN** 用户首次访问平台
- **THEN** 系统根据浏览器语言偏好自动选择界面语言
- **AND** 若浏览器语言不在支持列表中，则回退到中文

#### Scenario: 手动切换语言
- **WHEN** 用户通过语言切换组件选择新语言
- **THEN** 界面立即切换到新语言
- **AND** 语言偏好保存到 localStorage

#### Scenario: 语言偏好持久化
- **WHEN** 用户刷新页面或重新访问
- **THEN** 系统使用上次保存的语言偏好
- **AND** 无需重新选择语言

---

### Requirement: 翻译文件组织
系统 SHALL 按命名空间组织翻译文件，支持模块化管理和按需加载。

#### Scenario: 命名空间加载
- **WHEN** 用户进入某个功能模块（如大厅）
- **THEN** 系统按需加载对应命名空间的翻译文件
- **AND** 避免一次性加载全部翻译

#### Scenario: 游戏专属命名空间
- **WHEN** 游戏包含卡牌、状态或教程步骤等内容
- **THEN** 系统使用独立的游戏命名空间（如 `game-<gameId>`）存放翻译文本
- **AND** 游戏内容与通用 UI 文本分离以便维护

#### Scenario: 教程内容拆分
- **WHEN** 教程包含通用 UI 文案与具体游戏步骤内容
- **THEN** 通用教程 UI 文案存放在 `tutorial` 命名空间
- **AND** 具体游戏教程步骤内容存放在对应 `game-<gameId>` 命名空间

#### Scenario: 翻译 Key 缺失回退
- **WHEN** 翻译文件中缺少某个 Key
- **THEN** 系统显示 fallback 语言（中文）的对应文本
- **AND** 在开发模式下控制台输出警告

---

### Requirement: 游戏内容数据化
系统 SHALL 将卡牌、状态效果、教程步骤等游戏内容的数据与 UI 解耦，所有可展示文本仅以 i18n key 存储。

#### Scenario: 数据仅保存 i18n key
- **WHEN** 游戏内容被定义为数据结构
- **THEN** 数据只包含 `id` 与 i18n key（如 `nameKey`/`descKey`/`effectsKeys`）
- **AND** 不允许在数据层写入直接展示文本

#### Scenario: UI 渲染文本
- **WHEN** UI 组件需要展示游戏内容
- **THEN** UI 使用 `t(key)` 从翻译文件获取文本
- **AND** 不在组件内硬编码文本

---

### Requirement: 语言切换组件
系统 SHALL 提供可复用的语言切换 UI 组件。

#### Scenario: 显示当前语言
- **WHEN** 语言切换组件渲染
- **THEN** 当前选中的语言应明确标识
- **AND** 显示所有可用语言选项

#### Scenario: 切换语言交互
- **WHEN** 用户点击语言选项
- **THEN** 触发语言切换
- **AND** 组件状态更新反映新语言

---

### Requirement: 支持的语言列表
系统 SHALL 在 MVP 阶段支持以下语言：
- 中文简体 (zh-CN) - 默认语言
- 英文 (en)

#### Scenario: 语言列表配置
- **WHEN** 需要新增支持语言
- **THEN** 只需添加对应翻译文件目录
- **AND** 更新语言配置数组即可
