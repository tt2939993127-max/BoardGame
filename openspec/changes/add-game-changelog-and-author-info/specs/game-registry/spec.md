## ADDED Requirements

### Requirement: 游戏作者元数据与内容模块自动发现
系统 SHALL 允许每个游戏通过 `src/games/<gameId>/manifest.ts` 声明轻量作者名称，并通过游戏目录下的可选作者内容模块注入作者详情内容。

#### Scenario: manifest 声明作者名称
- **WHEN** 某个游戏的 `manifest.ts` 声明作者名称字段
- **THEN** 自动生成的前台游戏注册表暴露该名称
- **AND** 前台无需加载作者详情模块即可展示作者名称

#### Scenario: 自动发现作者内容模块
- **WHEN** 某个游戏目录包含约定的作者内容模块文件
- **THEN** 生成脚本为该游戏生成作者详情内容的懒加载入口
- **AND** 不需要维护手写的集中式 import 或 `gameId` 分支判断

#### Scenario: 缺少作者内容模块时仍能生成注册表
- **WHEN** 某个游戏目录没有作者内容模块文件
- **THEN** 生成脚本仍然成功产出游戏注册表
- **AND** 前台可以回退到默认作者行为
