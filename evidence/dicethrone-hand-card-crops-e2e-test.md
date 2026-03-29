# Dice Throne 手牌图修正 E2E 证据

## 用例

- 文件：`e2e/dicethrone-watch-out-spotlight.e2e.ts`
- 用例名：`samurai and gunslinger hand area should show corrected hand card images`
- 运行命令：

```bash
node scripts/infra/run-e2e-single.mjs ci e2e/dicethrone-watch-out-spotlight.e2e.ts "samurai and gunslinger hand area should show corrected hand card images"
```

## 截图

### 武士手牌区

![武士手牌区](../test-results/evidence-screenshots/dicethrone-watch-out-spotlight.e2e/samurai-and-gunslinger-hand-area-should-show-corrected-hand-card-images/10-samurai-hand-area.png)

观察结论：

- 手牌区中 3 张目标卡都显示为上半张目标卡内容，没有再混入下一张卡的标题条。
- `肃穆之仪 II`、`正宗 II`、`叶隐之心 II` 的卡面主体都落在各自卡框内，没有出现之前那种“下半张内容串进来”的错位感。
- 由于手牌本身有扇形重叠，卡牌会互相遮挡边缘，但可见部分都属于正确卡面，不是错误 slot 内容。

### 枪手手牌区

![枪手手牌区](../test-results/evidence-screenshots/dicethrone-watch-out-spotlight.e2e/samurai-and-gunslinger-hand-area-should-show-corrected-hand-card-images/11-gunslinger-hand-area.png)

观察结论：

- 6 张目标卡已经按正确来源显示，顶部 3 张升级卡不再出现复合 slot 串图。
- `手枪鞭打`、`标记目标`、`执法者` 现在显示的是对应短条卡面本体，位置居中，没有再错拿到别张卡的内容。
- 枪手下排这 3 张仍然是短条视觉，不是完整竖卡；这是源图本身的半高内容特征，不再是“偏移”或“错裁到另一张卡”。

### 正常角色对照：狂战士手牌区

![狂战士手牌区](../test-results/evidence-screenshots/dicethrone-watch-out-spotlight.e2e/samurai-and-gunslinger-hand-area-should-show-corrected-hand-card-images/12-barbarian-hand-area-reference.png)

观察结论：

- 正常角色的手牌卡面会从标题区一直延续到卡底，卡面主体基本填满整张手牌卡框。
- 即使在扇形重叠下，仍然能明显看出每张牌都是完整竖卡，而不是半张卡或上下拼接的一段。
- 这说明本轮问题不在 `HandArea` 的排布本身，而在武士/枪手少数卡牌的手牌图来源。

## 结论

- 这次修正已经落实到真实手牌区，不只是本地裁图目录。
- 对照狂战士后可以明确：异常不是“手牌容器把整张卡摆歪了”，而是“卡面内容在手牌卡框里的来源错了”。
- 武士问题表现为“复合 slot 被直接当成手牌图”，所以底部会串入下一张标题条；本轮已清掉这类串图。
- 枪手问题表现为“复合 slot/拆卡来源错误”；本轮已改为正确来源。其中特定 3 张仍是短条，是素材本体特征，不再是手牌显示偏移。
