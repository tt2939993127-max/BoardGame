import type { MatchState, PlayerId, RandomFn } from '../../../engine/types';
import { createSimpleChoice, queueInteraction } from '../../../engine/systems/InteractionSystem';
import { registerAbility } from '../domain/abilityRegistry';
import type { AbilityContext, AbilityResult } from '../domain/abilityRegistry';
import { registerInteractionHandler } from '../domain/abilityInteractionHandlers';
import {
    addPowerCounter,
    addTempPower,
    buildAbilityFeedback,
    buildBaseTargetOptions,
    buildMinionTargetOptions,
    buildStandardDrawEvents,
    buildValidatedDestroyEvents,
    buildValidatedMoveEvents,
    createSkipOption,
    grantExtraAction,
    grantExtraMinion,
    getMinionPower,
} from '../domain/abilityHelpers';
import { registerBaseAbility, registerExtended } from '../domain/baseAbilities';
import { registerTrigger } from '../domain/ongoingEffects';
import type { TriggerContext } from '../domain/ongoingEffects';
import { canStartDuel, isMinionInActiveDuel, startDuel } from '../domain/duel';
import type {
    CardsDrawnEvent,
    DeckReorderedEvent,
    MinionOnBase,
    SmashUpCore,
    SmashUpEvent,
} from '../domain/types';
import { SU_EVENTS } from '../domain/types';
import { getBaseDef, getCardDef } from '../data/cards';

type MinionChoice = { minionUid: string; baseIndex: number; defId?: string };
type FriendlyChoice = MinionChoice;
type DuelContinuation = {
    friendlyMinionUid: string;
    casterPlayerId: PlayerId;
    sourceId: string;
};
type StagecoachSourceContinuation = {
    sourceBaseIndex: number;
};
type StagecoachDestinationContinuation = {
    sourceBaseIndex: number;
    selectedMinions: Array<{ minionUid: string; defId: string }>;
};

export function registerCowboysAbilities(): void {
    registerAbility('cowboys_gunfighter', 'onPlay', cowboysGunfighterOnPlay);
    registerAbility('cowboys_quick_draw', 'onPlay', cowboysQuickDrawOnPlay);
    registerAbility('cowboys_high_noon', 'onPlay', cowboysHighNoonOnPlay);
    registerAbility('cowboys_run_em_off', 'onPlay', cowboysRunEmOffOnPlay);
    registerAbility('cowboys_gold_in_them_thar_hills', 'onPlay', cowboysGoldInThemTharHillsOnPlay);
    registerAbility('cowboys_stagecoach', 'onPlay', cowboysStagecoachOnPlay);
    registerAbility('cowboys_form_a_posse', 'onPlay', cowboysFormAPosseOnPlay);
    registerAbility('cowboys_dynamite_surprise', 'special', cowboysDynamiteSurpriseSpecial);

    registerTrigger('cowboys_sheriff', 'beforeScoring', cowboysSheriffBeforeScoring, {
        optional: true,
        perInstance: true,
        sourceScope: 'triggerBase',
    });
    registerTrigger('cowboys_gold_strike', 'onMinionPlayed', cowboysGoldStrikeOnMinionPlayed, {
        perInstance: true,
        sourceScope: 'triggerBase',
    });

    registerBaseAbility('base_so_so_corral', 'onMinionPlayed', cowboysBaseSoSoCorralOnMinionPlayed, { mandatory: false });
    registerExtended('base_saloon', 'onMinionDestroyed', cowboysBaseSaloonOnMinionDestroyed, { mandatory: true });
}

