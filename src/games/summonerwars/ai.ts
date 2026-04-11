import type { Command, MatchState, PlayerId } from '../../engine/types';
import {
    buildDeterministicAiNoise,
    createAiLegalActionId,
    createActionKindScorer,
    createProfileAwareActionScorer,
    createScoredLocalAiPolicy,
    withAiActionStrategyTags,
} from '../../engine/ai';
import {
    OPTIONAL_SKIP_AI_HINT,
    buildTargetAiHint,
    createInteractionHintScorer,
} from '../../engine/ai/semantics';
import type {
    AiEffectIntent,
    AiHint,
    AiLegalAction,
    AiStrategyProfile,
    GameAiRuntime,
    LocalAiActionScorer,
} from '../../engine/ai';
import type { InteractionDescriptor as EngineInteractionDescriptor, PromptMultiConfig } from '../../engine/systems/InteractionSystem';
import { SummonerWarsDomain } from './domain';
import { abilityRegistry } from './domain/abilities';
import { getActivatableAbilities, canActivateAbility } from './domain/abilityHelpers';
import {
    BOARD_COLS,
    BOARD_ROWS,
    getAdjacentCells,
    getPlayerUnits,
    getSummoner,
    getUnitAt,
    getStructureAt,
    getValidAttackTargetsEnhanced,
    getValidBuildPositions,
    getValidMoveTargetsEnhanced,
    getValidSummonPositions,
    manhattanDistance,
} from './domain/helpers';
import { SW_COMMANDS } from './domain/types';
import type {
    BoardUnit,
    Card,
    CellCoord,
    FactionId,
    GamePhase,
    SummonerWarsCore,
} from './domain/types';
import type { AbilityDef } from './domain/abilities';

type SummonerWarsState = MatchState<SummonerWarsCore>;
type SetupPhase = 'setup';
type SummonerWarsTurnPhase = SetupPhase | GamePhase;
type SummonerWarsStrategyTag =
    | 'summoner-defense'
    | 'summoner-pressure'
    | 'board-control'
    | 'economy'
    | 'ability-tempo';

type SummonerWarsInteractionOption = {
    id?: string;
    label?: string;
    value?: unknown;
    disabled?: boolean;
    _ai?: AiHint;
};

const FACTION_PRIORITY: FactionId[] = [
    'necromancer',
    'paladin',
    'frost',
    'goblin',
    'barbaric',
    'trickster',
];

const SUPPORTED_DIRECT_TARGET_PAYLOAD_FIELDS = new Set(['targetPosition']);

const createCommand = (playerId: PlayerId, type: string, payload: unknown = {}): Command => ({
    type,
    playerId,
    payload,
    timestamp: 0,
});

const isInteractionCommand = (type: string): boolean => type.startsWith('SYS_INTERACTION_');

const isCommandValid = (
    state: SummonerWarsState,
    playerId: PlayerId,
    type: string,
    payload: unknown = {},
): boolean => {
    if (isInteractionCommand(type)) {
        return validateInteractionCommand(state, playerId, type, payload);
    }
    const result = SummonerWarsDomain.validate(state, createCommand(playerId, type, payload) as never);
    return result.valid;
};

const appendAction = (
    actions: AiLegalAction[],
    state: SummonerWarsState,
    playerId: PlayerId,
    action: AiLegalAction,
): void => {
    if (action.commands.length === 0) return;
    const isValid = action.commands.every((command) => isCommandValid(state, playerId, command.type, command.payload));
    if (!isValid) return;
    actions.push(action);
};

const buildSimpleChoicePayload = (
    interactionId: string,
    optionIds: string[],
    multi: PromptMultiConfig | undefined,
    optionValue?: unknown,
): Record<string, unknown> => {
    if (optionIds.length <= 1 && !multi) {
        return optionValue === undefined
            ? { interactionId, optionId: optionIds[0] }
            : { interactionId, optionId: optionIds[0], mergedValue: optionValue };
    }
    if (optionIds.length <= 1 && (multi?.min ?? 0) <= 1) {
        return optionValue === undefined
            ? { interactionId, optionId: optionIds[0] }
            : { interactionId, optionId: optionIds[0], mergedValue: optionValue };
    }
    return { interactionId, optionIds };
};

const isRecoverableInteractionValue = (value: unknown): boolean => {
    if (!value || typeof value !== 'object') {
        return false;
    }
    const candidate = value as {
        skip?: unknown;
        done?: unknown;
        cancel?: unknown;
        __cancel__?: unknown;
        __emergency_skip__?: unknown;
    };
    return Boolean(
        candidate.skip
        || candidate.done
        || candidate.cancel
        || candidate.__cancel__
        || candidate.__emergency_skip__,
    );
};

const resolveSimpleChoiceFallbackReason = (
    options: SummonerWarsInteractionOption[],
    multi: PromptMultiConfig | undefined,
): 'empty-options' | 'all-options-disabled' | 'min-selection-unreachable' => {
    const minSelections = typeof multi?.min === 'number' ? multi.min : 1;
    if (options.length === 0) {
        return 'empty-options';
    }
    const enabledOptions = options.filter((option) => option.disabled !== true);
    if (enabledOptions.length === 0) {
        return 'all-options-disabled';
    }
    if (enabledOptions.length < Math.max(0, minSelections)) {
        return 'min-selection-unreachable';
    }
    return 'empty-options';
};

const buildEmergencyInteractionFallbackAction = (
    current: EngineInteractionDescriptor,
    reason: 'empty-options' | 'all-options-disabled' | 'min-selection-unreachable',
): AiLegalAction => {
    if (current.kind === 'simple-choice') {
        const data = current.data as {
            options?: SummonerWarsInteractionOption[];
            multi?: PromptMultiConfig;
        };
        const enabledOptions = (data.options ?? []).filter((option): option is Required<Pick<SummonerWarsInteractionOption, 'id'>> & SummonerWarsInteractionOption => {
            return typeof option?.id === 'string' && option.disabled !== true;
        });
        const recoverableOption = enabledOptions.find((option) => isRecoverableInteractionValue(option.value));
        if (recoverableOption) {
            return {
                actionId: createAiLegalActionId('interaction', current.id, recoverableOption.id),
                kind: 'interaction-choice',
                label: recoverableOption.label ?? '跳过交互',
                commands: [{
                    type: 'SYS_INTERACTION_RESPOND',
                    payload: buildSimpleChoicePayload(current.id, [recoverableOption.id], data.multi, recoverableOption.value),
                }],
                aiHints: [OPTIONAL_SKIP_AI_HINT],
                metadata: {
                    interactionId: current.id,
                    optionId: recoverableOption.id,
                    reason,
                    emergencyFallback: true,
                },
            };
        }

        if ((data.multi?.min ?? 1) === 0) {
            return {
                actionId: createAiLegalActionId('interaction', current.id, 'empty-selection'),
                kind: 'interaction-choice',
                label: '不选择任何项',
                commands: [{
                    type: 'SYS_INTERACTION_RESPOND',
                    payload: { interactionId: current.id, optionIds: [] },
                }],
                aiHints: [OPTIONAL_SKIP_AI_HINT],
                metadata: {
                    interactionId: current.id,
                    optionIds: [],
                    reason,
                    emergencyFallback: true,
                },
            };
        }
    }

    return {
        actionId: createAiLegalActionId('interaction', current.id, 'emergency-cancel'),
        kind: 'interaction-cancel',
        label: '取消交互',
        commands: [{
            type: 'SYS_INTERACTION_CANCEL',
            payload: { interactionId: current.id, reason },
        }],
        aiHints: [OPTIONAL_SKIP_AI_HINT],
        metadata: {
            interactionId: current.id,
            reason,
            emergencyFallback: true,
        },
    };
};

const validateInteractionCommand = (
    state: SummonerWarsState,
    playerId: PlayerId,
    type: string,
    payload: unknown,
): boolean => {
    const current = state.sys.interaction?.current as EngineInteractionDescriptor | undefined;
    if (!current || current.playerId !== playerId) return false;

    const interactionId = (payload as { interactionId?: unknown } | undefined)?.interactionId;
    if (typeof interactionId !== 'string' || interactionId !== current.id) return false;

    if (type === 'SYS_INTERACTION_CANCEL') {
        return true;
    }

    if (type === 'SYS_INTERACTION_CONFIRM') {
        return current.kind === 'multistep-choice';
    }

    if (type !== 'SYS_INTERACTION_RESPOND' || current.kind !== 'simple-choice') {
        return false;
    }

    const data = current.data as {
        options?: SummonerWarsInteractionOption[];
        multi?: PromptMultiConfig;
    };
    const availableOptions = (data.options ?? []).filter((option): option is Required<Pick<SummonerWarsInteractionOption, 'id'>> & SummonerWarsInteractionOption => {
        return typeof option?.id === 'string' && option.disabled !== true;
    });
    const optionsById = new Map(availableOptions.map((option) => [option.id, option] as const));
    const response = payload as { optionId?: unknown; optionIds?: unknown; mergedValue?: unknown };

    if (data.multi) {
        const rawOptionIds = Array.isArray(response.optionIds)
            ? response.optionIds
            : typeof response.optionId === 'string'
                ? [response.optionId]
                : [];
        const selectedIds = Array.from(new Set(rawOptionIds.filter((id): id is string => typeof id === 'string')));
        if (selectedIds.some((id) => !optionsById.has(id))) return false;
        if (response.mergedValue !== undefined) return false;

        const selectedOptions = selectedIds.map((id) => optionsById.get(id)!);
        const selectedSingleRecovery = selectedOptions.length === 1 && isRecoverableInteractionValue(selectedOptions[0]?.value);
        const minSelections = typeof data.multi.min === 'number' ? data.multi.min : 1;
        const maxSelections = typeof data.multi.max === 'number' ? data.multi.max : undefined;
        if (!selectedSingleRecovery && selectedIds.length < minSelections) return false;
        if (!selectedSingleRecovery && maxSelections !== undefined && selectedIds.length > maxSelections) return false;
        return true;
    }

    if (typeof response.optionId !== 'string') return false;
    return optionsById.has(response.optionId);
};

