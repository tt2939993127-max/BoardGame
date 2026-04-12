/**
 * Smash Up 持续效果与触发系统
 *
 * 统一管理：
 * - 保护（protection）/ 限制（restriction）
 * - 触发器（trigger）/ 事件拦截（interceptor）
 * - 压制（suppression）语义过滤
 *
 * 备注：本文件曾出现注释编码污染，已清理为可读版本。
 */

import type { PlayerId, RandomFn, MatchState } from '../../../engine/types';
import type {
    ActiveDuel,
    DuelOutcomeKind,
    SmashUpCore,
    SmashUpEvent,
    MinionOnBase,
    TriggerInstance,
    TriggerQueuedEvent,
    PlayerTurnRestrictionType,
} from './types';
import { SU_EVENTS } from './types';
import { registerTriggerExecutor } from './triggerExecutors';
import { getBaseDef, getTitanDef } from '../data/cards';
import { matchesDefId, mustUseBaseLimitedMinionQuota } from './utils';

// ============================================================================

// ============================================================================


export type ProtectionType =
    | 'destroy'
    | 'move'
    | 'affect'
    | 'action';


export type BaseAbilitySuppressionChecker = (state: SmashUpCore, baseIndex: number) => boolean;


export interface ProtectionCheckContext {
    state: SmashUpCore;

    targetMinion: MinionOnBase;

    targetBaseIndex: number;

    sourcePlayerId: PlayerId;

    protectionType: ProtectionType;
}


export type ProtectionChecker = (ctx: ProtectionCheckContext) => boolean;


export type RestrictionType =
    | 'play_minion'
    | 'play_action';


export interface RestrictionCheckContext {
    state: SmashUpCore;

    baseIndex: number;

    playerId: PlayerId;

    restrictionType: RestrictionType;

    extra?: Record<string, unknown>;
}


export type RestrictionChecker = (ctx: RestrictionCheckContext) => boolean;


/** 事件拦截器：可替换/过滤事件，返回 null/undefined 表示吞掉。 */
export type EventInterceptor = (
    state: SmashUpCore,
    event: SmashUpEvent
) => SmashUpEvent | SmashUpEvent[] | null | undefined;


export type TriggerTiming =
    | 'onDuelStarted'
    | 'onDuelResolved'
    | 'onMinionPlayed'
    | 'onActionPlayed'
    | 'onCardsDiscarded'
    | 'onCardBuried'
    | 'onBuriedCardUncovered'
    | 'onBaseRevealed'
    | 'onMinionDestroyed'
    | 'onMinionMoved'
    | 'onCardReturnedToHand'
    | 'onDeckInspected'
    | 'onMinionAffected'
    | 'onMinionDiscardedFromBase'
    | 'onTurnEnd'
    | 'onTurnStart'
    | 'beforeScoring'
    | 'afterScoring';


export type TitanAwareTriggerTiming = TriggerTiming | 'whenScoring' | 'onTitanMoved';

export type AffectType =
    | 'destroy'
    | 'move'
    | 'return'
    | 'power_change'
    | 'attach_action'
    | 'control_change'
    | 'cancel_ability'
    | 'shuffle_into_deck';


export interface TriggerContext {
    state: SmashUpCore;
    /** 完整的 match 状态，用于触发器创建交互 */
    matchState?: MatchState<SmashUpCore>;
    timing: TitanAwareTriggerTiming;
    /** 具体触发来源实例 uid */
    sourceCardUid?: string;
    /** 触发来源所在基地 */
    sourceBaseIndex?: number;
    /** 触发来源控制者 */
    sourceControllerId?: PlayerId;
    /** 事件关联玩家 */
    playerId: PlayerId;
    /** 事件关联基地 */
    baseIndex?: number;
    /** 决斗上下文（onDuelStarted / onDuelResolved） */
    duel?: ActiveDuel;
    duelSourceId?: string;
    duelOutcome?: DuelOutcomeKind;
    duelChallenger?: MinionOnBase;
    duelChallenged?: MinionOnBase;
    duelWinner?: MinionOnBase;
    duelLoser?: MinionOnBase;
    duelTie?: boolean;
    /** onMinionMoved 时：移动前基地 */
    moveFromBaseIndex?: number;
    /** onMinionMoved 时：移动后基地 */
    moveToBaseIndex?: number;
    /** 触发相关随从 */
    triggerMinion?: MinionOnBase;
    /** 触发相关随从 UID */
    triggerMinionUid?: string;
    /** 触发相关随从 defId */
    triggerMinionDefId?: string;
    /** 触发相关随从力量（用于队列与日志） */
    triggerMinionPower?: number;
    /** 消灭者（仅 onMinionDestroyed） */
    destroyerId?: PlayerId;
    /** 事件原因 */
    reason?: string;
    /** 影响类型（仅 onMinionAffected） */
    affectType?: AffectType;
    /** 基地计分排名（仅 afterScoring） */
    rankings?: { playerId: PlayerId; power: number; vp: number }[];
    /** 触发瞬间该基地上仍在场的控制者快照（供 afterScoring 触发器在后续交互链中使用） */
    triggerBaseControllersAtTrigger?: PlayerId[];
    /** 埋葬/翻开相关卡牌 UID */
    buriedCardUid?: string;
    /** 埋葬/翻开相关卡牌 defId */
    buriedCardDefId?: string;
    /** 埋葬/翻开相关卡牌控制者 */
    buriedCardControllerId?: PlayerId;
    /** 埋葬来源 */
    buriedFrom?: 'hand' | 'discard' | 'play' | 'deck';
    /** onActionPlayed 时：行动牌目标基地 */
    actionTargetBaseIndex?: number;
    /** onActionPlayed 时：行动牌目标类型 */
    actionTargetType?: 'base' | 'minion';
    /** onActionPlayed 时：行动牌目标随从 */
    actionTargetMinionUid?: string;
    /** REVEAL_HAND / REVEAL_DECK_TOP / onDeckInspected 时：暴露卡牌 */
    inspectionCards?: Array<{ uid: string; defId: string }>;
    /** REVEAL_HAND / REVEAL_DECK_TOP / onDeckInspected 时：暴露区域 */
    inspectionZone?: 'deck' | 'hand';
    /** REVEAL_HAND / REVEAL_DECK_TOP / onDeckInspected 时：被查看玩家 */
    inspectionTargetPlayerIds?: PlayerId[];
    /** REVEAL_HAND / REVEAL_DECK_TOP / onDeckInspected 时：实际查看者 */
    inspectionCausePlayerId?: PlayerId;
    random: RandomFn;
    now: number;
    /** 同一次 fireTriggers 调用内共享的临时状态（用于跨实例去重等） */
    triggerSharedState?: Record<string, unknown>;
}


