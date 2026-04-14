# Summoner Wars 手牌/阶段指示对齐 - E2E 证据

- 用例：移动横屏：基础流程可完成召唤、移动、建造、攻击与弃牌
- 命令：npm run test:e2e:ci:file -- e2e/summonerwars/summonerwars.e2e.ts "移动横屏：基础流程可完成召唤、移动、建造、攻击与弃牌"
- 时间：2026-04-13（修复后复跑）

## 关键截图与观察

1) 开局流程（手牌 + 阶段指示基线）
- 路径：D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars.e2e\移动横屏：基础流程可完成召唤、移动、建造、攻击与弃牌\40-mobile-basic-flow-start.png
- 观察：底部手牌在屏幕中线附近水平铺展，至少 4 张卡牌主体清晰可见，右侧悬浮球仅覆盖卡面边缘；阶段指示器位于右侧中部，与结束阶段按钮分离且未压到手牌。
- 判定：手牌可见数量与位置满足移动横屏可触达要求，阶段指示未造成遮挡。

2) 攻击后状态（手牌与阶段指示仍稳定）
- 路径：D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars.e2e\移动横屏：基础流程可完成召唤、移动、建造、攻击与弃牌\40-mobile-basic-flow-after-attack.png
- 观察：攻击后手牌仍贴底居中，卡牌未被屏幕边缘截断；阶段指示器处于右侧中部，弃牌堆/结束阶段按钮同列且未侵入手牌区域。
- 判定：战斗后的手牌与阶段指示位置稳定，布局未回归偏移。

3) 魔力阶段后（布局收口）
- 路径：D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars\summonerwars.e2e\移动横屏：基础流程可完成召唤、移动、建造、攻击与弃牌\41-mobile-basic-flow-after-magic.png
- 观察：魔力阶段后手牌仍底部居中，右侧阶段指示器完整可见；地图主区域未被手牌遮挡到关键格线。
- 判定：关键 UI 元素位置稳定，满足本轮移动端手牌对齐与可视性要求。
