## ADDED Requirements

### Requirement: UGC 包列表与发现
系统 SHALL 提供已发布 UGC 包的列表接口用于首页与分类展示。

#### Scenario: 获取发布列表
- **WHEN** 前端请求 UGC 包列表
- **THEN** 系统 MUST 仅返回已发布的 UGC 包

### Requirement: 首页“自制”分类入口
系统 SHALL 在首页提供“自制”分类并展示已发布 UGC 包。

#### Scenario: 首页展示自制
- **WHEN** 用户进入首页
- **THEN** 系统 MUST 展示“自制”分类与 UGC 包入口

### Requirement: 全部分类包含 UGC
系统 SHALL 在“全部分类”中展示 UGC 包并跳转到运行时入口。

#### Scenario: 全部分类跳转
- **WHEN** 用户从全部分类点击 UGC 包
- **THEN** 系统 MUST 跳转到对应运行时入口
