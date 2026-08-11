---
name: screenshot-delivery
description: "BoardGame 截图交付适配。用于本项目的 E2E 证据目录、截图命名脚本、项目开图命令与服务器相册；用户可见开图统一委托系统 show-image-to-user。"
---

# Screenshot Delivery

这是 BoardGame 的 `adapter`，不是独立的用户开图规范。

用户说“打开图、给我看图、图呢、重新打开”，或准备把最终验收图展示给用户时，用户可见开图、多图顺序、编号交接、原图与标记副本选择、查看器选择、PureRef 进程核验、失败回退和“用户是否真的看到”都只按系统 canonical-source 执行：

`D:\codex-home\skills\show-image-to-user\SKILL.md`

截图是否具备验收资格、必须拍哪些状态、如何区分 AI 核图与用户开图，以项目标准为准：

- `.spec/knowledge/standards/e2e-verification.md`
- `.spec/knowledge/standards/ui-change-gates.md`

本 skill 不复制上述文档的开图、编号、查看器或验收正文。

## BoardGame 专属适配

- 新增或重跑的主证据使用 `test-results/evidence-screenshots/<game>/<测试文件>/<用例>/`；目录、文件名和流程阶段遵循 `e2e-verification.md`，本 skill 不另定命名规则。
- 候选验收图、失败图和中间排查图不得上传为最终 `passed`；它们只能留在本地 evidence 或标为诊断材料。
- 服务器相册不是默认交付。只有用户明确要求上传、发布链接、服务器相册或手机查看时，才允许发布到 `http://8.148.71.102:18080/#/boardgame/<task-id>`。
- 获得明确上传授权后，只允许更新 `/home/admin/image-preview/data/projects/boardgame/tasks/<task-id>/`，禁止修改预览站壳层、根路由或客户端代码。

## 项目脚本

只有系统 canonical-source 选择了对应展示通道时，才调用项目脚本；脚本不自行选择图片、不替代 AI 核图，也不定义用户是否已经看到图片。

```powershell
npm run verify:open-image -- "<绝对路径1>" "<绝对路径2>"

node scripts/verify/open-verified-image.mjs --viewer pureref --paths "<绝对路径1>" "<绝对路径2>"
```

- `OPENED_IMAGE=`、`OPENED_WITH_PUREREF=` 或脚本退出成功只证明项目脚本发起了动作；用户可见交付和最终回复口径仍以系统 canonical-source 为准。
- `scripts/verify/label-image-sequence.py` 只负责生成项目内的全尺寸标记副本和序列索引，原图不得被覆盖；具体何时生成、打开哪一组文件由系统 canonical-source 决定。

## 落点

- 用户可见开图唯一真相源：`D:\codex-home\skills\show-image-to-user\SKILL.md`
- 截图验收总规则：`.spec/knowledge/standards/e2e-verification.md`
- UI 玩家视角门禁：`.spec/knowledge/standards/ui-change-gates.md`
- 仓库开图脚本：`scripts/verify/open-verified-image.mjs`
- 多图标记脚本：`scripts/verify/label-image-sequence.py`
