## 1. Spec & Asset Audit
- [x] 1.1 盘点 `Updated Paper Book/Sprites` 中可直接服务首页 V2 的书本、翻页、书签与背景素材。
- [x] 1.2 明确本轮素材缺口，并区分“必须补素材”与“可用 HTML/SVG/CSS 补位”的部分。
- [x] 1.3 新增 `home-book-navigation` spec delta，定义首页 V2 的页面状态机与翻页语义。

## 2. Design Artifacts
- [x] 2.1 输出首页 V2 的 SVG 草图，覆盖大厅目录页与游戏详情页两种主状态。
- [x] 2.2 在设计文档中记录双页布局、书签职责、翻页方向和移动端主方向裁决。
- [x] 2.3 回填失败复盘：明确“背景未铺满、书本过小、书签被错误做成分类筛选、书页原生占位 UI 过早叠加”属于本轮已确认的错误方向。
- [x] 2.4 回填接手口径：右侧真实书签应复用当前已有标签页与首页悬浮球功能，交互节奏参考炉石式游戏首页，整体风格以游戏为主。

## 3. Next Implementation Gate
- [x] 3.1 把临时素材迁入正式运行时资源目录，并决定是逐帧图还是 sprite sheet。
- [x] 3.2 实现首页 V2 逐帧书本壳基线：全屏背景、开书、书签出现、静止书本壳。
- [x] 3.3 在校准书本与书签的同时，直接实施最小真实首页入口：优先复用当前已有标签页与首页悬浮球能力，不做创建房间阶段才需要的模组/包管理 UI。
- [x] 3.4 在对应 worktree 中补 E2E，覆盖移动端 App 主方向下的开书、目录、详情和翻页导航。

## 4. Validation
- [x] 4.1 `openspec validate add-home-v2-book-navigation --strict --no-interactive` 通过。
