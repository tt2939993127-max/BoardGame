export type WorkbenchNodeStatus =
    | 'pending'
    | 'running'
    | 'waiting_decision'
    | 'blocked'
    | 'completed'
    | 'failed';

export type RuleSourceOptionId = 'wiki' | 'pdf' | 'document' | 'other-url';

export type WorkflowNodeId =
    | 'capture-faction-intent'
    | 'select-rule-source'
    | 'acquire-rule-material'
    | 'transcribe-or-normalize-rules'
    | 'inspect-assets'
    | 'draft-faction-definition'
    | 'review-faction-definition'
    | 'publish-artifact-bundle';

export interface RepoSession {
    id: string;
    sourceType: 'init-template' | 'import-local' | 'clone-remote';
    rootPath: string;
    defaultBranch: string;
    activeWorktreeId?: string;
    repoFingerprint: string;
    createdAt: string;
    metadata: {
        repoName: string;
        originUrl?: string;
        currentBranch?: string;
        productMode: 'local-first';
    };
}

export interface WorktreeTask {
    id: string;
    repoSessionId: string;
    branchName: string;
    worktreePath: string;
    taskKind: 'new-faction';
    status: 'ready' | 'running' | 'paused' | 'completed' | 'failed' | 'archived';
    artifactBundleIds: string[];
}

export interface WorkflowRun {
    id: string;
    templateId: 'new-faction';
    templateVersion: string;
    repoSessionId: string;
    worktreeTaskId: string;
    status: 'pending' | 'running' | 'waiting_decision' | 'blocked' | 'completed' | 'failed' | 'cancelled';
    currentNodeId?: string;
    checkpointVersion: number;
    startedAt: string;
    finishedAt?: string;
    latestDecisionRequestId?: string;
    latestArtifactBundleId?: string;
    title: string;
    context: {
        gameId: 'smashup';
        factionName: string;
    };
}

export interface NodeExecutionRecord {
    nodeId: WorkflowNodeId;
    runId: string;
    status: WorkbenchNodeStatus;
    attempt: number;
    inputRef: string;
    inputSnapshot: Record<string, unknown>;
    outputRef?: string;
    outputSnapshot?: Record<string, unknown>;
    stateRef?: string;
    stateSnapshot?: Record<string, unknown>;
    startedAt?: string;
    finishedAt?: string;
    errorCode?: string;
    errorSummary?: string;
}

export interface DecisionResolution {
    optionId: string;
    optionLabel: string;
    notes?: string;
    decidedAt: string;
    decidedBy: string;
}

export interface DecisionRequestOption {
    id: RuleSourceOptionId;
    label: string;
    description: string;
    payload: Record<string, unknown>;
}

export interface DecisionRequest {
    id: string;
    runId: string;
    nodeId: WorkflowNodeId;
    phase: 'rules' | 'assets' | 'definition' | 'delivery';
    kind: 'single_select' | 'form' | 'approval';
    title: string;
    summary: string;
    blocking: boolean;
    rationale?: string;
    options: DecisionRequestOption[];
    evidenceRefs: string[];
    recommendedOptionId?: RuleSourceOptionId;
    resumeToken: string;
    resolution?: DecisionResolution;
}

export interface ArtifactBundle {
    id: string;
    runId: string;
    title: string;
    status: 'published';
    createdAt: string;
    summary: string;
    outputs: {
        ruleSourceIndex: Array<Record<string, unknown>>;
        normalizedRuleCorpus: Record<string, unknown>;
        assetChecklist: Array<Record<string, unknown>>;
        factionDefinitionSnapshot: Record<string, unknown>;
        decisionLog: Array<Record<string, unknown>>;
        e2eStatus: 'not_applicable';
    };
    evidenceRefs: string[];
    keyObservations: string[];
}

export interface WorkflowTemplateSummary {
    id: 'new-faction';
    title: string;
    description: string;
    status: 'ready';
    tags: string[];
}

export interface WorkbenchJournal {
    schemaVersion: 1;
    updatedAt: string;
    repoSession: RepoSession;
    worktreeTask: WorktreeTask;
    templates: WorkflowTemplateSummary[];
    runs: WorkflowRun[];
    nodeRecords: NodeExecutionRecord[];
    decisions: DecisionRequest[];
    artifactBundles: ArtifactBundle[];
    activeRunId?: string;
}