export interface TriggerResult {
    events: SmashUpEvent[];

    matchState?: MatchState<SmashUpCore>;
}


export type TriggerCallback = (ctx: TriggerContext) => SmashUpEvent[] | TriggerResult;

// ============================================================================

// ============================================================================

interface ProtectionEntry {

    sourceDefId: string;
    protectionType: ProtectionType;
    checker: ProtectionChecker;

    consumable?: boolean;
}

interface RestrictionEntry {
    sourceDefId: string;
    restrictionType: RestrictionType;
    checker: RestrictionChecker;
}

interface TriggerEntry {
    sourceDefId: string;
    timing: TitanAwareTriggerTiming;
    callback: TriggerCallback;
    optional?: boolean;
    phase?: 'replacement' | 'reaction';
    playerContext?: 'eventPlayer' | 'sourceController';
    baseScoped?: boolean;

    perInstance?: boolean;

    sourceScope?: 'any' | 'triggerBase';
    /**
     * Global triggers bypass the "source must be in play" witness check.
     * Use for Special cards that can be played from hand/discard when a condition happens.
     */
    global?: boolean;

    globalZones?: Array<'hand' | 'discard' | 'deck'>;
}

interface TriggerSourceLocation {
    uid?: string;
    baseIndex?: number;
    controllerId?: PlayerId;
    titanUid?: string;
}

interface InterceptorEntry {
    sourceDefId: string;
    interceptor: EventInterceptor;
}

// ============================================================================
// 濠电偛顦崝宀勫船閻ｅ本鍋?
// ============================================================================

const protectionRegistry: ProtectionEntry[] = [];
const restrictionRegistry: RestrictionEntry[] = [];
const triggerRegistry: TriggerEntry[] = [];
const interceptorRegistry: InterceptorEntry[] = [];
const baseAbilitySuppressionRegistry: { sourceDefId: string; checker: BaseAbilitySuppressionChecker }[] = [];


export function registerProtection(
    sourceDefId: string,
    protectionType: ProtectionType,
    checker: ProtectionChecker,
    options?: { consumable?: boolean }
): void {

    if (protectionRegistry.some(e => e.sourceDefId === sourceDefId && e.protectionType === protectionType)) return;
    protectionRegistry.push({ sourceDefId, protectionType, checker, consumable: options?.consumable });
}


export function registerRestriction(
    sourceDefId: string,
    restrictionType: RestrictionType,
    checker: RestrictionChecker
): void {

    if (restrictionRegistry.some(e => e.sourceDefId === sourceDefId && e.restrictionType === restrictionType)) return;
    restrictionRegistry.push({ sourceDefId, restrictionType, checker });
}

/** 濠电偛顦崝宀勫船閻ｅ本鍠嗛柨鏇楀亾鐟滄澘鍊块獮蹇涙晜閽樺鍔甸梺?*/
export function registerTrigger(
    sourceDefId: string,
    timing: TitanAwareTriggerTiming,
    callback: TriggerCallback,
    options?: {
        optional?: boolean;
        phase?: 'replacement' | 'reaction';
        global?: boolean;
        globalZones?: Array<'hand' | 'discard' | 'deck'>;
        playerContext?: 'eventPlayer' | 'sourceController';
        baseScoped?: boolean;
        perInstance?: boolean;
        sourceScope?: 'any' | 'triggerBase';
    }
): void {

    if (triggerRegistry.some(e => e.sourceDefId === sourceDefId && e.timing === timing)) return;
    triggerRegistry.push({
        sourceDefId,
        timing,
        callback,
        optional: options?.optional,
        phase: options?.phase ?? 'reaction',
        perInstance: options?.perInstance,
        sourceScope: options?.sourceScope ?? 'any',
        global: options?.global,
        globalZones: options?.globalZones,
        playerContext: options?.playerContext ?? 'eventPlayer',
        baseScoped: options?.baseScoped ?? true,
    });
    registerTriggerExecutor(sourceDefId, timing, callback);
}

function locateSources(state: SmashUpCore, sourceDefId: string): TriggerSourceLocation[] {
    const locations: TriggerSourceLocation[] = [];
    for (let i = 0; i < state.bases.length; i++) {
        const base = state.bases[i];
        if (base.defId === sourceDefId) locations.push({ baseIndex: i });
        for (const ongoing of base.ongoingActions.filter(o => o.defId === sourceDefId)) {
            locations.push({ uid: ongoing.uid, baseIndex: i, controllerId: ongoing.ownerId });
        }
        for (const minion of base.minions.filter(m => m.defId === sourceDefId)) {
            locations.push({ uid: minion.uid, baseIndex: i, controllerId: minion.controller });
        }
        for (const m of base.minions) {
            for (const attached of m.attachedActions?.filter(a => a.defId === sourceDefId) ?? []) {
                locations.push({ uid: attached.uid, baseIndex: i, controllerId: attached.ownerId });
            }
        }
    }
    for (const titan of state.titans ?? []) {
        if (titan.defId !== sourceDefId || titan.location.zone !== 'base') continue;
        locations.push({
            uid: titan.uid,
            titanUid: titan.uid,
            baseIndex: titan.location.baseIndex,
            controllerId: titan.controllerId,
        });
    }
    for (const special of state.pendingAfterScoringSpecials ?? []) {
        if (special.sourceDefId !== sourceDefId) continue;
        locations.push({
            uid: special.cardUid,
            baseIndex: special.baseIndex,
            controllerId: special.playerId,
        });
    }
    return locations;
}