export function registerCowboysInteractionHandlers(): void {
    registerInteractionHandler('cowboys_gunfighter', handleGunfighterTarget);
    registerInteractionHandler('cowboys_quick_draw', handleQuickDraw);
    registerInteractionHandler('cowboys_high_noon_friendly', handleHighNoonFriendly);
    registerInteractionHandler('cowboys_high_noon_enemy', handleHighNoonEnemy);
    registerInteractionHandler('cowboys_run_em_off_friendly', handleRunEmOffFriendly);
    registerInteractionHandler('cowboys_run_em_off_enemy', handleRunEmOffEnemy);
    registerInteractionHandler('cowboys_gold_in_them_thar_hills', handleGoldInThemTharHills);
    registerInteractionHandler('cowboys_stagecoach_source', handleStagecoachSource);
    registerInteractionHandler('cowboys_stagecoach_cards', handleStagecoachCards);
    registerInteractionHandler('cowboys_stagecoach_destination', handleStagecoachDestination);
    registerInteractionHandler('cowboys_dynamite_surprise', handleDynamiteSurprise);
    registerInteractionHandler('cowboys_sheriff_before_scoring', handleSheriffBeforeScoring);
    registerInteractionHandler('base_so_so_corral', handleBaseSoSoCorral);
}

function cowboysGunfighterOnPlay(ctx: AbilityContext): AbilityResult {
    if (!canStartDuel(ctx.state) || ctx.duel) return { events: [] };
    return queueEnemyDuelPrompt(
        ctx.matchState,
        ctx.state,
        ctx.playerId,
        ctx.cardUid,
        ctx.now,
        'cowboys_gunfighter',
        '枪手：你可以令此随从与这里另一位玩家的一个随从决斗',
    );
}

function cowboysQuickDrawOnPlay(ctx: AbilityContext): AbilityResult {
    const ownMinions = collectOwnMinions(ctx.state, ctx.playerId);
    if (ownMinions.length === 0) {
        return { events: [buildAbilityFeedback(ctx.playerId, 'feedback.no_valid_targets', ctx.now)] };
    }
    const interaction = createSimpleChoice(
        `cowboys_quick_draw_${ctx.now}`,
        ctx.playerId,
        '拔枪术：选择你的一个随从获得力量加成',
        buildMinionTargetOptions(ownMinions, { state: ctx.state, sourcePlayerId: ctx.playerId }) as any[],
        { sourceId: 'cowboys_quick_draw', targetType: 'minion' },
    );
    return { events: [], matchState: queueInteraction(ctx.matchState, interaction) };
}

function cowboysHighNoonOnPlay(ctx: AbilityContext): AbilityResult {
    if (!canStartDuel(ctx.state) || ctx.duel) return { events: [] };
    const options = collectFriendlyDuelStarters(ctx.state, ctx.playerId);
    if (options.length === 0) {
        return { events: [buildAbilityFeedback(ctx.playerId, 'feedback.no_valid_targets', ctx.now)] };
    }
    const interaction = createSimpleChoice(
        `cowboys_high_noon_friendly_${ctx.now}`,
        ctx.playerId,
        '正午决斗：选择你的一个随从开始决斗',
        buildMinionTargetOptions(options, { state: ctx.state, sourcePlayerId: ctx.playerId }) as any[],
        { sourceId: 'cowboys_high_noon_friendly', targetType: 'minion' },
    );
    return { events: [], matchState: queueInteraction(ctx.matchState, interaction) };
}

function cowboysRunEmOffOnPlay(ctx: AbilityContext): AbilityResult {
    if (!canStartDuel(ctx.state) || ctx.duel) return { events: [] };
    const options = collectFriendlyDuelStarters(ctx.state, ctx.playerId);
    if (options.length === 0) {
        return { events: [buildAbilityFeedback(ctx.playerId, 'feedback.no_valid_targets', ctx.now)] };
    }
    const interaction = createSimpleChoice(
        `cowboys_run_em_off_friendly_${ctx.now}`,
        ctx.playerId,
        '赶走他们：选择你的一个随从开始决斗',
        buildMinionTargetOptions(options, { state: ctx.state, sourcePlayerId: ctx.playerId }) as any[],
        { sourceId: 'cowboys_run_em_off_friendly', targetType: 'minion' },
    );
    return { events: [], matchState: queueInteraction(ctx.matchState, interaction) };
}

