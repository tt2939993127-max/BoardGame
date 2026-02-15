import type { PlayerId, RandomFn } from '../../../engine/types';
import type { CardInstance, PlayerState, SmashUpCore, MinionOnBase } from './types';
import { getFactionCards } from '../data/cards';

// ============================================================================
// 微型机判断
// ============================================================================

/** 微型机 defId 集合（原始定义） */
export const MICROBOT_DEF_IDS = new Set([
    'robot_microbot_guard', 'robot_microbot_fixer', 'robot_microbot_reclaimer',
    'robot_microbot_archive', 'robot_microbot_alpha',
]);

/**
 * 判断一个随从是否算作微型机
 *
 * 规则：robot_microbot_alpha 的持续效果"你的所有随从均视为微型机"
 * - alpha 在场时，同控制者的所有随从都算微型机
 * - alpha 不在场时，只有原始微型机 defId 才算
 */
export function isMicrobot(state: SmashUpCore, minion: MinionOnBase): boolean {
    if (MICROBOT_DEF_IDS.has(minion.defId)) return true;
    // 检查同控制者的 alpha 是否在场
    for (const base of state.bases) {
        if (base.minions.some(m => m.defId === 'robot_microbot_alpha' && m.controller === minion.controller)) {
            return true;
        }
    }
    return false;
}

/**
 * 判断一个弃牌堆中的卡是否算作微型机（用于回收等场景）
 * alpha 在场时所有己方随从卡都算微型机
 */
export function isDiscardMicrobot(state: SmashUpCore, card: CardInstance, playerId: PlayerId): boolean {
    if (card.type !== 'minion') return false;
    if (MICROBOT_DEF_IDS.has(card.defId)) return true;
    // 检查该玩家的 alpha 是否在场
    for (const base of state.bases) {
        if (base.minions.some(m => m.defId === 'robot_microbot_alpha' && m.controller === playerId)) {
            return true;
        }
    }
    return false;
}

/** 将派系卡牌定义展开为卡牌实例列表 */
export function buildDeck(
    factions: [string, string],
    owner: PlayerId,
    startUid: number,
    random: RandomFn
): { deck: CardInstance[]; nextUid: number } {
    const cards: CardInstance[] = [];
    let uid = startUid;
    for (const factionId of factions) {
        const defs = getFactionCards(factionId);
        for (const def of defs) {
            for (let i = 0; i < def.count; i++) {
                cards.push({
                    uid: `c${uid++}`,
                    defId: def.id,
                    type: def.type,
                    owner,
                });
            }
        }
    }
    return { deck: random.shuffle(cards), nextUid: uid };
}

/** 从牌库顶部抽牌 */
export function drawCards(
    player: PlayerState,
    count: number,
    random: RandomFn
): {
    hand: CardInstance[];
    deck: CardInstance[];
    discard: CardInstance[];
    drawnUids: string[];
    reshuffledDeckUids?: string[];
} {
    let deck = [...player.deck];
    let discard = [...player.discard];
    const drawn: CardInstance[] = [];
    let reshuffledDeckUids: string[] | undefined;

    for (let i = 0; i < count; i++) {
        if (deck.length === 0 && discard.length > 0) {
            deck = random.shuffle([...discard]);
            discard = [];
            if (!reshuffledDeckUids) {
                reshuffledDeckUids = deck.map(card => card.uid);
            }
        }
        if (deck.length === 0) break;
        drawn.push(deck[0]);
        deck = deck.slice(1);
    }

    return {
        hand: [...player.hand, ...drawn],
        deck,
        discard,
        drawnUids: drawn.map(c => c.uid),
        reshuffledDeckUids,
    };
}
