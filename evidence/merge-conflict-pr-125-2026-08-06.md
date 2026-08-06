# PR #125 三方合并裁决记录

## 合并对象

- PR：#125「新增并闭环大杀四方迪士尼第二批四派系」
- 主线父提交：`5c170ad337a25393fbd237a459b9edcfdde5d307`
- PR 父提交：`8844a5348e3bacd07000fd9c620638bda4e02bd9`
- 共同祖先：`12f5269052449d58fe039b47c9de222cc9d0e3f5`
- 合并提交：本文件随 #125 merge commit 一起提交。

PR 分支相对主线明显落后：主线已经包含 Disney 首批与第二批派系、资源、locale、注册、测试和审计文件。合并时按内容级三方差异裁决，没有把 PR 分支整份覆盖到主线。

## 冲突文件

- `evidence/smashup/smashup-disney-four-factions-implementation-audit-2026-07-25.md`
- `openspec/changes/add-smashup-disney-four-factions/tasks.md`
- `public/assets/i18n/assets-manifest.json`
- `public/assets/i18n/zh-CN/smashup/assets-manifest.json`
- `public/assets/i18n/zh-CN/smashup/base/compressed/disney_four_faction_bases.webp`
- `public/assets/i18n/zh-CN/smashup/base/disney_four_faction_bases.webp`
- `public/assets/i18n/zh-CN/smashup/cards/compressed/disney_four_factions.webp`
- `public/locales/en/game-smashup.json`
- `public/locales/zh-CN/game-smashup.json`
- `src/games/smashup/__tests__/abilities/disney-four-factions.test.ts`
- `src/games/smashup/abilities/disney_four_factions.ts`
- `src/games/smashup/abilities/index.ts`
- `src/games/smashup/data/cards.ts`
- `src/games/smashup/domain/atlasCatalog.ts`

## 裁决结果

### 保留主线版本

以下内容在主线已经是更新并集，或 PR 侧表现为旧分支回退，因此以主线为准：

- Disney 第二批资源与资源 manifest：保留主线当前资源与哈希；PR 旧资源未覆盖主线。
- 中英文 Smash Up locale：保留主线已有 Disney 首批、Disney 第二批、Munchkin、半场战争、企鹅、DIY 等文案；没有采用 PR 旧 locale 的整份删除。
- `disney-four-factions.test.ts`：保留主线覆盖超能陆战队、冰雪奇缘、狮子王、花木兰的测试；没有接受 PR 删除测试的结果。
- `disney_four_factions.ts`、能力注册、卡牌注册、图集目录：保留主线当前实现，避免丢失主线新增派系、注册和玩法链。
- `public/assets/atlas-configs/assets-manifest.json` 的 Dice Throne 枪手图集 manifest 自动合并漂移已排除；它不属于 #125 Disney 有效增量。

### 吸收 PR 有效内容

- 吸收 PR closeout evidence 和 OpenSpec tasks 中“第二批四派系本地闭环”的有效记录。
- 同步修正资源事实：公开资源 URL 当前能 `HEAD 200`，但远端字节数仍是 PR 旧资源，和主线 #122 当前本地资源不一致。因此不能写成“资源同步已完成”，只能记录为 `blocked_resource_sync`。

## 验证结果

- Disney 第二批行为、静态注册、关键图片：3 个文件 / 39 个测试通过。
- 运行时随机审计：3 个测试通过。
- ESLint：0 error。
- TypeScript：通过。
- i18n：无缺失 key。
- Smash Up 定向资源 manifest：通过。
- OpenSpec strict：通过。
- Disney 首批共享入口 E2E：2 个测试通过。
- Disney 第二批真实入口 E2E：1 个测试通过，覆盖超能陆战队“升级”从真实打牌入口打开 Disney 选择并给角色放力量标记。
- `git diff --cached --check`：通过。

全量 `npm run assets:validate` 仍会被主线既有 Dice Throne manifest 漂移阻塞；本次只跑 Smash Up 定向资源 manifest 校验，没有借 #125 合并顺手修 Dice Throne。

## 审计结论

本次大量冲突文件的合并结果会完全等于父1主线，这是有意裁决：PR 侧是旧分支误删/旧资源/旧 locale/旧测试，不是应吸收的有效业务增量。严格 merge audit 若把这些文件列为“单边结果”，应以本文件作为人工解释证据；不能为了通过严格模式恢复旧资源、删除测试或覆盖主线实现。