function cowboysGoldInThemTharHillsOnPlay(ctx: AbilityContext): AbilityResult {
    const player = ctx.state.players[ctx.playerId];
    if (!player || player.deck.length === 0) return { events: [] };
    const topCards = player.deck.slice(0, 3);
    const options = topCards.map((card, index) => ({
        id: `top-${index}`,
        label: getCardDef(card.defId)?.name ?? card.defId,
        value: { cardUid: card.uid, defId: card.defId },
        _source: 'deck' as const,
        displayMode: 'card' as const,
    }));
    const interaction = createSimpleChoice(
        `cowboys_gold_in_them_thar_hills_${ctx.now}`,
        ctx.playerId,
        '那山里有金子：从牌库顶三张牌中选择一张抓到手里',
        options,
        { sourceId: 'cowboys_gold_in_them_thar_hills', targetType: 'generic' },
    );
    (interaction.data as any).continuationContext = {
        topCardUids: topCards.map(card => card.uid),
    };
    return { events: [], matchState: queueInteraction(ctx.matchState, interaction) };
}

function cowboysStagecoachOnPlay(ctx: AbilityContext): AbilityResult {
    const sourceBases = collectStagecoachSourceBases(ctx.state, ctx.playerId);
    if (sourceBases.length === 0 || ctx.state.bases.length <= 1) {
        return { events: [buildAbilityFeedback(ctx.playerId, 'feedback.no_valid_targets', ctx.now)] };
    }
    const interaction = createSimpleChoice(
        `cowboys_stagecoach_source_${ctx.now}`,
        ctx.playerId,
        '驿站马车：选择要搬运卡牌的来源基地',
        buildBaseTargetOptions(sourceBases, ctx.state),
        { sourceId: 'cowboys_stagecoach_source', targetType: 'base' },
    );
    return { events: [], matchState: queueInteraction(ctx.matchState, interaction) };
}

function cowboysFormAPosseOnPlay(ctx: AbilityContext): AbilityResult {
    const events = collectOwnMinions(ctx.state, ctx.playerId).map(target => (
        addTempPower(target.uid, target.baseIndex, 1, 'cowboys_form_a_posse', ctx.now)
    ));
    return { events };
}

function cowboysDynamiteSurpriseSpecial(ctx: AbilityContext): AbilityResult {
    const base = ctx.state.bases[ctx.baseIndex];
    if (!base) return { events: [] };
    const hasOwnMinion = base.minions.some(minion => minion.controller === ctx.playerId);
    if (!hasOwnMinion || isWinningOnBase(ctx.state, ctx.baseIndex, ctx.playerId)) {
        return { events: [buildAbilityFeedback(ctx.playerId, 'feedback.no_valid_targets', ctx.now)] };
    }
    const targets = base.minions
        .filter(minion => getMinionPower(ctx.state, minion, ctx.baseIndex) <= 4)
        .map(minion => ({
            uid: minion.uid,
            defId: minion.defId,
            baseIndex: ctx.baseIndex,
            label: `${getCardDef(minion.defId)?.name ?? minion.defId}`,
        }));
    if (targets.length === 0) {
        return { events: [buildAbilityFeedback(ctx.playerId, 'feedback.no_valid_targets', ctx.now)] };
    }
    const interaction = createSimpleChoice(
        `cowboys_dynamite_surprise_${ctx.now}`,
        ctx.playerId,
        '炸药惊喜：选择一个力量4或以下的随从消灭',
        buildMinionTargetOptions(targets, { state: ctx.state, sourcePlayerId: ctx.playerId, effectType: 'destroy' }) as any[],
        { sourceId: 'cowboys_dynamite_surprise', targetType: 'minion' },
    );
    return { events: [], matchState: queueInteraction(ctx.matchState, interaction) };
}

