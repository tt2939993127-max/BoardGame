# 大杀四方主动基地能力徽记偏右修复

## 问题

- 用户反馈：大杀四方里“主动触发”的基地，底部 `基地能力` 徽记看起来向右歪。
- 影响范围：[`src/games/smashup/ui/BaseZone.tsx`](D:/gongzuo/webgame/BoardGame/src/games/smashup/ui/BaseZone.tsx) 中主动基地能力可用态的底部徽记。

## 根因

- 旧实现把徽记直接挂在基地容器上，用的是 `left-1/2 -translate-x-1/2`。
- 这个写法在数学上是“居中”，但这里的父层同时承载了高亮 ring、缩放、外置 token、悬浮按钮等视觉外延，实际看上去更容易出现“锚点对了、视觉中心偏了”的观感。
- 这类底部短徽记更适合用整行容器做 `flex justify-center`，让横向锚点回到容器本身，而不是继续叠加 `translate`。

## 修复

- 将主动基地能力徽记从 `left-1/2 -translate-x-1/2` 改为 `absolute + inset-x-0 + flex justify-center`。
- 给徽记补了 `data-testid="base-ability-badge-${baseIndex}"`，方便后续直接测中心偏移。
- 在 [`e2e/smashup-gameplay.e2e.ts`](D:/gongzuo/webgame/BoardGame/e2e/smashup-gameplay.e2e.ts) 增加了一个主动基地能力场景，用 `base_pyramids` 校验徽记出现且中心偏移小于 `2px`。

## 验证

- 托管 E2E 命令尝试：
  - `npm run test:e2e:ci:file -- e2e/smashup-gameplay.e2e.ts "主动基地能力徽记应保持底部居中，不再向右偏"`
  - 结果：未跑通，不是用例失败，而是同机已有另一条 Playwright runtime 占用重任务预算，随后又触发全局内存预算门禁（剩余内存低于 `2.5GB`）。
- 轻量浏览器复核：
  - 方式：单独启动 `npm run dev:frontend`，用 Playwright 直连 `http://127.0.0.1:4173/play/smashup?...`，注入 `base_pyramids` 主动基地能力场景。
  - 结果：`base-ability-badge-0` 可见，且和 `base-zone-0` 的中心偏移为 `0.008209228515625px`，可视为居中。
- 截图留档：
  - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\manual-active-base-ability-badge\active-base-ability-badge-centered.png`

## 备注

- 本轮已经拿到浏览器内真实 DOM 几何结果和截图证据。
- 由于托管 E2E 被外部运行中的重任务和全局内存预算阻塞，本轮没有拿到 `test:e2e:ci:file` 的正式通过记录；若后续机器空闲，建议把新增的那条 E2E 再补跑一次收口。
