/**
 * 自动检测 DiceThrone 玩家面板上的技能槽边框位置
 * 通过颜色匹配找到边框矩形，输出百分比坐标
 *
 * 用法: node scripts/game/detect-ability-layout.cjs
 */

const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

// ========== 配置 ==========
const IMAGE_PATH = path.resolve(
    __dirname,
    '../../public/assets/dicethrone/images/monk/player-board.png'
);

// 普通技能边框：亮黄色 HSL 范围
// 采样显示实际颜色为 rgb(255,255,112)~rgb(252,255,90) 等亮黄
const YELLOW_HUE_MIN = 40;   // 色相下限
const YELLOW_HUE_MAX = 70;   // 色相上限
const YELLOW_SAT_MIN = 0.40;  // 饱和度下限
const YELLOW_LIGHT_MIN = 0.55; // 亮度下限
const YELLOW_LIGHT_MAX = 0.85; // 亮度上限（排除接近白色）

// 大招边框：在图片下方83%区域的浅色/白色边框
const ULTIMATE_LIGHT_MIN = 0.90; // 亮度 > 90% 的接近白色
const ULTIMATE_SAT_MAX = 0.15;   // 饱和度低（接近白色）
// 大招只在图片下部区域检测，避免全图白色噪声
const ULTIMATE_Y_START_RATIO = 0.80;

// 连通区域最小面积占图片比例（过滤噪点）
const MIN_AREA_RATIO = 0.0002;

// 技能槽 ID 映射（按位置排列：左→右，上→下）
const SLOT_IDS = [
    'fist', 'chi', 'sky', 'lotus',      // 第一行
    'combo', 'lightning', 'calm', 'meditate', // 第二行
];
const ULTIMATE_ID = 'ultimate';

// ========== 工具函数 ==========

/** RGB 转 HSL */
function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    if (max === min) return { h: 0, s: 0, l };
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h;
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
    return { h: h * 360, s, l };
}

/** 读取 PNG 图片为像素数据 */
function loadImage(filePath) {
    const buffer = fs.readFileSync(filePath);
    return PNG.sync.read(buffer);
}

/** 生成黄色边框 mask（HSL 色相匹配） */
function createYellowMask(png) {
    const { width, height, data } = png;
    const mask = new Uint8Array(width * height);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const a = data[idx + 3];
            if (a <= 128) continue;
            const { h, s, l } = rgbToHsl(data[idx], data[idx + 1], data[idx + 2]);
            if (h >= YELLOW_HUE_MIN && h <= YELLOW_HUE_MAX
                && s >= YELLOW_SAT_MIN
                && l >= YELLOW_LIGHT_MIN && l <= YELLOW_LIGHT_MAX) {
                mask[y * width + x] = 1;
            }
        }
    }
    return mask;
}

/** 生成大招边框 mask（亮白色，只检测图片下方区域） */
function createUltimateMask(png) {
    const { width, height, data } = png;
    const mask = new Uint8Array(width * height);
    const yStart = Math.floor(height * ULTIMATE_Y_START_RATIO);
    for (let y = yStart; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const a = data[idx + 3];
            if (a <= 128) continue;
            const { s, l } = rgbToHsl(data[idx], data[idx + 1], data[idx + 2]);
            if (l >= ULTIMATE_LIGHT_MIN && s <= ULTIMATE_SAT_MAX) {
                mask[y * width + x] = 1;
            }
        }
    }
    return mask;
}

/** BFS 连通区域标记，返回每个区域的像素坐标集 */
function findConnectedRegions(mask, width, height, minArea) {
    const visited = new Uint8Array(width * height);
    const regions = [];

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const pos = y * width + x;
            if (mask[pos] === 0 || visited[pos]) continue;

            // BFS
            const queue = [{ x, y }];
            visited[pos] = 1;
            let minX = x, maxX = x, minY = y, maxY = y;
            let count = 0;

            while (queue.length > 0) {
                const p = queue.shift();
                count++;
                if (p.x < minX) minX = p.x;
                if (p.x > maxX) maxX = p.x;
                if (p.y < minY) minY = p.y;
                if (p.y > maxY) maxY = p.y;

                // 8-连通
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        if (dx === 0 && dy === 0) continue;
                        const nx = p.x + dx;
                        const ny = p.y + dy;
                        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
                        const npos = ny * width + nx;
                        if (mask[npos] === 1 && !visited[npos]) {
                            visited[npos] = 1;
                            queue.push({ x: nx, y: ny });
                        }
                    }
                }
            }

            if (count >= minArea) {
                regions.push({ minX, maxX, minY, maxY, area: count });
            }
        }
    }
    return regions;
}

/**
 * 合并重叠/相近的区域（边框可能被圆角断开为多段）
 * 判断标准：两个区域的外接矩形重叠或间距小于 gap
 */