function cowboysSheriffBeforeScoring(ctx: TriggerContext): AbilityResult {
    if (!ctx.matchState || ctx.baseIndex === undefined || !ctx.sourceCardUid || !ctx.sourceControllerId) {
        return { events: [] };
    }
    if (!canStartDuel(ctx.state)) return { events: [] };
    const interaction = createSimpleChoice(
        `cowboys_sheriff_before_scoring_${ctx.now}_${ctx.sourceCardUid}`,
        ctx.sourceControllerId,
        '警长：你可以令此随从与这里另一位玩家的一个随从决斗',
        [createSkipOption('跳过（不决斗）'), ...buildEnemyMinionOptions(ctx.state, ctx.baseIndex, ctx.sourceControllerId)] as any[],
        { sourceId: 'cowboys_sheriff_before_scoring', targetType: 'minion' },
    );
    (interaction.data as any).continuationContext = {
        sourceId: 'cowboys_sheriff_before_scoring',
        friendlyMinionUid: ctx.sourceCardUid,
        casterPlayerId: ctx.sourceControllerId,
    } satisfies DuelContinuation;
    return { events: [], matchState: queueInteraction(ctx.matchState, interaction) };
}

function cowboysGoldStrikeOnMinionPlayed(ctx: TriggerContext): SmashUpEvent[] {
    if (ctx.baseIndex === undefined || !ctx.sourceControllerId || ctx.playerId !== ctx.sourceControllerId) return [];
    return buildStandardDrawEvents(ctx.state, ctx.sourceControllerId, 1, ctx.random, ctx.now);
}

function cowboysBaseSoSoCorralOnMinionPlayed(ctx: any): AbilityResult {
    if (!ctx.matchState || !ctx.minionUid || ctx.baseIndex === undefined) return { events: [] };
    if (!canStartDuel(ctx.state)) return { events: [] };
    const minion = ctx.state.bases[ctx.baseIndex]?.minions.find((entry: MinionOnBase) => entry.uid === ctx.minionUid);
    if (!minion) return { events: [] };
    const enemyOptions = buildEnemyMinionOptions(ctx.state, ctx.baseIndex, minion.controller);
    if (enemyOptions.length === 0) return { events: [] };
    const interaction = createSimpleChoice(
        `base_so_so_corral_${ctx.now}_${ctx.minionUid}`,
        minion.controller,
        '小镇：你可以令刚打出的随从与这里另一位玩家的一个随从决斗',
        [createSkipOption('跳过（不决斗）'), ...enemyOptions] as any[],
        { sourceId: 'base_so_so_corral', targetType: 'minion' },
    );
    (interaction.data as any).continuationContext = {
        sourceId: 'base_so_so_corral',
        friendlyMinionUid: ctx.minionUid,
        casterPlayerId: minion.controller,
    } satisfies DuelContinuation;
    return { events: [], matchState: queueInteraction(ctx.matchState, interaction) };
}

function cowboysBaseSaloonOnMinionDestroyed(ctx: any): AbilityResult {
    const base = ctx.state.bases[ctx.baseIndex];
    if (!base) return { events: [] };
    const playerIds = Array.from(new Set(base.minions.map((minion: MinionOnBase) => minion.controller)));
    return {
        events: playerIds.flatMap((playerId) => buildStandardDrawEvents(ctx.state, playerId, 1, dummyRandom, ctx.now)),
    };
}

function queueEnemyDuelPrompt(
    matchState: MatchState<SmashUpCore>,
    state: SmashUpCore,
    playerId: PlayerId,
    friendlyMinionUid: string,
    now: number,
    sourceId: string,
    title: string,
): AbilityResult {
    const found = state.bases.findIndex(base => base.minions.some(minion => minion.uid === friendlyMinionUid));
    if (found < 0) return { events: [] };
    const enemyOptions = buildEnemyMinionOptions(state, found, playerId);
    if (enemyOptions.length === 0) {
        return { events: [buildAbilityFeedback(playerId, 'feedback.no_valid_targets', now)] };
    }
    const interaction = createSimpleChoice(
        `${sourceId}_${now}_${friendlyMinionUid}`,
        playerId,
        title,
        [createSkipOption('跳过（不决斗）'), ...enemyOptions] as any[],
        { sourceId, targetType: 'minion' },
    );
    (interaction.data as any).continuationContext = {
        sourceId,
        friendlyMinionUid,
        casterPlayerId: playerId,
    } satisfies DuelContinuation;
    return { events: [], matchState: queueInteraction(matchState, interaction) };
}

