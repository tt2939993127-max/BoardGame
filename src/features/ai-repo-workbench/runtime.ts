export type WorkbenchNodeStatus =
    | 'pending'
    | 'running'
    | 'waiting_decision'
    | 'blocked'
    | 'skipped'
    | 'completed'
    | 'failed';

import {
    createLocalWorkflowOrchestrator,
    type LocalRuntime,
    type WorkflowOrchestrator,
} from './workflowServices';
import { createLangGraphWorkflowOrchestrator } from './langgraphWorkflowOrchestrator';

export type RuleSourceOptionId = 'wiki' | 'pdf' | 'document' | 'other-url';
export type WorkflowTemplateId = 'new-faction';
export const DEFAULT_WORKFLOW_TEMPLATE_ID: WorkflowTemplateId = 'new-faction';

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

export type OptionalWorkflowNodeId = 'run-e2e-validation';

export interface WorkflowNodeToggleDefinition {
    nodeId: OptionalWorkflowNodeId;
    label: string;
    description: string;
    defaultEnabled: boolean;
}

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
    label: string;
    branchName: string;
    worktreePath: string;
    taskKind: WorkflowTemplateId;
    status: 'ready' | 'running' | 'paused' | 'completed' | 'failed' | 'archived';
    artifactBundleIds: string[];
    managedBy: 'git-fixture' | 'journal-user' | 'git-runtime';
    lastRunId?: string;
}

export interface WorkflowRun {
    id: string;
    templateId: WorkflowTemplateId;
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
    enabledNodeIds: WorkflowNodeId[];
    orchestrator?: {
        engine: 'local' | 'langgraph';
        threadId?: string;
        checkpointStatus: 'waiting_decision' | 'resumed' | 'fallback' | 'completed';
        lastSyncAt: string;
    };
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
        e2eStatus: 'skipped' | 'passed_demo';
    };
    evidenceRefs: string[];
    keyObservations: string[];
}

export interface WorkflowTemplateSummary {
    id: WorkflowTemplateId;
    title: string;
    description: string;
    status: 'ready';
    tags: string[];
    optionalNodeToggles: WorkflowNodeToggleDefinition[];
}

export interface WorkflowNodeDefinition {
    label: string;
    hint: string;
}

export interface WorkflowTemplateDefinition extends WorkflowTemplateSummary {
    version: string;
    nodeOrder: WorkflowNodeId[];
    nodeDefinitions: Record<WorkflowNodeId, WorkflowNodeDefinition>;
}