function mergeNearbyRegions(regions, gap) {
    if (regions.length === 0) return [];

    // 按 minY, minX 排序
    const sorted = regions.slice().sort((a, b) => a.minY - b.minY || a.minX - b.minX);
    const merged = [{ ...sorted[0] }];

    for (let i = 1; i < sorted.length; i++) {
        const r = sorted[i];
        let didMerge = false;
        for (let j = 0; j < merged.length; j++) {
            const m = merged[j];
            // 检查是否重叠或间距足够近
            const overlapX = m.minX - gap <= r.maxX && r.minX - gap <= m.maxX;
            const overlapY = m.minY - gap <= r.maxY && r.minY - gap <= m.maxY;
            if (overlapX && overlapY) {
                m.minX = Math.min(m.minX, r.minX);
                m.maxX = Math.max(m.maxX, r.maxX);
                m.minY = Math.min(m.minY, r.minY);
                m.maxY = Math.max(m.maxY, r.maxY);
                m.area += r.area;
                didMerge = true;
                break;
            }
        }
        if (!didMerge) {
            merged.push({ ...r });
        }
    }

    // 多次合并直到稳定
    if (merged.length < regions.length) {
        return mergeNearbyRegions(merged, gap);
    }
    return merged;
}

/**
 * 从边框区域推算内部矩形
 * 边框是环形的，内部矩形 = 向内收缩边框宽度
 */
function inferInnerRect(region, width, height, borderThickness) {
    const x = ((region.minX + borderThickness) / width) * 100;
    const y = ((region.minY + borderThickness) / height) * 100;
    const w = ((region.maxX - region.minX - 2 * borderThickness) / width) * 100;
    const h = ((region.maxY - region.minY - 2 * borderThickness) / height) * 100;
    return {
        x: Number(x.toFixed(2)),
        y: Number(y.toFixed(2)),
        w: Number(w.toFixed(2)),
        h: Number(h.toFixed(2)),
    };
}

/** 从边框像素估算边框厚度（取区域宽度的中间一行，统计连续匹配像素） */
function estimateBorderThickness(mask, region, width) {
    const midY = Math.floor((region.minY + region.maxY) / 2);
    // 从左边界向右扫描
    let thickness = 0;
    for (let x = region.minX; x <= region.maxX; x++) {
        if (mask[midY * width + x] === 1) {
            thickness++;
        } else {
            break;
        }
    }
    return Math.max(thickness, 2);
}

/** 采样指定区域的像素颜色分布（调试用） */
function sampleColors(png, regions) {
    const { width, data } = png;
    for (const { label, x1, y1, x2, y2 } of regions) {
        const colors = {};
        for (let y = y1; y <= y2; y++) {
            for (let x = x1; x <= x2; x++) {
                const idx = (y * width + x) * 4;
                const key = `${data[idx]},${data[idx+1]},${data[idx+2]}`;
                colors[key] = (colors[key] || 0) + 1;
            }
        }
        // 按频率排序取 top 15
        const sorted = Object.entries(colors).sort((a, b) => b[1] - a[1]).slice(0, 15);
        console.log(`\n[${label}] 区域 (${x1},${y1})-(${x2},${y2}) 采样:`);
        sorted.forEach(([color, count]) => {
            console.log(`  rgb(${color}) x${count}`);
        });
    }
}

// ========== 主逻辑 ==========

/**
 * 投影直方图法：
 * 1. 生成黄色 mask
 * 2. 对每列求和 → 垂直投影（找垂直边框线 x 坐标）
 * 3. 对每行求和 → 水平投影（找水平边框线 y 坐标）
 * 4. 用峰值交叉点确定矩形网格
 */

/** 在一维投影数据中找边框线位置（连续高密度段） */
function findBorderLines(projection, totalLength, minDensity, minRunLength) {
    const lines = []; // { start, end, center }
    let runStart = -1;
    for (let i = 0; i < projection.length; i++) {
        const density = projection[i] / totalLength;
        if (density >= minDensity) {
            if (runStart === -1) runStart = i;
        } else {
            if (runStart !== -1) {
                const runLen = i - runStart;
                if (runLen >= minRunLength) {
                    lines.push({ start: runStart, end: i - 1, center: Math.floor((runStart + i - 1) / 2) });
                }
                runStart = -1;
            }
        }
    }
    if (runStart !== -1) {
        const runLen = projection.length - runStart;
        if (runLen >= minRunLength) {
            lines.push({ start: runStart, end: projection.length - 1, center: Math.floor((runStart + projection.length - 1) / 2) });
        }
    }
    return lines;
}

