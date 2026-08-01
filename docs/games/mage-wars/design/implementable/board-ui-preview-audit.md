# 法师战争主 UI 预览 AI 视觉核验

> 日期：2026-07-27
> 对象：`docs/games/mage-wars/design/implementable/board-ui-preview.html`
> 截图：`temp/mage-wars/design-audit/board-ui-preview-1920x1080.png`
> 视口：`1920x1080`
> 状态：用户已否决当前 AI 核验前提；原 `PASS` 结论撤销。

## 裁决

```text
verdict: REVISE
score: 0/100
hard_failures:
  - 设计前未重新读取规则真相源
  - 未先核对规则对象素材矩阵
  - 应由正式素材承载的对象被 HTML/CSS、文字壳或临时裁图替代
  - 前置门禁未成立，不能交给用户人工验收
```

## 失败原因

- 规则真相源没有作为本轮设计前置证据重新读取；至少应重新核对学徒模式属性、法术书组成、逐卡字段和素材 atlas 合同。
- 画面没有先建立“规则对象 -> 需要素材 -> 已锁素材 / 缺口 -> 可否出现在设计稿”的矩阵。
- `board-ui-preview.html` 引用了 `temp/mage-wars/apprentice-card-crops/` 临时核对裁图；这些裁图合同明确只用于录入核对，禁止移动到正式资源或作为正式运行时素材。
- 标准竞技场、法师牌、卡背、token、攻击骰、学徒法术 atlas 仍处于计划或候选状态；未完成正式落盘、压缩、manifest/atlas config 与运行时引用前，不能把“看起来用了素材”判成素材链通过。
- HTML/CSS 预览只能作为内部布局探索；当前没有满足规则/素材前置矩阵，因此不能作为设计稿、AI PASS 图或人工验收图。

## 恢复准入

1. 重新读取 `docs/games/mage-wars/rule/**` 与 `docs/games/mage-wars/intake/runtime-asset-plan.md`。
2. 写出设计前置矩阵：规则对象、素材需求、素材状态、允许画面表达、禁止替代方式。
3. 对 `planned / frame-candidate / temp-only / blocked` 的对象先补素材链或标为不可出现在验收稿。
4. 重新生成设计稿或预览后，再做 AI 图面核验；前置矩阵不过时，视觉稿只能判 `REVISE`。
