/**
 * 架构可视化 v6 — 数据层
 *
 * 包含：类型、节点/边定义、子图数据、布局工具函数。
 * 所有命名面向"不熟悉代码的人"，不用技术术语。
 */

// ============================================================================
// 类型
// ============================================================================

export interface ArchNode {
  id: string;
  label: string;
  desc: string;
  col: number;
  row: number;
  colSpan?: number;
  color: string;
  layer: string;
  details?: string[];
  dashed?: boolean;
  /** 可展开子图的类型 */
  expandable?: 'primitives' | 'pipeline' | 'systems' | 'testing';
  /** 主故事线序号（从 1 开始，0 = 不在主线上） */
  storyIndex?: number;
}

export interface ArchEdge {
  from: string;
  to: string;
  label?: string;
  color: string;
  type: 'dep' | 'data' | 'event';
  /** 是否属于主故事线 */
  story?: boolean;
}

export interface LayerBand {
  id: string;
  label: string;
  note: string;
  color: string;
  rowStart: number;
  rowEnd: number;
}

/** 基础能力库图标网格项 */
export interface PrimitiveItem {
  emoji: string;
  name: string;
  desc: string;
}

/** 管线步骤 */
export interface PipelineStep {
  emoji: string;
  label: string;
  desc: string;
  /** 右侧标注的系统 */
  systems?: string[];
  /** 骰子王座具体案例 */
  example?: string;
}

/** 系统插件项 */
export interface SystemItem {
  emoji: string;
  name: string;
  desc: string;
  hook: '前置' | '后置' | '前置+后置';
  isDefault: boolean;
}

/** 测试流程步骤 */
export interface TestStep {
  emoji: string;
  label: string;
  desc: string;
  phase: 'record' | 'verify';
  example?: string;
}

// ============================================================================
// 颜色
// ============================================================================

export const C = {
  ui: '#58a6ff',
  game: '#3fb950',
  engine: '#f0883e',
  core: '#bc8cff',
  server: '#8b949e',
  fx: '#f778ba',
} as const;

// ============================================================================
// 节点（重命名为"人话"）
// ============================================================================

