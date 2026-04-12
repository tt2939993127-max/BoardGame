import type { MatchState } from '../types';
import { resolveAiDifficultyProfile } from './difficulty';
import { getGameAiRuntime } from './registry';
import { extractAiInteractionSnapshot, extractAiResponseWindowSnapshot } from './snapshots';
import type { AiActionDecision, AiDecisionContext, AiLegalAction, AiSeatController } from './types';

export function createAiLegalActionId(...parts: Array<string | number | undefined | null>): string {
    return parts
        .filter((part) => part !== undefined && part !== null && `${part}`.length > 0)
        .map((part) => `${part}`.replace(/[^a-zA-Z0-9_-]+/g, '-'))
        .join(':');
}

interface BuildAiDecisionContextArgs {
    gameId: string;
    matchId: string;
    playerId: string;
    visibleState: MatchState<unknown>;
    rulesVersion: string | null;
    decisionBudgetMs: number;
    source: 'local' | 'online';
    seatController?: AiSeatController;
}

function isRecoverableInteractionValue(value: unknown): boolean {
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
}

function buildGenericInteractionFallbackActions(playerId: string, interaction: AiDecisionContext['interaction']): AiLegalAction[] {
    if (!interaction || interaction.kind !== 'simple-choice') {
        return [];
    }

    const options = Array.isArray(interaction.options) ? interaction.options : [];
    const enabledOptions = options.filter((option) => option.disabled !== true);
    const multi = interaction.multi as { min?: unknown; max?: unknown } | undefined;
    const minCount = typeof multi?.min === 'number' ? multi.min : 1;
    const actions: AiLegalAction[] = [];

    if (minCount === 0) {
        actions.push({
            actionId: createAiLegalActionId('interaction-fallback', interaction.id, 'empty-selection'),
            kind: 'interaction-choice',
            label: '不选择任何项',
            commands: [{
                type: 'SYS_INTERACTION_RESPOND',
                payload: { optionIds: [] },
            }],
            metadata: {
                playerId,
                interactionId: interaction.id,
                optionIds: [],
                generatedBy: 'engine-ai-fallback',
            },
        });
    }

    const recoverableOptions = enabledOptions.filter((option) => isRecoverableInteractionValue(option.value));
    for (const option of recoverableOptions) {
        actions.push({
            actionId: createAiLegalActionId('interaction-fallback', interaction.id, option.id),
            kind: 'interaction-choice',
            label: option.label ?? option.id,
            commands: [{
                type: 'SYS_INTERACTION_RESPOND',
                payload: multi ? { optionIds: [option.id] } : { optionId: option.id },
            }],
            metadata: {
                playerId,
                interactionId: interaction.id,
                optionId: option.id,
                generatedBy: 'engine-ai-fallback',
                recoverable: true,
            },
        });
    }

    return actions;
}

export function buildAiDecisionContext(args: BuildAiDecisionContextArgs): AiDecisionContext {
    const runtime = getGameAiRuntime(args.gameId);
    const interaction = extractAiInteractionSnapshot(args.visibleState);
    const runtimeLegalActions = runtime?.buildLegalActions({
        playerId: args.playerId,
        state: args.visibleState,
    }) ?? [];
    const legalActions = runtimeLegalActions.length > 0
        ? runtimeLegalActions
        : buildGenericInteractionFallbackActions(args.playerId, interaction);

    return {
        gameId: args.gameId,
        matchId: args.matchId,
        playerId: args.playerId,
        visibleState: args.visibleState,
        interaction,
        responseWindow: extractAiResponseWindowSnapshot(args.visibleState),
        legalActions,
        rulesVersion: args.rulesVersion,
        decisionBudgetMs: args.decisionBudgetMs,
        source: args.source,
        difficulty: resolveAiDifficultyProfile(
            args.seatController?.type === 'local-ai'
                ? args.seatController.difficulty
                : undefined,
        ),
    };
}

export function resolveAiActionDecision(
    context: AiDecisionContext,
    decision: AiActionDecision | null | undefined,
): AiLegalAction | null {
    if (!decision) return null;
    return context.legalActions.find((action) => action.actionId === decision.actionId) ?? null;
}