const buildOptionCombinations = (
    optionIds: string[],
    minCount: number,
    maxCount: number,
): string[][] => {
    if (optionIds.length === 0) return [];
    const normalizedMin = Math.max(1, minCount);
    const normalizedMax = Math.max(normalizedMin, maxCount);
    const results: string[][] = [];

    const walk = (start: number, selected: string[]): void => {
        if (selected.length >= normalizedMin && selected.length <= normalizedMax) {
            results.push([...selected]);
        }
        if (selected.length >= normalizedMax) return;
        for (let index = start; index < optionIds.length; index += 1) {
            selected.push(optionIds[index]);
            walk(index + 1, selected);
            selected.pop();
        }
    };

    walk(0, []);
    return results;
};

const getAllBoardUnitTargets = (core: SummonerWarsCore): Array<{ unit: BoardUnit; position: CellCoord }> => {
    const targets: Array<{ unit: BoardUnit; position: CellCoord }> = [];
    for (let row = 0; row < BOARD_ROWS; row += 1) {
        for (let col = 0; col < BOARD_COLS; col += 1) {
            const unit = core.board[row][col].unit;
            if (!unit) continue;
            targets.push({ unit, position: { row, col } });
        }
    }
    return targets;
};

const getAllBoardPositions = (): CellCoord[] => {
    const positions: CellCoord[] = [];
    for (let row = 0; row < BOARD_ROWS; row += 1) {
        for (let col = 0; col < BOARD_COLS; col += 1) {
            positions.push({ row, col });
        }
    }
    return positions;
};

const getEnemyPlayerId = (playerId: PlayerId): PlayerId => (playerId === '0' ? '1' : '0');

const supportsDirectTargetSelectionAiExpansion = (abilityDef: AbilityDef): boolean => {
    const targetCount = abilityDef.targetSelection?.count ?? 1;
    if (targetCount !== 1) return false;
    const requiredFields = abilityDef.interactionChain?.payloadContract?.required ?? [];
    return requiredFields.every((field) => SUPPORTED_DIRECT_TARGET_PAYLOAD_FIELDS.has(field));
};

const pushStrategyTag = (
    tags: SummonerWarsStrategyTag[],
    tag: SummonerWarsStrategyTag,
): void => {
    if (!tags.includes(tag)) {
        tags.push(tag);
    }
};

const addStrategyWeight = (
    weights: Partial<Record<SummonerWarsStrategyTag, number>>,
    tag: SummonerWarsStrategyTag,
    value: number,
): void => {
    weights[tag] = Number(((weights[tag] ?? 0) + value).toFixed(3));
};

const getCurrentPhase = (state: SummonerWarsState): SummonerWarsTurnPhase => {
    if (!state.core.hostStarted) {
        return 'setup';
    }
    return state.core.phase;
};

const getFactionPriority = (factionId: FactionId): number => {
    const index = FACTION_PRIORITY.indexOf(factionId);
    return index >= 0 ? index : FACTION_PRIORITY.length + 10;
};

const EFFECT_INTENT_PRIORITY: AiEffectIntent[] = [
    'destroy',
    'debuff',
    'buff',
    'move',
    'resource',
];

const inferAbilityEffectIntent = (abilityDef: AbilityDef | undefined): AiEffectIntent | null => {
    if (!abilityDef?.effects || abilityDef.effects.length === 0) return null;

    const found = new Set<AiEffectIntent>();
    for (const effect of abilityDef.effects) {
        switch (effect.type) {
            case 'damage':
            case 'destroyUnit':
                found.add('destroy');
                break;
            case 'takeControl':
            case 'preventMagicGain':
            case 'removeCharge':
                found.add('debuff');
                break;
            case 'heal':
            case 'addCharge':
            case 'grantExtraAttack':
            case 'doubleStrength':
            case 'reduceDamage':
                found.add('buff');
                break;
            case 'modifyStrength': {
                if (typeof effect.value === 'number') {
                    found.add(effect.value >= 0 ? 'buff' : 'debuff');
                }
                break;
            }
            case 'modifyLife': {
                if (typeof effect.value === 'number') {
                    found.add(effect.value >= 0 ? 'buff' : 'debuff');
                }
                break;
            }
            case 'modifyMagic':
            case 'setCharge':
                found.add('resource');
                break;
            case 'moveUnit':
            case 'pushPull':
            case 'extraMove':
                found.add('move');
                break;
            default:
                break;
        }
    }

    for (const intent of EFFECT_INTENT_PRIORITY) {
        if (found.has(intent)) return intent;
    }
    return null;
};

const getInteractionSourceAbility = (
    current: EngineInteractionDescriptor | undefined,
): AbilityDef | undefined => {
    const data = current?.data as { sourceId?: string } | undefined;
    const sourceId = typeof data?.sourceId === 'string' ? data.sourceId : undefined;
    return sourceId ? abilityRegistry.get(sourceId) : undefined;
};

const buildInteractionOptionAiHints = (
    state: SummonerWarsState,
    playerId: PlayerId,
    current: EngineInteractionDescriptor,
    option: SummonerWarsInteractionOption,
): AiHint[] => {
    const hints: AiHint[] = [];
    if (option._ai) hints.push(option._ai);

    const optionId = String(option.id ?? '').toLowerCase();
    if (optionId.includes('cancel') || optionId.includes('skip') || optionId.includes('pass')) {
        hints.push(OPTIONAL_SKIP_AI_HINT);
    }

    const value = option.value as { targetPosition?: CellCoord } | undefined;
    const targetPosition = value?.targetPosition;
    if (!targetPosition) return hints;

    const targetUnit = getUnitAt(state.core, targetPosition);
    const targetStructure = targetUnit ? null : getStructureAt(state.core, targetPosition);
    const targetOwner = targetUnit?.owner ?? targetStructure?.owner;

    const abilityDef = getInteractionSourceAbility(current);
    const effectIntent = inferAbilityEffectIntent(abilityDef);

    if (targetOwner) {
        hints.push(buildTargetAiHint({
            actorPlayerId: playerId,
            targetPlayerId: targetOwner,
            targetKind: 'card',
            effectIntent: effectIntent ?? 'affect',
            tags: [
                'sw:interaction',
                ...(abilityDef ? [`ability:${abilityDef.id}`] : []),
            ],
        }));
    }

    return hints;
};

const getCardKeepValue = (card: Card): number => {
    if (card.cardType === 'unit') {
        return card.strength * 18 + card.life * 8 + card.cost * 6;
    }
    if (card.cardType === 'structure') {
        return 40 + card.life * 6 + card.cost * 5 + (card.isGate ? 10 : 0);
    }
    return 18 + card.cost * 6 + (card.isActive ? 8 : 0) + (card.playPhase === 'any' ? 4 : 0);
};

const getCenterScore = (position: CellCoord): number => {
    const centerCol = Math.floor((BOARD_COLS - 1) / 2);
    return Math.max(0, 4 - Math.abs(position.col - centerCol));
};

const cloneCoreWithMovedUnit = (
    core: SummonerWarsCore,
    from: CellCoord,
    to: CellCoord,
): SummonerWarsCore | null => {
    const unit = core.board[from.row]?.[from.col]?.unit;
    if (!unit) return null;
    const board = core.board.map((row) => row.map((cell) => ({ ...cell })));
    board[from.row][from.col].unit = undefined;
    board[to.row][to.col].unit = {
        ...unit,
        position: to,
    };
    return {
        ...core,
        board,
    };
};