export interface WorkbenchJournal {
    schemaVersion: 4;
    updatedAt: string;
    repoSession: RepoSession;
    managedWorktrees: WorktreeTask[];
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

const NEW_FACTION_NODE_ORDER: WorkflowNodeId[] = [
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

const NEW_FACTION_OPTIONAL_NODE_TOGGLES: WorkflowNodeToggleDefinition[] = [
    {
        nodeId: 'run-e2e-validation',
        label: '端到端验证',
        description: '开启后会在发布 ArtifactBundle 前执行 E2E 验证节点；关闭则该节点直接跳过。',
        defaultEnabled: false,
    },
];

const NEW_FACTION_NODE_DEFINITIONS: Record<WorkflowNodeId, WorkflowNodeDefinition> = {
    'capture-faction-intent': {
        label: 'capture-faction-intent',
        hint: '锁定 RepoSession、模板和目标派系上下文。',
    },
    'select-rule-source': {
        label: 'select-rule-source',
        hint: '第一个真实人工决策点，统一通过 DecisionRequest 渲染。',
    },
    'acquire-rule-material': {
        label: 'acquire-rule-material',
        hint: '把来源入口收敛成 rawSourceSet。',
    },
    'transcribe-or-normalize-rules': {
        label: 'transcribe-or-normalize-rules',
        hint: '输出 normalizedRuleCorpus 和来源映射。',
    },
    'inspect-assets': {
        label: 'inspect-assets',
        hint: '把素材缺口结构化，不再只写“以后补”。',
    },
    'draft-faction-definition': {
        label: 'draft-faction-definition',
        hint: '生成可进入实现阶段的定义草案快照。',
    },
    'review-faction-definition': {
        label: 'review-faction-definition',
        hint: '当前仍是结构化 stub 自动通过，已明确标注。',
    },
    'run-e2e-validation': {
        label: 'run-e2e-validation',
        hint: '可选节点；用户可以在启动前关闭，例如本轮不做端到端时直接跳过。',
    },
    'publish-artifact-bundle': {
        label: 'publish-artifact-bundle',
        hint: '生成 ArtifactBundle 并进入完成态。',
    },
};

export const WORKFLOW_TEMPLATE_REGISTRY: Record<WorkflowTemplateId, WorkflowTemplateDefinition> = {
    'new-faction': {
        id: DEFAULT_WORKFLOW_TEMPLATE_ID,
        title: 'new-faction',
        description: '围绕派系规则来源、素材检查与 ArtifactBundle 交付的首条固定模板。',
        status: 'ready',
        version: 'mvp-v1',
        tags: ['RepoSession', 'DecisionRequest', 'ArtifactBundle', 'local-first'],
        optionalNodeToggles: NEW_FACTION_OPTIONAL_NODE_TOGGLES,
        nodeOrder: NEW_FACTION_NODE_ORDER,
        nodeDefinitions: NEW_FACTION_NODE_DEFINITIONS,
    },
};

export function getWorkflowTemplateDefinition(templateId: WorkflowTemplateId): WorkflowTemplateDefinition {
    return WORKFLOW_TEMPLATE_REGISTRY[templateId];
}

export function getWorkflowTemplateSummaries(): WorkflowTemplateSummary[] {
    return Object.values(WORKFLOW_TEMPLATE_REGISTRY).map((template) => ({
        id: template.id,
        title: template.title,
        description: template.description,
        status: template.status,
        tags: template.tags,
        optionalNodeToggles: template.optionalNodeToggles,
    }));
}

export function getActiveRun(journal: WorkbenchJournal): WorkflowRun | null {
    return journal.runs.find((run) => run.id === journal.activeRunId) ?? null;
}

export function getLatestRunForWorktree(journal: WorkbenchJournal, worktreeId?: string): WorkflowRun | null {
    if (!worktreeId) {
        return null;
    }
    return journal.runs
        .filter((run) => run.worktreeTaskId === worktreeId)
        .sort((left, right) => Date.parse(right.startedAt) - Date.parse(left.startedAt))[0]
        ?? null;
}

export function getVisibleRunForWorktree(journal: WorkbenchJournal, worktreeId?: string): WorkflowRun | null {
    const activeRun = getActiveRun(journal);
    if (!worktreeId) {
        return activeRun;
    }
    if (activeRun?.worktreeTaskId === worktreeId) {
        return activeRun;
    }
    return getLatestRunForWorktree(journal, worktreeId);
}

export function getRunNodeRecords(journal: WorkbenchJournal, runId?: string): NodeExecutionRecord[] {
    if (!runId) {
        return [];
    }
    return journal.nodeRecords.filter((record) => record.runId === runId);
}

export function getPendingDecisionForRun(journal: WorkbenchJournal, runId?: string): DecisionRequest | null {
    if (!runId) {
        return null;
    }
    return journal.decisions.find((decision) => decision.runId === runId && !decision.resolution) ?? null;
}

export function getArtifactBundleForRun(journal: WorkbenchJournal, runId?: string): ArtifactBundle | null {
    if (!runId) {
        return null;
    }
    const run = journal.runs.find((item) => item.id === runId);
    if (!run?.latestArtifactBundleId) {
        return null;
    }
    return journal.artifactBundles.find((bundle) => bundle.id === run.latestArtifactBundleId) ?? null;
}

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
        .replace(/^-|-$/g, '') || DEFAULT_WORKFLOW_TEMPLATE_ID;
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

function createSkippedNodeRecord(
    runId: string,
    nodeId: OptionalWorkflowNodeId,
    now: number,
): NodeExecutionRecord {
    return {
        nodeId,
        runId,
        status: 'skipped',
        attempt: 0,
        inputRef: `${nodeId}.input.skipped`,
        inputSnapshot: {
            skippedByUser: true,
        },
        outputRef: `${nodeId}.output.skipped`,
        outputSnapshot: {
            reason: 'disabled-before-run',
        },
        finishedAt: toIso(now),
    };
}

function resolveEnabledNodeIds(
    templateId: WorkflowTemplateId,
    nodeToggles?: Partial<Record<OptionalWorkflowNodeId, boolean>>,
): WorkflowNodeId[] {
    const template = getWorkflowTemplateDefinition(templateId);
    return template.nodeOrder.filter((nodeId) => {
        const toggle = template.optionalNodeToggles.find((item) => item.nodeId === nodeId);
        if (!toggle) {
            return true;
        }
        return nodeToggles?.[toggle.nodeId] ?? toggle.defaultEnabled;
    });
}

function syncManagedWorktree(
    journal: WorkbenchJournal,
    worktreeId: string,
    updater: (task: WorktreeTask) => WorktreeTask,
): WorkbenchJournal {
    const managedWorktrees = journal.managedWorktrees.map((task) => (
        task.id === worktreeId ? updater(task) : task
    ));
    const activeTask = managedWorktrees.find((task) => task.id === journal.repoSession.activeWorktreeId)
        ?? managedWorktrees[0];

    return {
        ...journal,
        managedWorktrees,
        repoSession: {
            ...journal.repoSession,
            activeWorktreeId: activeTask?.id,
        },
    };
}

function getActiveWorktreeTask(journal: WorkbenchJournal): WorktreeTask | undefined {
    return journal.managedWorktrees.find((task) => task.id === journal.repoSession.activeWorktreeId)
        ?? journal.managedWorktrees[0];
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
        case 'run-e2e-validation':
            return {
                e2eStatus: 'passed_demo',
                validationMode: 'workflow-node-demo',
                summary: '本轮用户开启了 E2E 验证节点，工作流已执行该节点。',
            };
        default:
            return {};
    }
}

function createArtifactBundle(journal: WorkbenchJournal, run: WorkflowRun, now: number): ArtifactBundle {
    const template = getWorkflowTemplateDefinition(run.templateId);
    const decision = journal.decisions.find((item) => item.id === run.latestDecisionRequestId);
    const sourceId = getResolvedRuleSource(decision);
    const sourceOption = getRuleSourceOption(sourceId);
    const factionName = run.context.factionName;
    const e2eEnabled = run.enabledNodeIds.includes('run-e2e-validation');

    return {
        id: createId('artifact'),
        runId: run.id,
        title: `${factionName} ArtifactBundle`,
        status: 'published',
        createdAt: toIso(now),
        summary: `已基于 ${sourceOption.label} 完成 ${template.title} MVP 纵切片，包含规则来源、规范化文本、素材检查与定义快照。`,
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

export const LOCAL_RUNTIME: LocalRuntime = {
    pauseForDecision(journal, payload, now = Date.now()) {
        const updatedAt = toIso(now);
        const updatedJournal = {
            ...journal,
            updatedAt,
            activeRunId: payload.run.id,
            runs: [...journal.runs, payload.run],
            nodeRecords: [...journal.nodeRecords, ...payload.nodeRecords],
            decisions: [...journal.decisions, payload.decision],
            artifactBundles: journal.artifactBundles,
        };
        return syncManagedWorktree(updatedJournal, payload.run.worktreeTaskId, (task) => ({
            ...task,
            status: 'paused',
            lastRunId: payload.run.id,
        }));
    },
    resumeRun(journal, payload, now = Date.now()) {
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
        };
        const withRunningWorktree = syncManagedWorktree(withDecision, run.worktreeTaskId, (task) => ({
            ...task,
            status: 'running',
        }));

        const withCompletedNode = updateNodeRecord(withRunningWorktree, run.id, 'select-rule-source', (record) => ({
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

        return updateRun(withCompletedNode, run.id, (item) => ({
            ...item,
            status: 'running',
            checkpointVersion: item.checkpointVersion + 1,
            currentNodeId: undefined,
        }));
    },
    runNode(journal, payload, now = Date.now()) {
        const run = journal.runs.find((item) => item.id === payload.runId);
        if (!run) {
            return journal;
        }
        const outputSnapshot = buildAutoNodeOutput(journal, run, payload.nodeId);
        const finishedAt = toIso(now);
        const completedJournal = updateNodeRecord(journal, run.id, payload.nodeId, (record) => ({
            ...record,
            status: 'completed',
            outputRef: `${record.nodeId}.output.completed`,
            outputSnapshot,
            finishedAt,
        }));

        return updateRun(completedJournal, run.id, (item) => ({
            ...item,
            checkpointVersion: item.checkpointVersion + 1,
            currentNodeId: undefined,
        }));
    },
    publishArtifactBundle(journal, payload, now = Date.now()) {
        const run = journal.runs.find((item) => item.id === payload.runId);
        if (!run) {
            return journal;
        }

        const artifact = createArtifactBundle(journal, run, now);
        const finishedAt = toIso(now);

        const withCompletedPublishNode = updateNodeRecord(journal, run.id, payload.nodeId, (record) => ({
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

        return syncManagedWorktree({
            ...withCompletedRun,
            updatedAt: finishedAt,
            artifactBundles: [...withCompletedRun.artifactBundles, artifact],
        }, run.worktreeTaskId, (task) => ({
            ...task,
            status: 'completed',
            artifactBundleIds: [...task.artifactBundleIds, artifact.id],
            lastRunId: run.id,
        }));
    },
};

const LOCAL_WORKFLOW_ORCHESTRATOR = createLocalWorkflowOrchestrator({
    autoNodeDurationMs: AUTO_NODE_DURATION_MS,
    defaultTemplateId: DEFAULT_WORKFLOW_TEMPLATE_ID,
    localRuntime: LOCAL_RUNTIME,
    createId,
    toIso,
    sanitizeFactionPathSegment,
    createPendingNodeRecord,
    createSkippedNodeRecord,
    resolveEnabledNodeIds,
    syncManagedWorktree,
    getActiveWorktreeTask,
    updateNodeRecord,
    updateRun,
    getWorkflowTemplateDefinition,
    ruleSourceOptions: RULE_SOURCE_OPTIONS,
});

const WORKFLOW_ORCHESTRATOR: WorkflowOrchestrator = createLangGraphWorkflowOrchestrator({
    localOrchestrator: LOCAL_WORKFLOW_ORCHESTRATOR,
    createThreadId: () => createId('workflow-thread'),
    toIso,
});

export function createInitialWorkbenchJournal(now = Date.now()): WorkbenchJournal {
    const createdAt = toIso(now);
    const repoSessionId = createId('repo-session');
    const worktreeTaskId = createId('worktree-task');
    const initialWorktreeTask: WorktreeTask = {
        id: worktreeTaskId,
        repoSessionId,
        label: '当前 AI 工作树',
        branchName: AI_REPO_WORKBENCH_BRANCH,
        worktreePath: AI_REPO_WORKBENCH_REPO_PATH,
        taskKind: DEFAULT_WORKFLOW_TEMPLATE_ID,
        status: 'ready',
        artifactBundleIds: [],
        managedBy: 'git-fixture',
    };

    return {
        schemaVersion: 4,
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
        managedWorktrees: [initialWorktreeTask],
        runs: [],
        nodeRecords: [],
        decisions: [],
        artifactBundles: [],
    };
}

type WorkbenchStorage = {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
};

function getWorkbenchStorage(): WorkbenchStorage | null {
    const runtimeGlobal = globalThis as { localStorage?: WorkbenchStorage };
    return runtimeGlobal.localStorage ?? null;
}

export function hydrateWorkbenchJournal(raw?: string | null): WorkbenchJournal {
    if (!raw) {
        return createInitialWorkbenchJournal();
    }

    try {
        const parsed = JSON.parse(raw) as
            | WorkbenchJournal
            | ({
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
            })
            | ({
                schemaVersion: 2;
                updatedAt: string;
                repoSession: RepoSession;
                worktreeTask: WorktreeTask;
                managedWorktrees: WorktreeTask[];
                templates: WorkflowTemplateSummary[];
                runs: WorkflowRun[];
                nodeRecords: NodeExecutionRecord[];
                decisions: DecisionRequest[];
                artifactBundles: ArtifactBundle[];
                activeRunId?: string;
            })
            | ({
                schemaVersion: 3;
                updatedAt: string;
                repoSession: RepoSession;
                managedWorktrees: WorktreeTask[];
                templates?: WorkflowTemplateSummary[];
                runs: WorkflowRun[];
                nodeRecords: NodeExecutionRecord[];
                decisions: DecisionRequest[];
                artifactBundles: ArtifactBundle[];
                activeRunId?: string;
            });
        if (parsed.schemaVersion === 1) {
            const migratedWorktree = {
                ...parsed.worktreeTask,
                label: '当前 AI 工作树',
                managedBy: 'git-fixture' as const,
            };
            return {
                schemaVersion: 4,
                updatedAt: parsed.updatedAt,
                managedWorktrees: [migratedWorktree],
                repoSession: {
                    ...parsed.repoSession,
                    activeWorktreeId: migratedWorktree.id,
                },
                runs: parsed.runs,
                nodeRecords: parsed.nodeRecords,
                decisions: parsed.decisions,
                artifactBundles: parsed.artifactBundles,
                activeRunId: parsed.activeRunId,
            };
        }
        if (parsed.schemaVersion === 2) {
            return {
                schemaVersion: 4,
                updatedAt: parsed.updatedAt,
                repoSession: {
                    ...parsed.repoSession,
                    activeWorktreeId: parsed.repoSession.activeWorktreeId ?? parsed.managedWorktrees[0]?.id,
                },
                managedWorktrees: parsed.managedWorktrees,
                runs: parsed.runs,
                nodeRecords: parsed.nodeRecords,
                decisions: parsed.decisions,
                artifactBundles: parsed.artifactBundles,
                activeRunId: parsed.activeRunId,
            };
        }
        if (parsed.schemaVersion === 3) {
            return {
                schemaVersion: 4,
                updatedAt: parsed.updatedAt,
                repoSession: parsed.repoSession,
                managedWorktrees: parsed.managedWorktrees,
                runs: parsed.runs,
                nodeRecords: parsed.nodeRecords,
                decisions: parsed.decisions,
                artifactBundles: parsed.artifactBundles,
                activeRunId: parsed.activeRunId,
            };
        }
        if (parsed.schemaVersion !== 4) {
            return createInitialWorkbenchJournal();
        }
        return parsed;
    } catch {
        return createInitialWorkbenchJournal();
    }
}

export function loadWorkbenchJournal(): WorkbenchJournal {
    const storage = getWorkbenchStorage();
    if (!storage) {
        return createInitialWorkbenchJournal();
    }
    return hydrateWorkbenchJournal(storage.getItem(AI_REPO_WORKBENCH_STORAGE_KEY));
}

export function persistWorkbenchJournal(journal: WorkbenchJournal): void {
    const storage = getWorkbenchStorage();
    if (!storage) {
        return;
    }
    storage.setItem(AI_REPO_WORKBENCH_STORAGE_KEY, JSON.stringify(journal));
}

export function resetWorkbenchJournal(now = Date.now()): WorkbenchJournal {
    const fresh = createInitialWorkbenchJournal(now);
    persistWorkbenchJournal(fresh);
    return fresh;
}

export function registerManagedWorktree(
    journal: WorkbenchJournal,
    payload: {
        branchName: string;
        worktreePath: string;
        label?: string;
    },
    now = Date.now(),
): WorkbenchJournal {
    const branchName = payload.branchName.trim();
    const worktreePath = payload.worktreePath.trim();
    if (!branchName || !worktreePath) {
        return journal;
    }

    const duplicate = journal.managedWorktrees.find((task) => (
        task.branchName === branchName || task.worktreePath.toLowerCase() === worktreePath.toLowerCase()
    ));
    if (duplicate) {
        return focusManagedWorktree(journal, { worktreeId: duplicate.id }, now);
    }

    const nextTask: WorktreeTask = {
        id: createId('worktree-task'),
        repoSessionId: journal.repoSession.id,
        label: payload.label?.trim() || branchName,
        branchName,
        worktreePath,
        taskKind: DEFAULT_WORKFLOW_TEMPLATE_ID,
        status: 'ready',
        artifactBundleIds: [],
        managedBy: 'journal-user',
    };

    const updatedAt = toIso(now);
    return {
        ...journal,
        updatedAt,
        managedWorktrees: [...journal.managedWorktrees, nextTask],
        repoSession: {
            ...journal.repoSession,
            activeWorktreeId: nextTask.id,
        },
    };
}

export function focusManagedWorktree(
    journal: WorkbenchJournal,
    payload: {
        worktreeId: string;
    },
    now = Date.now(),
): WorkbenchJournal {
    const target = journal.managedWorktrees.find((task) => task.id === payload.worktreeId);
    if (!target) {
        return journal;
    }

    return {
        ...journal,
        updatedAt: toIso(now),
        repoSession: {
            ...journal.repoSession,
            activeWorktreeId: target.id,
        },
    };
}

export async function startNewFactionRun(
    journal: WorkbenchJournal,
    payload: {
        factionName: string;
        nodeToggles?: Partial<Record<OptionalWorkflowNodeId, boolean>>;
    },
    now = Date.now(),
): Promise<WorkbenchJournal> {
    return await WORKFLOW_ORCHESTRATOR.startNewFactionRun(journal, payload, now);
}

export async function submitRuleSourceDecision(
    journal: WorkbenchJournal,
    payload: {
        decisionId: string;
        optionId: RuleSourceOptionId;
    },
    now = Date.now(),
): Promise<WorkbenchJournal> {
    return await WORKFLOW_ORCHESTRATOR.submitRuleSourceDecision(journal, payload, now);
}

export async function advanceWorkbenchJournal(journal: WorkbenchJournal, now = Date.now()): Promise<WorkbenchJournal> {
    return await WORKFLOW_ORCHESTRATOR.advance(journal, now);
}
