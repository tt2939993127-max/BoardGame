# Change: 大杀四方输入模式与偏好设置

## Why
大杀四方当前只有点击式出牌交互，缺少用户可切换的拖拽输入模式，也没有把游戏专属偏好与全局账户入口按平台收敛到稳定的导航位置。现有大杀四方卡图覆盖层偏好仅保存在本地，登录用户无法跨设备同步；同时移动端若直接复用桌面拖拽思路，容易与现有点击/长按查看产生串扰。

## What Changes
- 新增首页全局入口分流：手机首页使用面包屑式顶部导航承载登录、账户、社交与全局设置；PC 首页继续使用悬浮球。
- 新增大杀四方专属偏好入口，挂到现有局内设置入口，统一展示大杀四方交互模式与卡图覆盖层相关设置。
- 新增大杀四方“点击模式 / 拖拽模式”两种互斥输入模式，默认保持现有点击模式不变。
- 在拖拽模式下，为需要基地或随从目标的手牌出牌流程提供桌面端与移动端一致的拖拽到目标交互，并显示类似杀戮尖塔的目标箭头。
- 明确点击模式与拖拽模式的隔离规则，避免同一模式下同时响应两套主输入，减少误触和误出牌。
- 扩展用户设置持久化能力：游客继续走本地缓存；登录用户走账号级 UI 偏好存储，并支持首次登录迁移本地的大杀四方偏好。

## Impact
- Affected specs:
  - `home-global-navigation`
  - `manage-user-settings`
  - `smashup-input-mode`
- Affected code:
  - `src/pages/Home.tsx`
  - `src/components/system/GlobalHUD.tsx`
  - `src/components/social/UserMenu.tsx`
  - `src/games/smashup/Board.tsx`
  - `src/games/smashup/ui/HandArea.tsx`
  - `src/games/smashup/ui/BaseZone.tsx`
  - `src/games/smashup/ui/SmashUpOverlayContext.tsx`
  - `src/components/game/framework/widgets/GameHUD.tsx`
  - `src/api/user-settings.ts`
  - `apps/api/src/modules/user-settings/`
