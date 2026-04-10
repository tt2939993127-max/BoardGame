# DiceThrone 枪手 / 武士 UX 重审（2026-04-10）

## 审计范围

- 游戏：`dicethrone`
- 角色：`gunslinger`、`samurai`
- 本轮重审目标：
  1. 枪手 `Loaded / 装填` 在真实 token 响应后必须出现单骰特写，而不是只改数值。
  2. 武士 / 枪手的攻击修正、5 骰汇总、token 图标与国际化按钮要按老角色既有 UI 合同复核。
  3. 回写旧审计中过宽的“已完整收口”口径，明确哪些结论已经失效。

## 触发原因

用户连续指出旧审计不充分，实际体验仍有以下问题：

- 枪手 `Loaded` 使用后“逻辑可能生效，但 UI 看不到单骰特写”。
- 5 骰结果曾为“每颗骰子都写描述”导致布局挤坏，后来又变成“描述全没了”。
- `TOKENRESPONSE.SKIP` 这类英文 key 直接裸露在按钮上。
- 武士 token 图标 / 中文展示没有对齐既有角色。
- 旧审计把“定义链/执行链接上”写得过于接近“体验已收口”。

## 旧结论失效点

### 对 `evidence/dicethrone-gunslinger-samurai-reaudit-2026-04-05.md`

- 该文档解决的是运行时主链路缺口，不足以证明 UI 层已经收口。
- 后续真实反馈证明：攻击修正可见性、5 骰汇总文案、token 图标/文案一致性、Loaded 单骰特写仍存在漏项。
- 因此它原先可被理解为“枪手 / 武士已完整收口”的口径已经失效。

### 对 `evidence/dicethrone-gunslinger-samurai-vs-legacy-audit-2026-04-06.md`

- 该文档完成了“与老角色共享契约并排核对”，但仍没有把新角色的 UI 响应链当作独立验收项拉出来。
- 后续 Loaded 真问题证明：即便规则链正确，若 `BONUS_DICE_REROLL_REQUESTED` / overlay 消费链没走到用户可见层，体验仍然不达标。

## 本轮确认的根因与修复

### 1. 枪手基础 Loaded 的根因不是“特写布局没写好”，而是根本没产生展示型 settlement

- 文件：`src/games/dicethrone/domain/customActions/gunslinger.ts`
- 修复前：
  - 基础 `Loaded`（非 `Quick Draw II`、非 `Fill'Em With Lead`）只发 `BONUS_DAMAGE_ADDED`
  - UI 没有 `pendingBonusDiceSettlement`，所以用户看不到单骰特写
- 修复后：
  - 先发 `BONUS_DIE_ROLLED`
  - 再发 `displayOnly` 的 `BONUS_DICE_REROLL_REQUESTED`
  - 最后发 `BONUS_DAMAGE_ADDED`
- 结果：
  - 基础 Loaded 也会出现单骰特写
  - 但 settlement 是 `displayOnly`，因此 `rerollCostTokenId` 应为空字符串，不再是旧测试里期待的 `'loaded'`

### 2. ChoiceModal 的跳过按钮文案兜底不对，导致翻译 key 裸露

- 文件：`src/games/dicethrone/ui/ChoiceModal.tsx`
- 修复：
  - `resolveOptionLabel` 改为 `t(label, { defaultValue: label })`
  - slider 的 `skipLabelKey / hintKey / confirmLabelKey` 统一走同样兜底
- 结果：
  - 不再把 `tokenResponse.skip` / `TOKENRESPONSE.SKIP` 之类 key 直接渲染到按钮上

### 3. Loaded 回归测试与 E2E 断言已同步更新到新合同

- 领域测试文件：`src/games/dicethrone/__tests__/cross-hero.test.ts`
  - 新增：`base loaded choice should create single-die display settlement and add rounded damage`
- E2E 文件：`e2e/dicethrone-watch-out-spotlight.e2e.ts`
  - 旧断言错误地把基础 Loaded 当作“仍可重掷 settlement”
  - 现改为断言：
    - `phase === 'defensiveRoll'`
    - `displayOnly === true`
    - 仅 1 颗骰子
    - `effectKey === 'bonusDie.effect.gunslingerLoadedDie'`

## 验证记录

### 静态门禁

```powershell
npx eslint src/games/dicethrone/domain/customActions/gunslinger.ts src/games/dicethrone/ui/ChoiceModal.tsx src/games/dicethrone/__tests__/cross-hero.test.ts
npx eslint e2e/dicethrone-watch-out-spotlight.e2e.ts
npm run i18n:check
```

结果：

- 上述 ESLint 均为 `0 errors`（E2E 文件保留仓库既有 `any` warnings）
- `i18n-check: no missing keys detected.`

### 动态验证

#### 已确认通过的历史动态验证

```powershell
node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/__tests__/cross-hero.test.ts src/games/dicethrone/__tests__/BonusDieOverlay.test.ts --configLoader native
node scripts/infra/run-e2e-single.mjs ci e2e/dicethrone-watch-out-spotlight.e2e.ts "gunslinger loaded token should open single-die spotlight after real choice click"
```

结果（来自本轮前序已完成记录）：

- `cross-hero.test.ts + BonusDieOverlay.test.ts`：`86 passed`
- Loaded 单用例：曾成功跑通并产出单骰特写截图

#### 2026-04-10 继续复跑时的现状