export const NODES: ArchNode[] = [
  // ── 游戏层（User Story: 骰子王座） ──
  { id: 'game', label: '🎮 游戏层 — 骰子王座', desc: 'User Story: 骰子·英雄·技能·卡牌·回合对战', col: 0, row: 0, colSpan: 6, color: C.game, layer: 'game', dashed: true, storyIndex: 1, details: ['🎯 作为骰子王座，我需要引擎提供以下能力:', 'setup(): 初始化2名玩家 · 6个英雄可选 · 每人5骰子+20HP', 'validate(): 校验骰子操作/技能选择/卡牌使用是否合法', 'execute(): 产生伤害/治疗/状态/Token事件', 'reduce(): 纯函数更新血量/骰子/手牌状态', '🔌 10个系统: 回合管理·撤销·响应窗口·交互·事件推送·日志·操作记录·重赛·教学·作弊', '🧩 基础能力: 骰子·资源池·卡牌区域·效果处理·条件判断', '🎲 其他游戏同理: 召唤师战争·大杀四方·井字棋…都实现这4个函数接入'] },
  // ── 引擎层 ──
  { id: 'pipeline', label: '⚡ 回合执行引擎', desc: '玩家操作如何一步步变成游戏状态更新', col: 0, row: 1, colSpan: 6, color: C.engine, layer: 'engine', expandable: 'pipeline', storyIndex: 2 },
  { id: 'systems', label: '🔌 系统插件', desc: '撤销·教学·日志…不改游戏规则就能加功能', col: 0, row: 2, colSpan: 3, color: C.engine, layer: 'engine', expandable: 'systems' },
  { id: 'primitives', label: '🧩 基础能力库', desc: '骰子·卡牌·棋盘·资源…所有游戏都能用的基本能力', col: 3, row: 2, colSpan: 3, color: C.engine, layer: 'engine', expandable: 'primitives', details: ['🎯 所有游戏都能用的"积木块" — 10个独立模块', '游戏注册需要哪些能力，引擎负责调度', '🎲 例: 骰子王座用[骰子+资源池+目标选择+效果处理]'] },
  { id: 'testfw', label: '🧪 自动化测试', desc: '命令回放·快照对比·规则验证', col: 0, row: 3, colSpan: 3, color: C.engine, layer: 'engine', expandable: 'testing', details: ['🎯 确保改代码后游戏规则没被搞坏', '录制一局完整对战 → 存为命令序列 → 每次改代码后自动回放', '回放结果和快照不一致 → 有bug!', '🎲 例: 录制\"第3回合A攻击B\" → 回放验证B血量确实 20→17'] },
  { id: 'eventstream', label: '📡 事件广播', desc: '实时通知界面播放特效和音效', col: 3, row: 3, colSpan: 3, color: C.engine, layer: 'engine', details: ['🎯 管线处理完后通知UI"发生了什么" → 播放对应特效', '每个事件有自增ID, 撤销时清空(防止重播旧动画)', '🎲 例: 管线产生[攻击命中, 扣血-3] → UI依次播放命中音效+飞字"-3"'] },
  // ── 框架核心 ──
  { id: 'matchstate', label: '💾 游戏状态', desc: '当前对局的全部数据（系统状态 + 游戏状态）', col: 0, row: 4, colSpan: 3, color: C.core, layer: 'core', storyIndex: 3, details: ['🎯 当前对局的完整快照 — 所有玩家看到的"真相"', 'sys部分: 当前阶段 · 轮到谁 · 可撤销步数 · 交互请求', 'core部分: 由游戏层定义的状态(血量/手牌/骰子等)', '🎲 例: 骰子王座第3回合:', '  sys: 阶段=攻击, 轮到=玩家A, 可撤销=1步', '  core: A{hp:18, dice:4} B{hp:15, dice:3}'] },
  { id: 'domaincore', label: '📐 游戏规则契约', desc: '每个游戏接入引擎的"入口协议"', col: 3, row: 4, colSpan: 3, color: C.core, layer: 'core', details: ['🎯 每个游戏必须回答的 4 个核心问题:', '① 开局长什么样? → setup(): 每人5骰子+20血', '② 这步操作合法吗? → validate(): "你有骰子可以攻击吗?"', '③ 合法操作产生什么? → execute(): [扣血-3, 消耗骰子×1]', '④ 事件怎么改状态? → reduce(): 目标血量 20→17', '所有游戏通过这 4 个函数接入引擎, 引擎不关心具体规则'] },
  { id: 'adapter', label: '🔌 模式适配器', desc: '联机/本地/教学三种模式的统一入口', col: 0, row: 5, colSpan: 3, color: C.core, layer: 'core', details: ['🎯 让同一套规则跑在不同模式 — 改模式不改规则代码', '联机: 严格校验 → 通过 boardgame.io 同步', '本地: 跳过网络 → 直接本地执行(调试/单机)', '教学: 按脚本引导 → 限制可用操作, 一步步教新手', '🎲 例: 骰子王座同时支持联机对战和本地AI, 同一份规则代码'] },
  { id: 'assetloader', label: '📦 资源加载', desc: '图片压缩·音频注册·统一资源管理', col: 3, row: 5, colSpan: 3, color: C.core, layer: 'core', details: ['🎯 统一管理图片/音频 — 自动压缩·按需加载', '开发用原图, 生产自动切压缩版', '🎲 例: 加载骰子王座 → 预加载48张技能卡图片+12个音效'] },
  // ── UI 层 ──
  { id: 'pages', label: '📄 页面入口', desc: '首页·房间·本地对战', col: 0, row: 6, colSpan: 2, color: C.ui, layer: 'ui', details: ['🎯 玩家打开网站后的第一站 — 路由分发到不同页面', '首页(游戏列表) → 房间页(创建/加入) → 对战页(游戏画面)', '🎲 例: 点击"骰子王座" → 进入房间等人 → 2人齐了开始对战'] },
  { id: 'framework', label: '🧱 骨架层', desc: '跨游戏复用的 UI 框架', col: 2, row: 6, colSpan: 2, color: C.ui, layer: 'ui', details: ['🎯 所有游戏共用的界面框架 — 不用每个游戏重写界面', '游戏桌面布局 · 玩家信息面板 · 操作按钮栏 · 手牌/骰子区', '🎲 例: 玩家面板(头像+血量条+骰子数) 骰子王座和召唤师战争共用'] },
  { id: 'contexts', label: '🔗 全局状态', desc: '认证/音频/弹窗/撤销/游戏模式', col: 4, row: 6, colSpan: 2, color: C.ui, layer: 'ui', details: ['🎯 跨页面共享的状态 — 切换页面不会丢失', '登录态 · 音量开关 · 弹窗控制 · 撤销记录 · 游戏模式', '🎲 例: 你关掉音效 → 切换页面后音效仍然是关的'] },
  { id: 'contract', label: '📋 游戏↔UI 接口', desc: '游戏和界面之间约定好的数据格式', col: 0, row: 7, colSpan: 2, color: C.ui, layer: 'ui', details: ['🎯 游戏逻辑和界面之间的"翻译协议"', '游戏层只产出纯数据(你有3张手牌)', 'UI 层需要知道: 画在哪、画多大、能不能点', '🎲 例: 游戏说"手牌:[火球,治疗,盾击]" → UI 画3张牌, 蓝量不够的变灰'] },
  { id: 'fx', label: '✨ 视觉特效', desc: '粒子动画·画面震动·伤害飞字', col: 2, row: 7, colSpan: 2, color: C.fx, layer: 'ui', details: ['🎯 让游戏"有感觉" — 动画·音效·屏幕震动', 'Canvas 2D 粒子引擎 · Shader 特效 · CSS 动画', '🎲 例: 骰子王座攻击 → 屏幕震动 + 伤害飞字"-3"'] },
  { id: 'lib', label: '🛠 工具库', desc: '国际化 / 音频 / 通用 Hooks', col: 4, row: 7, colSpan: 2, color: C.ui, layer: 'ui', details: ['🎯 通用工具 — 国际化/音频播放/自定义Hooks', 'i18n(中英文切换) · AudioManager · 通用 Hooks', '🎲 例: 切换语言 → 所有界面文字自动变成英文'] },
  // ── 服务端 ──
  { id: 'bgio', label: '🎲 boardgame.io', desc: '状态同步·回合管理·房间管理', col: 0, row: 8, colSpan: 2, color: C.server, layer: 'server', storyIndex: 4, details: ['🎯 保证所有玩家看到一致的游戏状态', '你的操作 → 服务器校验 → 广播给所有人', 'Immer状态管理: 不可变更新, 自动记录历史', '🎲 例: 你点击"攻击" → 服务器确认合法 → 对手画面同步显示你的攻击动画'] },
  { id: 'socketio', label: '💬 实时通信', desc: '大厅/聊天/匹配/重赛投票', col: 2, row: 8, colSpan: 2, color: C.server, layer: 'server', details: ['🎯 非游戏内的实时通信 — 大厅/聊天/邀请', '在线状态 · 好友邀请 · 大厅聊天 · 重赛投票', '🎲 例: 你在大厅看到好友在线 → 发送邀请 → 好友收到弹窗'] },
  { id: 'restapi', label: '🌐 REST API', desc: '用户认证·数据持久化·UGC', col: 4, row: 8, colSpan: 2, color: C.server, layer: 'server', details: ['🎯 需要持久保存的操作 — 注册/登录/自定义内容', '用户认证 · 数据持久化 · UGC(自定义卡组)', '🎲 例: 你自创了一副卡组 → 保存到服务器 → 下次登录还在'] },
  { id: 'mongodb', label: '🗄 数据库', desc: '游戏状态·用户·自定义卡组', col: 0, row: 9, colSpan: 3, color: C.server, layer: 'server', storyIndex: 5, details: ['🎯 所有需要长期保存的数据都在这里', '游戏状态(断线重连) · 用户数据(账号) · 自定义卡组', '🎲 例: 对战到一半掉线 → 重新打开 → 对局还在, 从上次继续'] },
  { id: 'static', label: '☁️ 静态资源', desc: 'Cloudflare R2 · 图片 · 音频 · 国际化', col: 3, row: 9, colSpan: 3, color: C.server, layer: 'server', details: ['🎯 图片/音频/翻译文件的存储和分发', 'Cloudflare R2 CDN · 全球加速', '🎲 例: 玩家在海外打开游戏 → CDN就近加载卡牌图片, 秒开'] },
];