const estimateSummonerThreat = (
    core: SummonerWarsCore,
    playerId: PlayerId,
): {
    remainingLife: number;
    directThreatDamage: number;
    nearbyEnemyPressure: number;
    threateningEnemyIds: string[];
} => {
    const summoner = getSummoner(core, playerId);
    if (!summoner) {
        return {
            remainingLife: 0,
            directThreatDamage: 0,
            nearbyEnemyPressure: 0,
            threateningEnemyIds: [],
        };
    }

    const enemyUnits = getPlayerUnits(core, getEnemyPlayerId(playerId));
    let directThreatDamage = 0;
    let nearbyEnemyPressure = 0;
    const threateningEnemyIds: string[] = [];

    for (const enemyUnit of enemyUnits) {
        const canHitSummonerNow = getValidAttackTargetsEnhanced(core, enemyUnit.position).some((target) => {
            return target.row === summoner.position.row && target.col === summoner.position.col;
        });
        if (canHitSummonerNow) {
            directThreatDamage += enemyUnit.card.strength;
            threateningEnemyIds.push(enemyUnit.instanceId);
        }

        const distance = manhattanDistance(enemyUnit.position, summoner.position);
        nearbyEnemyPressure += Math.max(0, 5 - distance) * Math.max(1, enemyUnit.card.strength);
    }

    return {
        remainingLife: Math.max(0, summoner.card.life - summoner.damage),
        directThreatDamage,
        nearbyEnemyPressure,
        threateningEnemyIds,
    };
};

const getSummonerWarsStrategyProfile = (
    state: SummonerWarsState,
    playerId: PlayerId,
): AiStrategyProfile<SummonerWarsStrategyTag> => {
    const phase = getCurrentPhase(state);
    const threat = estimateSummonerThreat(state.core, playerId);
    const weights: Partial<Record<SummonerWarsStrategyTag, number>> = {};
    const summary: string[] = [];

    if (threat.remainingLife > 0 && threat.directThreatDamage >= threat.remainingLife) {
        addStrategyWeight(weights, 'summoner-defense', 2.4);
        addStrategyWeight(weights, 'board-control', 1.1);
        summary.push('先保召唤师');
    } else if (threat.nearbyEnemyPressure >= 8) {
        addStrategyWeight(weights, 'summoner-defense', 2);
        addStrategyWeight(weights, 'board-control', 1);
        addStrategyWeight(weights, 'summoner-pressure', 0.45);
        summary.push('前线承压，优先回防');
    } else {
        addStrategyWeight(weights, 'summoner-pressure', 1.15);
        addStrategyWeight(weights, 'board-control', 0.9);
    }

    switch (phase) {
        case 'summon':
            addStrategyWeight(weights, 'summoner-pressure', 0.35);
            addStrategyWeight(weights, 'board-control', 0.15);
            break;
        case 'move':
            addStrategyWeight(weights, 'summoner-pressure', 0.4);
            addStrategyWeight(weights, 'board-control', 0.2);
            break;
        case 'attack':
            addStrategyWeight(weights, 'summoner-pressure', 0.55);
            addStrategyWeight(weights, 'board-control', 0.25);
            break;
        case 'build':
            addStrategyWeight(weights, 'summoner-defense', 0.35);
            addStrategyWeight(weights, 'board-control', 0.2);
            break;
        case 'magic':
            addStrategyWeight(weights, 'economy', 1.4);
            summary.push('资源回合优先经济');
            break;
        default:
            addStrategyWeight(weights, 'ability-tempo', 0.35);
            break;
    }

    if (summary.length === 0) {
        summary.push('保持中线与召唤师压力平衡');
    }

    const tags = (Object.entries(weights) as Array<[SummonerWarsStrategyTag, number]>)
        .filter(([, weight]) => weight >= 0.85)
        .map(([tag]) => tag);

    return {
        tags,
        tagWeights: weights,
        summary,
    };
};

const buildSummonStrategyTags = (args: {
    distanceToEnemySummoner: number;
    distanceToOwnSummoner: number;
    centerScore: number;
}): SummonerWarsStrategyTag[] => {
    const tags: SummonerWarsStrategyTag[] = [];
    if (args.distanceToOwnSummoner <= 1) {
        pushStrategyTag(tags, 'summoner-defense');
    }
    if (args.distanceToEnemySummoner <= 4) {
        pushStrategyTag(tags, 'summoner-pressure');
    }
    if (args.centerScore >= 2) {
        pushStrategyTag(tags, 'board-control');
    }
    return tags;
};

const buildMoveStrategyTags = (args: {
    attackTargetsAfterMove: number;
    distanceToEnemySummonerBefore: number;
    distanceToEnemySummonerAfter: number;
    distanceToOwnSummonerBefore: number;
    distanceToOwnSummonerAfter: number;
    directThreatDamageBefore: number;
    directThreatDamageAfter: number;
    nearbyEnemyPressureBefore: number;
    nearbyEnemyPressureAfter: number;
    centerScore: number;
}): SummonerWarsStrategyTag[] => {
    const tags: SummonerWarsStrategyTag[] = [];
    if (
        args.attackTargetsAfterMove > 0
        || args.distanceToEnemySummonerAfter < args.distanceToEnemySummonerBefore
    ) {
        pushStrategyTag(tags, 'summoner-pressure');
    }
    if (
        args.directThreatDamageAfter < args.directThreatDamageBefore
        || args.nearbyEnemyPressureAfter < args.nearbyEnemyPressureBefore
        || args.distanceToOwnSummonerAfter < args.distanceToOwnSummonerBefore
    ) {
        pushStrategyTag(tags, 'summoner-defense');
    }
    if (args.centerScore >= 2) {
        pushStrategyTag(tags, 'board-control');
    }
    return tags;
};

const buildAttackStrategyTags = (args: {
    targetType: string;
    targetIsThreateningSummoner: boolean;
}): SummonerWarsStrategyTag[] => {
    const tags: SummonerWarsStrategyTag[] = [];
    if (args.targetType === 'summoner') {
        pushStrategyTag(tags, 'summoner-pressure');
    }
    if (args.targetIsThreateningSummoner) {
        pushStrategyTag(tags, 'summoner-defense');
    }
    if (args.targetType === 'champion' || args.targetType === 'common' || args.targetType === 'structure') {
        pushStrategyTag(tags, 'board-control');
    }
    return tags;
};

type ActivatedAbilityTargetSummary = {
    count: number;
    championCount: number;
    summonerCount: number;
    nearOwnSummonerCount: number;
    attackReadyCount: number;
    enemySummonerPressureCount: number;
};

const summarizeAbilityTargetUnits = (
    state: SummonerWarsState,
    units: BoardUnit[],
    ownSummonerPosition: CellCoord | null,
    enemySummonerPosition: CellCoord | null,
): ActivatedAbilityTargetSummary => {
    let championCount = 0;
    let summonerCount = 0;
    let nearOwnSummonerCount = 0;
    let attackReadyCount = 0;
    let enemySummonerPressureCount = 0;

    for (const unit of units) {
        if (unit.card.unitClass === 'champion') {
            championCount += 1;
        }
        if (unit.card.unitClass === 'summoner') {
            summonerCount += 1;
        }
        if (
            ownSummonerPosition
            && manhattanDistance(unit.position, ownSummonerPosition) <= 1
        ) {
            nearOwnSummonerCount += 1;
        }

        const attackTargets = getValidAttackTargetsEnhanced(state.core, unit.position);
        if (attackTargets.length > 0) {
            attackReadyCount += 1;
        }
        if (
            enemySummonerPosition
            && attackTargets.some((target) => {
                return target.row === enemySummonerPosition.row && target.col === enemySummonerPosition.col;
            })
        ) {
            enemySummonerPressureCount += 1;
        }
    }

    return {
        count: units.length,
        championCount,
        summonerCount,
        nearOwnSummonerCount,
        attackReadyCount,
        enemySummonerPressureCount,
    };
};