export const AI_REPO_WORKBENCH_STORAGE_KEY = 'ai-repo-workbench:mvp-journal';
export const AI_REPO_WORKBENCH_REPO_PATH = 'D:\\gongzuo\\webgame\\BoardGame-wt-ai-repo-workbench';
const AI_REPO_WORKBENCH_BRANCH = 'feat/ai-repo-workbench';
const AUTO_NODE_DURATION_MS = 450;

const WORKFLOW_NODE_ORDER: WorkflowNodeId[] = [
    'capture-faction-intent',
    'select-rule-source',
    'acquire-rule-material',
    'transcribe-or-normalize-rules',
    'inspect-assets',
    'draft-faction-definition',
    'review-faction-definition',
    'publish-artifact-bundle',
];

export const RULE_SOURCE_OPTIONS: DecisionRequestOption[] = [
    {
        id: 'wiki',
        label: 'Wiki（推荐）',
        description: '直接按现有规则/Wiki 路径采集，最适合当前 local-first MVP。',
        payload: {
            sourceKind: 'wiki',
            rawSourceSet: ['smashup-fandom-faction-page'],
        },
    },
    {
        id: 'pdf',
        label: '上传 PDF',
        description: '保留 PDF 转录分支，适合规则书或扫描件。',
        payload: {
            sourceKind: 'pdf',
            rawSourceSet: ['uploaded-rulebook.pdf'],
        },
    },
    {
        id: 'document',
        label: '上传文档',
        description: '适合已有 Markdown、Word 导出的规则文本。',
        payload: {
            sourceKind: 'document',
            rawSourceSet: ['uploaded-rules.md'],
        },
    },
    {
        id: 'other-url',
        label: '其他 URL',
        description: '保留网页抓取入口，但当前仅做结构化占位。',
        payload: {
            sourceKind: 'other-url',
            rawSourceSet: ['https://example.com/faction-rules'],
        },
    },
];