const handleGunfighterTarget = (state: MatchState<SmashUpCore>, _playerId: string, value: unknown, data: any, _random: RandomFn, now: number) => {
    const selected = value as { skip?: boolean; minionUid?: string };
    if (selected?.skip || !selected?.minionUid) return { state, events: [] };
    const ctx = data?.continuationContext as DuelContinuation | undefined;
    if (!ctx) return { state, events: [] };
    return {
        state: startDuel(state, {
            sourceId: ctx.sourceId,
            sourcePlayerId: ctx.casterPlayerId,
            challengerMinionUid: ctx.friendlyMinionUid,
            challengedMinionUid: selected.minionUid,
            outcome: 'destroy_loser',
            destroyReason: ctx.sourceId,
        }, now),
        events: [],
    };
};

const handleQuickDraw = (state: MatchState<SmashUpCore>, _playerId: string, value: unknown, _data: any, _random: RandomFn, now: number) => {
    const selected = value as FriendlyChoice | undefined;
    if (!selected?.minionUid || selected.baseIndex === undefined) return { state, events: [] };
    const inDuel = isMinionInActiveDuel(state.core, selected.minionUid);
    return {
        state,
        events: [addTempPower(selected.minionUid, selected.baseIndex, inDuel ? 4 : 2, 'cowboys_quick_draw', now)],
    };
};

const handleHighNoonFriendly = (state: MatchState<SmashUpCore>, playerId: string, value: unknown, _data: any, _random: RandomFn, now: number) => {
    const selected = value as FriendlyChoice | undefined;
    if (!selected?.minionUid || selected.baseIndex === undefined) return { state, events: [] };
    const options = buildEnemyMinionOptions(state.core, selected.baseIndex, playerId);
    if (options.length === 0) return { state, events: [] };
    const interaction = createSimpleChoice(
        `cowboys_high_noon_enemy_${now}`,
        playerId,
        '正午决斗：选择要决斗的对手随从',
        options,
        { sourceId: 'cowboys_high_noon_enemy', targetType: 'minion' },
    );
    (interaction.data as any).continuationContext = {
        sourceId: 'cowboys_high_noon_enemy',
        friendlyMinionUid: selected.minionUid,
        casterPlayerId: playerId,
    } satisfies DuelContinuation;
    return { state: queueInteraction(state, interaction), events: [] };
};

const handleHighNoonEnemy = (state: MatchState<SmashUpCore>, _playerId: string, value: unknown, data: any, _random: RandomFn, now: number) => {
    const selected = value as MinionChoice | undefined;
    const ctx = data?.continuationContext as DuelContinuation | undefined;
    if (!ctx || !selected?.minionUid) return { state, events: [] };
    return {
        state: startDuel(state, {
            sourceId: 'cowboys_high_noon',
            sourcePlayerId: ctx.casterPlayerId,
            challengerMinionUid: ctx.friendlyMinionUid,
            challengedMinionUid: selected.minionUid,
            outcome: 'high_noon',
            destroyReason: 'cowboys_high_noon',
        }, now),
        events: [],
    };
};