const buildActivatedAbilitySemantics = (args: {
    state: SummonerWarsState;
    playerId: PlayerId;
    unit: BoardUnit;
    abilityDef: AbilityDef;
}): {
    strategyTags: SummonerWarsStrategyTag[];
    metadata: Record<string, unknown>;
} => {
    const { state, playerId, unit, abilityDef } = args;
    const strategyTags: SummonerWarsStrategyTag[] = ['ability-tempo'];
    const ownSummoner = getSummoner(state.core, playerId);
    const enemySummoner = getSummoner(state.core, getEnemyPlayerId(playerId));
    const adjacentAllies = getAdjacentCells(unit.position)
        .map((position) => getUnitAt(state.core, position))
        .filter((candidate): candidate is BoardUnit => Boolean(candidate) && candidate.owner === playerId);
    const allAllies = getPlayerUnits(state.core, playerId).filter((candidate) => candidate.instanceId !== unit.instanceId);
    const effectTypes = abilityDef.effects.map((effect) => effect.type);
    const sourceAttackTargets = getValidAttackTargetsEnhanced(state.core, unit.position);

    const metadata: Record<string, unknown> = {
        abilityId: abilityDef.id,
        abilityEffectTypes: effectTypes,
        sourceUnitClass: unit.card.unitClass,
        sourceOwner: playerId,
        sourceBoostsBefore: unit.boosts ?? 0,
        sourceAttackTargetCount: sourceAttackTargets.length,
        costsMoveAction: abilityDef.costsMoveAction === true,
        costsAttackAction: abilityDef.costsAttackAction === true,
        selfChargeGain: 0,
        adjacentAllyCount: 0,
        adjacentChampionCount: 0,
        adjacentSummonerCount: 0,
        adjacentAttackReadyCount: 0,
        adjacentEnemySummonerPressureCount: 0,
        allAllyCount: 0,
        allChampionCount: 0,
        allSummonerCount: 0,
        allAttackReadyCount: 0,
        allEnemySummonerPressureCount: 0,
    };

    const applyFriendlyTargetSemantics = (target: string): void => {
        const summary = summarizeAbilityTargetUnits(
            state,
            target === 'adjacentAllies' ? adjacentAllies : allAllies,
            ownSummoner?.position ?? null,
            enemySummoner?.position ?? null,
        );
        const prefix = target === 'adjacentAllies' ? 'adjacent' : 'all';
        metadata[`${prefix}AllyCount`] = summary.count;
        metadata[`${prefix}ChampionCount`] = summary.championCount;
        metadata[`${prefix}SummonerCount`] = summary.summonerCount;
        metadata[`${prefix}NearOwnSummonerCount`] = summary.nearOwnSummonerCount;
        metadata[`${prefix}AttackReadyCount`] = summary.attackReadyCount;
        metadata[`${prefix}EnemySummonerPressureCount`] = summary.enemySummonerPressureCount;

        if (summary.count > 0) {
            pushStrategyTag(strategyTags, 'board-control');
        }
        if (summary.summonerCount > 0 || summary.nearOwnSummonerCount > 0) {
            pushStrategyTag(strategyTags, 'summoner-defense');
        }
        if (summary.attackReadyCount > 0 || summary.enemySummonerPressureCount > 0) {
            pushStrategyTag(strategyTags, 'summoner-pressure');
        }
    };

    for (const effect of abilityDef.effects) {
        switch (effect.type) {
            case 'addCharge':
                if (effect.target === 'self') {
                    metadata.selfChargeGain = (metadata.selfChargeGain as number) + effect.value;
                } else if (effect.target === 'adjacentAllies' || effect.target === 'allAllies') {
                    applyFriendlyTargetSemantics(effect.target);
                }
                break;
            case 'heal':
            case 'modifyStrength':
            case 'modifyLife':
            case 'grantExtraAttack':
                if (effect.target === 'adjacentAllies' || effect.target === 'allAllies') {
                    applyFriendlyTargetSemantics(effect.target);
                }
                break;
            default:
                break;
        }
    }

    return {
        strategyTags,
        metadata,
    };
};

const buildInteractionActions = (
    state: SummonerWarsState,
    playerId: PlayerId,
): AiLegalAction[] | null => {
    const current = state.sys.interaction?.current as EngineInteractionDescriptor | undefined;
    if (!current) return null;
    if (current.playerId !== playerId) return [];

    if (current.kind === 'simple-choice') {
        const data = current.data as {
            options?: SummonerWarsInteractionOption[];
            multi?: PromptMultiConfig;
        };
        const allOptions = data.options ?? [];
        const availableOptions = allOptions.filter((option): option is Required<Pick<SummonerWarsInteractionOption, 'id'>> & SummonerWarsInteractionOption => {
            return typeof option?.id === 'string' && option.disabled !== true;
        });
        const minCount = typeof data.multi?.min === 'number' ? data.multi.min : 1;
        const maxCount = typeof data.multi?.max === 'number' ? Math.max(minCount, data.multi.max) : minCount;
        const actions: AiLegalAction[] = [];

        if (data.multi) {
            if (minCount === 0) {
                actions.push({
                    actionId: createAiLegalActionId('interaction', current.id, 'empty-selection'),
                    kind: 'interaction-choice',
                    label: '不选择任何项',
                    commands: [{
                        type: 'SYS_INTERACTION_RESPOND',
                        payload: { interactionId: current.id, optionIds: [] },
                    }],
                    aiHints: [OPTIONAL_SKIP_AI_HINT],
                    metadata: {
                        interactionId: current.id,
                        optionIds: [],
                    },
                });
            }

            if (maxCount > 0 && availableOptions.length > 0) {
                const combos = buildOptionCombinations(
                    availableOptions.map((option) => option.id),
                    Math.max(1, minCount),
                    Math.max(Math.max(1, minCount), maxCount),
                );
                actions.push(...combos.map((combo, index) => {
                    const aiHints = combo.flatMap((optionId) => {
                        const option = availableOptions.find((candidate) => candidate.id === optionId);
                        return option ? buildInteractionOptionAiHints(state, playerId, current, option) : [];
                    });
                    return {
                        actionId: createAiLegalActionId('interaction', current.id, ...combo),
                        kind: 'interaction-choice',
                        label: `交互组合 ${index + 1}`,
                        commands: [{
                            type: 'SYS_INTERACTION_RESPOND',
                            payload: buildSimpleChoicePayload(current.id, combo, data.multi),
                        }],
                        ...(aiHints.length > 0 ? { aiHints } : {}),
                        metadata: {
                            interactionId: current.id,
                            optionIds: combo,
                        },
                    };
                }));
            }
        } else {
            actions.push(...availableOptions.map((option, index) => {
                const aiHints = buildInteractionOptionAiHints(state, playerId, current, option);
                return {
                    actionId: createAiLegalActionId('interaction', current.id, option.id),
                    kind: 'interaction-choice',
                    label: option.label ?? `交互选择 ${index + 1}`,
                    commands: [{
                        type: 'SYS_INTERACTION_RESPOND',
                        payload: buildSimpleChoicePayload(current.id, [option.id], data.multi, option.value),
                    }],
                    ...(aiHints.length > 0 ? { aiHints } : {}),
                    metadata: {
                        interactionId: current.id,
                        optionId: option.id,
                        optionValue: option.value,
                    },
                };
            }));
        }

        if (actions.length > 0) {
            return actions;
        }

        return [buildEmergencyInteractionFallbackAction(
            current,
            resolveSimpleChoiceFallbackReason(allOptions, data.multi),
        )];
    }

    if (current.kind === 'multistep-choice') {
        return [
            {
                actionId: createAiLegalActionId('interaction', current.id, 'confirm'),
                kind: 'interaction-confirm',
                label: '确认交互',
                commands: [{
                    type: 'SYS_INTERACTION_CONFIRM',
                    payload: { interactionId: current.id },
                }],
                metadata: { interactionId: current.id },
            },
            {
                actionId: createAiLegalActionId('interaction', current.id, 'cancel'),
                kind: 'interaction-cancel',
                label: '取消交互',
                commands: [{
                    type: 'SYS_INTERACTION_CANCEL',
                    payload: { interactionId: current.id },
                }],
                metadata: { interactionId: current.id },
            },
        ];
    }

    return [];
};

const buildSetupActions = (
    state: SummonerWarsState,
    playerId: PlayerId,
): AiLegalAction[] => {
    const actions: AiLegalAction[] = [];
    const selectedFaction = state.core.selectedFactions[playerId];
    const isHost = playerId === state.core.hostPlayerId;
    const isReady = state.core.readyPlayers[playerId];

    if (!selectedFaction || selectedFaction === 'unselected') {
        const takenFactions = new Set<FactionId>();
        for (const value of Object.values(state.core.selectedFactions)) {
            if (value && value !== 'unselected') {
                takenFactions.add(value as FactionId);
            }
        }
        const candidates = FACTION_PRIORITY.filter((factionId) => !takenFactions.has(factionId));
        const availableFactions = candidates.length > 0 ? candidates : FACTION_PRIORITY;

        for (const factionId of availableFactions) {
            appendAction(actions, state, playerId, {
                actionId: createAiLegalActionId('setup', 'select-faction', factionId),
                kind: 'setup-select-faction',
                label: `选择阵营 ${factionId}`,
                commands: [{
                    type: SW_COMMANDS.SELECT_FACTION,
                    payload: { factionId },
                }],
                metadata: {
                    factionId,
                    priority: getFactionPriority(factionId),
                },
            });
        }
        return actions;
    }

    if (!isHost && !isReady) {
        appendAction(actions, state, playerId, {
            actionId: createAiLegalActionId('setup', 'player-ready'),
            kind: 'setup-ready',
            label: '准备完成',
            commands: [{
                type: SW_COMMANDS.PLAYER_READY,
                payload: {},
            }],
        });
    }

    if (isHost) {
        appendAction(actions, state, playerId, {
            actionId: createAiLegalActionId('setup', 'host-start'),
            kind: 'setup-host-start',
            label: '开始游戏',
            commands: [{
                type: SW_COMMANDS.HOST_START_GAME,
                payload: {},
            }],
        });
    }

    return actions;
};