function _locateSource(state: SmashUpCore, sourceDefId: string): TriggerSourceLocation {
    return locateSources(state, sourceDefId)[0] ?? {};
}

function isTriggerSourceEligible(
    entry: TriggerEntry,
    timing: TitanAwareTriggerTiming,
    located: TriggerSourceLocation,
    triggerBaseIndex: number | undefined,
): boolean {
    if (triggerBaseIndex === undefined) return true;
    if (
        entry.baseScoped !== false
        && (timing === 'onMinionMoved' || timing === 'onMinionAffected' || timing === 'onTitanMoved')
        && located.baseIndex !== triggerBaseIndex
    ) {
        return false;
    }
    if (entry.sourceScope === 'triggerBase' && located.baseIndex !== triggerBaseIndex) {
        return false;
    }
    return true;
}

function buildTriggerId(
    entry: TriggerEntry,
    timing: TitanAwareTriggerTiming,
    now: number,
    order: number,
    _located: TriggerSourceLocation,
): string {
    if (entry.perInstance) {
        return `${timing}:${entry.sourceDefId}:${now}:${order}`;
    }
    return `${timing}:${entry.sourceDefId}:${now}:${order}`;
}

function createTriggerInstance(
    state: SmashUpCore,
    entry: TriggerEntry,
    timing: TitanAwareTriggerTiming,
    now: number,
    order: number,
    pid: PlayerId,
    located: TriggerSourceLocation,
    ctx: Omit<TriggerContext, 'timing'>,
): TriggerInstance {
    return {
        id: buildTriggerId(entry, timing, now, order, located),
        timing,
        sourceDefId: entry.sourceDefId,
        sourceCardUid: located.uid,
        sourceControllerId: located.controllerId,
        sourceBaseIndex: located.baseIndex,
        mandatory: entry.optional ? false : true,
        ownerPlayerId: entry.playerContext === 'sourceController' && located.controllerId
            ? located.controllerId
            : pid,
        witnessRequirement: 'inPlayAtTriggerTime',
        witnessed: true,
        baseIndex: ctx.baseIndex,
        moveFromBaseIndex: ctx.moveFromBaseIndex,
        moveToBaseIndex: ctx.moveToBaseIndex,
        triggerMinionUid: ctx.triggerMinionUid,
        triggerMinionDefId: ctx.triggerMinionDefId,
        triggerMinionPower: ctx.triggerMinionPower,
        destroyerId: ctx.destroyerId,
        reason: ctx.reason,
        affectType: ctx.affectType,
        rankings: ctx.rankings,
        triggerBaseControllersAtTrigger: ctx.baseIndex === undefined
            ? undefined
            : Array.from(new Set((state.bases[ctx.baseIndex]?.minions ?? []).map(minion => minion.controller))),
        buriedCardUid: ctx.buriedCardUid,
        buriedCardDefId: ctx.buriedCardDefId,
        buriedCardControllerId: ctx.buriedCardControllerId,
        buriedFrom: ctx.buriedFrom,
        actionTargetBaseIndex: ctx.actionTargetBaseIndex,
        actionTargetType: ctx.actionTargetType,
        actionTargetMinionUid: ctx.actionTargetMinionUid,
        inspectionCards: ctx.inspectionCards,
        inspectionZone: ctx.inspectionZone,
        inspectionTargetPlayerIds: ctx.inspectionTargetPlayerIds,
        inspectionCausePlayerId: ctx.inspectionCausePlayerId,
        lkiMinion: ctx.triggerMinion
            ? {
                uid: ctx.triggerMinion.uid,
                defId: ctx.triggerMinion.defId,
                owner: ctx.triggerMinion.owner,
                controller: ctx.triggerMinion.controller,
                baseIndex: ctx.baseIndex ?? located.baseIndex ?? -1,
                basePower: ctx.triggerMinion.basePower,
                powerCounters: ctx.triggerMinion.powerCounters,
                powerModifier: ctx.triggerMinion.powerModifier,
                tempPowerModifier: ctx.triggerMinion.tempPowerModifier,
                attachedActionDefIds: ctx.triggerMinion.attachedActions?.map(a => a.defId) ?? [],
                metadata: ctx.triggerMinion.metadata ? { ...ctx.triggerMinion.metadata } : undefined,
            }
            : undefined,
    };
}

function shouldSkipTriggerInstance(
    state: SmashUpCore,
    entry: TriggerEntry,
    timing: TitanAwareTriggerTiming,
    located: TriggerSourceLocation,
): boolean {
    return entry.sourceDefId === 'explorers_very_large_boulder'
        && timing === 'onMinionMoved'
        && !!located.titanUid
        && (state.veryLargeBoulderTriggeredTurnByTitan ?? {})[located.titanUid] === state.turnNumber;
}