/** 将边框线配对为矩形（贪心取最近的匹配） */
function pairLines(lines, minGap, maxGap, expectedGap) {
    const pairs = [];
    for (let i = 0; i < lines.length; i++) {
        let bestJ = -1;
        let bestDiff = Infinity;
        for (let j = i + 1; j < lines.length; j++) {
            const gap = lines[j].center - lines[i].center;
            if (gap >= minGap && gap <= maxGap) {
                const diff = Math.abs(gap - expectedGap);
                if (diff < bestDiff) {
                    bestDiff = diff;
                    bestJ = j;
                }
            }
        }
        if (bestJ !== -1) {
            pairs.push({ start: lines[i], end: lines[bestJ] });
        }
    }
    return pairs;
}

function main() {
    console.log('加载图片:', IMAGE_PATH);
    const png = loadImage(IMAGE_PATH);
    const { width, height } = png;
    console.log(`图片尺寸: ${width} x ${height}`);

    // 调试模式：采样边框区域的真实颜色
    if (process.argv.includes('--sample')) {
        sampleColors(png, [
            { label: 'fist左边框', x1: 0, y1: 143, x2: 20, y2: 173 },
            { label: 'fist上边框', x1: 100, y1: 43, x2: 200, y2: 63 },
            { label: 'fist右边框', x1: 662, y1: 143, x2: 682, y2: 173 },
            { label: 'fist下边框', x1: 100, y1: 1068, x2: 200, y2: 1088 },
            { label: 'chi左边框', x1: 740, y1: 200, x2: 760, y2: 230 },
            { label: 'chi上边框', x1: 850, y1: 28, x2: 950, y2: 48 },
        ]);
        return;
    }

    // Step 1: 生成黄色 mask
    console.log('\n--- Step 1: 生成黄色 mask ---');
    console.log(`色相: ${YELLOW_HUE_MIN}-${YELLOW_HUE_MAX}, 饱和度>=${YELLOW_SAT_MIN}, 亮度: ${YELLOW_LIGHT_MIN}-${YELLOW_LIGHT_MAX}`);
    const mask = createYellowMask(png);
    const totalPixels = mask.reduce((s, v) => s + v, 0);
    console.log(`匹配像素: ${totalPixels} (${(totalPixels / (width * height) * 100).toFixed(2)}%)`);

    // Step 2: 计算投影直方图
    console.log('\n--- Step 2: 计算投影直方图 ---');
    const xProjection = new Float64Array(width);  // 每列的黄色像素数
    const yProjection = new Float64Array(height); // 每行的黄色像素数
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (mask[y * width + x]) {
                xProjection[x]++;
                yProjection[y]++;
            }
        }
    }

    // 垂直边框线：某列至少 15% 的像素是黄色
    // 边框宽度至少 3px
    const vLines = findBorderLines(xProjection, height, 0.10, 3);
    console.log(`垂直边框线: ${vLines.length} 条`);
    vLines.forEach(l => {
        const pct = (l.center / width * 100).toFixed(2);
        const density = (xProjection[l.center] / height * 100).toFixed(1);
        console.log(`  x=${l.center} (${pct}%) 宽=${l.end - l.start + 1}px 密度=${density}%`);
    });

    // 水平边框线：某行至少 15% 的像素是黄色
    const hLines = findBorderLines(yProjection, width, 0.10, 3);
    console.log(`\n水平边框线: ${hLines.length} 条`);
    hLines.forEach(l => {
        const pct = (l.center / height * 100).toFixed(2);
        const density = (yProjection[l.center] / width * 100).toFixed(1);
        console.log(`  y=${l.center} (${pct}%) 高=${l.end - l.start + 1}px 密度=${density}%`);
    });

    // Step 3: 配对边框线为矩形
    console.log('\n--- Step 3: 配对边框线 ---');
    // 普通技能卡宽约 20-22% 图宽，高约 38-40% 图高
    const expectedCardW = width * 0.20;
    const expectedCardH = height * 0.38;
    const tolerance = 0.3; // 30% 容差

    const xPairs = pairLines(vLines, expectedCardW * (1 - tolerance), expectedCardW * (1 + tolerance), expectedCardW);
    const yPairs = pairLines(hLines, expectedCardH * (1 - tolerance), expectedCardH * (1 + tolerance), expectedCardH);
    console.log(`垂直配对: ${xPairs.length} 对 (期望卡宽 ${Math.round(expectedCardW)}px ±30%)`);
    console.log(`水平配对: ${yPairs.length} 对 (期望卡高 ${Math.round(expectedCardH)}px ±30%)`);

    // Step 4: 交叉配对生成矩形
    console.log('\n--- Step 4: 生成矩形 ---');
    const rects = [];
    for (const xp of xPairs) {
        for (const yp of yPairs) {
            // 验证这个矩形区域内确实有足够的黄色边框像素
            let borderPixels = 0;
            const x1 = xp.start.center;
            const x2 = xp.end.center;
            const y1 = yp.start.center;
            const y2 = yp.end.center;
            // 检查四条边
            for (let x = x1; x <= x2; x++) {
                if (mask[y1 * width + x]) borderPixels++;
                if (mask[y2 * width + x]) borderPixels++;
            }
            for (let y = y1; y <= y2; y++) {
                if (mask[y * width + x1]) borderPixels++;
                if (mask[y * width + x2]) borderPixels++;
            }
            const perimeter = 2 * (x2 - x1 + y2 - y1);
            const coverage = borderPixels / perimeter;
            if (coverage >= 0.25) {
                rects.push({ x1, y1, x2, y2, coverage });
            }
        }
    }
    console.log(`候选矩形: ${rects.length} 个 (边框覆盖率>=25%)`);

    // 去重：如果两个矩形大幅重叠，保留覆盖率高的
    rects.sort((a, b) => b.coverage - a.coverage);
    const finalRects = [];
    for (const r of rects) {
        const overlaps = finalRects.some(f => {
            const overlapX = Math.max(0, Math.min(r.x2, f.x2) - Math.max(r.x1, f.x1));
            const overlapY = Math.max(0, Math.min(r.y2, f.y2) - Math.max(r.y1, f.y1));
            const overlapArea = overlapX * overlapY;
            const rectArea = (r.x2 - r.x1) * (r.y2 - r.y1);
            return overlapArea / rectArea > 0.5;
        });
        if (!overlaps) finalRects.push(r);
    }

    // 按位置排序（上→下，左→右）
    finalRects.sort((a, b) => {
        if (Math.abs(a.y1 - b.y1) < height * 0.1) return a.x1 - b.x1;
        return a.y1 - b.y1;
    });

    // 输出结果
    console.log(`\n========== 检测结果 (${finalRects.length} 个普通技能槽) ==========\n`);
    const results = [];
    finalRects.forEach((r, i) => {
        const rect = {
            x: Number((r.x1 / width * 100).toFixed(2)),
            y: Number((r.y1 / height * 100).toFixed(2)),
            w: Number(((r.x2 - r.x1) / width * 100).toFixed(2)),
            h: Number(((r.y2 - r.y1) / height * 100).toFixed(2)),
        };
        const id = i < SLOT_IDS.length ? SLOT_IDS[i] : `slot_${i}`;
        console.log(`[${id}] 像素: (${r.x1},${r.y1})-(${r.x2},${r.y2}) 覆盖率=${(r.coverage * 100).toFixed(1)}%`);
        console.log(`         百分比: x=${rect.x}% y=${rect.y}% w=${rect.w}% h=${rect.h}%`);
        results.push({ id, ...rect });
    });

    // 大招检测：用水平投影找图片底部的边框线
    // 大招在 y>81% 区域，水平边框线 y=2183(81.46%) 和 y=2257~更低
    console.log('\n--- 大招检测 ---');
    // 从水平线中找 y>80% 的线作为大招上边界
    const ultTopLine = hLines.find(l => l.center / height > 0.80 && l.center / height < 0.86);
    // 大招下边界 = 图片底部
    // 大招左边界 = 图片左侧，右边界约 55% 图宽
    if (ultTopLine) {
        const ultY = ultTopLine.center;
        const ultX = 0;
        const ultW = Math.round(width * 0.55); // 大招宽度约 55%
        const ultH = height - ultY;
        const rect = {
            x: Number((ultX / width * 100).toFixed(2)),
            y: Number((ultY / height * 100).toFixed(2)),
            w: Number((ultW / width * 100).toFixed(2)),
            h: Number((ultH / height * 100).toFixed(2)),
        };
        console.log(`[ultimate] 像素: (${ultX},${ultY})-(${ultX + ultW},${height}) 上边框y=${ultTopLine.center}`);
        console.log(`           百分比: x=${rect.x}% y=${rect.y}% w=${rect.w}% h=${rect.h}%`);
        results.push({ id: ULTIMATE_ID, ...rect });
    } else {
        console.log('未检测到大招上边框线，使用默认值');
        results.push({ id: ULTIMATE_ID, x: 0.10, y: 83.50, w: 55, h: 15.60 });
    }

    // 输出可直接粘贴的 TS 代码
    console.log('\n========== 可粘贴的布局代码 ==========\n');
    console.log('export const DEFAULT_ABILITY_SLOT_LAYOUT: AbilitySlotLayoutItem[] = [');
    results.forEach(r => {
        console.log(`    { id: '${r.id}', x: ${r.x}, y: ${r.y}, w: ${r.w}, h: ${r.h} },`);
    });
    console.log('];');
}

main();
