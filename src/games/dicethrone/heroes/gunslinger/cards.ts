/**
 * Gunslinger (枪手) 卡牌定义
 * 
 * 基于 OCR 识别结果录入，来源：player-board.webp
 * 
 * 卡牌布局（4行x2列）：
 * 第1行：左轮手枪、槍戰決鬥
 * 第2行：（左轮手枪效果详情）、（枪战决斗效果详情）
 * 第3行：快速拔枪+掩护射击、左轮速射+对决
 * 第4行：枪林弹雨（终极招式）、（枪林弹雨+对决效果详情）
 */

import type { AbilityCard } from '../../types';
import type { RandomFn } from '../../../../engine/types';

/**
 * Gunslinger 卡牌定义
 * 
 * 注意：
 * - 所有卡牌的 cpCost 需要从原图确认（OCR 无法识别图标）
 * - 卡牌数量需要从完整牌库配置确认
 * - 当前基于 player-board.webp 的 OCR 结果录入
 */
export const GUNSLINGER_CARDS: AbilityCard[] = [
    // ========== 基础攻击卡 ==========
    
    /**
     * 左轮手枪（Revolver）
     * 
     * OCR 识别结果：
     * - 第1行第1列：左輪手槍、賞金獵人
     * - 第2行第1列：造成 3/4/5 傷害，造成賞金效果，再造成 1 不可防禦傷害
     * 
     * 实际包含两个技能：
     * 1. 左轮手枪：3/4/5个子弹 → 3/4/5伤害
     * 2. 赏金猎人：2子弹+2准心 → 赏金效果+1不可防御伤害
     */
    {
        id: 'card-revolver',
        name: '左轮手枪', // Revolver
        abilityIds: ['revolver', 'bounty-hunter'],
        cpCost: 0, // TODO: 从原图确认
        count: 1, // TODO: 从完整牌库配置确认
    },
    
    // ========== 主动技能卡 ==========
    
    /**
     * 枪战决斗（Gunfight Duel）+ 死亡之眼（Deaths Eye）
     * 
     * OCR 识别结果：
     * - 第1行第2列：槍戰決鬥、死亡之眼
     * - 第2行第2列：小顺-4颗連續骰數，造成击倒效果，比较骰点大小，造成 5/6/7 伤害
     * 
     * 实际包含两个技能：
     * 1. 枪战决斗：小顺-4 → 对决掷骰，胜利7伤害/失败5伤害
     * 2. 死亡之眼：4准心 → 击倒+6不可防御伤害
     */
    {
        id: 'card-gunfight-duel',
        name: '槍戰決鬥', // Gunfight Duel
        abilityIds: ['gunfight-duel', 'deaths-eye'],
        cpCost: 0, // TODO: 从原图确认
        count: 1, // TODO: 从完整牌库配置确认
    },
    
    /**
     * 快速拔枪（Quick Draw）+ 掩护射击（Covering Fire）
     * 
     * OCR 识别结果：
     * - 第3行第1列：快速拔槍、掩護射擊、被動技能
     * - 在你的維持階段期間，獲得裝填彈藥指示物
     * - 獲得閃避指示物，造成5傷害
     * 
     * 实际包含两个技能：
     * 1. 快速拔枪（被动）：维持阶段 → 获得装填弹药
     * 2. 掩护射击：2子弹+3冲刺 → 闪避+5伤害
     */
    {
        id: 'card-quick-draw',
        name: '快速拔槍', // Quick Draw
        abilityIds: ['quick-draw', 'covering-fire'],
        cpCost: 0, // TODO: 从原图确认
        count: 1, // TODO: 从完整牌库配置确认
    },
    
    /**
     * 左轮速射（Rapid Fire）+ 对决（Duel）
     * 
     * OCR 识别结果：
     * - 第3行第2列：左輪速射、對决、大順-5顆連續骰數
     * - 擲1顆骰子，獲得2個閃避指示物，擲骰防禦階段你與攻擊方
     * 
     * 实际包含两个技能：
     * 1. 左轮速射：大顺-5 → 2闪避+7伤害
     * 2. 对决（防御）：掷1骰对决，胜利选择3不可防御伤害或抵挡½伤害，失败1不可防御伤害
     */
    {
        id: 'card-rapid-fire',
        name: '左輪速射', // Rapid Fire
        abilityIds: ['rapid-fire', 'duel'],
        cpCost: 0, // TODO: 从原图确认（OCR识别到"大順-5顆"，可能是CP消耗）
        count: 1, // TODO: 从完整牌库配置确认
    },
    
    // ========== 终极招式卡 ==========
    
    /**
     * 枪林弹雨（Bullet Storm）- 终极招式
     * 
     * OCR 识别结果：
     * - 第4行第1列+第2列：槍林彈雨、終極招式
     * - 獲得閃避指示物，造成賞金效果與擊倒
     * - 如果你花費一個装填彈藥指示物來增加傷害的話，你可以重擲此骰一次
     * - 然後再造成 10 不可防禦傷害
     * - 對手僅可以改變骰子來阻止玩家的終極招式，除此之外，任何對手都不能使用任意類型的行動來改變、避免或取消此技能，直到此技能被完整執行
     * 
     * 终极招式特性：
     * - 5准心触发
     * - 闪避+赏金+击倒+10不可防御伤害
     * - 可花费装填弹药重掷
     * - 对手只能改变骰子阻止，不能用其他行动干扰
     */
    {
        id: 'card-bullet-storm',
        name: '槍林彈雨', // Bullet Storm
        abilityIds: ['bullet-storm'],
        cpCost: 0, // TODO: 从原图确认
        count: 1, // TODO: 从完整牌库配置确认
        tags: ['ultimate'], // 终极招式标记
    },
];

/**
 * 获取枪手的起始牌库（洗牌后）
 * 
 * TODO: 确认起始牌库配置
 * - 每张卡的数量
 * - 是否有升级卡（如 Revolver II）
 * - 总卡牌数量
 */
export function getGunslingerStartingDeck(random: RandomFn): AbilityCard[] {
    const deck = [...GUNSLINGER_CARDS];
    return random.shuffle(deck);
}
