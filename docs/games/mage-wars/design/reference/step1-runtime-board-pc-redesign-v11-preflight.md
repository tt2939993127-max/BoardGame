# 法师战争 Step 1 PC Open Design v11 出图前硬回执

> 状态：`preflight-ready / open-design-artifact-route / media-generate-forbidden / human-review-not-allowed`。v11 延续 v10 的规则权重裁定，只修正 AI 自检失败点：攻击骰素材呈现、己方边缘牌区拥挤和主界面解释句。

## 继承的规则前提

- 规则来源继承本轮已重新读取的 `page_004.md`、`page_009.md`、`page_010.md`、`page_014.md`、`page_015.md`、`page_020.md`、`page_024.md`、`page_027.md`。
- 当前主链仍限定为：竞技场、当前施放法术、当前目标、费用、确认 / 取消、攻击骰和 12 面效果骰。
- 法术书、已计划法术和弃牌堆仍属于所属玩家边缘牌区；弃牌堆是低权重公开归档入口，不进入中央。

## v11 修正点

| v10 失败点 | v11 处理 |
| --- | --- |
| 攻击骰从整张骰子贴图取背景位置，截图像红黑块 | 从 `attack-die-texture.png` 裁出 `attack-die-face-*.png` 六个真实骰面，artifact 直接渲染骰面图片。 |
| 己方法师 HUD、法师牌、法术书 / 已计划 / 弃牌堆挤在左下角 | 己方边缘牌区移到竞技场下方所属玩家边缘；法师 HUD 留在左下，避免互相遮挡。 |
| 主 UI 末尾解释“弃牌堆为什么在这里” | 删除解释句；主界面只保留对象名、数值、短状态和按钮标签。 |

## 素材新增裁定

| 衍生素材 | 来源 | 用途 | 裁定 |
| --- | --- | --- | --- |
| `attack-die-face-crit.png` | `refs/mage-wars-step1/attack-die-texture.png` 正式攻击骰贴图裁切 | 攻击骰面 | `visible-subject-derived-from-official-texture` |
| `attack-die-face-crit2.png` | 同上 | 攻击骰面 | `visible-subject-derived-from-official-texture` |
| `attack-die-face-blank.png` | 同上 | 攻击骰面 | `visible-subject-derived-from-official-texture` |
| `attack-die-face-2.png` | 同上 | 攻击骰面 | `visible-subject-derived-from-official-texture` |
| `attack-die-face-1.png` | 同上 | 攻击骰面 | `visible-subject-derived-from-official-texture` |
| `attack-die-face-topblank.png` | 同上 | 攻击骰面 | `visible-subject-derived-from-official-texture` |

## 人工验收状态

当前状态：`human-review-not-allowed`。v11 必须重新导出截图、通过资源检查、禁词扫描和 AI 图面核验后，才允许打开给用户。
