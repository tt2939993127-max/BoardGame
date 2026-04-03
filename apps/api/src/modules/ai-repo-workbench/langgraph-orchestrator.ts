import {
    Annotation,
    Command,
    END,
    MemorySaver,
    START,
    StateGraph,
    interrupt,
    isGraphInterrupt,
} from '@langchain/langgraph';

// ---------------------------------------------------------------------------
// Types — shared with frontend runtime but kept self-contained so the backend
// module does not import from `src/features/…`.
// ---------------------------------------------------------------------------

export type RuleSourceOptionId = 'wiki' | 'pdf' | 'document' | 'other-url';

export type WorkflowNodeId =
    | 'capture-faction-intent'
    | 'select-rule-source'
    | 'acquire-rule-material'
    | 'transcribe-or-normalize-rules'
    | 'inspect-assets'
    | 'draft-faction-definition'
    | 'review-faction-definition'
    | 'run-e2e-validation'
    | 'publish-artifact-bundle';

export type WorkbenchNodeStatus =
    | 'pending'
    | 'running'
    | 'waiting_decision'
    | 'blocked'
    | 'skipped'
    | 'completed'
    | 'failed';

export interface NodeRecord {
    nodeId: WorkflowNodeId;
    status: WorkbenchNodeStatus;
    attempt: number;
    inputSnapshot: Record<string, unknown>;
    outputSnapshot: Record<string, unknown> | null;
    startedAt: string | null;
    finishedAt: string | null;
    errorSummary: string | null;
}

export interface DecisionPayload {
    decisionId: string;
    nodeId: WorkflowNodeId;
    phase: string;
    kind: 'single_select' | 'form' | 'approval';
    title: string;
    summary: string;
    options: Array<{
        id: string;
        label: string;
        description: string;
        payload: Record<string, unknown>;
    }>;
    recommendedOptionId?: string;
}

export interface DecisionResolution {
    optionId: string;
    optionLabel: string;
    decidedAt: string;
    decidedBy: string;
}

export interface ArtifactBundleOutput {
    id: string;
    title: string;
    status: 'published';
    createdAt: string;
    summary: string;
    outputs: Record<string, unknown>;
    evidenceRefs: string[];
    keyObservations: string[];
}

// ---------------------------------------------------------------------------
// Graph state annotation
// ---------------------------------------------------------------------------

const WorkflowStateAnnotation = Annotation.Root({
    // ── Run identity ────────────────────────────────────────────────────
    runId: Annotation<string>(),
    threadId: Annotation<string>(),
    templateId: Annotation<string>(),
    templateVersion: Annotation<string>(),

    // ── Context ─────────────────────────────────────────────────────────
    factionName: Annotation<string>(),
    gameId: Annotation<string>(),
    worktreePath: Annotation<string>(),
    branchName: Annotation<string>(),
    repoSessionId: Annotation<string>(),
    worktreeTaskId: Annotation<string>(),

    // ── Configuration ───────────────────────────────────────────────────
    enabledNodeIds: Annotation<WorkflowNodeId[]>(),

    // ── Progress tracking ───────────────────────────────────────────────
    currentNodeId: Annotation<WorkflowNodeId | null>(),
    nodeRecords: Annotation<NodeRecord[]>(),
    runStatus: Annotation<string>(),

    // ── Decision tracking ───────────────────────────────────────────────
    pendingDecision: Annotation<DecisionPayload | null>(),
    decisions: Annotation<Array<DecisionPayload & { resolution?: DecisionResolution }>>(),

    // ── Node outputs (accumulated as graph progresses) ──────────────────
    intentOutput: Annotation<Record<string, unknown> | null>(),
    selectedRuleSource: Annotation<RuleSourceOptionId | null>(),
    acquiredMaterial: Annotation<Record<string, unknown> | null>(),
    normalizedRules: Annotation<Record<string, unknown> | null>(),
    assetInspection: Annotation<Record<string, unknown> | null>(),
    definitionDraft: Annotation<Record<string, unknown> | null>(),
    reviewResult: Annotation<Record<string, unknown> | null>(),
    e2eResult: Annotation<Record<string, unknown> | null>(),
    artifactBundle: Annotation<ArtifactBundleOutput | null>(),

    // ── Timestamps ──────────────────────────────────────────────────────
    startedAt: Annotation<string>(),
    finishedAt: Annotation<string | null>(),
    checkpointVersion: Annotation<number>(),
});

