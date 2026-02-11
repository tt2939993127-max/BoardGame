/**
 * 大杀四方 (Smash Up) - 游戏适配器组装
 */

import type { ActionLogEntry, ActionLogSegment, Command, GameEvent, MatchState } from '../../engine/types';
import type { EngineSystem } from '../../engine/systems/types';
import {
    createGameAdapter,
    createFlowSystem,
    createCheatSystem,
    createActionLogSystem,
    createEventStreamSystem,
    createLogSystem,
    createPromptSystem,
    createRematchSystem,
    createResponseWindowSystem,
    createTutorialSystem,
    createUndoSystem,
    CHEAT_COMMANDS,
    FLOW_COMMANDS,
} from '../../engine';
import { PROMPT_COMMANDS } from '../../engine/systems/PromptSystem';
import { SmashUpDomain, SU_COMMANDS, type SmashUpCommand, type SmashUpCore, type SmashUpEvent } from './domain';
import { smashUpFlowHooks } from './domain/index';
import { initAllAbilities } from './abilities';
import { createSmashUpPromptBridge } from './domain/systems';
import { smashUpCheatModifier } from './cheatModifier';
import { registerCardPreviewGetter } from '../../components/game/cardPreviewRegistry';
import { getSmashUpCardPreviewMeta, getSmashUpCardPreviewRef } from './ui/cardPreviewHelper';
import { registerCriticalImageResolver } from '../../core';
import { smashUpCriticalImageResolver } from './criticalImageResolver';
import { getCardDef, getBaseDef } from './data/cards';
import type { SmashUpCore as Core } from './domain/types';

// 注册所有派系能力
initAllAbilities();

// ============================================================================
// ActionLog 白名单 + 格式化
// ============================================================================

/** 需要记录日志的命令白名单 */
const ACTION_ALLOWLIST = [
    SU_COMMANDS.PLAY_MINION,
    SU_COMMANDS.PLAY_ACTION,
    SU_COMMANDS.USE_TALENT,
    SU_COMMANDS.DISCARD_TO_LIMIT,
    FLOW_COMMANDS.ADVANCE_PHASE,
] as const;

/** 构建卡牌片段（支持 hover 预览） */
const buildCardSegment = (cardId?: string): ActionLogSegment | null => {
    if (!cardId) return null;
    const meta = getSmashUpCardPreviewMeta(cardId);
    if (meta?.previewRef) {
        return { type: 'card', cardId, previewText: meta.name };
    }
    if (meta?.name) {
        return { type: 'text', text: meta.name };
    }
    return { type: 'text', text: cardId };
};

/** 在前缀文本后追加卡牌片段 */
const withCardSegments = (prefix: string, cardId?: string): ActionLogSegment[] => {
    const segments: ActionLogSegment[] = [{ type: 'text', text: prefix }];
    const cardSeg = buildCardSegment(cardId);
    if (cardSeg) segments.push(cardSeg);
    return segments;
};

/**
 * SmashUp 操作日志格式化
 */