/** 收集符合当前时机的触发器实例，供全局反应队列后续排序与执行。 */
export function collectTriggers(
    state: SmashUpCore,
    timing: TitanAwareTriggerTiming,
    ctx: Omit<TriggerContext, 'timing'>,
): TriggerQueuedEvent | undefined {
    if (triggerRegistry.length === 0) return undefined;
    const triggers: TriggerInstance[] = [];
    const now = ctx.now;
    const pid = ctx.playerId;

    for (const entry of triggerRegistry) {
        if (entry.timing !== timing) continue;
        // Only queue reaction-phase triggers (replacement effects must remain immediate)
        if (entry.phase === 'replacement') continue;
        if (entry.global) {
            if (!isSourceInZones(state, entry.sourceDefId, entry.globalZones ?? ['hand', 'discard'])) continue;
            triggers.push(createTriggerInstance(state, entry, timing, now, triggers.length, pid, {}, ctx));
            continue;
        }

        const locatedSources = locateSources(state, entry.sourceDefId);
        if (locatedSources.length === 0) {
            if (!entry.perInstance && isSourceActive(state, entry.sourceDefId)) {
                triggers.push(createTriggerInstance(state, entry, timing, now, triggers.length, pid, {}, ctx));
            }
            continue;
        }

        if (entry.perInstance) {
            for (const located of locatedSources) {
                if (!isTriggerSourceEligible(entry, timing, located, ctx.baseIndex)) continue;
                if (shouldSkipTriggerInstance(state, entry, timing, located)) continue;
                triggers.push(createTriggerInstance(state, entry, timing, now, triggers.length, pid, located, ctx));
            }
            continue;
        }

        const located = locatedSources[0];
        if (!isTriggerSourceEligible(entry, timing, located, ctx.baseIndex)) continue;
        if (shouldSkipTriggerInstance(state, entry, timing, located)) continue;
        triggers.push(createTriggerInstance(state, entry, timing, now, triggers.length, pid, located, ctx));
    }

    if (triggers.length === 0) return undefined;
    return {
        type: SU_EVENTS.TRIGGER_QUEUED,
        payload: { triggers },
        timestamp: now,
    } as TriggerQueuedEvent;
}


export function registerInterceptor(
    sourceDefId: string,
    interceptor: EventInterceptor
): void {

    if (interceptorRegistry.some(e => e.sourceDefId === sourceDefId)) return;
    interceptorRegistry.push({ sourceDefId, interceptor });
}


export function registerBaseAbilitySuppression(
    sourceDefId: string,
    checker: BaseAbilitySuppressionChecker
): void {

    if (baseAbilitySuppressionRegistry.some(e => e.sourceDefId === sourceDefId)) return;
    baseAbilitySuppressionRegistry.push({ sourceDefId, checker });
}


export function clearOngoingEffectRegistry(): void {
    protectionRegistry.length = 0;
    restrictionRegistry.length = 0;
    triggerRegistry.length = 0;
    interceptorRegistry.length = 0;
    baseAbilitySuppressionRegistry.length = 0;
}

export function hasRegisteredTrigger(sourceDefId: string, timing: TriggerTiming): boolean {
    return triggerRegistry.some(entry => entry.sourceDefId === sourceDefId && entry.timing === timing);
}


/** 为 POD 版本自动注册 ongoing 别名（trigger / restriction / protection / suppression）。 */
export function registerPodOngoingAliases(): void {
    let _mappedCount = 0;
    

    const triggersToAdd: TriggerEntry[] = [];
    for (const entry of triggerRegistry) {
        const { sourceDefId, timing, callback } = entry;
        

        if (sourceDefId.endsWith('_pod')) continue;
        if (getTitanDef(sourceDefId)) continue;
        
        const podDefId = `${sourceDefId}_pod`;
        

        const alreadyRegistered = triggerRegistry.some(
            e => e.sourceDefId === podDefId && e.timing === timing
        );
        if (alreadyRegistered) continue;
        

        triggersToAdd.push({
            sourceDefId: podDefId,
            timing,
            callback,
            optional: entry.optional,
            phase: entry.phase,
            perInstance: entry.perInstance,
            sourceScope: entry.sourceScope,
            global: entry.global,
            globalZones: entry.globalZones,
        });
        _mappedCount++;
    }
    

    for (const entry of triggersToAdd) {
        registerTrigger(entry.sourceDefId, entry.timing, entry.callback, {
            optional: entry.optional,
            phase: entry.phase,
            perInstance: entry.perInstance,
            sourceScope: entry.sourceScope,
            global: entry.global,
            globalZones: entry.globalZones,
        });
    }
    

    const restrictionsToAdd: RestrictionEntry[] = [];
    for (const entry of restrictionRegistry) {
        const { sourceDefId, restrictionType, checker } = entry;
        
        if (sourceDefId.endsWith('_pod')) continue;
        if (getTitanDef(sourceDefId)) continue;
        
        const podDefId = `${sourceDefId}_pod`;
        
        const alreadyRegistered = restrictionRegistry.some(
            e => e.sourceDefId === podDefId && e.restrictionType === restrictionType
        );
        if (alreadyRegistered) continue;
        
        restrictionsToAdd.push({ sourceDefId: podDefId, restrictionType, checker });
        _mappedCount++;
    }
    
    restrictionRegistry.push(...restrictionsToAdd);
    

    const protectionsToAdd: ProtectionEntry[] = [];
    for (const entry of protectionRegistry) {
        const { sourceDefId, protectionType, checker } = entry;
        
        if (sourceDefId.endsWith('_pod')) continue;
        if (getTitanDef(sourceDefId)) continue;
        
        const podDefId = `${sourceDefId}_pod`;
        
        const alreadyRegistered = protectionRegistry.some(
            e => e.sourceDefId === podDefId && e.protectionType === protectionType
        );
        if (alreadyRegistered) continue;
        
        protectionsToAdd.push({ sourceDefId: podDefId, protectionType, checker });
        _mappedCount++;
    }
    
    protectionRegistry.push(...protectionsToAdd);
    

    const suppressionsToAdd: { sourceDefId: string; checker: BaseAbilitySuppressionChecker }[] = [];
    for (const entry of baseAbilitySuppressionRegistry) {
        const { sourceDefId, checker } = entry;
        
        if (sourceDefId.endsWith('_pod')) continue;
        if (getTitanDef(sourceDefId)) continue;
        
        const podDefId = `${sourceDefId}_pod`;
        
        const alreadyRegistered = baseAbilitySuppressionRegistry.some(
            e => e.sourceDefId === podDefId
        );
        if (alreadyRegistered) continue;
        
        suppressionsToAdd.push({ sourceDefId: podDefId, checker });
        _mappedCount++;
    }
    
    baseAbilitySuppressionRegistry.push(...suppressionsToAdd);
    

}