// ============================================================================
// 边（含测试框架补连线 + 主故事线标记）
// ============================================================================

export const EDGES: ArchEdge[] = [
  // 主故事线（①→⑤ 连续路径）
  { from: 'game', to: 'pipeline', label: 'Command', color: C.engine, type: 'data', story: true },
  { from: 'pipeline', to: 'matchstate', label: '读写状态', color: C.core, type: 'data', story: true },
  { from: 'matchstate', to: 'bgio', label: '状态同步', color: C.server, type: 'data', story: true },
  { from: 'bgio', to: 'mongodb', label: '持久化', color: C.server, type: 'data', story: true },
  // 游戏层→UI（提供 Board 组件）
  { from: 'game', to: 'pages', label: '提供 Board', color: C.game, type: 'dep' },
  { from: 'game', to: 'framework', label: '注入 Board', color: C.game, type: 'dep' },
  // UI 层内部
  { from: 'pages', to: 'framework', label: '组合', color: C.ui, type: 'dep' },
  { from: 'pages', to: 'contexts', label: '注入', color: C.ui, type: 'dep' },
  { from: 'contract', to: 'framework', label: '实现', color: C.ui, type: 'dep' },
  { from: 'framework', to: 'fx', label: '触发特效', color: C.fx, type: 'event' },
  { from: 'contexts', to: 'lib', label: '使用', color: C.ui, type: 'dep' },
  // 引擎层
  { from: 'game', to: 'primitives', label: '使用能力', color: C.engine, type: 'dep' },
  { from: 'pipeline', to: 'systems', label: '前置+后置钩子', color: C.engine, type: 'dep' },
  { from: 'systems', to: 'eventstream', label: '事件发布', color: C.engine, type: 'event' },
  { from: 'eventstream', to: 'fx', label: '驱动特效/音效', color: C.fx, type: 'event' },
  { from: 'pipeline', to: 'domaincore', label: '调用规则函数', color: C.core, type: 'dep' },
  { from: 'systems', to: 'matchstate', label: '读写 sys', color: C.core, type: 'data' },
  { from: 'adapter', to: 'pipeline', label: 'executePipeline', color: C.core, type: 'data' },
  { from: 'domaincore', to: 'matchstate', label: '定义状态结构', color: C.core, type: 'dep' },
  // 测试框架
  { from: 'testfw', to: 'pipeline', label: '命令回放', color: C.engine, type: 'data' },
  { from: 'testfw', to: 'matchstate', label: '快照对比', color: C.engine, type: 'data' },
  { from: 'game', to: 'testfw', label: '测试用例', color: C.engine, type: 'dep' },
  // 框架核心内部
  { from: 'adapter', to: 'bgio', label: 'Immer 写入', color: C.server, type: 'data' },
  // 服务端
  { from: 'pages', to: 'socketio', label: '大厅通信', color: C.server, type: 'data' },
  { from: 'pages', to: 'restapi', label: 'API 调用', color: C.server, type: 'data' },
  { from: 'restapi', to: 'mongodb', label: 'CRUD', color: C.server, type: 'data' },
  { from: 'assetloader', to: 'static', label: '加载资源', color: C.server, type: 'data' },
];

