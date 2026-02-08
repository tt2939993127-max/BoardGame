/**
 * 大杀四方 - 蒸汽朋克派系能力
 *
 * 主题：战术卡（行动卡）复用、从弃牌堆取回行动卡
 */

import { registerAbility } from '../domain/abilityRegistry';
import type { AbilityContext, AbilityResult } from '../domain/abilityRegistry';
import { recoverCardsFromDiscard } from '../domain/abilityHelpers';

/** 注册蒸汽朋克派系所有能力 */
export function registerSteampunkAbilities(): void {
    // 废物利用（行动卡）：从弃牌堆取回一张行动卡到手牌
    registerAbility('steampunk_scrap_diving', 'onPlay', steampunkScrapDiving);
}

/** 废物利用 onPlay：从弃牌堆取回一张行动卡到手牌（MVP：自动取第一张） */
function steampunkScrapDiving(ctx: AbilityContext): AbilityResult {
    const player = ctx.state.players[ctx.playerId];
    // 找弃牌堆中的行动卡（排除刚打出的自己）
    const actionInDiscard = player.discard.find(
        c => c.type === 'action' && c.uid !== ctx.cardUid
    );
    if (!actionInDiscard) return { events: [] };

    return {
        events: [recoverCardsFromDiscard(
            ctx.playerId, [actionInDiscard.uid],
            'steampunk_scrap_diving', ctx.now
        )],
    };
}

// TODO: steampunk_steam_queen (ongoing) - 己方战术不受对手影响（需要 ongoing 效果系统）
// TODO: steampunk_mechanic (onPlay) - 从弃牌堆打出持续行动卡（需要 Prompt + 额外行动）
// TODO: steampunk_steam_man (ongoing) - 按基地上己方行动卡数+力量（需要 ongoing 力量修正）
// TODO: steampunk_captain_ahab (talent) - 移动到有己方行动卡的基地（需要 Prompt 选基地）
// TODO: steampunk_ornate_dome (ongoing) - 禁止对手打行动卡（需要 ongoing 效果系统）
// TODO: steampunk_aggromotive (ongoing) - 有随从时+5力量（需要 ongoing 力量修正）
// TODO: steampunk_zeppelin (ongoing+talent) - 移动随从（需要 Prompt）
// TODO: steampunk_change_of_venue (action) - 取回行动卡再打出（需要 Prompt）
// TODO: steampunk_rotary_slug_thrower (ongoing) - 己方随从+2力量（需要 ongoing 力量修正）
// TODO: steampunk_difference_engine (ongoing) - 回合结束多抽牌（需要 onTurnEnd 触发）
// TODO: steampunk_escape_hatch (ongoing) - 随从被消灭时回手牌（需要 onDestroy 触发）
