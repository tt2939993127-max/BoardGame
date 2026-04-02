## ADDED Requirements

### Requirement: Book Hybrid v2 唯一开发入口
系统 SHALL 将 `book-hybrid` v2 作为唯一保留的书本试验页入口，并通过 `/dev/book-hybrid` 提供访问。

#### Scenario: 打开开发路由
- **WHEN** 开发者访问 `/dev/book-hybrid`
- **THEN** 系统展示可运行的 `book-hybrid` 页面
- **AND** 系统不再要求存在独立的 `book-2d` 或 `book-3d` 试验入口

### Requirement: Book Hybrid v2 使用纯 2D DOM 实现
系统 SHALL 使用纯 2D DOM / CSS / React 结构实现 `book-hybrid` 页面；系统 MUST NOT 依赖 WebGL、Three.js 场景或程序化材质生成才能完成核心展示。

#### Scenario: 无 WebGL 依赖时仍可展示
- **WHEN** 页面在普通浏览器环境中加载 `/dev/book-hybrid`
- **THEN** 用户仍可看到书籍列表、当前书页内容和基础操作按钮
- **AND** 页面不会因为缺失 WebGL 场景初始化而阻塞主内容渲染

### Requirement: Book Hybrid v2 支持本地素材图片替换
系统 SHALL 允许 `book-hybrid` 页面为每本书配置本地素材图片，并在封面区、预览区或装饰区域引用这些图片。

#### Scenario: 为书籍配置本地素材图
- **GIVEN** 某本书已配置项目内可访问的本地图片路径
- **WHEN** 用户查看该书在 `/dev/book-hybrid` 中的内容
- **THEN** 页面展示对应素材图
- **AND** 开发者无需修改渲染架构即可替换为另一张本地素材图

#### Scenario: 暂无最终素材图时保持可运行
- **GIVEN** 某本书暂未配置最终素材图
- **WHEN** 用户打开 `/dev/book-hybrid`
- **THEN** 页面仍展示该书的文本信息和基础占位内容
- **AND** 页面不会因为缺图而报错或白屏

### Requirement: Book Hybrid v2 提供最小交互闭环
系统 SHALL 提供“切换书籍”和“切换分页”的最小交互闭环，以支撑素材验证和基础可用性检查。

#### Scenario: 切换书籍后重置分页
- **WHEN** 用户从当前书切换到另一本书
- **THEN** 页面展示新书的第一页内容

#### Scenario: 分页切换受边界约束
- **WHEN** 用户位于第一页点击“上一页”，或位于最后一页点击“下一页”
- **THEN** 系统保持当前页不变
- **AND** 页面不得出现越界页码或运行时报错