// ============================================================================
// 层色带（含一句话注解）
// ============================================================================

export const LAYER_BANDS: LayerBand[] = [
  { id: 'game', label: '游戏层', note: 'User Story', color: C.game, rowStart: 0, rowEnd: 0 },
  { id: 'engine', label: '引擎层', note: '共享运行时', color: C.engine, rowStart: 1, rowEnd: 3 },
  { id: 'core', label: '框架核心', note: '类型契约+状态', color: C.core, rowStart: 4, rowEnd: 5 },
  { id: 'ui', label: 'UI 层', note: '引擎提供的界面框架', color: C.ui, rowStart: 6, rowEnd: 7 },
  { id: 'server', label: '服务端', note: '网络+存储', color: C.server, rowStart: 8, rowEnd: 9 },
];

// ============================================================================
// 主干边（默认显示）+ 主故事线
// ============================================================================

const TRUNK_PAIRS: [string, string][] = [
  ['game', 'pages'], ['game', 'framework'],
  ['game', 'pipeline'], ['pipeline', 'systems'], ['pipeline', 'matchstate'],
  ['pipeline', 'domaincore'], ['adapter', 'pipeline'], ['adapter', 'bgio'],
  ['eventstream', 'fx'], ['matchstate', 'bgio'], ['bgio', 'mongodb'], ['restapi', 'mongodb'],
  // 测试框架连线
  ['testfw', 'pipeline'], ['testfw', 'matchstate'], ['game', 'testfw'],
];