const buildActivatedAbilityActions = (
    state: SummonerWarsState,
    playerId: PlayerId,
    phase: GamePhase,
): AiLegalAction[] => {
    const actions: AiLegalAction[] = [];
    const units = getPlayerUnits(state.core, playerId);

    for (const unit of units) {
        const abilityIds = getActivatableAbilities(unit, phase, state.core);
        for (const abilityId of abilityIds) {
            const abilityDef = abilityRegistry.get(abilityId);
            if (!abilityDef) continue;
            if (abilityDef.trigger !== 'activated') continue;
            if (!canActivateAbility(state.core, unit, abilityId, playerId)) continue;
            const semantics = buildActivatedAbilitySemantics({
                state,
                playerId,
                unit,
                abilityDef,
            });

            if (!abilityDef.requiresTargetSelection) {
                appendAction(actions, state, playerId, {
                    actionId: createAiLegalActionId('activate-ability', unit.instanceId, abilityId),
                    kind: 'activate-ability',
                    label: `发动技能 ${abilityDef.name}`,
                    commands: [{
                        type: SW_COMMANDS.ACTIVATE_ABILITY,
                        payload: {
                            abilityId,
                            sourceUnitId: unit.instanceId,
                        },
                    }],
                    metadata: withAiActionStrategyTags({
                        ...semantics.metadata,
                        sourceUnitId: unit.instanceId,
                        sourcePosition: unit.position,
                    }, semantics.strategyTags),
                });
                continue;
            }

            const targetSelection = abilityDef.targetSelection;
            if (!targetSelection || !supportsDirectTargetSelectionAiExpansion(abilityDef)) continue;
            const ownSummoner = getSummoner(state.core, playerId);
            const enemySummoner = getSummoner(state.core, getEnemyPlayerId(playerId));

            if (targetSelection.type === 'unit') {
                const targets = getAllBoardUnitTargets(state.core);
                for (const target of targets) {
                    const targetUnit = target.unit;
                    const targetLifeRemaining = targetUnit.card.life - targetUnit.damage;
                    const distanceToOwnSummoner = ownSummoner ? manhattanDistance(target.position, ownSummoner.position) : 99;
                    const distanceToEnemySummoner = enemySummoner ? manhattanDistance(target.position, enemySummoner.position) : 99;
                    const strategyTags = [...semantics.strategyTags];
                    if (targetUnit.owner === playerId) {
                        pushStrategyTag(strategyTags, 'board-control');
                        if (targetUnit.card.unitClass === 'summoner') {
                            pushStrategyTag(strategyTags, 'summoner-defense');
                        }
                    } else {
                        pushStrategyTag(strategyTags, 'summoner-pressure');
                    }

                    appendAction(actions, state, playerId, {
                        actionId: createAiLegalActionId(
                            'activate-ability',
                            unit.instanceId,
                            abilityId,
                            target.position.row,
                            target.position.col,
                        ),
                        kind: 'activate-ability',
                        label: `发动技能 ${abilityDef.name} → ${targetUnit.card.name}`,
                        commands: [{
                            type: SW_COMMANDS.ACTIVATE_ABILITY,
                            payload: {
                                abilityId,
                                sourceUnitId: unit.instanceId,
                                targetPosition: target.position,
                            },
                        }],
                        metadata: withAiActionStrategyTags({
                            ...semantics.metadata,
                            sourceUnitId: unit.instanceId,
                            sourcePosition: unit.position,
                            targetPosition: target.position,
                            targetOwner: targetUnit.owner,
                            targetType: targetUnit.card.unitClass,
                            targetUnitClass: targetUnit.card.unitClass,
                            targetLifeRemaining,
                            distanceToOwnSummoner,
                            distanceToEnemySummoner,
                        }, strategyTags),
                    });
                }
                continue;
            }

            if (targetSelection.type === 'position') {
                const positions = getAllBoardPositions();
                for (const targetPosition of positions) {
                    const targetUnit = getUnitAt(state.core, targetPosition);
                    const targetStructure = getStructureAt(state.core, targetPosition);
                    const targetType = targetUnit
                        ? targetUnit.card.unitClass
                        : targetStructure
                            ? 'structure'
                            : 'position';
                    const targetOwner = targetUnit?.owner ?? targetStructure?.owner;
                    const targetLifeRemaining = targetUnit
                        ? targetUnit.card.life - targetUnit.damage
                        : targetStructure
                            ? targetStructure.card.life - targetStructure.damage
                            : undefined;
                    const distanceToOwnSummoner = ownSummoner ? manhattanDistance(targetPosition, ownSummoner.position) : 99;
                    const distanceToEnemySummoner = enemySummoner ? manhattanDistance(targetPosition, enemySummoner.position) : 99;
                    const strategyTags = [...semantics.strategyTags];
                    if (targetOwner === playerId) {
                        pushStrategyTag(strategyTags, 'board-control');
                    } else if (targetOwner) {
                        pushStrategyTag(strategyTags, 'summoner-pressure');
                    }

                    appendAction(actions, state, playerId, {
                        actionId: createAiLegalActionId(
                            'activate-ability',
                            unit.instanceId,
                            abilityId,
                            targetPosition.row,
                            targetPosition.col,
                        ),
                        kind: 'activate-ability',
                        label: `发动技能 ${abilityDef.name} → (${targetPosition.row},${targetPosition.col})`,
                        commands: [{
                            type: SW_COMMANDS.ACTIVATE_ABILITY,
                            payload: {
                                abilityId,
                                sourceUnitId: unit.instanceId,
                                targetPosition,
                            },
                        }],
                        metadata: withAiActionStrategyTags({
                            ...semantics.metadata,
                            sourceUnitId: unit.instanceId,
                            sourcePosition: unit.position,
                            targetPosition,
                            targetOwner,
                            targetType,
                            targetUnitClass: targetUnit?.card.unitClass,
                            targetLifeRemaining,
                            distanceToOwnSummoner,
                            distanceToEnemySummoner,
                        }, strategyTags),
                    });
                }
            }
        }
    }

    return actions;
};

const buildSummonActions = (
    state: SummonerWarsState,
    playerId: PlayerId,
): AiLegalAction[] => {
    const actions: AiLegalAction[] = [];
    const player = state.core.players[playerId];
    const summonPositions = getValidSummonPositions(state.core, playerId);
    const enemySummoner = getSummoner(state.core, getEnemyPlayerId(playerId));
    const ownSummoner = getSummoner(state.core, playerId);
    const threat = estimateSummonerThreat(state.core, playerId);

    for (const card of player.hand) {
        if (card.cardType !== 'unit') continue;
        for (const position of summonPositions) {
            const distanceToEnemySummoner = enemySummoner ? manhattanDistance(position, enemySummoner.position) : 99;
            const distanceToOwnSummoner = ownSummoner ? manhattanDistance(position, ownSummoner.position) : 99;
            const centerScore = getCenterScore(position);
            const strategyTags = buildSummonStrategyTags({
                distanceToEnemySummoner,
                distanceToOwnSummoner,
                centerScore,
            });
            appendAction(actions, state, playerId, {
                actionId: createAiLegalActionId('summon-unit', card.id, position.row, position.col),
                kind: 'summon-unit',
                label: `召唤 ${card.name}`,
                commands: [{
                    type: SW_COMMANDS.SUMMON_UNIT,
                    payload: {
                        cardId: card.id,
                        position,
                    },
                }],
                metadata: withAiActionStrategyTags({
                    cardId: card.id,
                    cardName: card.name,
                    cost: card.cost,
                    strength: card.strength,
                    life: card.life,
                    position,
                    centerScore,
                    distanceToEnemySummoner,
                    distanceToOwnSummoner,
                    remainingLife: threat.remainingLife,
                    directThreatDamage: threat.directThreatDamage,
                    nearbyEnemyPressure: threat.nearbyEnemyPressure,
                }, strategyTags),
            });
        }
    }

    return actions;
};

