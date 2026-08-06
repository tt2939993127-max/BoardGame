# PR #126 合并冲突裁决证据

## 范围

- PR：#126 `实装大杀四方普通企鹅派系玩法`
- PR head：`46b838342f1892d5540c0376d701b11538826699`
- 合并现场：`D:/gongzuo/webgame/BoardGame/.worktrees/pr-125-merge`
- 基线：`origin/main` / `253fc1360a608a56216f9038f3036a0e685a711b`，已包含 PR #125 Disney 第二批合并结果。

## 三方裁决

- `commands.ts` / `reducer.ts`：吸收 PR 的普通企鹅“跳舞企鹅替代手牌随从打出”字段 `replacementHandCardUid` 与事件逻辑，同时保留当前主线既有外部来源、弃牌堆、牌库、暂存区和 Me First 出牌校验。
- `ongoingEffects.ts` / `reactionSession.ts` / `types.ts`：双保留主线 Munchkin 怪物销毁公开快照字段和 PR 的 `triggerMinionFromDeck` 字段；两者分别服务不同触发链，不能单边删除。
- OpenSpec、closeout、E2E、企鹅能力实现、locale 和测试均属于 #126 的有效新增 / 修改内容，已按 PR 范围保留。
- 未采用旧分支回退主线的方式解决冲突；本次没有删除当前主线已有测试或共享实现。

## 验证结果

- 冲突解决状态：`passed`，冲突标记已清除，`git diff --name-only --diff-filter=U` 为空，`git diff --cached --check` 通过。
- Typecheck：`passed`，`npm run typecheck -- --pretty false` / `tsc --noEmit` 通过；npm 仅输出 `--pretty` 配置告警。
- Vitest：`passed`，`npx vitest run src/games/smashup/__tests__/abilities/penguins.test.ts src/games/smashup/__tests__/penguinsIntegration.test.ts --reporter=dot`，2 个文件 / 28 个测试通过。
- Test structure guard：`passed`，已将企鹅测试新增的交互断言改为 `expectNoPrompt`、`getSimpleChoicePrompt/getPromptOption` 与 `respondToPrompt`，不再直读 `sys.interaction.current` / `prompt.data.options` 或手写 `SYS_INTERACTION_RESPOND`。
- ESLint：`passed_with_warnings`，企鹅触达文件为 0 error；现有 SmashUp 领域文件仍有 warning，未作为本 PR 阻塞。
- i18n：`passed`，`npm run i18n:check` 无缺失 key，保留既有 warning 基线 2 条。
- 资源 manifest：`passed`，`node scripts/assets/generate_asset_manifests.js --validate --root public/assets/i18n/zh-CN --id smashup` 通过。
- OpenSpec：`passed`，`openspec validate add-smashup-penguins-faction --strict --no-interactive` 有效。
- Interaction targetType 审计：`baseline_failed_non_penguin`，当前失败项是神话马、波利尼西亚航海者、Brood Hive 等既有非企鹅基线；失败清单不包含普通企鹅新增 sourceId。
- E2E：`passed`，`npm run test:e2e:ci:file -- e2e/smashup/smashup-penguins-playable.e2e.ts`，7 条真实入口链全部通过。
- merge audit：`passed`，`npm run merge:audit -- HEAD` 完成；9 个混合结果、1 个两侧相同、0 个单边结果。
- merge audit strict：`passed`，`npm run merge:audit:strict -- HEAD` 完成；没有单边采用结果需要额外阻断。

## 剩余风险

- 全量 assets validate 仍有非企鹅 DiceThrone atlas hash/bytes 基线问题；本次只以 SmashUp 企鹅相关 manifest 定向校验作为 #126 门禁。
- 服务器素材主源上传按 #126 closeout 记录为本玩法 PR 范围外 scoped-debt；本次合并不把远端素材上传包装为已完成。