export const TRUNK_EDGE_IDS = new Set<number>();
EDGES.forEach((edge, i) => {
  if (TRUNK_PAIRS.some(([a, b]) => (edge.from === a && edge.to === b) || (edge.from === b && edge.to === a))) {
    TRUNK_EDGE_IDS.add(i);
  }
});

/** 主故事线边索引 */
export const STORY_EDGE_IDS = new Set<number>();
EDGES.forEach((edge, i) => {
  if (edge.story) STORY_EDGE_IDS.add(i);
});

// ============================================================================
// C4 Model 数据
// ============================================================================

/** L1 System Context 实体 */
export interface ContextEntity {
  id: string;
  label: string;
  desc: string;
  type: 'person' | 'system' | 'external' | 'story';
  color: string;
}

export const C4_CONTEXT: ContextEntity[] = [
  { id: 'user', label: '👤 玩家', desc: '通过浏览器玩桌游', type: 'person', color: '#bc8cff' },
  { id: 'story', label: '🎮 骰子王座', desc: 'User Story — 引擎的消费者', type: 'story', color: C.game },
  { id: 'platform', label: '⚙️ 桌游引擎框架', desc: '管线 · 系统 · 基础能力 · UI框架', type: 'system', color: '#58a6ff' },
  { id: 'ext-db', label: '🗄️ MongoDB', desc: '用户 · 对局 · 卡组', type: 'external', color: '#8b949e' },
  { id: 'ext-cdn', label: '☁️ Cloudflare R2', desc: '图片 · 音频 · CDN', type: 'external', color: '#8b949e' },
];

export const C4_CONTEXT_LINKS: { from: string; to: string; label: string }[] = [
  { from: 'user', to: 'story', label: '浏览器操作' },
  { from: 'story', to: 'platform', label: 'Command · 使用能力' },
  { from: 'platform', to: 'ext-db', label: '状态持久化' },
  { from: 'platform', to: 'ext-cdn', label: '静态资源加载' },
];

/** L2 Container 层间边 */
export const CONTAINER_LINKS: { from: string; to: string; label: string; color: string; dashed?: boolean }[] = [
  { from: 'game', to: 'engine', label: 'Command · 使用能力', color: C.game },
  { from: 'engine', to: 'core', label: '读写状态 · 调用规则', color: C.engine },
  { from: 'core', to: 'server', label: 'Immer写入 · API · 资源', color: C.core },
  { from: 'game', to: 'ui', label: '提供 Board 组件', color: C.game, dashed: true },
  { from: 'engine', to: 'ui', label: '事件→特效/音效', color: C.fx, dashed: true },
];

/** 每层组件摘要（L2 容器图显示） */
export const LAYER_SUMMARIES: Record<string, string> = {
  game: 'User Story — 骰子王座: setup·validate·execute·reduce 接入引擎',
  engine: '回合管线 · 系统插件 · 基础能力 · 测试框架 · 事件广播',
  core: '游戏状态 · 规则契约 · 模式适配 · 资源加载',
  ui: '页面入口 · 骨架层 · 全局状态 · 接口契约 · 视觉特效 · 工具库',
  server: 'boardgame.io · 实时通信 · REST API · MongoDB · CDN',
};

