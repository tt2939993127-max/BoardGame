---
name: data-entry-workflow
description: "用于本项目里基于图片、规则书、Wiki、PDF、截图做业务数据录入、核对、裁图、资源索引登记、文案同步时。先执行零猜测数据录入门禁，再按 gameId 进入对应 workflow；适用于 Dice Throne 角色录入、Smash Up 派系 intake，以及其他游戏的数据真相源锁定与核对契约建立。"
---

# 数据录入工作流

## 何时使用

- 用户要求“录入数据”“根据图片补卡牌/技能/Token”“核对图片和代码”“整理真相源”“补 atlas 索引”“根据规则书/PDF/Wiki 更新文案或静态数据”时使用。
- 这不是实现 skill；它先收紧数据录入纪律，再把任务路由到对应游戏的 workflow。

## 先读

- 通用门禁：`docs/ai-rules/data-entry.md`
- 涉及图片资源路径、manifest、R2/CDN 时：`docs/ai-rules/asset-pipeline.md`
- 录入后要进入机制实现时：`docs/ai-rules/engine-systems.md`
- 不确定还要看什么时：`docs/ai-rules/doc-index.md`

## 强制门禁

1. 先确认 `gameId`、本轮 scope、对应 `git worktree`，禁止在错工作区里看素材和下结论。
2. 先锁定主真相源和对照源，并把“谁负责什么字段”写清楚。
3. 先裁图到单对象可读粒度，再开始正式录入。
4. 先写 Markdown 核对契约，再改运行时代码。
5. 任意名称、数字、限定词、索引看不清时必须停下，禁止猜。
6. 涉及规则、文案、资源映射时，先同步文档，再进入实现。
7. 发现资源 404、白卡面、CardPreview 异常时，必须按最终请求 URL 排查 `compressed/`、manifest 和 R2，不得只看本地原图。
8. 录入完成后，只要动到了运行时资源，就默认由 AI 主动完成上传和远端回查；如果没传成，最终必须明确告知用户哪些资源还没上传以及当前影响。

## Workflow 路由

### Smash Up

- 新派系图片、卡牌、基地、atlas、locale intake：
  读 `docs/games/smashup/workflows/smashup-faction-intake.md`
- 额外硬规则：
  涉及 Wiki 核对时，必须按仓库根 `AGENTS.md` 使用项目爬虫，不能凭记忆。

### Dice Throne

- 单角色 / 新英雄的图片、骰面、Token、卡牌、裁图、资源上传、规则文档录入：
  读 `docs/games/dicethrone/workflows/dicethrone-hero-intake.md`

### 其他游戏

- 若还没有专用 workflow：
  以 `docs/ai-rules/data-entry.md` 为主流程，再补读该游戏自己的 `src/games/<gameId>/rule/` 文档。
- 不得把某个游戏的字段结构、抓取站点或索引习惯提升成全局默认。

## 交付要求

- 至少产出：真相源表、切图表、核对合同表、对照表、冲突待裁定表。
- 最终汇报必须明确：
  - 主真相源是什么
  - 对照源是什么
  - 哪些字段已确认
  - 哪些字段仍待裁定
  - 改动是否已经同步到文档、资源、代码
  - 资源是否已经上传到 R2 / CDN；若没有，具体缺口是什么