const buildMoveActions = (
    state: SummonerWarsState,
    playerId: PlayerId,
): AiLegalAction[] => {
    const actions: AiLegalAction[] = [];
    const enemySummoner = getSummoner(state.core, getEnemyPlayerId(playerId));
    const ownSummoner = getSummoner(state.core, playerId);
    const threatBefore = estimateSummonerThreat(state.core, playerId);

    for (const unit of getPlayerUnits(state.core, playerId)) {
        const targets = getValidMoveTargetsEnhanced(state.core, unit.position);
        for (const to of targets) {
            const movedCore = cloneCoreWithMovedUnit(state.core, unit.position, to);
            const attackTargetsAfterMove = movedCore ? getValidAttackTargetsEnhanced(movedCore, to).length : 0;
            const threatAfter = movedCore ? estimateSummonerThreat(movedCore, playerId) : threatBefore;
            const distanceToEnemySummonerBefore = enemySummoner ? manhattanDistance(unit.position, enemySummoner.position) : 99;
            const distanceToEnemySummonerAfter = enemySummoner ? manhattanDistance(to, enemySummoner.position) : 99;
            const distanceToOwnSummonerBefore = ownSummoner ? manhattanDistance(unit.position, ownSummoner.position) : 99;
            const distanceToOwnSummonerAfter = ownSummoner
                ? (unit.card.unitClass === 'summoner' ? 0 : manhattanDistance(to, ownSummoner.position))
                : 99;
            const centerScore = getCenterScore(to);
            const strategyTags = buildMoveStrategyTags({
                attackTargetsAfterMove,
                distanceToEnemySummonerBefore,
                distanceToEnemySummonerAfter,
                distanceToOwnSummonerBefore,
                distanceToOwnSummonerAfter,
                directThreatDamageBefore: threatBefore.directThreatDamage,
                directThreatDamageAfter: threatAfter.directThreatDamage,
                nearbyEnemyPressureBefore: threatBefore.nearbyEnemyPressure,
                nearbyEnemyPressureAfter: threatAfter.nearbyEnemyPressure,
                centerScore,
            });
            appendAction(actions, state, playerId, {
                actionId: createAiLegalActionId('move-unit', unit.instanceId, to.row, to.col),
                kind: 'move-unit',
                label: `移动 ${unit.card.name}`,
                commands: [{
                    type: SW_COMMANDS.MOVE_UNIT,
                    payload: {
                        from: unit.position,
                        to,
                    },
                }],
                metadata: withAiActionStrategyTags({
                    sourceUnitId: unit.instanceId,
                    from: unit.position,
                    to,
                    attackTargetsAfterMove,
                    distanceToEnemySummonerBefore,
                    distanceToEnemySummonerAfter,
                    centerScore,
                    attackType: unit.card.attackType,
                    sourceUnitClass: unit.card.unitClass,
                    sourceIsSummoner: unit.card.unitClass === 'summoner',
                    distanceToOwnSummonerBefore,
                    distanceToOwnSummonerAfter,
                    remainingLifeBefore: threatBefore.remainingLife,
                    directThreatDamageBefore: threatBefore.directThreatDamage,
                    nearbyEnemyPressureBefore: threatBefore.nearbyEnemyPressure,
                    directThreatDamageAfter: threatAfter.directThreatDamage,
                    nearbyEnemyPressureAfter: threatAfter.nearbyEnemyPressure,
                }, strategyTags),
            });
        }
    }

    return actions;
};

const buildStructureActions = (
    state: SummonerWarsState,
    playerId: PlayerId,
): AiLegalAction[] => {
    const actions: AiLegalAction[] = [];
    const player = state.core.players[playerId];
    const buildPositions = getValidBuildPositions(state.core, playerId);
    const ownSummoner = getSummoner(state.core, playerId);
    const threat = estimateSummonerThreat(state.core, playerId);

    for (const card of player.hand) {
        if (card.cardType !== 'structure') continue;
        for (const position of buildPositions) {
            const distanceToOwnSummoner = ownSummoner ? manhattanDistance(position, ownSummoner.position) : 99;
            const centerScore = getCenterScore(position);
            const strategyTags: SummonerWarsStrategyTag[] = [];
            if (distanceToOwnSummoner <= 1) {
                strategyTags.push('summoner-defense');
            }
            if (centerScore >= 2) {
                strategyTags.push('board-control');
            }
            appendAction(actions, state, playerId, {
                actionId: createAiLegalActionId('build-structure', card.id, position.row, position.col),
                kind: 'build-structure',
                label: `建造 ${card.name}`,
                commands: [{
                    type: SW_COMMANDS.BUILD_STRUCTURE,
                    payload: {
                        cardId: card.id,
                        position,
                    },
                }],
                metadata: withAiActionStrategyTags({
                    cardId: card.id,
                    cost: card.cost,
                    life: card.life,
                    position,
                    centerScore,
                    distanceToOwnSummoner,
                    remainingLife: threat.remainingLife,
                    directThreatDamage: threat.directThreatDamage,
                    nearbyEnemyPressure: threat.nearbyEnemyPressure,
                }, strategyTags),
            });
        }
    }

    return actions;
};

const buildAttackActions = (
    state: SummonerWarsState,
    playerId: PlayerId,
): AiLegalAction[] => {
    const actions: AiLegalAction[] = [];
    const threat = estimateSummonerThreat(state.core, playerId);
    const threateningEnemyIds = new Set(threat.threateningEnemyIds);

    for (const unit of getPlayerUnits(state.core, playerId)) {
        const targets = getValidAttackTargetsEnhanced(state.core, unit.position);
        for (const target of targets) {
            const targetUnit = getUnitAt(state.core, target);
            const targetStructure = getStructureAt(state.core, target);
            const targetType = targetUnit
                ? targetUnit.card.unitClass
                : targetStructure
                    ? 'structure'
                    : 'unknown';
            const targetLifeRemaining = targetUnit
                ? targetUnit.card.life - targetUnit.damage
                : targetStructure
                    ? targetStructure.card.life - targetStructure.damage
                    : 0;
            const targetIsThreateningSummoner = targetUnit ? threateningEnemyIds.has(targetUnit.instanceId) : false;
            const strategyTags = buildAttackStrategyTags({
                targetType,
                targetIsThreateningSummoner,
            });
            appendAction(actions, state, playerId, {
                actionId: createAiLegalActionId('declare-attack', unit.instanceId, target.row, target.col),
                kind: 'declare-attack',
                label: `攻击 ${targetUnit?.card.name ?? targetStructure?.card.name ?? '目标'}`,
                commands: [{
                    type: SW_COMMANDS.DECLARE_ATTACK,
                    payload: {
                        attacker: unit.position,
                        target,
                    },
                }],
                metadata: withAiActionStrategyTags({
                    sourceUnitId: unit.instanceId,
                    attacker: unit.position,
                    target,
                    attackerStrength: unit.card.strength,
                    attackType: unit.card.attackType,
                    targetType,
                    targetLifeRemaining,
                    lethalLikely: unit.card.strength >= targetLifeRemaining,
                    targetOwner: targetUnit?.owner ?? targetStructure?.owner,
                    targetIsThreateningSummoner,
                    remainingLife: threat.remainingLife,
                    directThreatDamage: threat.directThreatDamage,
                    nearbyEnemyPressure: threat.nearbyEnemyPressure,
                }, strategyTags),
            });
        }
    }

    return actions;
};

const buildMagicActions = (
    state: SummonerWarsState,
    playerId: PlayerId,
): AiLegalAction[] => {
    const actions: AiLegalAction[] = [];
    const player = state.core.players[playerId];

    for (const card of player.hand) {
        appendAction(actions, state, playerId, {
            actionId: createAiLegalActionId('discard-for-magic', card.id),
            kind: 'discard-for-magic',
            label: `弃置 ${card.name} 换魔力`,
            commands: [{
                type: SW_COMMANDS.DISCARD_FOR_MAGIC,
                payload: { cardIds: [card.id] },
            }],
            metadata: withAiActionStrategyTags({
                cardId: card.id,
                cardType: card.cardType,
                keepValue: getCardKeepValue(card),
            }, ['economy']),
        });
    }

    return actions;
};

const buildEndPhaseAction = (
    state: SummonerWarsState,
    playerId: PlayerId,
): AiLegalAction => ({
    actionId: createAiLegalActionId('advance-phase', getCurrentPhase(state), playerId),
    kind: 'advance-phase',
    label: '结束当前阶段',
    commands: [{
        type: SW_COMMANDS.END_PHASE,
        payload: {},
    }],
    metadata: {
        phase: getCurrentPhase(state),
    },
});

export function buildSummonerWarsAiLegalActions(args: {
    playerId: PlayerId;
    state: MatchState<unknown>;
}): AiLegalAction[] {
    const state = args.state as SummonerWarsState;
    const playerId = args.playerId;
    const interactionActions = buildInteractionActions(state, playerId);
    if (interactionActions !== null) {
        return interactionActions.filter((action) =>
            action.commands.every((command) => isCommandValid(state, playerId, command.type, command.payload)),
        );
    }

    const phase = getCurrentPhase(state);
    if (phase === 'setup') {
        return buildSetupActions(state, playerId);
    }

    if (state.core.currentPlayer !== playerId) {
        return [];
    }

    switch (phase) {
        case 'summon':
            return [
                ...buildActivatedAbilityActions(state, playerId, phase),
                ...buildSummonActions(state, playerId),
                buildEndPhaseAction(state, playerId),
            ];
        case 'move':
            return [
                ...buildActivatedAbilityActions(state, playerId, phase),
                ...buildMoveActions(state, playerId),
                buildEndPhaseAction(state, playerId),
            ];
        case 'build':
            return [
                ...buildActivatedAbilityActions(state, playerId, phase),
                ...buildStructureActions(state, playerId),
                buildEndPhaseAction(state, playerId),
            ];
        case 'attack':
            return [
                ...buildActivatedAbilityActions(state, playerId, phase),
                ...buildAttackActions(state, playerId),
                buildEndPhaseAction(state, playerId),
            ];
        case 'magic':
            return [
                ...buildMagicActions(state, playerId),
                buildEndPhaseAction(state, playerId),
            ];
        case 'draw':
        default:
            return [buildEndPhaseAction(state, playerId)];
    }
}

