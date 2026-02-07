/**
 * 大杀四方 (Smash Up) - 命令验证
 */

import type { MatchState, ValidationResult } from '../../../engine/types';
import type { SmashUpCommand, SmashUpCore } from './types';
import { SU_COMMANDS, getCurrentPlayerId, HAND_LIMIT } from './types';
import { getCardDef } from '../data/cards';

export function validate(
    state: MatchState<SmashUpCore>,
    command: SmashUpCommand
): ValidationResult {
    const core = state.core;
    const currentPlayerId = getCurrentPlayerId(core);
    const phase = state.sys.phase;

    switch (command.type) {
        case SU_COMMANDS.PLAY_MINION: {
            if (phase !== 'playCards') {
                return { valid: false, error: '只能在出牌阶段打出随从' };
            }
            if (command.playerId !== currentPlayerId) {
                return { valid: false, error: '不是你的回合' };
            }
            const player = core.players[command.playerId];
            if (!player) return { valid: false, error: '玩家不存在' };
            if (player.minionsPlayed >= player.minionLimit) {
                return { valid: false, error: '本回合随从额度已用完' };
            }
            const card = player.hand.find(c => c.uid === command.payload.cardUid);
            if (!card) return { valid: false, error: '手牌中没有该卡牌' };
            if (card.type !== 'minion') return { valid: false, error: '该卡牌不是随从' };
            const { baseIndex } = command.payload;
            if (baseIndex < 0 || baseIndex >= core.bases.length) {
                return { valid: false, error: '无效的基地索引' };
            }
            return { valid: true };
        }

        case SU_COMMANDS.PLAY_ACTION: {
            if (phase !== 'playCards') {
                return { valid: false, error: '只能在出牌阶段打出行动卡' };
            }
            if (command.playerId !== currentPlayerId) {
                return { valid: false, error: '不是你的回合' };
            }
            const player = core.players[command.playerId];
            if (!player) return { valid: false, error: '玩家不存在' };
            if (player.actionsPlayed >= player.actionLimit) {
                return { valid: false, error: '本回合行动额度已用完' };
            }
            const card = player.hand.find(c => c.uid === command.payload.cardUid);
            if (!card) return { valid: false, error: '手牌中没有该卡牌' };
            if (card.type !== 'action') return { valid: false, error: '该卡牌不是行动卡' };
            const def = getCardDef(card.defId);
            if (!def) return { valid: false, error: '卡牌定义不存在' };
            return { valid: true };
        }

        case SU_COMMANDS.DISCARD_TO_LIMIT: {
            if (phase !== 'draw') {
                return { valid: false, error: '只能在抽牌阶段弃牌' };
            }
            if (command.playerId !== currentPlayerId) {
                return { valid: false, error: '不是你的回合' };
            }
            const player = core.players[command.playerId];
            if (!player) return { valid: false, error: '玩家不存在' };
            const excess = player.hand.length - HAND_LIMIT;
            if (excess <= 0) return { valid: false, error: '手牌未超过上限' };
            if (command.payload.cardUids.length !== excess) {
                return { valid: false, error: `需要弃掉 ${excess} 张牌` };
            }
            const handUids = new Set(player.hand.map(c => c.uid));
            for (const uid of command.payload.cardUids) {
                if (!handUids.has(uid)) {
                    return { valid: false, error: `手牌中不存在 uid=${uid}` };
                }
            }
            return { valid: true };
        }

        default:
            return { valid: false, error: '未知命令' };
    }
}