const handleRunEmOffFriendly = (state: MatchState<SmashUpCore>, playerId: string, value: unknown, _data: any, _random: RandomFn, now: number) => {
    const selected = value as FriendlyChoice | undefined;
    if (!selected?.minionUid || selected.baseIndex === undefined) return { state, events: [] };
    const options = buildEnemyMinionOptions(state.core, selected.baseIndex, playerId);
    if (options.length === 0) return { state, events: [] };
    const interaction = createSimpleChoice(
        `cowboys_run_em_off_enemy_${now}`,
        playerId,
        '赶走他们：选择要决斗的对手随从',
        options,
        { sourceId: 'cowboys_run_em_off_enemy', targetType: 'minion' },
    );
    (interaction.data as any).continuationContext = {
        sourceId: 'cowboys_run_em_off_enemy',
        friendlyMinionUid: selected.minionUid,
        casterPlayerId: playerId,
    } satisfies DuelContinuation;
    return { state: queueInteraction(state, interaction), events: [] };
};

const handleRunEmOffEnemy = (state: MatchState<SmashUpCore>, _playerId: string, value: unknown, data: any, _random: RandomFn, now: number) => {
    const selected = value as MinionChoice | undefined;
    const ctx = data?.continuationContext as DuelContinuation | undefined;
    if (!ctx || !selected?.minionUid) return { state, events: [] };
    return {
        state: startDuel(state, {
            sourceId: 'cowboys_run_em_off',
            sourcePlayerId: ctx.casterPlayerId,
            challengerMinionUid: ctx.friendlyMinionUid,
            challengedMinionUid: selected.minionUid,
            outcome: 'run_em_off',
        }, now),
        events: [],
    };
};

const handleGoldInThemTharHills = (state: MatchState<SmashUpCore>, playerId: string, value: unknown, data: any, _random: RandomFn, now: number) => {
    const selected = value as { cardUid?: string; defId?: string } | undefined;
    const topCardUids = (data?.continuationContext as any)?.topCardUids as string[] | undefined;
    const player = state.core.players[playerId];
    if (!selected?.cardUid || !topCardUids || !player) return { state, events: [] };
    const topCards = player.deck.slice(0, topCardUids.length);
    const chosen = topCards.find(card => card.uid === selected.cardUid);
    if (!chosen) return { state, events: [] };
    const remaining = topCards.filter(card => card.uid !== chosen.uid);
    const restOfDeck = player.deck.slice(topCards.length);
    const reordered = [...remaining.map(card => card.uid), ...restOfDeck.map(card => card.uid)];
    const events: SmashUpEvent[] = [
        {
            type: SU_EVENTS.CARDS_DRAWN,
            payload: { playerId, count: 1, cardUids: [chosen.uid] },
            timestamp: now,
        } as CardsDrawnEvent,
        {
            type: SU_EVENTS.DECK_REORDERED,
            payload: { playerId, deckUids: reordered },
            timestamp: now,
        } as DeckReorderedEvent,
    ];
    if (chosen.type === 'minion') {
        events.push(grantExtraMinion(playerId, 'cowboys_gold_in_them_thar_hills', now));
    } else if (chosen.type === 'action') {
        events.push(grantExtraAction(playerId, 'cowboys_gold_in_them_thar_hills', now));
    }
    return { state, events };
};

const handleStagecoachSource = (state: MatchState<SmashUpCore>, playerId: string, value: unknown, _data: any, _random: RandomFn, now: number) => {
    const selected = value as { baseIndex?: number } | undefined;
    if (selected?.baseIndex === undefined) return { state, events: [] };
    const sourceBase = state.core.bases[selected.baseIndex];
    if (!sourceBase) return { state, events: [] };

    const movableMinions = sourceBase.minions
        .filter(minion => minion.controller === playerId)
        .map(minion => ({
            uid: minion.uid,
            defId: minion.defId,
            baseIndex: selected.baseIndex!,
            label: getCardDef(minion.defId)?.name ?? minion.defId,
        }));
    if (movableMinions.length === 0) {
        return { state, events: [] };
    }

    const interaction = createSimpleChoice(
        `cowboys_stagecoach_cards_${now}`,
        playerId,
        '驿站马车：选择 1-2 个要移动的己方随从',
        buildMinionTargetOptions(movableMinions, { state: state.core, sourcePlayerId: playerId }) as any[],
        {
            sourceId: 'cowboys_stagecoach_cards',
            targetType: 'minion',
            multi: { min: 1, max: Math.min(2, movableMinions.length) },
        },
    );
    (interaction.data as any).continuationContext = {
        sourceBaseIndex: selected.baseIndex,
    } satisfies StagecoachSourceContinuation;
    return { state: queueInteraction(state, interaction), events: [] };
};

