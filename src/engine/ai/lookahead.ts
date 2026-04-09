import type {
    AiDecisionContext,
    AiDifficultyProfile,
    AiLegalAction,
    LocalAiActionEvaluation,
    LocalAiActionScoreContribution,
    LocalAiActionScorer,
    LocalAiPolicy,
} from './types';
import { resolveAiDifficultyProfile } from './difficulty';
import { evaluateLocalAiActions } from './scoring';
import { buildDeterministicAiNoise } from './noise';

export interface AiProjectedActionScore {
    score: number;
    reason?: string;
    metadata?: Record<string, unknown>;
}

export interface AiLookaheadTraceEntry {
    actionId: string;
    kind: string;
    baseScore: number;
    projectedScore: number;
    noiseScore: number;
    finalScore: number;
    searched: boolean;
    contributions: LocalAiActionScoreContribution[];
    metadata?: Record<string, unknown>;
}

export interface CreateLookaheadLocalAiPolicyOptions {
    id: string;
    scorers: LocalAiActionScorer[];
    maxReasonCount?: number;
    projectAction?: (args: {
        context: AiDecisionContext;
        action: AiLegalAction;
        baseEvaluation: LocalAiActionEvaluation;
        difficulty: AiDifficultyProfile;
        remainingBudgetMs: number;
    }) => AiProjectedActionScore | null | undefined;
}

interface FinalEvaluation {
    action: AiLegalAction;
    totalScore: number;
    contributions: LocalAiActionScoreContribution[];
    trace: AiLookaheadTraceEntry;
}

function stableSortedEvaluations(
    evaluations: LocalAiActionEvaluation[],
): Array<LocalAiActionEvaluation & { index: number }> {
    return evaluations
        .map((evaluation, index) => ({ ...evaluation, index }))
        .sort((left, right) => {
            if (right.totalScore !== left.totalScore) {
                return right.totalScore - left.totalScore;
            }
            return left.index - right.index;
        });
}

function buildConfidence(finalEvaluations: FinalEvaluation[], best: FinalEvaluation): number | undefined {
    if (finalEvaluations.length <= 1) return 1;

    const second = finalEvaluations
        .filter((item) => item.action.actionId !== best.action.actionId)
        .sort((left, right) => right.totalScore - left.totalScore)[0];
    if (!second) return 1;

    const margin = Math.max(0, best.totalScore - second.totalScore);
    const denominator = Math.max(1, Math.abs(best.totalScore) + Math.abs(second.totalScore));
    return Math.min(1, Number((margin / denominator).toFixed(3)));
}

function buildReasoningSummary(best: FinalEvaluation, maxReasonCount: number): string | undefined {
    const topReasons = [...best.contributions]
        .sort((left, right) => right.score - left.score)
        .filter((item) => item.reason)
        .slice(0, maxReasonCount)
        .map((item) => item.reason);

    return topReasons.length > 0 ? topReasons.join('；') : undefined;
}

export function createLookaheadLocalAiPolicy(
    options: CreateLookaheadLocalAiPolicyOptions,
): LocalAiPolicy {
    return {
        id: options.id,
        decide(context) {
            const difficulty = context.difficulty ?? resolveAiDifficultyProfile(undefined);
            const normalizedContext = context.difficulty
                ? context
                : {
                    ...context,
                    difficulty,
                };
            const baseEvaluations = evaluateLocalAiActions(normalizedContext, options.scorers);
            if (baseEvaluations.length === 0) return null;

            const sorted = stableSortedEvaluations(baseEvaluations);
            const shortlistSize = Math.max(1, Math.min(difficulty.shortlistSize, sorted.length));
            const shortlist = new Set(sorted.slice(0, shortlistSize).map((item) => item.action.actionId));
            const startedAt = Date.now();

            const finalEvaluations: FinalEvaluation[] = sorted.map((evaluation) => {
                const contributions = [...evaluation.contributions];
                let projectedScore = 0;
                let projectedMetadata: Record<string, unknown> | undefined;
                const shouldSearch = Boolean(
                    options.projectAction
                    && difficulty.searchDepth > 0
                    && shortlist.has(evaluation.action.actionId),
                );

                if (shouldSearch) {
                    const remainingBudgetMs = Math.max(
                        0,
                        difficulty.simulationBudgetMs - (Date.now() - startedAt),
                    );
                    if (remainingBudgetMs > 0) {
                        const projected = options.projectAction?.({
                            context: normalizedContext,
                            action: evaluation.action,
                            baseEvaluation: evaluation,
                            difficulty,
                            remainingBudgetMs,
                        });
                        if (projected && Number.isFinite(projected.score) && projected.score !== 0) {
                            projectedScore = projected.score;
                            projectedMetadata = projected.metadata;
                            contributions.push({
                                scorerId: 'lookahead',
                                score: projected.score,
                                ...(projected.reason ? { reason: projected.reason } : {}),
                            });
                        }
                    }
                }

                let noiseScore = 0;
                if (difficulty.randomness > 0) {
                    noiseScore = Number(
                        (buildDeterministicAiNoise(normalizedContext, evaluation.action) * difficulty.randomness).toFixed(3),
                    );
                    if (noiseScore !== 0) {
                        contributions.push({
                            scorerId: 'difficulty-noise',
                            score: noiseScore,
                            reason: `难度扰动 ${difficulty.level}`,
                        });
                    }
                }

                const finalScore = evaluation.totalScore + projectedScore + noiseScore;
                return {
                    action: evaluation.action,
                    totalScore: finalScore,
                    contributions,
                    trace: {
                        actionId: evaluation.action.actionId,
                        kind: evaluation.action.kind,
                        baseScore: evaluation.totalScore,
                        projectedScore,
                        noiseScore,
                        finalScore,
                        searched: shouldSearch,
                        contributions,
                        ...(projectedMetadata ? { metadata: projectedMetadata } : {}),
                    },
                };
            });

            const best = [...finalEvaluations].sort((left, right) => {
                if (right.totalScore !== left.totalScore) {
                    return right.totalScore - left.totalScore;
                }
                const leftIndex = sorted.findIndex((item) => item.action.actionId === left.action.actionId);
                const rightIndex = sorted.findIndex((item) => item.action.actionId === right.action.actionId);
                return leftIndex - rightIndex;
            })[0];
            if (!best) return null;

            return {
                actionId: best.action.actionId,
                confidence: buildConfidence(finalEvaluations, best),
                reasoningSummary: buildReasoningSummary(best, options.maxReasonCount ?? 3),
                providerMetadata: {
                    policyId: options.id,
                    difficulty,
                    shortlistSize,
                    evaluations: finalEvaluations.map((evaluation) => evaluation.trace),
                },
            };
        },
    };
}