/** L3: 某层内部边 */
export function layerInternalEdges(layerId: string): ArchEdge[] {
  return EDGES.filter(e => {
    const fn = NODE_MAP.get(e.from);
    const tn = NODE_MAP.get(e.to);
    return fn && tn && fn.layer === layerId && tn.layer === layerId;
  });
}

/** L3: 某层与外部的接口 */
export interface ExternalLink {
  direction: 'in' | 'out';
  internalId: string;
  externalNode: ArchNode;
  label: string;
}

export function layerExternalLinks(layerId: string): ExternalLink[] {
  const links: ExternalLink[] = [];
  EDGES.forEach(e => {
    const fn = NODE_MAP.get(e.from);
    const tn = NODE_MAP.get(e.to);
    if (!fn || !tn) return;
    if (fn.layer === layerId && tn.layer !== layerId) {
      links.push({ direction: 'out', internalId: fn.id, externalNode: tn, label: e.label ?? '' });
    } else if (tn.layer === layerId && fn.layer !== layerId) {
      links.push({ direction: 'in', internalId: tn.id, externalNode: fn, label: e.label ?? '' });
    }
  });
  return links;
}

// ============================================================================
// 基础能力库 — 图标网格数据
// ============================================================================

export const PRIMITIVE_ITEMS: PrimitiveItem[] = [
  { emoji: '🎲', name: '骰子', desc: '投掷·统计' },
  { emoji: '🃏', name: '卡牌区域', desc: '手牌·牌库·弃牌堆' },
  { emoji: '📐', name: '棋盘格', desc: '坐标·距离·邻接' },
  { emoji: '💰', name: '资源池', desc: '增减·消耗·边界' },
  { emoji: '🎯', name: '目标选择', desc: '选中谁·攻击谁' },
  { emoji: '⚡', name: '效果处理', desc: '定义·执行效果' },
  { emoji: '🔀', name: '条件判断', desc: '满足条件才触发' },
  { emoji: '📊', name: '表达式', desc: '数值计算' },
  { emoji: '🖼️', name: '视觉解析', desc: '实体→图片映射' },
  { emoji: '📋', name: '动作注册', desc: 'actionId→处理器' },
];

// ============================================================================
// 管线子图 — 8 步 + halt 旁路
// ============================================================================

export const PIPELINE_STEPS: PipelineStep[] = [
  { emoji: '📥', label: '命令到达', desc: '玩家点击按钮产生的操作指令', example: '玩家A点击“攻击” → {type:attack, target:B}' },
  { emoji: '🔒', label: '系统前置拦截', desc: '可拦截/消费命令，跳过规则层', systems: ['撤销(Undo)', '回合管理(Flow)', '响应窗口', '教学系统', '交互系统', '调试工具', '选角系统'], example: '撤销系统检查: 不是撤销命令 → 放行' },
  { emoji: '✅', label: '规则校验', desc: '这个操作合法吗？不合法直接拒绝', example: 'validate: A有骰子 → 攻击合法 ✓' },
  { emoji: '⚙️', label: '执行命令', desc: '合法操作 → 产生游戏事件列表', example: 'execute: → [命中, 扣血-3, 消耗骰子×1]' },
  { emoji: '🔄', label: '后处理', desc: '自动补充缺失事件（如检测死亡）', example: 'B血量>0 → 存活, 无需补充事件' },
  { emoji: '📝', label: '逐事件更新', desc: '每个事件修改游戏状态（纯函数）', example: 'reduce: B.hp 20→17, A.dice 5→4' },
  { emoji: '📡', label: '系统后置响应', desc: '可产生新事件，最多迭代 10 轮', systems: ['原始日志(Log)', '事件推送(EventStream)', '操作记录(ActionLog)', '回合管理(Flow)', '响应窗口'], example: '事件推送 → UI播放攻击动画+音效' },
  { emoji: '📤', label: '广播结果', desc: '更新后的状态发给所有玩家', example: '两个玩家画面同步更新血量和骰子数' },
];

// ============================================================================
// 系统插件子图 — 11 个系统，分默认/按需两组
// ============================================================================