const handleStagecoachCards = (state: MatchState<SmashUpCore>, playerId: string, value: unknown, data: any, _random: RandomFn, now: number) => {
    const ctx = (data?.continuationContext ?? {}) as StagecoachSourceContinuation;
    const selected = (Array.isArray(value) ? value : []) as MinionChoice[];
    if (ctx.sourceBaseIndex === undefined || selected.length === 0) return { state, events: [] };

    const destinationBases = state.core.bases
        .map((base, baseIndex) => ({ baseIndex, label: getBaseDef(base.defId)?.name ?? base.defId }))
        .filter(base => base.baseIndex !== ctx.sourceBaseIndex);
    if (destinationBases.length === 0) return { state, events: [] };

    const interaction = createSimpleChoice(
        `cowboys_stagecoach_destination_${now}`,
        playerId,
        '驿站马车：选择目标基地',
        buildBaseTargetOptions(destinationBases, state.core),
        { sourceId: 'cowboys_stagecoach_destination', targetType: 'base' },
    );
    (interaction.data as any).continuationContext = {
        sourceBaseIndex: ctx.sourceBaseIndex,
        selectedMinions: selected
            .filter(choice => choice.minionUid && choice.defId)
            .map(choice => ({ minionUid: choice.minionUid, defId: choice.defId! })),
    } satisfies StagecoachDestinationContinuation;
    return { state: queueInteraction(state, interaction), events: [] };
};

const handleStagecoachDestination = (state: MatchState<SmashUpCore>, _playerId: string, value: unknown, data: any, _random: RandomFn, now: number) => {
    const selected = value as { baseIndex?: number; baseDefId?: string } | undefined;
    const ctx = (data?.continuationContext ?? {}) as StagecoachDestinationContinuation;
    if (selected?.baseIndex === undefined || ctx.sourceBaseIndex === undefined || !ctx.selectedMinions?.length) {
        return { state, events: [] };
    }

    return {
        state,
        events: ctx.selectedMinions.flatMap(minion => buildValidatedMoveEvents(state, {
            minionUid: minion.minionUid,
            minionDefId: minion.defId,
            fromBaseIndex: ctx.sourceBaseIndex,
            toBaseIndex: selected.baseIndex!,
            toBaseDefId: selected.baseDefId,
            reason: 'cowboys_stagecoach',
            now,
        })),
    };
};

const handleDynamiteSurprise = (state: MatchState<SmashUpCore>, playerId: string, value: unknown, _data: any, _random: RandomFn, now: number) => {
    const selected = value as MinionChoice | undefined;
    if (!selected?.minionUid || selected.baseIndex === undefined || !selected.defId) return { state, events: [] };
    return {
        state,
        events: buildValidatedDestroyEvents(state, {
            minionUid: selected.minionUid,
            minionDefId: selected.defId,
            fromBaseIndex: selected.baseIndex,
            destroyerId: playerId,
            reason: 'cowboys_dynamite_surprise',
            now,
        }),
    };
};

const handleSheriffBeforeScoring = (state: MatchState<SmashUpCore>, _playerId: string, value: unknown, data: any, _random: RandomFn, now: number) => {
    const selected = value as { skip?: boolean; minionUid?: string } | undefined;
    if (selected?.skip || !selected?.minionUid) return { state, events: [] };
    const ctx = data?.continuationContext as DuelContinuation | undefined;
    if (!ctx) return { state, events: [] };
    return {
        state: startDuel(state, {
            sourceId: 'cowboys_sheriff_before_scoring',
            sourcePlayerId: ctx.casterPlayerId,
            challengerMinionUid: ctx.friendlyMinionUid,
            challengedMinionUid: selected.minionUid,
            outcome: 'destroy_loser',
            destroyReason: 'cowboys_sheriff_before_scoring',
        }, now),
        events: [],
    };
};