export function getOngoingEffectRegistrySize(): {
    protection: number;
    restriction: number;
    trigger: number;
    interceptor: number;
} {
    return {
        protection: protectionRegistry.length,
        restriction: restrictionRegistry.length,
        trigger: triggerRegistry.length,
        interceptor: interceptorRegistry.length,
    };
}


export function getRegisteredOngoingEffectIds(): {
    protectionIds: Set<string>;
    restrictionIds: Set<string>;
    triggerIds: Map<string, TriggerTiming[]>;
    interceptorIds: Set<string>;
    baseAbilitySuppressionIds: Set<string>;
} {
    const protectionIds = new Set(protectionRegistry.map(e => e.sourceDefId));
    const restrictionIds = new Set(restrictionRegistry.map(e => e.sourceDefId));
    const interceptorIds = new Set(interceptorRegistry.map(e => e.sourceDefId));
    const baseAbilitySuppressionIds = new Set(baseAbilitySuppressionRegistry.map(e => e.sourceDefId));


    const triggerIds = new Map<string, TriggerTiming[]>();
    for (const entry of triggerRegistry) {
        const existing = triggerIds.get(entry.sourceDefId) ?? [];
        existing.push(entry.timing);
        triggerIds.set(entry.sourceDefId, existing);
    }

    return { protectionIds, restrictionIds, triggerIds, interceptorIds, baseAbilitySuppressionIds };
}


// ============================================================================

// ============================================================================


/** 判断某基地能力是否被压制（用于 before/afterScoring 等基地能力）。 */
export function isBaseAbilitySuppressed(
    state: SmashUpCore,
    baseIndex: number
): boolean {

    if (state.suppressedBasesUntilTurnStart?.some(s => s.baseIndex === baseIndex)) {
        return true;
    }


    if (baseAbilitySuppressionRegistry.length === 0) return false;
    for (const entry of baseAbilitySuppressionRegistry) {
        const filteredState = getSuppressionFilteredStateForSource(state, entry.sourceDefId);
        if (!isSourceActiveOnBase(filteredState, entry.sourceDefId, baseIndex)) continue;
        if (entry.checker(filteredState, baseIndex)) return true;
    }
    return false;
}


export function isCardSuppressed(
    state: SmashUpCore,
    cardUid: string,
): boolean {
    return state.suppressedCardsUntilTurnStart?.some(entry => entry.cardUid === cardUid) ?? false;
}

export function getSuppressionFilteredStateForSource(
    state: SmashUpCore,
    sourceDefId: string,
): SmashUpCore {
    if (!state.suppressedCardsUntilTurnStart?.length) {
        return state;
    }

    const suppressedUids = new Set(state.suppressedCardsUntilTurnStart.map(entry => entry.cardUid));
    let changed = false;

    const bases = state.bases.map(base => {
        let baseChanged = false;

        const ongoingActions = base.ongoingActions.filter(action => {
            const keep = !(action.defId === sourceDefId && suppressedUids.has(action.uid));
            if (!keep) baseChanged = true;
            return keep;
        });

        const minions = base.minions.flatMap(minion => {
            if (minion.defId === sourceDefId && suppressedUids.has(minion.uid)) {
                baseChanged = true;
                return [];
            }

            const attachedActions = (minion.attachedActions ?? []).filter(action => {
                const keep = !(action.defId === sourceDefId && suppressedUids.has(action.uid));
                if (!keep) baseChanged = true;
                return keep;
            });

            if (attachedActions.length !== (minion.attachedActions ?? []).length) {
                return [{ ...minion, attachedActions }];
            }

            return [minion];
        });

        if (!baseChanged) {
            return base;
        }

        changed = true;
        return {
            ...base,
            minions,
            ongoingActions,
        };
    });

    if (!changed) {
        return state;
    }

    return {
        ...state,
        bases,
    };
}


/** 判断随从是否受到保护（含可消耗保护来源）。 */
export function isMinionProtected(
    state: SmashUpCore,
    targetMinion: MinionOnBase,
    targetBaseIndex: number,
    sourcePlayerId: PlayerId,
    protectionType: ProtectionType
): boolean {
    if (hasTurnScopedMetadataProtection(state, targetMinion, protectionType)) return true;
    if (protectionRegistry.length === 0) return false;

    const ctx: ProtectionCheckContext = {
        state,
        targetMinion,
        targetBaseIndex,
        sourcePlayerId,
        protectionType,
    };

    for (const entry of protectionRegistry) {
        if (entry.protectionType !== protectionType) continue;

        const filteredState = getSuppressionFilteredStateForSource(state, entry.sourceDefId);
        if (!isSourceActive(filteredState, entry.sourceDefId)) continue;
        if (entry.checker({ ...ctx, state: filteredState })) return true;
    }
    return false;
}


/** 判断随从是否受到不可消耗保护（不影响后续消耗逻辑）。 */
export function isMinionProtectedNonConsumable(
    state: SmashUpCore,
    targetMinion: MinionOnBase,
    targetBaseIndex: number,
    sourcePlayerId: PlayerId,
    protectionType: ProtectionType
): boolean {
    if (hasTurnScopedMetadataProtection(state, targetMinion, protectionType)) return true;
    if (protectionRegistry.length === 0) return false;

    const ctx: ProtectionCheckContext = {
        state,
        targetMinion,
        targetBaseIndex,
        sourcePlayerId,
        protectionType,
    };

    for (const entry of protectionRegistry) {
        if (entry.protectionType !== protectionType) continue;
        if (entry.consumable) continue;
        const filteredState = getSuppressionFilteredStateForSource(state, entry.sourceDefId);
        if (!isSourceActive(filteredState, entry.sourceDefId)) continue;
        if (entry.checker({ ...ctx, state: filteredState })) return true;
    }
    return false;
}

