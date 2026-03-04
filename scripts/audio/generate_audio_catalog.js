/**
 * 生成音效语义目录（供 AI 快速查找音效用）
 * 
 * 将 6800+ 条 registry entry 压缩为紧凑的语义索引。
 * 核心思路：提取每条 key 中的"语义词"（去掉厂商名/编号/格式标签），
 * 按二级分类聚合，输出一个 AI 可一次性读取的紧凑目录。
 * 
 * 用法：node scripts/audio/generate_audio_catalog.js
 * 产出：docs/audio/audio-catalog.md
 */
import fs from 'fs';
import path from 'path';

const REGISTRY_PATH = path.resolve('public/assets/common/audio/registry.json');
const OUTPUT_PATH = path.resolve('docs/audio/audio-catalog.md');

// ── 噪声过滤 ──────────────────────────────────────────────

const NOISE_EXACT = new Set([
  'general', 'files', 'none', 'assets', 'ucs', '192khz',
  'vol', 'pack', 'fx', 'sound', 'music',
]);

const NOISE_PREFIX = [
  /^khron_studio_/,
  /^casual_mobile_sound_fx_pack/,
  /^ui_menu_sound_fx_pack/,
  /^cyberpunk_sound_fx_pack/,
  /^steampunk_sound_fx_pack/,
  /^medieval_fantasy_sound_fx_pack/,
  /^mini_games_sound_effects/,
  /^decks_and_cards_sound_fx_pack/,
  /^fight_fury/,
  /^forged_in_fury/,
  /^modern_magic_sound_fx_pack/,
  /^simple_magic_sound_fx_pack/,
  /^spells_variations/,
  /^player_status_sound_fx_pack/,
  /^monster_library/,
  /^rpg_interface_essentials/,
  /^ethereal_music_pack/,
  /^fantasy_music_pack/,
  /^funk_music_pack/,
  /^casual_music_pack/,
  /^sound_of_survival/,
];

/** 
 * 文件名前缀标签（如 weapswrd_, dsgnsynth_, fooddrnk_）
 * 这些是音频文件的分类编码前缀，不含语义信息。
 * 只匹配已知的无意义编码模式，避免误删 negative_/positive_ 等有意义前缀。
 */
const FILE_TAGS = new Set([
  'weapswrd', 'weapaxe', 'weapbow', 'weappole', 'weaparro', 'weapmisc',
  'dsgnsynth', 'dsgnsrce', 'dsgnmisc',
  'fooddrnk', 'foodeat', 'foodmisc', 'foodingr',
  'metlmisc', 'metlhndl', 'metlcrsh',
  'rockmisc', 'rockhndl', 'rockcrsh',
  'woodmisc', 'woodcrsh',
  'clothmisc', 'clothhndl',
  'plashndl', 'plasmisc',
  'toolhand', 'toolmisc',
  'objfurn', 'objcont',
  'doormetl', 'doorwood', 'doorhdwr', 'doorappl',
  'drwrmetl', 'drwrwood',
  'fireburn', 'firetrch',
  'vegetree', 'vegemisc',
  'goresrce',
  'destrcrsh',
  'clocktick',
  'paprmisc', 'paprhndl',
  'magspel', 'magmisc',
  'uiclick', 'uimisc',
  'stgr',
]);

function isNoise(seg) {
  if (NOISE_EXACT.has(seg)) return true;
  if (/^\d+$/.test(seg)) return true;
  if (/^vol_?\d+$/i.test(seg)) return true;
  if (/^rt_\d+$/i.test(seg)) return true;
  if (NOISE_PREFIX.some(p => p.test(seg))) return true;
  return false;
}

// ── 语义提取 ──────────────────────────────────────────────

function cleanSegment(seg) {
  let cleaned = seg;
  // 1. 先去厂商后缀（优先级最高，避免被变体正则误匹配）
  cleaned = cleaned.replace(/_(krst_none|krst|none)$/i, '');
  // 2. 去掉变体后缀 _01/_a/_b1/_001
  cleaned = cleaned.replace(/[_](?:\d+|[a-z]\d*)$/i, '');
  // 3. 去掉已知的文件名前缀标签（白名单匹配）
  const underscoreIdx = cleaned.indexOf('_');
  if (underscoreIdx > 0) {
    const prefix = cleaned.slice(0, underscoreIdx);
    if (FILE_TAGS.has(prefix)) {
      cleaned = cleaned.slice(underscoreIdx + 1);
    }
  }
  // 4. BGM 变体
  cleaned = cleaned.replace(/_(cut_\d+|intensity_\d+|main|loop)$/i, '');
  return cleaned;
}

/**
 * 从完整 key 提取语义词列表
 */
function extractSemanticWords(key) {
  const parts = key.split('.');
  const words = [];
  for (const seg of parts) {
    if (isNoise(seg)) continue;
    const cleaned = cleanSegment(seg);
    if (cleaned.length > 0 && !isNoise(cleaned)) {
      words.push(cleaned);
    }
  }
  return words;
}

/**
 * 二级分组 key（前 2 个语义词）
 */
function getGroupKey(words) {
  if (words.length === 0) return 'misc';
  if (words.length === 1) return words[0];
  return words[0] + '.' + words[1];
}