const handleBaseSoSoCorral = (state: MatchState<SmashUpCore>, _playerId: string, value: unknown, data: any, _random: RandomFn, now: number) => {
    const selected = value as { skip?: boolean; minionUid?: string } | undefined;
    if (selected?.skip || !selected?.minionUid) return { state, events: [] };
    const ctx = data?.continuationContext as DuelContinuation | undefined;
    if (!ctx) return { state, events: [] };
    return {
        state: startDuel(state, {
            sourceId: 'base_so_so_corral',
            sourcePlayerId: ctx.casterPlayerId,
            challengerMinionUid: ctx.friendlyMinionUid,
            challengedMinionUid: selected.minionUid,
            outcome: 'destroy_loser',
            destroyReason: 'base_so_so_corral',
        }, now),
        events: [],
    };
};

function collectOwnMinions(state: SmashUpCore, playerId: PlayerId): Array<{ uid: string; defId: string; baseIndex: number; label: string }> {
    const results: Array<{ uid: string; defId: string; baseIndex: number; label: string }> = [];
    state.bases.forEach((base, baseIndex) => {
        base.minions.forEach((minion) => {
            if (minion.controller !== playerId) return;
            results.push({
                uid: minion.uid,
                defId: minion.defId,
                baseIndex,
                label: getCardDef(minion.defId)?.name ?? minion.defId,
            });
        });
    });
    return results;
}

function collectFriendlyDuelStarters(state: SmashUpCore, playerId: PlayerId): Array<{ uid: string; defId: string; baseIndex: number; label: string }> {
    return collectOwnMinions(state, playerId).filter(({ baseIndex }) => buildEnemyMinionOptions(state, baseIndex, playerId).length > 0);
}

function collectStagecoachSourceBases(state: SmashUpCore, playerId: PlayerId): Array<{ baseIndex: number; label: string }> {
    return state.bases
        .map((base, baseIndex) => ({
            baseIndex,
            label: getBaseDef(base.defId)?.name ?? base.defId,
            movableCount: base.minions.filter(minion => minion.controller === playerId).length,
        }))
        .filter(base => base.movableCount > 0)
        .map(({ baseIndex, label }) => ({ baseIndex, label }));
}

function buildEnemyMinionOptions(state: SmashUpCore, baseIndex: number, sourcePlayerId: PlayerId): any[] {
    const base = state.bases[baseIndex];
    if (!base) return [];
    return buildMinionTargetOptions(
        base.minions
            .filter(minion => minion.controller !== sourcePlayerId)
            .map(minion => ({
                uid: minion.uid,
                defId: minion.defId,
                baseIndex,
                label: `${getCardDef(minion.defId)?.name ?? minion.defId}（力量 ${getMinionPower(state, minion, baseIndex)}）`,
            })),
        { state, sourcePlayerId, effectType: 'destroy' },
    );
}

function isWinningOnBase(state: SmashUpCore, baseIndex: number, playerId: PlayerId): boolean {
    const base = state.bases[baseIndex];
    if (!base) return false;
    const totals = new Map<PlayerId, number>();
    for (const minion of base.minions) {
        totals.set(minion.controller, (totals.get(minion.controller) ?? 0) + getMinionPower(state, minion, baseIndex));
    }
    const ownPower = totals.get(playerId) ?? 0;
    for (const [pid, power] of totals) {
        if (pid === playerId) continue;
        if (power >= ownPower) return false;
    }
    return ownPower > 0;
}

const dummyRandom: RandomFn = {
    random: () => 0.5,
    d: () => 1,
    range: (min: number) => min,
    shuffle: <T>(items: T[]) => [...items],
};