export const SYSTEM_ITEMS: SystemItem[] = [
  // 默认启用（8 个）
  { emoji: '🔒', name: '撤销系统', desc: 'Ctrl+Z 撤回上一步', hook: '前置', isDefault: true },
  { emoji: '🎯', name: '统一交互', desc: '阻塞式玩家选择，可扩展 kind', hook: '前置', isDefault: true },
  { emoji: '🪟', name: '响应窗口', desc: '打断对手回合进行响应', hook: '前置+后置', isDefault: true },
  { emoji: '📖', name: '教学系统', desc: '新手引导步骤控制', hook: '前置', isDefault: true },
  { emoji: '📋', name: '原始日志', desc: '记录所有操作（审计用）', hook: '后置', isDefault: true },
  { emoji: '📡', name: '事件推送', desc: '驱动特效和音效', hook: '后置', isDefault: true },
  { emoji: '📝', name: '操作记录', desc: '玩家可见的操作历史', hook: '后置', isDefault: true },
  { emoji: '🔁', name: '重赛投票', desc: '结束后再来一局', hook: '前置', isDefault: true },
  // 按需配置（3 个）
  { emoji: '🔄', name: '回合管理', desc: '阶段流转，需游戏提供 FlowHooks', hook: '前置+后置', isDefault: false },
  { emoji: '🎮', name: '调试工具', desc: '开发时修改资源/状态', hook: '前置', isDefault: false },
  { emoji: '👤', name: '选角系统', desc: '开局选角色', hook: '前置', isDefault: false },
];

// ============================================================================
// 测试框架子图 — 录制→回放→对比 全流程
// ============================================================================

export const TEST_FLOW_STEPS: TestStep[] = [
  { emoji: '🎮', label: '正常对局', desc: '玩家正常玩一局游戏，框架在后台记录', phase: 'record', example: '开一局骰子王座，玩家A攻击B、B防御、A释放技能…' },
  { emoji: '📋', label: '录制命令序列', desc: '每一步操作自动转为 Command 对象存入数组', phase: 'record', example: '[{type:attack,target:B}, {type:defend}, {type:skill,id:fireball}]' },
  { emoji: '📸', label: '保存状态快照', desc: '对局结束后序列化完整游戏状态作为"标准答案"', phase: 'record', example: 'snapshot: {A:{hp:12,dice:2}, B:{hp:0}, winner:A}' },
  { emoji: '💾', label: '持久化测试用例', desc: '命令序列 + 快照 存为 JSON 文件', phase: 'record', example: 'dice-throne/tests/attack-combo.test.json' },
  { emoji: '✏️', label: '修改代码', desc: '开发者修改了游戏规则 / 引擎逻辑', phase: 'verify', example: '重构攻击伤害计算公式' },
  { emoji: '▶️', label: '回放命令序列', desc: '读取 JSON，用相同命令序列重新执行一遍', phase: 'verify', example: '逐条执行: attack→defend→skill→…(无需UI)' },
  { emoji: '🔍', label: '快照对比', desc: '将回放后的状态与保存的快照逐字段深度对比', phase: 'verify', example: 'diff: A.hp 期望12 实际12 ✓, B.hp 期望0 实际3 ✗' },
  { emoji: '✅', label: '结果判定', desc: '全部字段一致 → 通过; 有差异 → 报错 + 定位', phase: 'verify', example: '❌ B.hp 不一致 → 攻击伤害计算有bug!' },
];

// ============================================================================
// 布局常量与工具函数
// ============================================================================

export const GRID = {
  cols: 6, rows: 10,
  padX: 80, padY: 30,
  cellW: 170, cellH: 56,
  gapX: 12, gapY: 10,
} as const;

export const SVG_W = GRID.padX + GRID.cols * (GRID.cellW + GRID.gapX);
export const SVG_H = GRID.padY + GRID.rows * (GRID.cellH + GRID.gapY) + 20;

export function nodeRect(n: ArchNode) {
  const span = n.colSpan ?? 1;
  const x = GRID.padX + n.col * (GRID.cellW + GRID.gapX);
  const y = GRID.padY + n.row * (GRID.cellH + GRID.gapY);
  const w = span * GRID.cellW + (span - 1) * GRID.gapX;
  return { x, y, w, h: GRID.cellH };
}