const actionKindScorer = createActionKindScorer('action-kind', {
    'interaction-choice': 240,
    'interaction-confirm': 180,
    'interaction-cancel': -40,
    'setup-select-faction': 140,
    'setup-ready': 170,
    'setup-host-start': 220,
    'summon-unit': 130,
    'move-unit': 90,
    'build-structure': 55,
    'declare-attack': 210,
    'activate-ability': 110,
    'discard-for-magic': 25,
    'advance-phase': -80,
});

const interactionScorer: LocalAiActionScorer = {
    id: 'interaction-priority',
    score(_context, action) {
        if (action.kind !== 'interaction-choice') return null;
        const optionId = String(action.metadata?.optionId ?? '').toLowerCase();
        if (optionId.includes('confirm') || optionId.includes('accept') || optionId.includes('yes')) {
            return { score: 30, reason: '优先确认当前可执行的交互分支' };
        }
        if (optionId.includes('cancel') || optionId.includes('skip') || optionId.includes('pass')) {
            return { score: -20, reason: '能执行效果时尽量不直接跳过交互' };
        }
        return 5;
    },
};

const interactionHintScorer = createInteractionHintScorer({
    id: 'interaction-ai-hints',
    actionKinds: ['interaction-choice'],
    skipPenaltyWhenAlternativesExist: 35,
});

const setupScorer: LocalAiActionScorer = {
    id: 'setup-priority',
    score(_context, action) {
        if (action.kind === 'setup-select-faction') {
            const priority = typeof action.metadata?.priority === 'number'
                ? action.metadata.priority
                : FACTION_PRIORITY.length + 10;
            return {
                score: 80 - priority * 8,
                reason: `优先选择当前 baseline 更稳的阵营 ${String(action.metadata?.factionId ?? '')}`,
            };
        }
        if (action.kind === 'setup-ready') {
            return { score: 120, reason: '选完阵营后尽快准备完成' };
        }
        if (action.kind === 'setup-host-start') {
            return { score: 200, reason: '双方已就绪时尽快开始对局' };
        }
        return null;
    },
};

const setupRandomScorer: LocalAiActionScorer = {
    id: 'setup-random',
    score(context, action) {
        if (action.kind !== 'setup-select-faction') return null;
        const noise = buildDeterministicAiNoise(context, action, 'setup');
        return {
            score: Number((noise * 10).toFixed(3)),
            reason: '阵营选择随机扰动',
        };
    },
};

const summonScorer: LocalAiActionScorer = {
    id: 'summon-tempo',
    score(_context, action) {
        if (action.kind !== 'summon-unit') return null;
        const cost = typeof action.metadata?.cost === 'number' ? action.metadata.cost : 0;
        const strength = typeof action.metadata?.strength === 'number' ? action.metadata.strength : 0;
        const life = typeof action.metadata?.life === 'number' ? action.metadata.life : 0;
        const centerScore = typeof action.metadata?.centerScore === 'number' ? action.metadata.centerScore : 0;
        const distanceToEnemySummoner = typeof action.metadata?.distanceToEnemySummoner === 'number'
            ? action.metadata.distanceToEnemySummoner
            : 99;
        return {
            score: strength * 22 + life * 6 + cost * 8 + centerScore * 5 - distanceToEnemySummoner,
            reason: `优先召唤更有场面收益的单位 ${String(action.metadata?.cardName ?? '')}`,
        };
    },
};

const moveScorer: LocalAiActionScorer = {
    id: 'move-pressure',
    score(_context, action) {
        if (action.kind !== 'move-unit') return null;
        const before = typeof action.metadata?.distanceToEnemySummonerBefore === 'number'
            ? action.metadata.distanceToEnemySummonerBefore
            : 99;
        const after = typeof action.metadata?.distanceToEnemySummonerAfter === 'number'
            ? action.metadata.distanceToEnemySummonerAfter
            : 99;
        const attackTargetsAfterMove = typeof action.metadata?.attackTargetsAfterMove === 'number'
            ? action.metadata.attackTargetsAfterMove
            : 0;
        const centerScore = typeof action.metadata?.centerScore === 'number' ? action.metadata.centerScore : 0;
        return {
            score: (before - after) * 20 + attackTargetsAfterMove * 45 + centerScore * 4,
            reason: attackTargetsAfterMove > 0
                ? '优先移动到能形成攻击威胁的位置'
                : '优先向敌方召唤师和中线施压',
        };
    },
};

const attackScorer: LocalAiActionScorer = {
    id: 'attack-value',
    score(_context, action) {
        if (action.kind !== 'declare-attack') return null;
        const targetType = String(action.metadata?.targetType ?? '');
        const attackerStrength = typeof action.metadata?.attackerStrength === 'number'
            ? action.metadata.attackerStrength
            : 0;
        const targetLifeRemaining = typeof action.metadata?.targetLifeRemaining === 'number'
            ? action.metadata.targetLifeRemaining
            : 99;
        const lethalLikely = action.metadata?.lethalLikely === true;

        let score = attackerStrength * 8;
        if (targetType === 'summoner') score += 180;
        if (targetType === 'champion') score += 70;
        if (targetType === 'common') score += 40;
        if (targetType === 'structure') score += 15;
        if (lethalLikely) score += 60;
        score += Math.max(0, 10 - targetLifeRemaining);

        return {
            score,
            reason: targetType === 'summoner'
                ? '优先压制敌方召唤师'
                : lethalLikely
                    ? '优先处理接近击杀的目标'
                    : '优先攻击更有价值的目标',
        };
    },
};

const strategyProfileScorer = createProfileAwareActionScorer<SummonerWarsStrategyTag>({
    id: 'strategy-profile-fit',
    allowedKinds: [
        'summon-unit',
        'move-unit',
        'build-structure',
        'declare-attack',
        'discard-for-magic',
        'activate-ability',
    ],
    getProfile(context) {
        return getSummonerWarsStrategyProfile(context.visibleState as SummonerWarsState, context.playerId);
    },
});

const summonerSafetyScorer: LocalAiActionScorer = {
    id: 'summoner-safety',
    score(_context, action) {
        const remainingLife = typeof action.metadata?.remainingLife === 'number'
            ? action.metadata.remainingLife
            : 0;
        const directThreatDamage = typeof action.metadata?.directThreatDamage === 'number'
            ? action.metadata.directThreatDamage
            : 0;
        const nearbyEnemyPressure = typeof action.metadata?.nearbyEnemyPressure === 'number'
            ? action.metadata.nearbyEnemyPressure
            : 0;
        const lethalPressure = remainingLife > 0 && directThreatDamage >= remainingLife;
        const underPressure = lethalPressure || nearbyEnemyPressure >= 12;

        if (!underPressure) return null;

        if (action.kind === 'move-unit') {
            const directThreatDamageBefore = typeof action.metadata?.directThreatDamageBefore === 'number'
                ? action.metadata.directThreatDamageBefore
                : directThreatDamage;
            const directThreatDamageAfter = typeof action.metadata?.directThreatDamageAfter === 'number'
                ? action.metadata.directThreatDamageAfter
                : directThreatDamage;
            const nearbyEnemyPressureBefore = typeof action.metadata?.nearbyEnemyPressureBefore === 'number'
                ? action.metadata.nearbyEnemyPressureBefore
                : nearbyEnemyPressure;
            const nearbyEnemyPressureAfter = typeof action.metadata?.nearbyEnemyPressureAfter === 'number'
                ? action.metadata.nearbyEnemyPressureAfter
                : nearbyEnemyPressure;
            const sourceIsSummoner = action.metadata?.sourceIsSummoner === true;
            const distanceToOwnSummonerBefore = typeof action.metadata?.distanceToOwnSummonerBefore === 'number'
                ? action.metadata.distanceToOwnSummonerBefore
                : 99;
            const distanceToOwnSummonerAfter = typeof action.metadata?.distanceToOwnSummonerAfter === 'number'
                ? action.metadata.distanceToOwnSummonerAfter
                : 99;

            let score = 0;
            if (directThreatDamageAfter < directThreatDamageBefore) {
                score += 120 + (directThreatDamageBefore - directThreatDamageAfter) * 24;
            }
            if (nearbyEnemyPressureAfter < nearbyEnemyPressureBefore) {
                score += 40 + (nearbyEnemyPressureBefore - nearbyEnemyPressureAfter) * 3;
            }
            if (!sourceIsSummoner && distanceToOwnSummonerAfter < distanceToOwnSummonerBefore) {
                score += 24;
            }
            if (sourceIsSummoner && directThreatDamageAfter <= directThreatDamageBefore) {
                score += 45;
            }
            if (score === 0) return null;

            return {
                score,
                reason: lethalPressure
                    ? '召唤师有被击杀风险，先移动减压或补防线'
                    : '召唤师承压时优先回防而不是继续前压',
            };
        }

        if (action.kind === 'summon-unit' || action.kind === 'build-structure') {
            const distanceToOwnSummoner = typeof action.metadata?.distanceToOwnSummoner === 'number'
                ? action.metadata.distanceToOwnSummoner
                : 99;
            const score = distanceToOwnSummoner <= 1
                ? 95 - distanceToOwnSummoner * 12
                : distanceToOwnSummoner === 2
                    ? 38
                    : -18;
            return {
                score,
                reason: lethalPressure
                    ? '召唤师危险时优先在身边补单位或建筑挡刀'
                    : '压力较大时优先把资源投到召唤师附近',
            };
        }

        if (action.kind === 'declare-attack' && action.metadata?.targetIsThreateningSummoner === true) {
            return {
                score: action.metadata?.lethalLikely === true ? 150 : 95,
                reason: '优先清掉正在威胁己方召唤师的敌军',
            };
        }

        return null;
    },
};