function hasTurnScopedMetadataProtection(
    state: SmashUpCore,
    targetMinion: MinionOnBase,
    protectionType: ProtectionType,
): boolean {
    const metadata = targetMinion.metadata ?? {};
    const currentTurn = state.turnNumber ?? 0;
    const destroyUntilTurn = typeof metadata.tempProtectDestroyUntilTurnNumber === 'number'
        ? metadata.tempProtectDestroyUntilTurnNumber
        : undefined;
    const moveUntilTurn = typeof metadata.tempProtectMoveUntilTurnNumber === 'number'
        ? metadata.tempProtectMoveUntilTurnNumber
        : undefined;
    const affectUntilTurn = typeof metadata.tempProtectAffectUntilTurnNumber === 'number'
        ? metadata.tempProtectAffectUntilTurnNumber
        : undefined;

    if (protectionType === 'destroy') return (destroyUntilTurn ?? -1) >= currentTurn;
    if (protectionType === 'move') return (moveUntilTurn ?? -1) >= currentTurn;
    if (protectionType === 'affect' || protectionType === 'action') return (affectUntilTurn ?? -1) >= currentTurn;
    return false;
}

/**
 * 返回一个可被消耗的保护来源。
 *
 * 只有在 `isMinionProtected()` 已确认目标受到保护时，这里才会继续查找具体来源；
 * 例如 `trickster_hideout` 这类持续效果，会在真正拦截 destroy / move / affect 前
 * 定位到对应的 ongoing 来源，供后续发出 `ONGOING_DETACHED` 或移除保护状态使用。
 */
export function getConsumableProtectionSource(
    state: SmashUpCore,
    targetMinion: MinionOnBase,
    targetBaseIndex: number,
    sourcePlayerId: PlayerId,
    protectionType: ProtectionType
): { uid: string; defId: string; ownerId: string } | undefined {
    if (protectionRegistry.length === 0) return undefined;

    const ctx: ProtectionCheckContext = {
        state,
        targetMinion,
        targetBaseIndex,
        sourcePlayerId,
        protectionType,
    };

    for (const entry of protectionRegistry) {
        if (entry.protectionType !== protectionType) continue;
        if (!entry.consumable) continue;
        const filteredState = getSuppressionFilteredStateForSource(state, entry.sourceDefId);
        if (!isSourceActive(filteredState, entry.sourceDefId)) continue;
        if (!entry.checker({ ...ctx, state: filteredState })) continue;

        const base = filteredState.bases[targetBaseIndex];
        if (!base) continue;

        const filteredTargetMinion = base.minions.find(minion => minion.uid === targetMinion.uid) ?? targetMinion;
        const attached = filteredTargetMinion.attachedActions.find(a => a.defId === entry.sourceDefId);
        if (attached) return { uid: attached.uid, defId: attached.defId, ownerId: attached.ownerId };

        const ongoing = base.ongoingActions.find(o => o.defId === entry.sourceDefId);
        if (ongoing) return { uid: ongoing.uid, defId: ongoing.defId, ownerId: ongoing.ownerId };
    }
    return undefined;
}


export function isOperationRestricted(
    state: SmashUpCore,
    baseIndex: number,
    playerId: PlayerId,
    restrictionType: RestrictionType,
    extra?: Record<string, unknown>
): boolean {
    const base = state.bases[baseIndex];
    if (!base) return false;


    const baseDef = getBaseDef(base.defId);
    if (baseDef?.restrictions) {
        for (const r of baseDef.restrictions) {
            if (r.type !== restrictionType) continue;

            if (!r.condition) return true;

            if (r.condition.maxPower !== undefined && restrictionType === 'play_minion') {
                const basePower = extra?.basePower as number | undefined;
                if (basePower !== undefined && basePower <= r.condition.maxPower) {



                    if (baseDef.id === 'base_tsars_palace') {
                        const hasBaseInfiltrate = base.ongoingActions.some(o =>
                            o.ownerId === playerId && o.defId.startsWith('ninja_infiltrate'),
                        );
                        if (hasBaseInfiltrate) {
                            continue;
                        }
                    }
                    return true;
                }
            }

            if (r.condition.extraPlayMinionPowerMax !== undefined && restrictionType === 'play_minion') {
                const basePower = extra?.basePower as number | undefined;
                const isExtraMinionPlay = extra?.isExtraMinionPlayAttempt as boolean | undefined;
                const usingBaseLimitedQuota = (extra?.usesBaseLimitedMinionQuota as boolean | undefined)
                    ?? mustUseBaseLimitedMinionQuota(
                        state,
                        state.players[playerId],
                        baseIndex,
                        extra?.minionDefId as string | undefined,
                        basePower,
                    );
                if ((isExtraMinionPlay || usingBaseLimitedQuota) && basePower !== undefined && basePower > r.condition.extraPlayMinionPowerMax) {
                    return true;
                }
            }

            if (r.condition.minionPlayLimitPerTurn !== undefined && restrictionType === 'play_minion') {
                const player = state.players[playerId];
                const playedAtBase = player?.minionsPlayedPerBase?.[baseIndex] ?? 0;
                if (playedAtBase >= r.condition.minionPlayLimitPerTurn) {


                    if (baseDef.id === 'base_antarctic_base') {
                        const hasBaseInfiltrate = base.ongoingActions.some(o =>
                            o.ownerId === playerId && o.defId.startsWith('ninja_infiltrate'),
                        );
                        if (hasBaseInfiltrate) {
                            continue;
                        }
                    }
                    return true;
                }
            }
        }
    }


    if (restrictionRegistry.length > 0) {
        const ctx: RestrictionCheckContext = {
            state,
            baseIndex,
            playerId,
            restrictionType,
            extra,
        };
        for (const entry of restrictionRegistry) {
            if (entry.restrictionType !== restrictionType) continue;
            const filteredState = getSuppressionFilteredStateForSource(state, entry.sourceDefId);
            if (!isSourceActiveOnBase(filteredState, entry.sourceDefId, baseIndex)) continue;
            if (entry.checker({ ...ctx, state: filteredState })) return true;
        }
    }

    return false;
}


export function hasPlayerTurnRestriction(
    state: SmashUpCore,
    playerId: PlayerId,
    restrictionType: PlayerTurnRestrictionType,
): boolean {
    return state.playerRestrictionsUntilTurnStart?.some(
        entry => entry.targetPlayerId === playerId && entry.restrictionType === restrictionType,
    ) ?? false;
}