function formatSmashUpActionEntry({
    command,
    state: _state,
    events,
}: {
    command: Command;
    state: MatchState<unknown>;
    events: GameEvent[];
}): ActionLogEntry | null {
    const timestamp = typeof command.timestamp === 'number' ? command.timestamp : 0;
    const actorId = command.playerId;

    switch (command.type) {
        case SU_COMMANDS.PLAY_MINION: {
            const payload = command.payload as { cardUid?: string; baseIndex?: number };
            // 从事件中获取 defId（更可靠）
            const minionEvent = [...events].reverse().find(
                e => e.type === 'su:minion_played'
            ) as { payload?: { defId?: string; baseIndex?: number } } | undefined;
            const defId = minionEvent?.payload?.defId ?? payload?.cardUid;
            const baseDef = minionEvent?.payload?.baseIndex !== undefined
                ? findBaseByIndex(_state as MatchState<Core>, minionEvent.payload.baseIndex)
                : undefined;
            const segments = withCardSegments('打出随从：', defId);
            if (baseDef) {
                segments.push({ type: 'text', text: ` → ${baseDef}` });
            }
            return { id: `${command.type}-${actorId}-${timestamp}`, timestamp, actorId, kind: command.type, segments };
        }

        case SU_COMMANDS.PLAY_ACTION: {
            const actionEvent = [...events].reverse().find(
                e => e.type === 'su:action_played'
            ) as { payload?: { defId?: string } } | undefined;
            const defId = actionEvent?.payload?.defId ?? (command.payload as { cardUid?: string })?.cardUid;
            return {
                id: `${command.type}-${actorId}-${timestamp}`,
                timestamp,
                actorId,
                kind: command.type,
                segments: withCardSegments('打出行动卡：', defId),
            };
        }

        case SU_COMMANDS.USE_TALENT: {
            const talentEvent = [...events].reverse().find(
                e => e.type === 'su:talent_used'
            ) as { payload?: { defId?: string } } | undefined;
            const defId = talentEvent?.payload?.defId ?? (command.payload as { minionUid?: string })?.minionUid;
            return {
                id: `${command.type}-${actorId}-${timestamp}`,
                timestamp,
                actorId,
                kind: command.type,
                segments: withCardSegments('使用天赋：', defId),
            };
        }

        case SU_COMMANDS.DISCARD_TO_LIMIT: {
            const payload = command.payload as { cardUids?: string[] };
            const count = payload?.cardUids?.length ?? 0;
            return {
                id: `${command.type}-${actorId}-${timestamp}`,
                timestamp,
                actorId,
                kind: command.type,
                segments: [{ type: 'text', text: `弃牌至手牌上限（${count}张）` }],
            };
        }

        default:
            return null;
    }
}

/** 根据基地索引查找基地名称 */
function findBaseByIndex(state: MatchState<Core>, baseIndex: number): string | undefined {
    const core = state.core;
    const base = core.bases?.[baseIndex];
    if (!base) return undefined;
    const baseDef = getBaseDef(base.defId);
    return baseDef?.name;
}

// ============================================================================
// 系统组装（展开 createDefaultSystems，替换 ActionLogSystem 为带配置版本）
// ============================================================================

const systems: EngineSystem<SmashUpCore>[] = [
    createFlowSystem<SmashUpCore>({ hooks: smashUpFlowHooks }),
    createLogSystem(),
    createActionLogSystem<SmashUpCore>({
        commandAllowlist: ACTION_ALLOWLIST,
        formatEntry: formatSmashUpActionEntry,
    }),
    createUndoSystem({ snapshotCommandAllowlist: ACTION_ALLOWLIST }),
    createPromptSystem(),
    createRematchSystem(),
    createResponseWindowSystem(),
    createTutorialSystem(),
    createEventStreamSystem(),
    createSmashUpPromptBridge(),
    createCheatSystem<SmashUpCore>(smashUpCheatModifier),
];

export const SmashUp = createGameAdapter<SmashUpCore, SmashUpCommand, SmashUpEvent>({
    domain: SmashUpDomain,
    systems,
    minPlayers: 2,
    maxPlayers: 4,
    commandTypes: [
        ...Object.values(SU_COMMANDS),
        'RESPONSE_PASS',
        PROMPT_COMMANDS.RESPOND,
        CHEAT_COMMANDS.SET_RESOURCE,
        CHEAT_COMMANDS.DEAL_CARD_BY_INDEX,
        CHEAT_COMMANDS.SET_STATE,
        CHEAT_COMMANDS.MERGE_STATE,
    ],
});

export default SmashUp;

// ============================================================================
// 卡牌预览注册（放文件末尾，避免 Vite SSR 函数提升陷阱）
// ============================================================================
registerCardPreviewGetter('smashup', getSmashUpCardPreviewRef);
registerCriticalImageResolver('smashup', smashUpCriticalImageResolver);