const buildScorer: LocalAiActionScorer = {
    id: 'build-structure',
    score(_context, action) {
        if (action.kind !== 'build-structure') return null;
        const life = typeof action.metadata?.life === 'number' ? action.metadata.life : 0;
        const cost = typeof action.metadata?.cost === 'number' ? action.metadata.cost : 0;
        const centerScore = typeof action.metadata?.centerScore === 'number' ? action.metadata.centerScore : 0;
        return {
            score: 20 + life * 5 + cost * 4 + centerScore * 2,
            reason: '没有更高优先级动作时再考虑铺设建筑',
        };
    },
};

const discardScorer: LocalAiActionScorer = {
    id: 'discard-for-magic',
    score(_context, action) {
        if (action.kind !== 'discard-for-magic') return null;
        const keepValue = typeof action.metadata?.keepValue === 'number' ? action.metadata.keepValue : 999;
        return {
            score: 80 - keepValue,
            reason: '优先把保留价值较低的手牌换成魔力',
        };
    },
};

const activatedAbilityTargetScorer: LocalAiActionScorer = {
    id: 'activated-ability-target',
    score(context, action) {
        if (action.kind !== 'activate-ability') return null;
        const targetOwner = typeof action.metadata?.targetOwner === 'string'
            ? action.metadata.targetOwner
            : null;
        if (!targetOwner) return null;
        const targetType = String(action.metadata?.targetType ?? action.metadata?.targetUnitClass ?? '');
        const distanceToOwnSummoner = typeof action.metadata?.distanceToOwnSummoner === 'number'
            ? action.metadata.distanceToOwnSummoner
            : 99;
        const distanceToEnemySummoner = typeof action.metadata?.distanceToEnemySummoner === 'number'
            ? action.metadata.distanceToEnemySummoner
            : 99;
        const sourceOwner = typeof action.metadata?.sourceOwner === 'string'
            ? action.metadata.sourceOwner
            : null;
        const isEnemy = sourceOwner ? targetOwner !== sourceOwner : false;
        const visibleState = context.visibleState as SummonerWarsState | undefined;
        const ownThreat = visibleState && sourceOwner
            ? estimateSummonerThreat(visibleState.core, sourceOwner)
            : null;

        let score = 0;
        if (isEnemy) {
            score = 45;
            if (targetType === 'summoner') score += 140;
            else if (targetType === 'champion') score += 70;
            else if (targetType === 'common') score += 40;
            else if (targetType === 'structure') score += 25;
            if (distanceToEnemySummoner <= 2) score += 18;
            return { score, reason: '优先用指向技能压制敌方关键单位' };
        }

        score = 30;
        if (targetType === 'summoner') {
            const underPressure = ownThreat
                ? (ownThreat.remainingLife > 0 && ownThreat.directThreatDamage >= ownThreat.remainingLife)
                    || ownThreat.nearbyEnemyPressure >= 8
                : false;
            score += underPressure ? 110 : 20;
        }
        else if (targetType === 'champion') score += 60;
        else if (targetType === 'common') score += 30;
        if (distanceToOwnSummoner <= 1) score += 24;
        return { score, reason: '优先把增益给核心友军或召唤师' };
    },
};

const abilityScorer: LocalAiActionScorer = {
    id: 'activated-ability',
    score(_context, action) {
        if (action.kind !== 'activate-ability') return null;
        const abilityId = String(action.metadata?.abilityId ?? '');
        const selfChargeGain = typeof action.metadata?.selfChargeGain === 'number'
            ? action.metadata.selfChargeGain
            : 0;
        const sourceBoostsBefore = typeof action.metadata?.sourceBoostsBefore === 'number'
            ? action.metadata.sourceBoostsBefore
            : 0;
        const costsMoveAction = action.metadata?.costsMoveAction === true;
        const costsAttackAction = action.metadata?.costsAttackAction === true;
        const adjacentAllyCount = typeof action.metadata?.adjacentAllyCount === 'number'
            ? action.metadata.adjacentAllyCount
            : 0;
        const adjacentChampionCount = typeof action.metadata?.adjacentChampionCount === 'number'
            ? action.metadata.adjacentChampionCount
            : 0;
        const adjacentSummonerCount = typeof action.metadata?.adjacentSummonerCount === 'number'
            ? action.metadata.adjacentSummonerCount
            : 0;
        const adjacentAttackReadyCount = typeof action.metadata?.adjacentAttackReadyCount === 'number'
            ? action.metadata.adjacentAttackReadyCount
            : 0;
        const adjacentEnemySummonerPressureCount = typeof action.metadata?.adjacentEnemySummonerPressureCount === 'number'
            ? action.metadata.adjacentEnemySummonerPressureCount
            : 0;
        const allAllyCount = typeof action.metadata?.allAllyCount === 'number'
            ? action.metadata.allAllyCount
            : 0;
        const allChampionCount = typeof action.metadata?.allChampionCount === 'number'
            ? action.metadata.allChampionCount
            : 0;
        const allAttackReadyCount = typeof action.metadata?.allAttackReadyCount === 'number'
            ? action.metadata.allAttackReadyCount
            : 0;
        const allEnemySummonerPressureCount = typeof action.metadata?.allEnemySummonerPressureCount === 'number'
            ? action.metadata.allEnemySummonerPressureCount
            : 0;
        const sourceAttackTargetCount = typeof action.metadata?.sourceAttackTargetCount === 'number'
            ? action.metadata.sourceAttackTargetCount
            : 0;

        let score = 72;
        const reasons: string[] = [];

        if (selfChargeGain > 0) {
            score += selfChargeGain * 16;
            score += sourceBoostsBefore === 0 ? 24 : 8;
            if (costsMoveAction) {
                score -= 12;
            }
            if (costsAttackAction) {
                score -= 16;
            }
            if (sourceAttackTargetCount > 0 && costsAttackAction) {
                score -= 12;
            }
            reasons.push(sourceBoostsBefore === 0 ? '先给关键单位充能' : '继续累积充能资源');
        }

        const supportTargetCount = adjacentAllyCount + allAllyCount;
        if (supportTargetCount > 0) {
            const championCount = adjacentChampionCount + allChampionCount;
            const attackReadyCount = adjacentAttackReadyCount + allAttackReadyCount;
            const enemySummonerPressureCount = adjacentEnemySummonerPressureCount + allEnemySummonerPressureCount;
            score += supportTargetCount * 24;
            score += championCount * 18;
            score += (adjacentSummonerCount > 0 ? 22 : 0);
            score += attackReadyCount * 12;
            score += enemySummonerPressureCount * 18;
            reasons.push(
                supportTargetCount >= 2
                    ? '一次能强化多个友军'
                    : '能顺手强化周围友军',
            );
        }

        return {
            score,
            reason: reasons.length > 0
                ? `${reasons.join('，')}：${abilityId}`
                : `可无目标发动的技能通常有即时收益：${abilityId}`,
        };
    },
};

const phaseTempoScorer: LocalAiActionScorer = {
    id: 'phase-tempo',
    score(context, action) {
        if (action.kind !== 'advance-phase') return null;
        const hasOtherPlayableActions = context.legalActions.some((candidate) => {
            return candidate.actionId !== action.actionId
                && candidate.kind !== 'interaction-cancel';
        });
        return {
            score: hasOtherPlayableActions ? -120 : 90,
            reason: hasOtherPlayableActions ? '当前阶段还有更高价值的动作，不应过早结束' : '当前阶段收益已接近耗尽，可以推进流程',
        };
    },
};

const baselineLocalPolicy = createScoredLocalAiPolicy({
    id: 'baseline',
    scorers: [
        actionKindScorer,
        interactionHintScorer,
        interactionScorer,
        setupScorer,
        setupRandomScorer,
        summonScorer,
        moveScorer,
        attackScorer,
        strategyProfileScorer,
        summonerSafetyScorer,
        buildScorer,
        discardScorer,
        activatedAbilityTargetScorer,
        abilityScorer,
        phaseTempoScorer,
    ],
    maxReasonCount: 3,
});

export const summonerWarsAiRuntime: GameAiRuntime = {
    gameId: 'summonerwars',
    buildLegalActions: buildSummonerWarsAiLegalActions,
    localPolicies: {
        baseline: baselineLocalPolicy,
    },
    defaultLocalPolicyId: 'baseline',
};