function createId(prefix: string): string {
    return `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;
}

function toIso(now = Date.now()): string {
    return new Date(now).toISOString();
}

function sanitizeFactionPathSegment(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') || 'new-faction';
}

function createPendingNodeRecord(runId: string, nodeId: WorkflowNodeId): NodeExecutionRecord {
    return {
        nodeId,
        runId,
        status: 'pending',
        attempt: 0,
        inputRef: `${nodeId}.input.pending`,
        inputSnapshot: {},
    };
}

function getRuleSourceOption(optionId: RuleSourceOptionId): DecisionRequestOption {
    return RULE_SOURCE_OPTIONS.find((option) => option.id === optionId) ?? RULE_SOURCE_OPTIONS[0];
}

function getResolvedRuleSource(decision?: DecisionRequest): RuleSourceOptionId {
    if (!decision?.resolution) {
        return 'wiki';
    }
    return decision.resolution.optionId as RuleSourceOptionId;
}

function updateNodeRecord(
    journal: WorkbenchJournal,
    runId: string,
    nodeId: WorkflowNodeId,
    updater: (record: NodeExecutionRecord) => NodeExecutionRecord,
): WorkbenchJournal {
    return {
        ...journal,
        nodeRecords: journal.nodeRecords.map((record) => (
            record.runId === runId && record.nodeId === nodeId ? updater(record) : record
        )),
    };
}

function updateRun(
    journal: WorkbenchJournal,
    runId: string,
    updater: (run: WorkflowRun) => WorkflowRun,
): WorkbenchJournal {
    return {
        ...journal,
        runs: journal.runs.map((run) => (run.id === runId ? updater(run) : run)),
    };
}

function buildAcquireRuleMaterialOutput(factionName: string, sourceId: RuleSourceOptionId) {
    const option = getRuleSourceOption(sourceId);
    return {
        sourceKind: sourceId,
        rawSourceSet: option.payload.rawSourceSet,
        acquisitionMode: 'local-first-journal',
        summary: `${factionName} 已锁定 ${option.label} 作为规则来源。`,
    };
}

function buildNormalizedRuleCorpus(factionName: string, sourceId: RuleSourceOptionId) {
    return {
        sourceKind: sourceId,
        normalizedSections: [
            `${factionName} 的核心钩子是“离场后回收并再部署”。`,
            '每张牌都需要映射到统一的 faction definition 草案结构。',
            '规则来源必须保留来源索引和规范化摘要，避免只有聊天文本。',
        ],
        sourceMapping: [
            {
                sectionId: 'overview',
                sourceRef: sourceId,
                confidence: 'demo-fixture',
            },
        ],
    };
}

function buildAssetChecklist(factionName: string) {
    return [
        {
            item: `${factionName} 中文卡图`,
            status: 'missing',
            required: true,
            recoveryPath: '先走纯规则模式',
        },
        {
            item: `${factionName} 基地图`,
            status: 'missing',
            required: true,
            recoveryPath: '补素材后继续',
        },
        {
            item: `${factionName} locale 文案骨架`,
            status: 'ready',
            required: true,
            recoveryPath: 'n/a',
        },
    ];
}

function buildFactionDefinitionSnapshot(factionName: string, sourceId: RuleSourceOptionId) {
    return {
        factionName,
        gameId: 'smashup',
        sourceKind: sourceId,
        designHook: '离场回收 + 再部署节奏',
        mechanicPillars: ['回收已打出的随从', '延迟爆发', '资源留痕'],
        cardPackageSkeleton: {
            minions: 10,
            actions: 10,
            bases: 2,
        },
        reviewMode: 'mvp-structured-stub',
    };
}

function buildAutoNodeOutput(
    journal: WorkbenchJournal,
    run: WorkflowRun,
    nodeId: WorkflowNodeId,
): Record<string, unknown> {
    const decision = journal.decisions.find((item) => item.id === run.latestDecisionRequestId);
    const sourceId = getResolvedRuleSource(decision);
    const factionName = run.context.factionName;

    switch (nodeId) {
        case 'acquire-rule-material':
            return buildAcquireRuleMaterialOutput(factionName, sourceId);
        case 'transcribe-or-normalize-rules':
            return {
                normalizedRuleCorpus: buildNormalizedRuleCorpus(factionName, sourceId),
                normalizationMode: sourceId === 'wiki' ? 'wiki-ingest-ready' : 'document-ingest-ready',
            };
        case 'inspect-assets':
            return {
                assetChecklist: buildAssetChecklist(factionName),
                selectedRecoveryPath: '先走纯规则模式',
                inspectionMode: 'structured_stub_but_domain_real',
            };
        case 'draft-faction-definition':
            return {
                factionDefinitionSnapshot: buildFactionDefinitionSnapshot(factionName, sourceId),
                outputShape: 'ArtifactBundle-ready',
            };
        case 'review-faction-definition':
            return {
                reviewMode: 'auto_approval_stub',
                approvalStatus: 'approved_for_demo',
                explanation: '本轮 MVP 只保留规则来源的真实人工决策，定义确认先用结构化 stub 自动通过。',
            };
        default:
            return {};
    }
}

function createArtifactBundle(journal: WorkbenchJournal, run: WorkflowRun, now: number): ArtifactBundle {
    const decision = journal.decisions.find((item) => item.id === run.latestDecisionRequestId);
    const sourceId = getResolvedRuleSource(decision);
    const sourceOption = getRuleSourceOption(sourceId);
    const factionName = run.context.factionName;

    return {
        id: createId('artifact'),
        runId: run.id,
        title: `${factionName} ArtifactBundle`,
        status: 'published',
        createdAt: toIso(now),
        summary: `已基于 ${sourceOption.label} 完成 new-faction MVP 纵切片，包含规则来源、规范化文本、素材检查与定义快照。`,
        outputs: {
            ruleSourceIndex: [
                {
                    sourceKind: sourceId,
                    label: sourceOption.label,
                    rawSourceSet: sourceOption.payload.rawSourceSet,
                    decisionMode: 'human-selected',
                },
            ],
            normalizedRuleCorpus: buildNormalizedRuleCorpus(factionName, sourceId),
            assetChecklist: buildAssetChecklist(factionName),
            factionDefinitionSnapshot: buildFactionDefinitionSnapshot(factionName, sourceId),
            decisionLog: [
                {
                    decisionId: decision?.id ?? 'missing-decision',
                    title: decision?.title ?? '规则来源选择',
                    resolution: decision?.resolution ?? null,
                },
            ],
            e2eStatus: 'not_applicable',
        },
        evidenceRefs: [
            'RepoSession.local-fixture',
            'DecisionRequest.select-rule-source',
            'ArtifactBundle.outputs.e2eStatus=not_applicable',
        ],
        keyObservations: [
            '当前纵切片把真实人工输入收敛到规则来源选择，其他节点仍以结构化 local fixture 驱动。',
            '运行详情页已经能展示节点状态、决策记录和 ArtifactBundle，不再只是 spec 文本。',
            '后续若接真实抓取或 PDF 转录，只需要替换 LocalRuntime 节点实现，不需要改前端主语义。',
        ],
    };
}

function startNextPendingNode(journal: WorkbenchJournal, runId: string, now: number): WorkbenchJournal {
    const run = journal.runs.find((item) => item.id === runId);
    if (!run || run.status !== 'running') {
        return journal;
    }

    const nextRecord = journal.nodeRecords.find((record) => record.runId === runId && record.status === 'pending');
    if (!nextRecord) {
        return journal;
    }

    const startedJournal = updateNodeRecord(journal, runId, nextRecord.nodeId, (record) => ({
        ...record,
        status: 'running',
        attempt: Math.max(record.attempt, 1),
        startedAt: toIso(now),
        inputRef: `${record.nodeId}.input.started`,
        inputSnapshot: {
            runId,
            factionName: run.context.factionName,
        },
    }));

    return updateRun(startedJournal, runId, (activeRun) => ({
        ...activeRun,
        currentNodeId: nextRecord.nodeId,
    }));
}

export function createInitialWorkbenchJournal(now = Date.now()): WorkbenchJournal {
    const createdAt = toIso(now);
    const repoSessionId = createId('repo-session');
    const worktreeTaskId = createId('worktree-task');

    return {
        schemaVersion: 1,
        updatedAt: createdAt,
        repoSession: {
            id: repoSessionId,
            sourceType: 'import-local',
            rootPath: AI_REPO_WORKBENCH_REPO_PATH,
            defaultBranch: 'main',
            activeWorktreeId: worktreeTaskId,
            repoFingerprint: 'ai-repo-workbench-local-fixture',
            createdAt,
            metadata: {
                repoName: 'BoardGame-wt-ai-repo-workbench',
                currentBranch: AI_REPO_WORKBENCH_BRANCH,
                productMode: 'local-first',
            },
        },
        worktreeTask: {
            id: worktreeTaskId,
            repoSessionId,
            branchName: AI_REPO_WORKBENCH_BRANCH,
            worktreePath: AI_REPO_WORKBENCH_REPO_PATH,
            taskKind: 'new-faction',
            status: 'ready',
            artifactBundleIds: [],
        },
        templates: [
            {
                id: 'new-faction',
                title: 'new-faction',
                description: '围绕派系规则来源、素材检查与 ArtifactBundle 交付的首条固定模板。',
                status: 'ready',
                tags: ['RepoSession', 'DecisionRequest', 'ArtifactBundle', 'local-first'],
            },
        ],
        runs: [],
        nodeRecords: [],
        decisions: [],
        artifactBundles: [],
    };
}

export function loadWorkbenchJournal(): WorkbenchJournal {
    if (typeof window === 'undefined') {
        return createInitialWorkbenchJournal();
    }

    const raw = window.localStorage.getItem(AI_REPO_WORKBENCH_STORAGE_KEY);
    if (!raw) {
        return createInitialWorkbenchJournal();
    }

    try {
        const parsed = JSON.parse(raw) as WorkbenchJournal;
        if (parsed.schemaVersion !== 1) {
            return createInitialWorkbenchJournal();
        }
        return parsed;
    } catch {
        return createInitialWorkbenchJournal();
    }
}

export function persistWorkbenchJournal(journal: WorkbenchJournal): void {
    if (typeof window === 'undefined') {
        return;
    }
    window.localStorage.setItem(AI_REPO_WORKBENCH_STORAGE_KEY, JSON.stringify(journal));
}

export function resetWorkbenchJournal(now = Date.now()): WorkbenchJournal {
    const fresh = createInitialWorkbenchJournal(now);
    persistWorkbenchJournal(fresh);
    return fresh;
}

export function startNewFactionRun(
    journal: WorkbenchJournal,
    payload: { factionName: string },
    now = Date.now(),
): WorkbenchJournal {
    const factionName = payload.factionName.trim() || '星环游牧者';
    const runId = createId('workflow-run');
    const decisionId = createId('decision');
    const createdAt = toIso(now);

    const run: WorkflowRun = {
        id: runId,
        templateId: 'new-faction',
        templateVersion: 'mvp-v1',
        repoSessionId: journal.repoSession.id,
        worktreeTaskId: journal.worktreeTask.id,
        status: 'waiting_decision',
        currentNodeId: 'select-rule-source',
        checkpointVersion: 1,
        startedAt: createdAt,
        latestDecisionRequestId: decisionId,
        title: `${factionName} / new-faction`,
        context: {
            gameId: 'smashup',
            factionName,
        },
    };

    const decision: DecisionRequest = {
        id: decisionId,
        runId,
        nodeId: 'select-rule-source',
        phase: 'rules',
        kind: 'single_select',
        title: '选择规则来源',
        summary: `为 ${factionName} 选择当前这次纵切片要走的规则来源路径。`,
        blocking: true,
        rationale: '首个真实人工决策点必须可见、可恢复、可审计。',
        options: RULE_SOURCE_OPTIONS,
        evidenceRefs: [
            'openspec:add-ai-repo-workbench/select-rule-source',
            'repo:local-first-fixture',
        ],
        recommendedOptionId: 'wiki',
        resumeToken: createId('resume-token'),
    };

    const captureNode: NodeExecutionRecord = {
        nodeId: 'capture-faction-intent',
        runId,
        status: 'completed',
        attempt: 1,
        inputRef: 'capture-faction-intent.input.fixture',
        inputSnapshot: {
            templateId: 'new-faction',
            factionName,
            gameId: 'smashup',
        },
        outputRef: 'capture-faction-intent.output.intent',
        outputSnapshot: {
            workingDirectory: `temp/workbench/${sanitizeFactionPathSegment(factionName)}`,
            requestedOutcome: '生成规则驱动的派系定义草案与 ArtifactBundle',
        },
        startedAt: createdAt,
        finishedAt: createdAt,
    };

    const selectRuleSourceNode: NodeExecutionRecord = {
        nodeId: 'select-rule-source',
        runId,
        status: 'waiting_decision',
        attempt: 1,
        inputRef: 'select-rule-source.input.options',
        inputSnapshot: {
            supportedSources: RULE_SOURCE_OPTIONS.map((option) => option.id),
            recommendedOptionId: 'wiki',
        },
        stateRef: 'select-rule-source.state.decision-request',
        stateSnapshot: {
            decisionRequestId: decisionId,
        },
        startedAt: createdAt,
    };

    const nextNodes = WORKFLOW_NODE_ORDER
        .filter((nodeId) => !['capture-faction-intent', 'select-rule-source'].includes(nodeId))
        .map((nodeId) => createPendingNodeRecord(runId, nodeId));

    return {
        ...journal,
        updatedAt: createdAt,
        activeRunId: runId,
        worktreeTask: {
            ...journal.worktreeTask,
            status: 'paused',
        },
        runs: [...journal.runs, run],
        nodeRecords: [...journal.nodeRecords, captureNode, selectRuleSourceNode, ...nextNodes],
        decisions: [...journal.decisions, decision],
        artifactBundles: journal.artifactBundles,
    };
}

export function submitRuleSourceDecision(
    journal: WorkbenchJournal,
    payload: {
        decisionId: string;
        optionId: RuleSourceOptionId;
    },
    now = Date.now(),
): WorkbenchJournal {
    const decision = journal.decisions.find((item) => item.id === payload.decisionId);
    if (!decision || decision.resolution) {
        return journal;
    }

    const run = journal.runs.find((item) => item.id === decision.runId);
    if (!run) {
        return journal;
    }

    const option = getRuleSourceOption(payload.optionId);
    const decidedAt = toIso(now);
    const resolvedDecision: DecisionRequest = {
        ...decision,
        resolution: {
            optionId: option.id,
            optionLabel: option.label,
            decidedAt,
            decidedBy: 'owner',
        },
    };

    const withDecision = {
        ...journal,
        updatedAt: decidedAt,
        decisions: journal.decisions.map((item) => (item.id === decision.id ? resolvedDecision : item)),
        worktreeTask: {
            ...journal.worktreeTask,
            status: 'running',
        },
    };

    const withCompletedNode = updateNodeRecord(withDecision, run.id, 'select-rule-source', (record) => ({
        ...record,
        status: 'completed',
        outputRef: 'select-rule-source.output.selection',
        outputSnapshot: {
            selectedSource: option.id,
            selectedLabel: option.label,
            rawSourceSet: option.payload.rawSourceSet,
        },
        stateRef: 'select-rule-source.state.resolved',
        stateSnapshot: {
            resumeToken: decision.resumeToken,
            resumeMode: 'idempotent',
        },
        finishedAt: decidedAt,
    }));

    const withRunningRun = updateRun(withCompletedNode, run.id, (item) => ({
        ...item,
        status: 'running',
        checkpointVersion: item.checkpointVersion + 1,
        currentNodeId: undefined,
    }));

    return startNextPendingNode(withRunningRun, run.id, now);
}

export function advanceWorkbenchJournal(journal: WorkbenchJournal, now = Date.now()): WorkbenchJournal {
    if (!journal.activeRunId) {
        return journal;
    }

    const run = journal.runs.find((item) => item.id === journal.activeRunId);
    if (!run || run.status !== 'running') {
        return journal;
    }

    const runningNode = journal.nodeRecords.find((record) => record.runId === run.id && record.status === 'running');
    if (!runningNode) {
        return startNextPendingNode(journal, run.id, now);
    }

    if (!runningNode.startedAt || now - Date.parse(runningNode.startedAt) < AUTO_NODE_DURATION_MS) {
        return journal;
    }

    if (runningNode.nodeId === 'publish-artifact-bundle') {
        const artifact = createArtifactBundle(journal, run, now);
        const finishedAt = toIso(now);

        const withCompletedPublishNode = updateNodeRecord(journal, run.id, runningNode.nodeId, (record) => ({
            ...record,
            status: 'completed',
            outputRef: 'publish-artifact-bundle.output.bundle',
            outputSnapshot: {
                artifactBundleId: artifact.id,
                summary: artifact.summary,
            },
            finishedAt,
        }));

        const withCompletedRun = updateRun(withCompletedPublishNode, run.id, (item) => ({
            ...item,
            status: 'completed',
            currentNodeId: undefined,
            finishedAt,
            checkpointVersion: item.checkpointVersion + 1,
            latestArtifactBundleId: artifact.id,
        }));

        return {
            ...withCompletedRun,
            updatedAt: finishedAt,
            worktreeTask: {
                ...withCompletedRun.worktreeTask,
                status: 'completed',
                artifactBundleIds: [...withCompletedRun.worktreeTask.artifactBundleIds, artifact.id],
            },
            artifactBundles: [...withCompletedRun.artifactBundles, artifact],
        };
    }

    const outputSnapshot = buildAutoNodeOutput(journal, run, runningNode.nodeId);
    const finishedAt = toIso(now);
    const completedJournal = updateNodeRecord(journal, run.id, runningNode.nodeId, (record) => ({
        ...record,
        status: 'completed',
        outputRef: `${record.nodeId}.output.completed`,
        outputSnapshot,
        finishedAt,
    }));

    const withCheckpoint = updateRun(completedJournal, run.id, (item) => ({
        ...item,
        checkpointVersion: item.checkpointVersion + 1,
        currentNodeId: undefined,
    }));

    return startNextPendingNode(withCheckpoint, run.id, now);
}