export function nodeCenter(n: ArchNode) {
  const r = nodeRect(n);
  return { cx: r.x + r.w / 2, cy: r.y + r.h / 2 };
}

export function bandRect(band: LayerBand) {
  const y = GRID.padY + band.rowStart * (GRID.cellH + GRID.gapY) - 6;
  const h = (band.rowEnd - band.rowStart + 1) * (GRID.cellH + GRID.gapY) + 2;
  return { x: GRID.padX - 8, y, w: GRID.cols * (GRID.cellW + GRID.gapX) + 4, h };
}

export const NODE_MAP = new Map(NODES.map(n => [n.id, n]));

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

type Rect = { x: number; y: number; w: number; h: number };

/** 两个矩形之间的正交路径（圆角） — 通用版 */
export function rectEdgePath(fromR: Rect, toR: Rect): string {
  const fCx = fromR.x + fromR.w / 2, fCy = fromR.y + fromR.h / 2;
  const tCx = toR.x + toR.w / 2, tCy = toR.y + toR.h / 2;
  const r = 7;

  // 下行
  if (toR.y > fromR.y + fromR.h - 10) {
    const sx = clamp(tCx, fromR.x + 14, fromR.x + fromR.w - 14);
    const sy = fromR.y + fromR.h;
    const tx = clamp(fCx, toR.x + 14, toR.x + toR.w - 14);
    const ty = toR.y;
    if (Math.abs(sx - tx) < 4) return `M${sx},${sy} V${ty}`;
    const my = (sy + ty) / 2, d = tx > sx ? 1 : -1;
    return `M${sx},${sy} V${my - r} Q${sx},${my} ${sx + d * r},${my} H${tx - d * r} Q${tx},${my} ${tx},${my + r} V${ty}`;
  }

  // 上行
  if (toR.y + toR.h < fromR.y + 10) {
    const sx = clamp(tCx, fromR.x + 14, fromR.x + fromR.w - 14);
    const sy = fromR.y;
    const tx = clamp(fCx, toR.x + 14, toR.x + toR.w - 14);
    const ty = toR.y + toR.h;
    if (Math.abs(sx - tx) < 4) return `M${sx},${sy} V${ty}`;
    const my = (sy + ty) / 2, d = tx > sx ? 1 : -1;
    return `M${sx},${sy} V${my + r} Q${sx},${my} ${sx + d * r},${my} H${tx - d * r} Q${tx},${my} ${tx},${my - r} V${ty}`;
  }

  // 同行水平
  if (tCx > fCx) return `M${fromR.x + fromR.w},${fCy} H${toR.x}`;
  return `M${fromR.x},${fCy} H${toR.x + toR.w}`;
}

/** 边路径（全局布局用，内部调 rectEdgePath） */
export function edgePath(edge: ArchEdge): string {
  const fn = NODE_MAP.get(edge.from);
  const tn = NODE_MAP.get(edge.to);
  if (!fn || !tn) return '';
  return rectEdgePath(nodeRect(fn), nodeRect(tn));
}

export function edgeLabelPos(edge: ArchEdge) {
  const fromNode = NODE_MAP.get(edge.from);
  const toNode = NODE_MAP.get(edge.to);
  if (!fromNode || !toNode) return { x: 0, y: 0 };
  const fromC = nodeCenter(fromNode);
  const toC = nodeCenter(toNode);
  return { x: (fromC.cx + toC.cx) / 2, y: (fromC.cy + toC.cy) / 2 };
}

/** 主故事线边的颜色（按层色带过渡） */
export function storyEdgeColor(edge: ArchEdge): string {
  const fromNode = NODE_MAP.get(edge.from);
  if (!fromNode) return '#e3b341';
  const layerColors: Record<string, string> = {
    game: '#3fb950', engine: '#f0883e', core: '#bc8cff',
    ui: '#58a6ff', server: '#8b949e',
  };
  return layerColors[fromNode.layer] ?? '#e3b341';
}
