## ADDED Requirements

### Requirement: UGC 资源上传入口
系统 SHALL 提供 UGC 资源上传入口并绑定 userId/packageId，上传前必须完成权限校验。

#### Scenario: 资源上传请求
- **WHEN** 用户上传图片或音频资源
- **THEN** 系统 MUST 校验权限并接受上传以进入处理流程

### Requirement: 强制压缩与不保留原始文件
系统 SHALL 在需要压缩时生成压缩变体并仅保留压缩后的文件；禁止保留原始文件。

#### Scenario: 音频压缩成功
- **WHEN** 用户上传 WAV 音频
- **THEN** 系统 MUST 生成 OGG/MP3 变体并仅存储压缩版本

#### Scenario: 压缩失败
- **WHEN** 需要压缩但压缩流程失败
- **THEN** 系统 MUST 拒绝上传并不存储原始文件

### Requirement: 已压缩格式跳过处理
系统 SHALL 在检测到已压缩格式时跳过压缩，并直接存储该格式作为变体。

#### Scenario: 跳过压缩音频
- **WHEN** 用户上传 OGG/MP3 音频
- **THEN** 系统 MUST 跳过压缩并直接存储为变体

### Requirement: 资产记录与 manifest 同步
系统 SHALL 生成资产记录与 manifest 变体描述，并使用 `ugc/<userId>/<packageId>/...` 前缀存储。

#### Scenario: 生成 manifest 记录
- **WHEN** 资源处理完成
- **THEN** 系统 MUST 写入 manifest 变体信息与对应对象存储路径