1. 第一次复跑已进入页面断言，真实看到 Loaded 单骰特写出现，但旧断言仍错误要求 `rerollCostTokenId === 'loaded'`，因此失败。
2. 本轮把断言改成 `displayOnly` 后，后续两次复跑被 E2E runtime 启动链波动打断：
   - 一次卡在 runtime manager 提前退出
   - 一次卡在游戏服务异常退出
3. 这些失败信号发生在测试基建阶段，不是再次回到“Loaded 没有特写”的旧根因。

## 截图证据与肉眼结论

### A. 枪手 Loaded：真实看到单骰特写已出现

- 路径：
  - `D:\gongzuo\webgame\BoardGame\test-results\playwright-artifacts\dicethrone-watch-out-spotl-d9088-ght-after-real-choice-click-chromium\test-failed-1.png`
- 我实际看到什么：
  1. 棋盘中央已经弹出单骰特写 overlay，不再是“点击 token 后什么都没显示”。
  2. 中间只有 1 颗骰子，符合基础 Loaded 的单骰展示，不是 5 骰汇总。
  3. 右侧攻击栏还能看到 `结束攻击` 按钮，说明当前链路已推进到后续攻击结算，而不是停在空白/死链。
- 是否达到验收标准：
  - **就“基础 Loaded 至少要有用户可见单骰特写”这一点，已达到。**
  - **但本轮还缺一次在新断言下完整全绿的 E2E 复跑，因此动态门禁证据仍需补绿。**

### B. 武士 Retribution：token 响应后有真实反击展示

- 路径：
  - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\dicethrone-watch-out-spotlight.e2e\samurai-retribution-token-should-retaliate-through-real-click-flow\21-samurai-retribution-after-retaliation.png`
- 我实际看到什么：
  1. 画面中央有 1 颗额外骰子特写，证明 `Back Strike / 反击` 不是只记事件流。
  2. 左侧武士 token 计数区仍可见，未被弹层遮死。
  3. 主棋盘、右侧角色板和中央弹层没有互相挤坏。
- 是否达到验收标准：
  - **已达到“真实 token 点击后出现可见反击结算”的验收标准。**

### C. 武士 Honor：token 图标与中文标签当前可见

- 路径：
  - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\dicethrone-watch-out-spotlight.e2e\samurai-honor-token-should-accumulate-to-+3-after-two-real-clicks\19-samurai-honor-finalized-after-second-use.png`
- 我实际看到什么：
  1. 左侧资源区附近能看到武士专属圆形 token 图标，不是空白占位。
  2. 中央大图层使用的是 `侍 / SAMURAI` 视觉，不是错贴到枪手或其他角色资源。
  3. 页面上主要按钮已是中文，如 `下一阶段`，不是英文裸 key。
- 是否达到验收标准：
  - **就“武士 token 图标可见、主要按钮不是英文 key”这一层，已达到。**

### D. 武士 Zanshin：5 骰已经改成汇总文案，不再逐骰挤爆布局

- 路径：
  - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\dicethrone-watch-out-spotlight.e2e\samurai-zanshin-should-settle-5-bonus-dice-and-synchronize-effects-against-paladin\10-samurai-zanshin-vs-paladin.png`
- 我实际看到什么：
  1. 中央仍显示 5 颗额外骰子，但底部只保留一条汇总文案。
  2. 汇总文案没有把 5 颗骰子彼此顶开，布局比“每颗骰子单独描述”稳定。
  3. 右侧攻击修正区也仍可见，没有被 5 骰 overlay 完全遮掉。
- 是否达到验收标准：
  - **已达到“5 骰使用汇总描述，不再挤坏布局”的验收标准。**

## D 维度命中

- `D3 数据流闭环`：Loaded 现在从 token 使用一路到 UI settlement 闭环。
- `D5 UI 语义一致性`：5 骰改为汇总文案，避免逐骰描述破坏视觉语义。
- `D15 可见反馈完整性`：攻击修正 / 额外骰 / token 响应都必须用户可见，不能只写状态。
- `D23 共享抽象一致性`：基础 Loaded 与可 reroll Loaded 现在共享 bonus-die 展示合同，而不是一条有 UI、一条没 UI。
- `D47 测试覆盖完整性`：新增基础 Loaded 领域回归；E2E 断言同步到新合同。
- `D48 视觉证据充分性`：本轮显式以截图核对单骰、5 骰汇总、token 图标和按钮文案。
- `D49 旧结论修订义务`：本文件与旧审计文档一起回写“哪些结论已经失效”。

## 残留风险

1. **Loaded 新断言下尚缺一次完整全绿的 E2E 复跑。**
   - 当前不是玩法根因未修，而是测试基建在后续复跑时波动。
2. `vitest-cli-safe` 在当前 shell 环境里再次执行时，出现了 `fork probe timed out`，说明当前会话对子进程支持不稳定。
3. 当前已顺手修掉一批 E2E 基建问题（如 `AGENTS.md` BOM、`scripts/infra/e2e-port-config.js` 冲突痕迹、`allocateAvailablePortSet` 导出缺口），但这些属于验证链噪音，不应再误判成 DiceThrone 玩法本身的问题。

## 结论

- **枪手 Loaded 的主问题已定位并修正：基础 token 现在会产生单骰展示型 settlement。**
- **武士 / 枪手这轮 UX 重审证明：攻击修正、5 骰汇总、token 图标与主要按钮翻译已回到可接受基线。**
- **旧审计“已完整收口”的说法失效，必须以本文件作为新的 UX 收口基线。**
- **下一步只剩补一轮稳定的全绿 E2E，把验证链收死，不是再回去重查 Loaded 根因。**