export function interceptEvent(
    state: SmashUpCore,
    event: SmashUpEvent
): SmashUpEvent | SmashUpEvent[] | null | undefined {
    if (interceptorRegistry.length === 0) return undefined;

    for (const entry of interceptorRegistry) {
        const filteredState = getSuppressionFilteredStateForSource(state, entry.sourceDefId);
        if (!isSourceActive(filteredState, entry.sourceDefId)) continue;
        const result = entry.interceptor(filteredState, event);
        if (result !== undefined) return result;
    }
    return undefined;
}


export function fireTriggers(
    state: SmashUpCore,
    timing: TitanAwareTriggerTiming,
    ctx: Omit<TriggerContext, 'timing'>,
    options?: { phase?: 'replacement' | 'reaction' }
): TriggerResult {
    if (triggerRegistry.length === 0) {
        return { events: [] };
    }

    const events: SmashUpEvent[] = [];
    let matchState = ctx.matchState;
    const triggerSharedState: Record<string, unknown> = {};
    const fullCtx: TriggerContext = { ...ctx, timing, triggerSharedState };

    for (const entry of triggerRegistry) {
        if (entry.timing !== timing) continue;
        if (options?.phase && (entry.phase ?? 'reaction') !== options.phase) continue;
        
        const filteredState = getSuppressionFilteredStateForSource(state, entry.sourceDefId);
        const getFilteredMatchState = () => (
            matchState && matchState.core === state
                ? { ...matchState, core: filteredState }
                : matchState
        );

        if (entry.global) {
            if (!isSourceInZones(state, entry.sourceDefId, entry.globalZones ?? ['hand', 'discard'])) continue;
            const result = entry.callback({ ...fullCtx, state: filteredState, matchState: getFilteredMatchState() });
            const triggerEvents = Array.isArray(result) ? result : result.events;
            if (triggerEvents.length > 0) {
                events.push(...triggerEvents);
            }
            if (!Array.isArray(result) && result.matchState) {
                matchState = result.matchState;
            }
            continue;
        }

        const locatedSources = locateSources(filteredState, entry.sourceDefId);
        if (locatedSources.length === 0) {
            if (!entry.perInstance && isSourceActive(filteredState, entry.sourceDefId)) {
                const result = entry.callback({ ...fullCtx, state: filteredState, matchState: getFilteredMatchState() });
                const triggerEvents = Array.isArray(result) ? result : result.events;
                if (triggerEvents.length > 0) {
                    events.push(...triggerEvents);
                }
                if (!Array.isArray(result) && result.matchState) {
                    matchState = result.matchState;
                }
            }
            continue;
        }

        const sourcesToExecute = entry.perInstance
            ? locatedSources.filter(located => isTriggerSourceEligible(entry, timing, located, ctx.baseIndex))
            : [selectSpecificSourceLocation(locatedSources, ctx)].filter(located => (
                located !== undefined && isTriggerSourceEligible(entry, timing, located, ctx.baseIndex)
            ));
        if (sourcesToExecute.length === 0) continue;

        for (const located of sourcesToExecute) {
            const result = entry.callback({
                ...fullCtx,
                state: filteredState,
                matchState: getFilteredMatchState(),
                sourceCardUid: located.uid,
                sourceBaseIndex: located.baseIndex,
                sourceControllerId: located.controllerId,
            });
            const triggerEvents = Array.isArray(result) ? result : result.events;
            if (triggerEvents.length > 0) {
                events.push(...triggerEvents);
            }
            if (!Array.isArray(result) && result.matchState) {
                matchState = result.matchState;
            }
        }
    }

    return { events, matchState };
}

function selectSpecificSourceLocation(
    locatedSources: TriggerSourceLocation[],
    ctx: Omit<TriggerContext, 'timing'>,
): TriggerSourceLocation | undefined {
    const preferredUid = ctx.sourceCardUid ?? ctx.triggerMinionUid;
    if (preferredUid) {
        const matched = locatedSources.find(located => located.uid === preferredUid);
        if (matched) {
            return matched;
        }
    }
    return locatedSources[0];
}


/** 触发指定来源的触发器（不入队，立即执行）。 */
export function fireTriggerForSource(
    state: SmashUpCore,
    sourceDefId: string,
    timing: TriggerTiming,
    ctx: Omit<TriggerContext, 'timing'>,
    options?: { phase?: 'replacement' | 'reaction' }
): TriggerResult {
    if (triggerRegistry.length === 0) {
        return { events: [] };
    }

    const events: SmashUpEvent[] = [];
    let matchState = ctx.matchState;
    const triggerSharedState: Record<string, unknown> = {};
    const fullCtx: TriggerContext = { ...ctx, timing, triggerSharedState };

    for (const entry of triggerRegistry) {
        if (entry.sourceDefId !== sourceDefId) continue;
        if (entry.timing !== timing) continue;
        if (options?.phase && (entry.phase ?? 'reaction') !== options.phase) continue;

        const filteredState = getSuppressionFilteredStateForSource(state, entry.sourceDefId);
        const getFilteredMatchState = () => (
            matchState && matchState.core === state
                ? { ...matchState, core: filteredState }
                : matchState
        );

        if (entry.global) {
            if (!isSourceInZones(state, entry.sourceDefId, entry.globalZones ?? ['hand', 'discard'])) continue;
            const result = entry.callback({ ...fullCtx, state: filteredState, matchState: getFilteredMatchState() });
            const triggerEvents = Array.isArray(result) ? result : result.events;
            if (triggerEvents.length > 0) {
                events.push(...triggerEvents);
            }
            if (!Array.isArray(result) && result.matchState) {
                matchState = result.matchState;
            }
            continue;
        }

        const locatedSources = locateSources(filteredState, entry.sourceDefId);
        if (locatedSources.length === 0) {
            if (!entry.perInstance && isSourceActive(filteredState, entry.sourceDefId)) {
                const result = entry.callback({ ...fullCtx, state: filteredState, matchState: getFilteredMatchState() });
                const triggerEvents = Array.isArray(result) ? result : result.events;
                if (triggerEvents.length > 0) {
                    events.push(...triggerEvents);
                }
                if (!Array.isArray(result) && result.matchState) {
                    matchState = result.matchState;
                }
            }
            continue;
        }

        const sourcesToExecute = entry.perInstance
            ? locatedSources.filter(located => isTriggerSourceEligible(entry, timing, located, ctx.baseIndex))
            : [selectSpecificSourceLocation(locatedSources, ctx)].filter(located => (
                located !== undefined && isTriggerSourceEligible(entry, timing, located, ctx.baseIndex)
            ));
        if (sourcesToExecute.length === 0) continue;

        for (const located of sourcesToExecute) {
            const result = entry.callback({
                ...fullCtx,
                state: filteredState,
                matchState: getFilteredMatchState(),
                sourceCardUid: located.uid,
                sourceBaseIndex: located.baseIndex,
                sourceControllerId: located.controllerId,
            });
            const triggerEvents = Array.isArray(result) ? result : result.events;
            if (triggerEvents.length > 0) {
                events.push(...triggerEvents);
            }
            if (!Array.isArray(result) && result.matchState) {
                matchState = result.matchState;
            }
        }
    }

    return { events, matchState };
}

