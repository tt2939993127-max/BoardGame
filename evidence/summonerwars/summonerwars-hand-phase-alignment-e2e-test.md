# Summoner Wars 手牌/阶段指示对齐 - E2E 证据

- 用例：移动横屏：基础流程可完成召唤、移动、建造、攻击与弃牌
- 命令：npm run test:e2e:ci:file -- e2e/summonerwars/summonerwars.e2e.ts "移动横屏：基础流程可完成召唤、移动、建造、攻击与弃牌"
- 时间：2026-04-13

## 关键截图与观察

1) 开局流程（手牌 + 阶段指示基线）
- 路径：D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars.e2e\移动横屏：基础流程可完成召唤、移动、建造、攻击与弃牌\40-mobile-basic-flow-start.png
- 观察：手牌区位于底部正中，卡牌水平铺展没有明显左/右偏移；阶段指示器位于右侧中部，与结束阶段按钮垂直分离，未遮挡手牌。
- 判定：符合“手牌与阶段指示回到移动端适配前位置关系”的验收标准。

2) 攻击后状态（手牌与阶段指示仍稳定）
- 路径：D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars.e2e\移动横屏：基础流程可完成召唤、移动、建造、攻击与弃牌\40-mobile-basic-flow-after-attack.png
- 观察：攻击后手牌仍保持底部居中，阶段指示器仍在右侧中部，未出现偏移或被 HUD 挤压的情况；弃牌堆与结束阶段按钮同列对齐。
- 判定：阶段指示与手牌在战斗后仍保持正确位置。

3) 魔力阶段后（布局收口）
- 路径：D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars.e2e\移动横屏：基础流程可完成召唤、移动、建造、攻击与弃牌\41-mobile-basic-flow-after-magic.png
- 观察：手牌区依旧底部居中，阶段指示器位于右侧中部并可见当前回合信息；地图区域未被手牌或阶段指示挤压。
- 判定：关键 UI 元素位置稳定，满足本轮对齐修复要求。