// ── 主逻辑 ──────────────────────────────────────────────

function run() {
  const raw = fs.readFileSync(REGISTRY_PATH, 'utf8');
  const registry = JSON.parse(raw);
  const entries = registry.entries ?? [];

  // 按二级 key 聚合
  const groups = new Map();
  for (const entry of entries) {
    const words = extractSemanticWords(entry.key);
    const gk = getGroupKey(words);

    if (!groups.has(gk)) {
      groups.set(gk, {
        count: 0,
        type: entry.type,
        // 收集第 3+ 层的语义词（去重），用于展示子类型
        childWords: new Set(),
      });
    }
    const g = groups.get(gk);
    g.count++;

    // 收集第 3 个词开始的所有语义词（已清洗）
    for (let i = 2; i < words.length; i++) {
      // words 已经是清洗过的，直接加入
      g.childWords.add(words[i]);
    }
  }

  // 按顶级分类组织
  const tree = new Map();
  for (const [gk, data] of groups) {
    const top = gk.split('.')[0];
    if (!tree.has(top)) tree.set(top, []);

    // 子关键词：取前 12 个，用逗号分隔
    const children = [...data.childWords].sort().slice(0, 12);

    tree.get(top).push({
      gk,
      label: gk.split('.').slice(1).join(' > ') || gk,
      count: data.count,
      children,
    });
  }

  // ── 生成 Markdown ──────────────────────────────────────

  const lines = [];
  lines.push('# 音效语义目录');
  lines.push('');
  lines.push('> 自动生成。`node scripts/audio/generate_audio_catalog.js`');
  lines.push(`> ${entries.length} 条 → ${groups.size} 组`);
  lines.push('');
  lines.push('## 查找流程');
  lines.push('');
  lines.push('1. 搜索本文件的场景关键词（negative/click/sword/heal/alert/shield 等）');
  lines.push('2. 找到组后，用 grep 模式在 registry.json 中搜索获取完整 key');
  lines.push('3. 变体：末尾 `_01`→`_02` / `_a`→`_b`');
  lines.push('4. 试听：`AudioManager.play(\'key\')`');
  lines.push('');

  // 概览表
  lines.push('## 概览');
  lines.push('');

  const categoryDesc = {
    ambient: '环境（生存/制作/拾取/家具）',
    bgm: 'BGM（空灵/奇幻/放克/休闲）',
    card: '卡牌（翻/洗/抽/放/魔法牌）',
    coins: '金币（掉落/奖励/收集）',
    combat: '战斗（剑/斧/拳/弓/盾/爆炸）',
    cyberpunk: '赛博朋克（科幻UI/武器）',
    dice: '骰子（投掷/碰撞/滚动）',
    fantasy: '奇幻（弓箭/盾/治疗/火焰）',
    magic: '魔法（施法/元素/光暗/召唤）',
    misc: '杂项',
    monster: '怪物（咆哮/攻击/死亡）',
    puzzle: '休闲（提示/成功/失败/弹出）',
    status: '状态（buff/debuff/治疗/中毒）',
    steampunk: '蒸汽朋克（齿轮/蒸汽）',
    stinger: '过场（胜利/失败）',
    system: '系统（移动/通知/庆祝）',
    token: 'Token（放置/拾取）',
    ui: 'UI（点击/弹窗/通知/信号）',
  };

  const sortedTops = [...tree.keys()].sort();
  lines.push('| 分类 | 组 | 条 | 说明 |');
  lines.push('|------|----|----|------|');
  for (const top of sortedTops) {
    const g = tree.get(top);
    const total = g.reduce((s, x) => s + x.count, 0);
    lines.push(`| ${top} | ${g.length} | ${total} | ${categoryDesc[top] || ''} |`);
  }
  lines.push('');

  // 每个分类
  for (const top of sortedTops) {
    const topGroups = tree.get(top);
    topGroups.sort((a, b) => a.label.localeCompare(b.label));

    lines.push(`## ${top}`);
    lines.push('');
    lines.push('| 语义 | # | grep | 子关键词 |');
    lines.push('|------|---|------|----------|');

    for (const group of topGroups) {
      const label = group.label.length > 35
        ? group.label.slice(0, 32) + '...'
        : group.label;

      // grep 模式
      const grepParts = group.gk.split('.').filter(w => !isNoise(w));
      const grep = grepParts.join('.*');

      // 子关键词（紧凑显示，限制长度）
      const childStr = group.children.length > 0
        ? group.children.join(', ')
        : '';
      const childDisplay = childStr.length > 45
        ? childStr.slice(0, 42) + '...'
        : childStr;

      lines.push(`| ${label} | ${group.count} | \`${grep}\` | ${childDisplay} |`);
    }
    lines.push('');
  }

  // 写入
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  const content = lines.join('\n');
  fs.writeFileSync(OUTPUT_PATH, content, 'utf8');

  const sizeKB = (Buffer.byteLength(content, 'utf8') / 1024).toFixed(1);
  console.log(`[AudioCatalog] ${groups.size} 组, ${sizeKB} KB -> ${path.relative(process.cwd(), OUTPUT_PATH)}`);
}

try {
  run();
} catch (error) {
  console.error('[AudioCatalog] 生成失败:', error);
  process.exit(1);
}