function isSourceInZones(
    state: SmashUpCore,
    sourceDefId: string,
    zones: Array<'hand' | 'discard' | 'deck'>,
): boolean {
    for (const p of Object.values(state.players)) {
        if (zones.includes('hand') && p.hand?.some(c => c.defId === sourceDefId)) return true;
        if (zones.includes('discard') && p.discard?.some(c => c.defId === sourceDefId)) return true;
        if (zones.includes('deck') && p.deck?.some(c => c.defId === sourceDefId)) return true;
    }
    if ((state.titans ?? []).some(titan => titan.defId === sourceDefId)) {
        return true;
    }
    return false;
}

// ============================================================================

// ============================================================================


/** 判断来源是否在场或可见（基地/ongoing/attached/泰坦/待处理 special）。 */
function isSourceActive(state: SmashUpCore, sourceDefId: string): boolean {
    // PR63: Tricksters POD「睡眠印记」会写入 sleepMarkedPlayers / sleepMoveMarkedPlayers，
    // 同时使用 registerInterceptor('trickster_mark_of_sleep_pod') 拦截 MINION_MOVED。
    //
    // 由于该卡在数据上是 standard action（不是 ongoing），它不会挂在 base.ongoingActions 上，
    // 如果仅依赖“卡牌是否在场”来判断 source 是否 active，会导致拦截器永远不生效。
    //
    // 因此这里把“睡眠印记 POD 的标记尚未过期”视为 source active 的一种形式。
    if (sourceDefId === 'trickster_mark_of_sleep_pod') {
        const expires = state.sleepMarkExpiresOnTurnNumber;
        const hasAnyMarks =
            (state.sleepMarkedPlayers?.length ?? 0) > 0
            || (state.sleepMoveMarkedPlayers?.length ?? 0) > 0;
        if (hasAnyMarks && typeof expires === 'number' && state.turnNumber < expires) {
            return true;
        }
    }

    if (state.pendingAfterScoringSpecials?.some(s => s.sourceDefId === sourceDefId)) {
        return true;
    }
    for (const base of state.bases) {

        if (base.defId === sourceDefId) {
            return true;
        }

        if (base.ongoingActions.some(o => o.defId === sourceDefId)) {
            return true;
        }

        if (base.minions.some(m => m.defId === sourceDefId)) {
            return true;
        }

        for (const m of base.minions) {
            if (m.attachedActions?.some(a => a.defId === sourceDefId)) {
                return true;
            }
        }
    }

    if ((state.titans ?? []).some(titan => titan.defId === sourceDefId && titan.location.zone === 'base')) {
        return true;
    }
    
    return false;
}


export function isSourceActiveOnBase(state: SmashUpCore, sourceDefId: string, baseIndex: number): boolean {
    const base = state.bases[baseIndex];
    if (!base) return false;

    if (base.defId === sourceDefId) return true;

    if (base.ongoingActions.some(o => o.defId === sourceDefId)) return true;

    if (base.minions.some(m => m.defId === sourceDefId)) return true;
    for (const minion of base.minions) {
        if (minion.attachedActions?.some(action => action.defId === sourceDefId)) {
            return true;
        }
    }
    if ((state.titans ?? []).some(titan =>
        titan.defId === sourceDefId
        && titan.location.zone === 'base'
        && titan.location.baseIndex === baseIndex,
    )) {
        return true;
    }
    return false;
}

// ============================================================================

// ============================================================================


export interface BaseRestrictionInfo {

    type: 'blocked_faction' | 'blocked_action';

    displayText: string;

    sourceDefId: string;
}


/** 获取基地上可视限制（供 UI 展示）。 */
export function getBaseRestrictions(state: SmashUpCore, baseIndex: number): BaseRestrictionInfo[] {
    const base = state.bases[baseIndex];
    if (!base) return [];

    const restrictions: BaseRestrictionInfo[] = [];


    const blockAction = base.ongoingActions.find(o => matchesDefId(o.defId, 'trickster_block_the_path'));
    if (blockAction) {
        const blockedFaction = blockAction.metadata?.blockedFaction as string | undefined;
        if (blockedFaction) {


            restrictions.push({
                type: 'blocked_faction',
                displayText: blockedFaction,
                sourceDefId: blockAction.defId,
            });
        }
    }


    // const domeAction = base.ongoingActions.find(o => o.defId === 'steampunk_ornate_dome');
    // if (domeAction) {
    //     restrictions.push({
    //         type: 'blocked_action',
    //         displayText: 'action',
    //         sourceDefId: 'steampunk_ornate_dome',
    //     });
    // }

    return restrictions;
}