type WorkflowState = typeof WorkflowStateAnnotation.State;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toIso(now = Date.now()): string {
    return new Date(now).toISOString();
}

function createId(prefix: string): string {
    return `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;
}

function updateNodeRecord(
    records: NodeRecord[],
    nodeId: WorkflowNodeId,
    updater: (r: NodeRecord) => NodeRecord,
): NodeRecord[] {
    return records.map((r) => (r.nodeId === nodeId ? updater(r) : r));
}

function createPendingRecord(nodeId: WorkflowNodeId): NodeRecord {
    return {
        nodeId,
        status: 'pending',
        attempt: 0,
        inputSnapshot: {},
        outputSnapshot: null,
        startedAt: null,
        finishedAt: null,
        errorSummary: null,
    };
}

function markRunning(record: NodeRecord, inputSnapshot: Record<string, unknown>, now: string): NodeRecord {
    return {
        ...record,
        status: 'running',
        attempt: Math.max(record.attempt, 1),
        inputSnapshot,
        startedAt: now,
    };
}

function markCompleted(record: NodeRecord, outputSnapshot: Record<string, unknown>, now: string): NodeRecord {
    return {
        ...record,
        status: 'completed',
        outputSnapshot,
        finishedAt: now,
    };
}

function markWaitingDecision(record: NodeRecord): NodeRecord {
    return { ...record, status: 'waiting_decision' };
}

// ---------------------------------------------------------------------------
// Rule-source options (shared constant)
// ---------------------------------------------------------------------------

const RULE_SOURCE_OPTIONS: DecisionPayload['options'] = [
    {
        id: 'wiki',
        label: 'Wiki（推荐）',
        description: '直接按现有规则/Wiki 路径采集，最适合当前 local-first MVP。',
        payload: { sourceKind: 'wiki', rawSourceSet: ['smashup-fandom-faction-page'] },
    },
    {
        id: 'pdf',
        label: '上传 PDF',
        description: '保留 PDF 转录分支，适合规则书或扫描件。',
        payload: { sourceKind: 'pdf', rawSourceSet: ['uploaded-rulebook.pdf'] },
    },
    {
        id: 'document',
        label: '上传文档',
        description: '适合已有 Markdown、Word 导出的规则文本。',
        payload: { sourceKind: 'document', rawSourceSet: ['uploaded-rules.md'] },
    },
    {
        id: 'other-url',
        label: '其他 URL',
        description: '保留网页抓取入口，但当前仅做结构化占位。',
        payload: { sourceKind: 'other-url', rawSourceSet: ['https://example.com/faction-rules'] },
    },
];

function getRuleSourceOption(optionId: string) {
    return RULE_SOURCE_OPTIONS.find((o) => o.id === optionId) ?? RULE_SOURCE_OPTIONS[0];
}

function buildRuleSourceDecision(state: WorkflowState): DecisionPayload {
    const nodeId: WorkflowNodeId = 'select-rule-source';
    return {
        decisionId: `decision-${state.runId}-${nodeId}`,
        nodeId,
        phase: 'rules',
        kind: 'single_select',
        title: '选择规则来源',
        summary: `为 ${state.factionName} 选择当前这次纵切片要走的规则来源路径。`,
        options: RULE_SOURCE_OPTIONS,
        recommendedOptionId: 'wiki',
    };
}

function resolveInterruptPayload(
    snapshot: { tasks?: Array<{ interrupts?: Array<{ value?: unknown }> }> },
    state: WorkflowState,
): DecisionPayload | null {
    const interruptInfo = snapshot.tasks?.find((t) => t.interrupts?.length);
    if (!interruptInfo?.interrupts?.length) {
        return null;
    }
    const interruptValue = interruptInfo.interrupts[0]?.value;
    if (interruptValue && typeof interruptValue === 'object' && 'decision' in (interruptValue as Record<string, unknown>)) {
        return (interruptValue as { decision: DecisionPayload }).decision;
    }
    if (interruptValue) {
        return interruptValue as DecisionPayload;
    }
    return buildRuleSourceDecision(state);
}

// ---------------------------------------------------------------------------
// Output builders (domain fixtures for MVP)
// ---------------------------------------------------------------------------

function buildAcquireOutput(factionName: string, sourceId: RuleSourceOptionId) {
    const opt = getRuleSourceOption(sourceId);
    return {
        sourceKind: sourceId,
        rawSourceSet: opt.payload.rawSourceSet,
        acquisitionMode: 'local-first-journal',
        summary: `${factionName} 已锁定 ${opt.label} 作为规则来源。`,
    };
}

function buildNormalizeOutput(factionName: string, sourceId: RuleSourceOptionId) {
    return {
        normalizedRuleCorpus: {
            sourceKind: sourceId,
            normalizedSections: [
                `${factionName} 的核心钩子是"离场后回收并再部署"。`,
                '每张牌都需要映射到统一的 faction definition 草案结构。',
                '规则来源必须保留来源索引和规范化摘要，避免只有聊天文本。',
            ],
            sourceMapping: [{ sectionId: 'overview', sourceRef: sourceId, confidence: 'demo-fixture' }],
        },
        normalizationMode: sourceId === 'wiki' ? 'wiki-ingest-ready' : 'document-ingest-ready',
    };
}

function buildAssetChecklistOutput(factionName: string) {
    return {
        assetChecklist: [
            { item: `${factionName} 中文卡图`, status: 'missing', required: true, recoveryPath: '先走纯规则模式' },
            { item: `${factionName} 基地图`, status: 'missing', required: true, recoveryPath: '补素材后继续' },
            { item: `${factionName} locale 文案骨架`, status: 'ready', required: true, recoveryPath: 'n/a' },
        ],
        selectedRecoveryPath: '先走纯规则模式',
        inspectionMode: 'structured_stub_but_domain_real',
    };
}

function buildDraftOutput(factionName: string, sourceId: RuleSourceOptionId) {
    return {
        factionDefinitionSnapshot: {
            factionName,
            gameId: 'smashup',
            sourceKind: sourceId,
            designHook: '离场回收 + 再部署节奏',
            mechanicPillars: ['回收已打出的随从', '延迟爆发', '资源留痕'],
            cardPackageSkeleton: { minions: 10, actions: 10, bases: 2 },
            reviewMode: 'mvp-structured-stub',
        },
        outputShape: 'ArtifactBundle-ready',
    };
}

function buildReviewOutput() {
    return {
        reviewMode: 'auto_approval_stub',
        approvalStatus: 'approved_for_demo',
        explanation: '本轮 MVP 只保留规则来源的真实人工决策，定义确认先用结构化 stub 自动通过。',
    };
}

function buildE2eOutput() {
    return {
        e2eStatus: 'passed_demo',
        validationMode: 'workflow-node-demo',
        summary: '本轮用户开启了 E2E 验证节点，工作流已执行该节点。',
    };
}

function buildArtifactBundle(state: WorkflowState, now: string): ArtifactBundleOutput {
    const sourceId = state.selectedRuleSource ?? 'wiki';
    const opt = getRuleSourceOption(sourceId);
    const e2eEnabled = state.enabledNodeIds.includes('run-e2e-validation');

    return {
        id: createId('artifact'),
        title: `${state.factionName} ArtifactBundle`,
        status: 'published',
        createdAt: now,
        summary: `已基于 ${opt.label} 完成 new-faction MVP 纵切片，包含规则来源、规范化文本、素材检查与定义快照。`,
        outputs: {
            ruleSourceIndex: [{
                sourceKind: sourceId,
                label: opt.label,
                rawSourceSet: opt.payload.rawSourceSet,
                decisionMode: 'human-selected',
            }],
            normalizedRuleCorpus: state.normalizedRules ?? {},
            assetChecklist: (state.assetInspection as Record<string, unknown>)?.assetChecklist ?? [],
            factionDefinitionSnapshot: (state.definitionDraft as Record<string, unknown>)?.factionDefinitionSnapshot ?? {},
            decisionLog: state.decisions.map((d) => ({
                decisionId: d.decisionId,
                title: d.title,
                resolution: d.resolution ?? null,
            })),
            e2eStatus: e2eEnabled ? 'passed_demo' : 'skipped',
        },
        evidenceRefs: [
            'RepoSession.local-fixture',
            'DecisionRequest.select-rule-source',
            e2eEnabled ? 'WorkflowNode.run-e2e-validation=enabled' : 'WorkflowNode.run-e2e-validation=skipped',
        ],
        keyObservations: [
            '当前纵切片把真实人工输入收敛到规则来源选择，其他节点仍以结构化 local fixture 驱动。',
            '运行详情页已经能展示节点状态、决策记录和 ArtifactBundle，不再只是 spec 文本。',
            e2eEnabled
                ? '本轮用户开启了 E2E 节点，因此 ArtifactBundle 记录为 passed_demo。'
                : '本轮用户关闭了 E2E 节点，因此 ArtifactBundle 明确记录为 skipped，而不是隐式缺失。',
        ],
    };
}

// ---------------------------------------------------------------------------
// Graph nodes — each maps to a WorkflowNodeId
// ---------------------------------------------------------------------------

function captureFactionIntentNode(state: WorkflowState) {
    const now = toIso();
    const nodeId: WorkflowNodeId = 'capture-faction-intent';
    const output = {
        workingDirectory: `${state.worktreePath}\\temp\\workbench\\${state.factionName}`,
        requestedOutcome: '生成规则驱动的派系定义草案与 ArtifactBundle',
    };

    const records = updateNodeRecord(state.nodeRecords, nodeId, (r) =>
        markCompleted(
            markRunning(r, {
                templateId: state.templateId,
                factionName: state.factionName,
                gameId: state.gameId,
                worktreePath: state.worktreePath,
                branchName: state.branchName,
            }, now),
            output,
            now,
        ),
    );

    return {
        currentNodeId: nodeId,
        nodeRecords: records,
        intentOutput: output,
        checkpointVersion: state.checkpointVersion + 1,
    };
}

function selectRuleSourceNode(state: WorkflowState) {
    const now = toIso();
    const nodeId: WorkflowNodeId = 'select-rule-source';
    const decisionId = `decision-${state.runId}-${nodeId}`;

    const decision: DecisionPayload = {
        decisionId,
        nodeId,
        phase: 'rules',
        kind: 'single_select',
        title: '选择规则来源',
        summary: `为 ${state.factionName} 选择当前这次纵切片要走的规则来源路径。`,
        options: RULE_SOURCE_OPTIONS,
        recommendedOptionId: 'wiki',
    };

    const records = updateNodeRecord(state.nodeRecords, nodeId, (r) =>
        markWaitingDecision(markRunning(r, {
            supportedSources: RULE_SOURCE_OPTIONS.map((o) => o.id),
            recommendedOptionId: 'wiki',
        }, now)),
    );

    // ── interrupt: pause here and wait for human decision ────────────
    const resolution = interrupt<
        { decision: DecisionPayload },
        { optionId: RuleSourceOptionId }
    >({ decision });

    // ── execution continues after resume ─────────────────────────────
    const resumeNow = toIso();
    const selectedOption = getRuleSourceOption(resolution.optionId);

    const completedRecords = updateNodeRecord(records, nodeId, (r) =>
        markCompleted(r, {
            selectedSource: selectedOption.id,
            selectedLabel: selectedOption.label,
            rawSourceSet: selectedOption.payload.rawSourceSet,
        }, resumeNow),
    );

    return {
        currentNodeId: nodeId,
        nodeRecords: completedRecords,
        selectedRuleSource: resolution.optionId as RuleSourceOptionId,
        pendingDecision: null,
        decisions: [
            ...state.decisions,
            {
                ...decision,
                resolution: {
                    optionId: selectedOption.id,
                    optionLabel: selectedOption.label,
                    decidedAt: resumeNow,
                    decidedBy: 'owner',
                },
            },
        ],
        runStatus: 'running',
        checkpointVersion: state.checkpointVersion + 1,
    };
}

function acquireRuleMaterialNode(state: WorkflowState) {
    const now = toIso();
    const nodeId: WorkflowNodeId = 'acquire-rule-material';
    const sourceId = state.selectedRuleSource ?? 'wiki';
    const output = buildAcquireOutput(state.factionName, sourceId);

    const records = updateNodeRecord(state.nodeRecords, nodeId, (r) =>
        markCompleted(markRunning(r, { sourceId }, now), output, now),
    );

    return {
        currentNodeId: nodeId,
        nodeRecords: records,
        acquiredMaterial: output,
        checkpointVersion: state.checkpointVersion + 1,
    };
}

function transcribeOrNormalizeNode(state: WorkflowState) {
    const now = toIso();
    const nodeId: WorkflowNodeId = 'transcribe-or-normalize-rules';
    const sourceId = state.selectedRuleSource ?? 'wiki';
    const output = buildNormalizeOutput(state.factionName, sourceId);

    const records = updateNodeRecord(state.nodeRecords, nodeId, (r) =>
        markCompleted(markRunning(r, { acquiredMaterial: state.acquiredMaterial }, now), output, now),
    );

    return {
        currentNodeId: nodeId,
        nodeRecords: records,
        normalizedRules: output,
        checkpointVersion: state.checkpointVersion + 1,
    };
}

function inspectAssetsNode(state: WorkflowState) {
    const now = toIso();
    const nodeId: WorkflowNodeId = 'inspect-assets';
    const output = buildAssetChecklistOutput(state.factionName);

    const records = updateNodeRecord(state.nodeRecords, nodeId, (r) =>
        markCompleted(markRunning(r, { factionName: state.factionName }, now), output, now),
    );

    return {
        currentNodeId: nodeId,
        nodeRecords: records,
        assetInspection: output,
        checkpointVersion: state.checkpointVersion + 1,
    };
}

function draftFactionDefinitionNode(state: WorkflowState) {
    const now = toIso();
    const nodeId: WorkflowNodeId = 'draft-faction-definition';
    const sourceId = state.selectedRuleSource ?? 'wiki';
    const output = buildDraftOutput(state.factionName, sourceId);

    const records = updateNodeRecord(state.nodeRecords, nodeId, (r) =>
        markCompleted(markRunning(r, {
            normalizedRules: state.normalizedRules,
            assetInspection: state.assetInspection,
        }, now), output, now),
    );

    return {
        currentNodeId: nodeId,
        nodeRecords: records,
        definitionDraft: output,
        checkpointVersion: state.checkpointVersion + 1,
    };
}

function reviewFactionDefinitionNode(state: WorkflowState) {
    const now = toIso();
    const nodeId: WorkflowNodeId = 'review-faction-definition';
    const output = buildReviewOutput();

    const records = updateNodeRecord(state.nodeRecords, nodeId, (r) =>
        markCompleted(markRunning(r, { definitionDraft: state.definitionDraft }, now), output, now),
    );

    return {
        currentNodeId: nodeId,
        nodeRecords: records,
        reviewResult: output,
        checkpointVersion: state.checkpointVersion + 1,
    };
}

function runE2eValidationNode(state: WorkflowState) {
    const nodeId: WorkflowNodeId = 'run-e2e-validation';

    if (!state.enabledNodeIds.includes(nodeId)) {
        const now = toIso();
        const records = updateNodeRecord(state.nodeRecords, nodeId, (r) => ({
            ...r,
            status: 'skipped' as const,
            outputSnapshot: { reason: 'disabled-before-run' },
            finishedAt: now,
        }));
        return {
            currentNodeId: nodeId,
            nodeRecords: records,
            e2eResult: { e2eStatus: 'skipped', reason: 'disabled-before-run' },
            checkpointVersion: state.checkpointVersion + 1,
        };
    }

    const now = toIso();
    const output = buildE2eOutput();
    const records = updateNodeRecord(state.nodeRecords, nodeId, (r) =>
        markCompleted(markRunning(r, { reviewResult: state.reviewResult }, now), output, now),
    );

    return {
        currentNodeId: nodeId,
        nodeRecords: records,
        e2eResult: output,
        checkpointVersion: state.checkpointVersion + 1,
    };
}

function publishArtifactBundleNode(state: WorkflowState) {
    const now = toIso();
    const nodeId: WorkflowNodeId = 'publish-artifact-bundle';
    const bundle = buildArtifactBundle(state, now);

    const records = updateNodeRecord(state.nodeRecords, nodeId, (r) =>
        markCompleted(markRunning(r, { reviewResult: state.reviewResult }, now), {
            artifactBundleId: bundle.id,
            summary: bundle.summary,
        }, now),
    );

    return {
        currentNodeId: null,
        nodeRecords: records,
        artifactBundle: bundle,
        runStatus: 'completed',
        finishedAt: now,
        checkpointVersion: state.checkpointVersion + 1,
    };
}

// ---------------------------------------------------------------------------
// Conditional edge: skip e2e validation if disabled
// ---------------------------------------------------------------------------

function shouldRunE2e(state: WorkflowState): string {
    return state.enabledNodeIds.includes('run-e2e-validation')
        ? 'run-e2e-validation'
        : 'run-e2e-validation';
}

// ---------------------------------------------------------------------------
// Graph builder
// ---------------------------------------------------------------------------

export function buildNewFactionGraph() {
    const checkpointer = new MemorySaver();

    const graph = new StateGraph(WorkflowStateAnnotation)
        .addNode('capture-faction-intent', captureFactionIntentNode)
        .addNode('select-rule-source', selectRuleSourceNode)
        .addNode('acquire-rule-material', acquireRuleMaterialNode)
        .addNode('transcribe-or-normalize-rules', transcribeOrNormalizeNode)
        .addNode('inspect-assets', inspectAssetsNode)
        .addNode('draft-faction-definition', draftFactionDefinitionNode)
        .addNode('review-faction-definition', reviewFactionDefinitionNode)
        .addNode('run-e2e-validation', runE2eValidationNode)
        .addNode('publish-artifact-bundle', publishArtifactBundleNode)
        .addEdge(START, 'capture-faction-intent')
        .addEdge('capture-faction-intent', 'select-rule-source')
        .addEdge('select-rule-source', 'acquire-rule-material')
        .addEdge('acquire-rule-material', 'transcribe-or-normalize-rules')
        .addEdge('transcribe-or-normalize-rules', 'inspect-assets')
        .addEdge('inspect-assets', 'draft-faction-definition')
        .addEdge('draft-faction-definition', 'review-faction-definition')
        .addEdge('review-faction-definition', 'run-e2e-validation')
        .addEdge('run-e2e-validation', 'publish-artifact-bundle')
        .addEdge('publish-artifact-bundle', END)
        .compile({
            checkpointer,
            name: 'ai-repo-workbench-new-faction-v2',
        });

    return { graph, checkpointer };
}

// ---------------------------------------------------------------------------
// Orchestrator factory — used by NestJS service
// ---------------------------------------------------------------------------

export interface LangGraphOrchestratorConfig {
    factionName: string;
    gameId: string;
    worktreePath: string;
    branchName: string;
    repoSessionId: string;
    worktreeTaskId: string;
    enabledNodeIds: WorkflowNodeId[];
    templateId?: string;
    templateVersion?: string;
}

const NODE_ORDER: WorkflowNodeId[] = [
    'capture-faction-intent',
    'select-rule-source',
    'acquire-rule-material',
    'transcribe-or-normalize-rules',
    'inspect-assets',
    'draft-faction-definition',
    'review-faction-definition',
    'run-e2e-validation',
    'publish-artifact-bundle',
];

export interface GraphRunResult {
    threadId: string;
    state: WorkflowState;
    interrupted: boolean;
    interruptPayload: DecisionPayload | null;
}

export class NewFactionLangGraphOrchestrator {
    private readonly graph: ReturnType<typeof buildNewFactionGraph>['graph'];
    private readonly checkpointer: MemorySaver;

    constructor() {
        const { graph, checkpointer } = buildNewFactionGraph();
        this.graph = graph;
        this.checkpointer = checkpointer;
    }

    async startRun(config: LangGraphOrchestratorConfig): Promise<GraphRunResult> {
        const threadId = createId('lg-thread');
        const now = toIso();
        const runId = createId('workflow-run');

        const initialState: WorkflowState = {
            runId,
            threadId,
            templateId: config.templateId ?? 'new-faction',
            templateVersion: config.templateVersion ?? 'mvp-v1',
            factionName: config.factionName,
            gameId: config.gameId,
            worktreePath: config.worktreePath,
            branchName: config.branchName,
            repoSessionId: config.repoSessionId,
            worktreeTaskId: config.worktreeTaskId,
            enabledNodeIds: config.enabledNodeIds,
            currentNodeId: null,
            nodeRecords: NODE_ORDER.map(createPendingRecord),
            runStatus: 'running',
            pendingDecision: null,
            decisions: [],
            intentOutput: null,
            selectedRuleSource: null,
            acquiredMaterial: null,
            normalizedRules: null,
            assetInspection: null,
            definitionDraft: null,
            reviewResult: null,
            e2eResult: null,
            artifactBundle: null,
            startedAt: now,
            finishedAt: null,
            checkpointVersion: 0,
        };

        const threadConfig = { configurable: { thread_id: threadId } };

        try {
            const result = await this.graph.invoke(initialState, threadConfig);
            const snapshot = await this.graph.getState(threadConfig);
            const state = snapshot.values as WorkflowState;
            const interruptPayload = resolveInterruptPayload(snapshot, state);
            if (interruptPayload) {
                return {
                    threadId,
                    state,
                    interrupted: true,
                    interruptPayload,
                };
            }
            return {
                threadId,
                state: result,
                interrupted: false,
                interruptPayload: null,
            };
        } catch (error) {
            if (isGraphInterrupt(error)) {
                const snapshot = await this.graph.getState(threadConfig);
                const state = snapshot.values as WorkflowState;
                const interruptPayload = resolveInterruptPayload(snapshot, state) ?? buildRuleSourceDecision(state);
                return {
                    threadId,
                    state,
                    interrupted: true,
                    interruptPayload,
                };
            }
            throw error;
        }
    }

    async resumeDecision(
        threadId: string,
        resolution: { optionId: RuleSourceOptionId },
    ): Promise<GraphRunResult> {
        const threadConfig = { configurable: { thread_id: threadId } };

        try {
            const result = await this.graph.invoke(
                new Command({ resume: resolution }),
                threadConfig,
            );
            const snapshot = await this.graph.getState(threadConfig);
            const state = snapshot.values as WorkflowState;
            const interruptPayload = resolveInterruptPayload(snapshot, state);
            if (interruptPayload) {
                return {
                    threadId,
                    state,
                    interrupted: true,
                    interruptPayload,
                };
            }
            return {
                threadId,
                state: result,
                interrupted: false,
                interruptPayload: null,
            };
        } catch (error) {
            if (isGraphInterrupt(error)) {
                const snapshot = await this.graph.getState(threadConfig);
                const state = snapshot.values as WorkflowState;
                const interruptPayload = resolveInterruptPayload(snapshot, state) ?? buildRuleSourceDecision(state);
                return {
                    threadId,
                    state,
                    interrupted: true,
                    interruptPayload,
                };
            }
            throw error;
        }
    }

    async getState(threadId: string): Promise<WorkflowState | null> {
        const threadConfig = { configurable: { thread_id: threadId } };
        try {
            const snapshot = await this.graph.getState(threadConfig);
            return (snapshot.values as WorkflowState) ?? null;
        } catch {
            return null;
        }
    }
}
