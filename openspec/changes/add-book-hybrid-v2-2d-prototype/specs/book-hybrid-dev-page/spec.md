## ADDED Requirements

### Requirement: Book Hybrid v2 纯 2D 唯一开发入口
系统 SHALL 将 `book-hybrid` v2 作为纯 2D 的书本试验页入口，并通过 `/dev/book-hybrid` 提供访问。

#### Scenario: 打开开发路由
- **WHEN** 开发者访问 `/dev/book-hybrid`
- **THEN** 系统展示 `book-hybrid` 的纯 2D 页面
- **AND** 系统不再要求存在 3D WebGL 书架实现

### Requirement: Book Hybrid v2 不依赖 3D WebGL
系统 SHALL 以纯 DOM / CSS 的 2D 方案展示书籍内容；系统 MUST NOT 将 Three.js、React Three Fiber 或 WebGL 作为该页面主路径的必需条件。

#### Scenario: 开发页在无 WebGL 依赖下仍可展示
- **WHEN** 开发者访问 `/dev/book-hybrid`
- **THEN** 页面可完成加载并显示书籍内容
- **AND** 页面不会因为缺少 3D 渲染能力而阻塞主路径

### Requirement: Book Hybrid v2 支持书籍本地素材字段
系统 SHALL 允许书籍数据显式声明本地素材图片字段，包括但不限于 `cover`、`preview`、`background`，以支撑纯 2D 展示和后续素材替换。

#### Scenario: 书籍已配置本地素材图
- **GIVEN** 某本书已配置项目内可访问的本地图片路径
- **WHEN** 用户查看该书在 `/dev/book-hybrid` 中的详情
- **THEN** 页面展示对应素材图

### Requirement: Book Hybrid v2 在缺少素材时稳定退化
系统 SHALL 在书籍未配置本地素材图时仍保持页面稳定运行，并显示占位内容或默认样式；系统 MUST NOT 因素材缺失出现白屏或运行时报错。

#### Scenario: 书籍未配置素材图
- **GIVEN** 某本书没有 `cover`、`preview` 或 `background` 图片
- **WHEN** 用户打开 `/dev/book-hybrid` 或切换到该书
- **THEN** 页面继续展示书籍内容与分页信息
- **AND** 页面可用占位内容替代缺失素材
- **AND** 页面不得出现白屏或运行时报错

### Requirement: Book Hybrid v2 提供最小交互闭环
系统 SHALL 提供“切换书籍”和“切换分页”的最小交互闭环，以支撑 2D 原型验证。

#### Scenario: 切换书籍后重置分页
- **WHEN** 用户从当前书切换到另一本书
- **THEN** 页面展示新书的第一页内容

#### Scenario: 分页切换受边界约束
- **WHEN** 用户位于第一页点击“上一页”，或位于最后一页点击“下一页”
- **THEN** 系统保持当前页不变
- **AND** 页面不得出现越界页码或运行时报错
