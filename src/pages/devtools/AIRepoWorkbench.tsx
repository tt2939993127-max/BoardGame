import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, FolderGit2, GitBranch, PlayCircle, RefreshCcw, Sparkles, Workflow, Zap } from 'lucide-react';
import clsx from 'clsx';
import { useNavigate } from 'react-router-dom';
import {
    DEFAULT_WORKFLOW_TEMPLATE_ID,
    advanceWorkbenchJournal,
    getArtifactBundleForRun,
    getPendingDecisionForRun,
    getRunNodeRecords,
    getVisibleRunForWorktree,
    getWorkflowTemplateDefinition,
    loadWorkbenchJournal,
    persistWorkbenchJournal,
    resetWorkbenchJournal,
    startNewFactionRun,
    submitRuleSourceDecision,
    type ArtifactBundle,
    type DecisionRequest,
    type NodeExecutionRecord,
    type OptionalWorkflowNodeId,
    type RuleSourceOptionId,
    registerManagedWorktree,
    focusManagedWorktree,
    type WorkbenchJournal,
    type WorkbenchNodeStatus,
    type WorktreeTask,
    type WorkflowNodeId,
    type WorkflowRun,
    type WorkflowTemplateDefinition,
} from '../../features/ai-repo-workbench/runtime';
import { FlowiseWorkbenchShell } from '../../features/ai-repo-workbench/FlowiseWorkbenchShell';
import {
    advanceWorkbenchJournalRemote,
    fetchWorkbenchJournal,
    focusManagedWorktreeRemote,
    registerManagedWorktreeRemote,
    resetWorkbenchJournalRemote,
    startNewFactionRunRemote,
    submitRuleSourceDecisionRemote,
} from '../../api/ai-repo-workbench';

const STATUS_LABELS: Record<WorkbenchNodeStatus | WorkflowRun['status'], string> = {
    pending: '待执行',
    running: '运行中',
    waiting_decision: '等待决策',
    blocked: '阻塞',
    skipped: '已跳过',
    completed: '已完成',
    failed: '失败',
    cancelled: '已取消',
};

const STATUS_STYLES: Record<WorkbenchNodeStatus | WorkflowRun['status'], string> = {
    pending: 'border-slate-600 bg-slate-800/50 text-slate-400',
    running: 'border-amber-600 bg-amber-900/40 text-amber-400',
    waiting_decision: 'border-sky-600 bg-sky-900/40 text-sky-400',
    blocked: 'border-rose-600 bg-rose-900/40 text-rose-400',
    skipped: 'border-stone-600 bg-stone-800/40 text-stone-500',
    completed: 'border-emerald-600 bg-emerald-900/40 text-emerald-400',
    failed: 'border-rose-600 bg-rose-900/40 text-rose-400',
    cancelled: 'border-slate-600 bg-slate-800/50 text-slate-500',
};

const NODE_GRAPH_ROLE_LABELS: Record<WorkflowNodeId, string> = {
    'capture-faction-intent': '启动',
    'select-rule-source': '人工决策',
    'acquire-rule-material': '采集',
    'transcribe-or-normalize-rules': '整理',
    'inspect-assets': '检查',
    'draft-faction-definition': '生成',
    'review-faction-definition': '复核',
    'run-e2e-validation': '验证',
    'publish-artifact-bundle': '交付',
};

const NODE_GRAPH_STATUS_META: Record<
    WorkbenchNodeStatus,
    {
        shell: string;
        badge: string;
        dot: string;
        body: string;
    }
> = {
    pending: {
        shell: 'border-white/8 bg-[linear-gradient(180deg,rgba(24,31,46,0.98),rgba(14,18,28,0.96))] shadow-[0_18px_42px_rgba(2,6,23,0.35)]',
        badge: 'border-slate-300/15 bg-slate-300/10 text-slate-200',
        dot: 'bg-slate-300',
        body: 'text-slate-400',
    },
    running: {
        shell: 'border-amber-400/30 bg-[linear-gradient(180deg,rgba(71,37,10,0.96),rgba(23,18,10,0.96))] shadow-[0_18px_42px_rgba(245,158,11,0.18)]',
        badge: 'border-amber-300/20 bg-amber-300/10 text-amber-100',
        dot: 'bg-amber-300',
        body: 'text-amber-100/70',
    },
    waiting_decision: {
        shell: 'border-sky-400/35 bg-[linear-gradient(180deg,rgba(6,59,88,0.96),rgba(10,24,40,0.98))] shadow-[0_20px_46px_rgba(14,165,233,0.2)]',
        badge: 'border-sky-300/20 bg-sky-300/10 text-sky-100',
        dot: 'bg-sky-300',
        body: 'text-sky-100/70',
    },
    blocked: {
        shell: 'border-rose-400/30 bg-[linear-gradient(180deg,rgba(79,17,40,0.96),rgba(30,12,20,0.96))] shadow-[0_18px_42px_rgba(244,63,94,0.18)]',
        badge: 'border-rose-300/20 bg-rose-300/10 text-rose-100',
        dot: 'bg-rose-300',
        body: 'text-rose-100/70',
    },
    skipped: {
        shell: 'border-stone-300/10 bg-[linear-gradient(180deg,rgba(39,39,42,0.96),rgba(20,20,20,0.96))] shadow-[0_18px_42px_rgba(10,10,10,0.3)]',
        badge: 'border-stone-300/15 bg-stone-300/10 text-stone-300',
        dot: 'bg-stone-300',
        body: 'text-stone-400',
    },
    completed: {
        shell: 'border-emerald-400/30 bg-[linear-gradient(180deg,rgba(8,68,53,0.96),rgba(9,28,23,0.98))] shadow-[0_20px_46px_rgba(16,185,129,0.18)]',
        badge: 'border-emerald-300/20 bg-emerald-300/10 text-emerald-100',
        dot: 'bg-emerald-300',
        body: 'text-emerald-100/70',
    },
    failed: {
        shell: 'border-rose-500/35 bg-[linear-gradient(180deg,rgba(99,17,35,0.96),rgba(38,10,18,0.98))] shadow-[0_20px_46px_rgba(244,63,94,0.22)]',
        badge: 'border-rose-300/20 bg-rose-300/10 text-rose-100',
        dot: 'bg-rose-300',
        body: 'text-rose-100/70',
    },
};

function StatusBadge({ status }: { status: WorkbenchNodeStatus | WorkflowRun['status'] }) {
    return (
        <span className={clsx('inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold', STATUS_STYLES[status])}>
            {STATUS_LABELS[status]}
        </span>
    );
}

function WorkbenchHydrationSkeleton() {
    return (
        <div className="mt-5 grid gap-5 xl:grid-cols-[300px_minmax(0,1.15fr)_360px] 2xl:grid-cols-[320px_minmax(0,1.2fr)_380px]">
            <div className="space-y-6">
                <div className="h-[420px] animate-pulse rounded-[28px] border border-stone-200 bg-white/80" />
                <div className="h-[220px] animate-pulse rounded-[28px] border border-stone-200 bg-white/80" />
            </div>
            <div className="space-y-6">
                <div className="h-[220px] animate-pulse rounded-[28px] border border-stone-200 bg-white/80" />
                <div className="h-[320px] animate-pulse rounded-[28px] border border-stone-200 bg-white/80" />
                <div className="h-[260px] animate-pulse rounded-[28px] border border-stone-200 bg-white/80" />
            </div>
            <div className="space-y-6">
                <div className="h-[300px] animate-pulse rounded-[28px] border border-stone-200 bg-white/80" />
                <div className="h-[320px] animate-pulse rounded-[28px] border border-stone-200 bg-white/80" />
            </div>
        </div>
    );
}

function formatSnapshot(snapshot: Record<string, unknown> | undefined): Array<[string, string]> {
    if (!snapshot) return [];
    return Object.entries(snapshot).map(([key, value]) => {
        if (Array.isArray(value)) {
            return [key, value.map((item) => (typeof item === 'string' ? item : JSON.stringify(item))).join(' / ')];
        }
        if (typeof value === 'object' && value !== null) {
            return [key, JSON.stringify(value, null, 2)];
        }
        return [key, String(value)];
    });
}

function NodeDetailCard({
    node,
    run,
    template,
}: {
    node: NodeExecutionRecord;
    run: WorkflowRun;
    template: WorkflowTemplateDefinition;
}) {
    const snapshotRows = node.status === 'completed' ? formatSnapshot(node.outputSnapshot) : formatSnapshot(node.inputSnapshot);
    const nodeDefinition = template.nodeDefinitions[node.nodeId];

    return (
        <article
            data-testid={`node-card-${node.nodeId}`}
            className="rounded-xl border border-white/10 bg-white/5 p-4"
        >
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-500">NodeExecutionRecord</p>
                    <h3 className="mt-1 text-sm font-semibold text-white">{nodeDefinition.label}</h3>
                    <p className="mt-1 text-xs leading-5 text-stone-400">{nodeDefinition.hint}</p>
                </div>
                <StatusBadge status={node.status} />
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] text-stone-500">
                <span className="rounded bg-white/5 px-2 py-0.5">run: {run.id}</span>
                <span className="rounded bg-white/5 px-2 py-0.5">attempt: {node.attempt}</span>
                {node.startedAt ? <span className="rounded bg-white/5 px-2 py-0.5">start: {node.startedAt.slice(11, 19)}</span> : null}
                {node.finishedAt ? <span className="rounded bg-white/5 px-2 py-0.5">end: {node.finishedAt.slice(11, 19)}</span> : null}
            </div>
            {snapshotRows.length > 0 ? (
                <dl className="mt-3 space-y-2 text-xs">
                    {snapshotRows.map(([key, value]) => (
                        <div key={key} className="rounded-lg bg-white/5 px-3 py-2">
                            <dt className="font-medium text-stone-300">{key}</dt>
                            <dd className="mt-0.5 whitespace-pre-wrap break-all text-stone-500">{value}</dd>
                        </div>
                    ))}
                </dl>
            ) : (
                <div className="mt-3 rounded-lg border border-dashed border-white/10 px-3 py-3 text-xs text-stone-500">
                    该节点尚未产生结构化快照。
                </div>
            )}
        </article>
    );
}

function NodeStatusRail({
    nodes,
    activeRun,
    template,
    selectedNodeId,
    onSelectNode,
}: {
    nodes: NodeExecutionRecord[];
    activeRun: WorkflowRun | null;
    template: WorkflowTemplateDefinition;
    selectedNodeId?: WorkflowNodeId;
    onSelectNode: (nodeId: WorkflowNodeId) => void;
}) {
    const orderedNodes = template.nodeOrder
        .map((nodeId) => nodes.find((node) => node.nodeId === nodeId))
        .filter((node): node is NodeExecutionRecord => Boolean(node));
    if (!orderedNodes.length) {
        return (
            <div className="rounded-lg border border-dashed border-white/10 px-4 py-6 text-xs text-stone-500">
                启动模板后展示节点状态轨。
            </div>
        );
    }

    return (
        <div data-testid="node-status-panel" className="overflow-x-auto bg-[#11141c] px-4 py-3">
            <div className="mb-3 flex items-center gap-2">
                <div className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold text-stone-400">
                    <Workflow className="h-3 w-3" />
                    Flow 状态轨
                </div>
                <p className="text-[11px] text-stone-500">图交互交给上方 Flowise，下面只保留状态摘要和节点切换。</p>
            </div>
            <div className="flex min-w-max gap-3 pb-1">
                {orderedNodes.map((node, index) => {
                    const isCurrent = activeRun?.currentNodeId === node.nodeId;
                    const nodeDefinition = template.nodeDefinitions[node.nodeId];
                    const isSelected = selectedNodeId === node.nodeId;
                    const styleMeta = NODE_GRAPH_STATUS_META[node.status];
                    const stepNumber = index + 1;
                    return (
                        <button
                            key={node.nodeId}
                            type="button"
                            data-testid={`node-status-${node.nodeId}`}
                            onClick={() => onSelectNode(node.nodeId)}
                            className={clsx(
                                'relative w-[230px] shrink-0 overflow-hidden rounded-[20px] border p-4 text-left transition duration-200',
                                styleMeta.shell,
                                isCurrent && 'ring-2 ring-sky-300/45',
                                isSelected && 'ring-1 ring-white/20',
                                !isCurrent && 'hover:-translate-y-0.5 hover:border-white/20',
                            )}
                        >
                            <div className={clsx('absolute inset-x-4 top-0 h-px opacity-70', styleMeta.dot)} />
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex min-w-0 items-start gap-3">
                                    <div className={clsx('inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border text-[11px] font-semibold shadow-inner', styleMeta.badge)}>
                                        {String(stepNumber).padStart(2, '0')}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-[9px] font-semibold uppercase tracking-[0.24em] text-white/45">
                                                {NODE_GRAPH_ROLE_LABELS[node.nodeId]}
                                            </span>
                                            {isCurrent ? <Zap className="h-3 w-3 text-sky-300" /> : null}
                                        </div>
                                        <h3 className="mt-1 text-[13px] font-semibold leading-4 text-white">
                                            {nodeDefinition.label}
                                        </h3>
                                    </div>
                                </div>
                                <span className={clsx('inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-semibold', styleMeta.badge)}>
                                    <span className={clsx('h-1.5 w-1.5 rounded-full', styleMeta.dot)} />
                                    {STATUS_LABELS[node.status]}
                                </span>
                            </div>
                            <p className={clsx('mt-3 line-clamp-2 text-[11px] leading-5', styleMeta.body)}>
                                {nodeDefinition.hint}
                            </p>
                            <div className="mt-4 flex flex-wrap gap-1.5 text-[10px]">
                                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-white/75">
                                    attempt #{node.attempt}
                                </span>
                                {isCurrent ? <span className="rounded-full border border-sky-300/20 bg-sky-300/10 px-2 py-0.5 font-semibold text-sky-100">当前节点</span> : null}
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

function WorktreeManagerPanel({
    worktrees,
    activeWorktreeId,
    onFocus,
}: {
    worktrees: WorktreeTask[];
    activeWorktreeId?: string;
    onFocus: (worktreeId: string) => void;
}) {
    return (
        <div data-testid="managed-worktree-list" className="space-y-2">
            {worktrees.map((task) => {
                const isActive = task.id === activeWorktreeId;
                return (
                    <article
                        key={task.id}
                        data-testid={`managed-worktree-card-${task.id}`}
                        className={clsx(
                            'rounded-lg border px-3 py-2 transition',
                            isActive ? 'border-sky-500/40 bg-sky-500/10' : 'border-white/5 bg-white/[0.02]',
                        )}
                    >
                        <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                                <p className="text-xs font-semibold text-white">{task.label}</p>
                                <p className="mt-0.5 break-all text-[10px] text-stone-500">{task.worktreePath}</p>
                            </div>
                            <StatusBadge status={task.status === 'ready' ? 'pending' : task.status === 'paused' ? 'waiting_decision' : task.status === 'archived' ? 'completed' : task.status as WorkbenchNodeStatus} />
                        </div>
                        <div className="mt-1.5 flex flex-wrap gap-1.5 text-[10px] text-stone-500">
                            <span className="rounded bg-white/5 px-2 py-0.5">{task.branchName}</span>
                            <span className="rounded bg-white/5 px-2 py-0.5">{task.managedBy === 'journal-user' ? '手动' : '接管'}</span>
                            {isActive ? <span className="rounded bg-sky-500/20 px-2 py-0.5 font-semibold text-sky-400">已聚焦</span> : null}
                        </div>
                        {!isActive ? (
                            <button
                                type="button"
                                onClick={() => onFocus(task.id)}
                                className="mt-2 rounded-lg border border-white/10 px-2.5 py-1 text-[10px] font-medium text-stone-400 transition hover:bg-white/5"
                            >
                                聚焦
                            </button>
                        ) : null}
                    </article>
                );
            })}
        </div>
    );
}

function DecisionPanel({
    decision,
    selectedOptionId,
    onSelect,
    onSubmit,
}: {
    decision: DecisionRequest | null;
    selectedOptionId: RuleSourceOptionId;
    onSelect: (optionId: RuleSourceOptionId) => void;
    onSubmit: () => void;
}) {
    if (!decision) {
        return (
            <section className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-500">DecisionRequest</p>
                <h3 className="mt-2 text-sm font-semibold text-stone-300">当前没有待处理决策</h3>
                <p className="mt-2 text-xs leading-5 text-stone-500">
                    进入 waiting_decision 后，这里展示统一决策卡片。
                </p>
            </section>
        );
    }

    return (
        <section data-testid="decision-request-panel" className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-sky-400">DecisionRequest</p>
            <h3 className="mt-2 text-base font-semibold text-white">{decision.title}</h3>
            <p className="mt-2 text-xs leading-5 text-stone-300">{decision.summary}</p>
            {decision.rationale ? (
                <p className="mt-2 rounded-lg bg-white/5 px-3 py-2 text-xs leading-5 text-stone-400">{decision.rationale}</p>
            ) : null}
            <div className="mt-3 space-y-2">
                {decision.options.map((option) => {
                    const selected = selectedOptionId === option.id;
                    const recommended = decision.recommendedOptionId === option.id;
                    return (
                        <button
                            key={option.id}
                            type="button"
                            data-testid={`decision-option-${option.id}`}
                            onClick={() => onSelect(option.id)}
                            className={clsx(
                                'w-full rounded-lg border px-3 py-3 text-left transition',
                                selected
                                    ? 'border-sky-500 bg-sky-500/20'
                                    : 'border-white/10 bg-white/5 hover:border-sky-500/40',
                            )}
                        >
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-sm font-semibold text-white">{option.label}</span>
                                {recommended ? (
                                    <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">推荐</span>
                                ) : null}
                            </div>
                            <p className="mt-1 text-xs leading-5 text-stone-400">{option.description}</p>
                        </button>
                    );
                })}
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] text-sky-400">
                {decision.evidenceRefs.map((ref) => (
                    <span key={ref} className="rounded bg-white/5 px-2 py-0.5">{ref}</span>
                ))}
            </div>
            <button
                type="button"
                data-testid="submit-rule-source-decision"
                onClick={onSubmit}
                className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-500"
            >
                确认规则来源并继续
            </button>
        </section>
    );
}

function ArtifactPanel({ artifact }: { artifact: ArtifactBundle | null }) {
    if (!artifact) {
        return (
            <section className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-500">ArtifactBundle</p>
                <h3 className="mt-2 text-sm font-semibold text-stone-300">尚未生成</h3>
                <p className="mt-2 text-xs leading-5 text-stone-500">
                    完成 publish-artifact-bundle 后显示产物。
                </p>
            </section>
        );
    }

    return (
        <section data-testid="artifact-bundle-panel" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-400">ArtifactBundle</p>
                    <h3 className="mt-2 text-base font-semibold text-white">{artifact.title}</h3>
                    <p className="mt-2 text-xs leading-5 text-stone-300">{artifact.summary}</p>
                </div>
                <StatusBadge status="completed" />
            </div>
            <div className="mt-3 grid gap-2">
                <div className="rounded-lg bg-white/5 p-3">
                    <p className="text-xs font-semibold text-white">规则来源索引</p>
                    <pre className="mt-1 whitespace-pre-wrap break-words text-[10px] leading-5 text-stone-400">{JSON.stringify(artifact.outputs.ruleSourceIndex, null, 2)}</pre>
                </div>
                <div className="rounded-lg bg-white/5 p-3">
                    <p className="text-xs font-semibold text-white">规范化规则文本</p>
                    <pre className="mt-1 whitespace-pre-wrap break-words text-[10px] leading-5 text-stone-400">{JSON.stringify(artifact.outputs.normalizedRuleCorpus, null, 2)}</pre>
                </div>
                <div className="rounded-lg bg-white/5 p-3">
                    <p className="text-xs font-semibold text-white">素材核对清单</p>
                    <pre className="mt-1 whitespace-pre-wrap break-words text-[10px] leading-5 text-stone-400">{JSON.stringify(artifact.outputs.assetChecklist, null, 2)}</pre>
                </div>
                <div className="rounded-lg bg-white/5 p-3">
                    <p className="text-xs font-semibold text-white">派系定义快照</p>
                    <pre className="mt-1 whitespace-pre-wrap break-words text-[10px] leading-5 text-stone-400">{JSON.stringify(artifact.outputs.factionDefinitionSnapshot, null, 2)}</pre>
                </div>
                <div className="rounded-lg bg-white/5 p-3">
                    <p className="text-xs font-semibold text-white">决策日志</p>
                    <pre className="mt-1 whitespace-pre-wrap break-words text-[10px] leading-5 text-stone-400">{JSON.stringify(artifact.outputs.decisionLog, null, 2)}</pre>
                </div>
            </div>
            <div className="mt-3 rounded-lg border border-dashed border-white/10 px-3 py-3 text-xs text-stone-400">
                <span className="font-semibold text-white">e2eStatus</span>: {artifact.outputs.e2eStatus}
            </div>
        </section>
    );
}

export default function AIRepoWorkbench() {
    const navigate = useNavigate();
    const template = useMemo(() => getWorkflowTemplateDefinition(DEFAULT_WORKFLOW_TEMPLATE_ID), []);
    const [journal, setJournal] = useState<WorkbenchJournal>(() => loadWorkbenchJournal());
    const journalRef = useRef(journal);
    const autoAdvanceInFlightRef = useRef(false);
    const [factionName, setFactionName] = useState('星环游牧者');
    const [selectedRuleSource, setSelectedRuleSource] = useState<RuleSourceOptionId>('wiki');
    const [selectedNodeId, setSelectedNodeId] = useState<WorkflowNodeId>('capture-faction-intent');
    const [orchestratorBusy, setOrchestratorBusy] = useState(false);
    const [orchestratorError, setOrchestratorError] = useState<string | null>(null);
    const [journalMode, setJournalMode] = useState<'server' | 'local'>('local');
    const [journalHydrated, setJournalHydrated] = useState(false);
    const [nodeToggles, setNodeToggles] = useState<Partial<Record<OptionalWorkflowNodeId, boolean>>>(() => (
        Object.fromEntries(template.optionalNodeToggles.map((toggle) => [toggle.nodeId, toggle.defaultEnabled]))
    ));
    const [newWorktreeBranch, setNewWorktreeBranch] = useState('feat/repo-audit-demo');
    const [newWorktreePath, setNewWorktreePath] = useState('D:\\gongzuo\\webgame\\BoardGame-wt-repo-audit-demo');

    const activeWorktree = useMemo(
        () => journal.managedWorktrees.find((task) => task.id === journal.repoSession.activeWorktreeId) ?? journal.managedWorktrees[0] ?? null,
        [journal.managedWorktrees, journal.repoSession.activeWorktreeId],
    );
    const worktreeScopedRun = useMemo(() => {
        return getVisibleRunForWorktree(journal, activeWorktree?.id);
    }, [activeWorktree?.id, journal]);
    const activeNodes = useMemo(
        () => getRunNodeRecords(journal, worktreeScopedRun?.id),
        [journal, worktreeScopedRun?.id],
    );
    const activeDecision = useMemo(
        () => getPendingDecisionForRun(journal, worktreeScopedRun?.id),
        [journal, worktreeScopedRun?.id],
    );
    const activeArtifact = useMemo(
        () => getArtifactBundleForRun(journal, worktreeScopedRun?.id),
        [journal, worktreeScopedRun?.id],
    );

    useEffect(() => {
        journalRef.current = journal;
        persistWorkbenchJournal(journal);
    }, [journal]);

    useEffect(() => {
        let cancelled = false;
        setJournalHydrated(false);
        void fetchWorkbenchJournal()
            .then((nextJournal) => {
                if (cancelled) {
                    return;
                }
                journalRef.current = nextJournal;
                setJournal(nextJournal);
                setJournalMode('server');
            })
            .catch(() => {
                if (cancelled) {
                    return;
                }
                const localJournal = loadWorkbenchJournal();
                journalRef.current = localJournal;
                setJournal(localJournal);
                setJournalMode('local');
            })
            .finally(() => {
                if (!cancelled) {
                    setJournalHydrated(true);
                }
            });

        return () => {
            cancelled = true;
        };
    }, []);

    async function applyAsyncJournalMutation(
        producer: {
            local: (current: WorkbenchJournal) => Promise<WorkbenchJournal>;
            server?: () => Promise<WorkbenchJournal>;
        },
    ) {
        if (orchestratorBusy || !journalHydrated) {
            return;
        }
        setOrchestratorBusy(true);
        setOrchestratorError(null);
        try {
            let nextJournal: WorkbenchJournal;
            if (journalMode === 'server' && producer.server) {
                nextJournal = await producer.server();
            } else {
                nextJournal = await producer.local(journalRef.current);
            }
            journalRef.current = nextJournal;
            setJournal(nextJournal);
        } catch (error) {
            const message = error instanceof Error ? error.message : '未知错误';
            setOrchestratorError(message);
        } finally {
            setOrchestratorBusy(false);
        }
    }

    useEffect(() => {
        if (worktreeScopedRun?.status !== 'running') {
            return undefined;
        }

        if (journalMode === 'server') {
            // LangGraph completes all nodes in a single invoke/resume call.
            // Just do a single refresh to pick up the latest state.
            if (autoAdvanceInFlightRef.current) return undefined;
            autoAdvanceInFlightRef.current = true;
            void advanceWorkbenchJournalRemote()
                .then((nextJournal) => {
                    journalRef.current = nextJournal;
                    setJournal(nextJournal);
                })
                .catch((error) => {
                    const message = error instanceof Error ? error.message : '未知错误';
                    setOrchestratorError(message);
                })
                .finally(() => {
                    autoAdvanceInFlightRef.current = false;
                });
            return undefined;
        }

        // Local mode: poll with timer for step-by-step advance
        const timer = window.setInterval(() => {
            if (autoAdvanceInFlightRef.current) {
                return;
            }
            autoAdvanceInFlightRef.current = true;
            void advanceWorkbenchJournal(journalRef.current, Date.now())
                .then((nextJournal) => {
                    journalRef.current = nextJournal;
                    setJournal(nextJournal);
                })
                .catch((error) => {
                    const message = error instanceof Error ? error.message : '未知错误';
                    setOrchestratorError(message);
                })
                .finally(() => {
                    autoAdvanceInFlightRef.current = false;
                });
        }, 300);

        return () => window.clearInterval(timer);
    }, [journalMode, worktreeScopedRun?.id, worktreeScopedRun?.status]);

    useEffect(() => {
        if (!activeNodes.length) {
            return;
        }
        if (worktreeScopedRun?.currentNodeId) {
            setSelectedNodeId(worktreeScopedRun.currentNodeId as WorkflowNodeId);
            return;
        }
        if (!activeNodes.some((node) => node.nodeId === selectedNodeId)) {
            setSelectedNodeId(activeNodes[0].nodeId);
        }
    }, [activeNodes, selectedNodeId, worktreeScopedRun?.currentNodeId]);

    const progressSummary = useMemo(() => {
        if (!activeNodes.length) {
            return { completed: 0, total: 0 };
        }
        return {
            completed: activeNodes.filter((node) => node.status === 'completed').length,
            total: activeNodes.length,
        };
    }, [activeNodes]);
    const inspectedNode = useMemo(
        () => activeNodes.find((node) => node.nodeId === selectedNodeId) ?? activeNodes[0] ?? null,
        [activeNodes, selectedNodeId],
    );

    const [rightPanelTab, setRightPanelTab] = useState<'decision' | 'inspector' | 'artifact'>('decision');

    // Synchronous override: force decision tab when a decision needs attention.
    // This avoids async useEffect race where Playwright asserts before the tab switches.
    const effectiveRightTab = activeDecision ? 'decision' : rightPanelTab;

    useEffect(() => {
        if (!activeDecision && activeArtifact) setRightPanelTab('artifact');
    }, [activeDecision?.id, activeArtifact?.id]);

    const flowiseHeader = () => (
        <div className="flex min-h-[68px] items-center justify-between gap-4 bg-white/95 px-5 py-3 backdrop-blur">
            <div className="min-w-0">
                <div className="flex items-center gap-3">
                    <h1 data-testid="workbench-page-heading" className="text-lg font-semibold tracking-tight text-slate-900">
                        AI 仓库工作台
                    </h1>
                    <StatusBadge status={worktreeScopedRun?.status ?? 'pending'} />
                    {worktreeScopedRun ? (
                        <>
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-500">
                                {worktreeScopedRun.orchestrator?.engine ?? 'local'}
                            </span>
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-500">
                                v{worktreeScopedRun.checkpointVersion}
                            </span>
                        </>
                    ) : null}
                </div>
                <p data-testid="workbench-journal-mode" className="mt-1 text-xs text-slate-500">
                    {journalMode === 'server' ? 'server-file + git worktree' : 'localStorage fallback'}
                    {!journalHydrated ? ' · syncing…' : ''}
                </p>
            </div>
            <div className="flex items-center gap-3">
                {worktreeScopedRun ? (
                    <div className="hidden min-w-[220px] items-center gap-3 xl:flex">
                        <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-200">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-sky-500 to-teal-400 transition-all duration-500"
                                style={{ width: `${progressSummary.total > 0 ? (progressSummary.completed / progressSummary.total) * 100 : 0}%` }}
                            />
                        </div>
                        <span className="shrink-0 text-xs text-slate-500">
                            {progressSummary.completed}/{progressSummary.total}
                        </span>
                    </div>
                ) : null}
                <button
                    type="button"
                    onClick={() => navigate('/')}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    返回
                </button>
            </div>
        </div>
    );

    const flowisePalette = () => (
        <div className="agentflow-palette !w-[280px] bg-[#f6f8fb]" data-testid="workbench-left-palette">
            <div className="space-y-3 px-3 pb-3">
                <article data-testid="template-new-faction-card" className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Template</p>
                    <h2 className="mt-1 text-sm font-semibold text-slate-900">{template.title}</h2>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{template.description}</p>
                    <label className="mt-3 block">
                        <span className="text-[10px] font-medium uppercase tracking-widest text-slate-400">派系名称</span>
                        <input
                            value={factionName}
                            onChange={(e) => setFactionName(e.target.value)}
                            className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 outline-none focus:border-sky-400"
                            placeholder="输入目标名"
                        />
                    </label>
                    <div className="mt-3 space-y-2">
                        {template.optionalNodeToggles.map((toggle) => {
                            const enabled = nodeToggles[toggle.nodeId] ?? toggle.defaultEnabled;
                            return (
                                <label key={toggle.nodeId} data-testid={`node-toggle-${toggle.nodeId}`} className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                                    <span className="text-xs text-slate-700">{toggle.label}</span>
                                    <button
                                        type="button"
                                        data-testid={`toggle-button-${toggle.nodeId}`}
                                        disabled={!journalHydrated}
                                        onClick={() => setNodeToggles((c) => ({ ...c, [toggle.nodeId]: !enabled }))}
                                        className={clsx('rounded-full px-2.5 py-1 text-[10px] font-semibold transition', enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-slate-500')}
                                    >
                                        {enabled ? '已开启' : '已关闭'}
                                    </button>
                                </label>
                            );
                        })}
                    </div>
                    <div className="mt-3 grid gap-2">
                        <button
                            type="button"
                            data-testid="start-new-faction-run"
                            disabled={orchestratorBusy || !journalHydrated}
                            onClick={() => {
                                void applyAsyncJournalMutation({
                                    local: (current) => startNewFactionRun(current, { factionName, nodeToggles }, Date.now()),
                                    server: () => startNewFactionRunRemote({ factionName, nodeToggles }),
                                });
                            }}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-sky-500 disabled:opacity-40"
                        >
                            <PlayCircle className="h-3.5 w-3.5" />
                            {orchestratorBusy ? '启动中…' : '启动工作流'}
                        </button>
                        <button
                            type="button"
                            data-testid="reset-workbench-journal"
                            disabled={!journalHydrated}
                            onClick={() => {
                                void applyAsyncJournalMutation({
                                    local: async () => resetWorkbenchJournal(Date.now()),
                                    server: () => resetWorkbenchJournalRemote(),
                                });
                            }}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-500 transition hover:bg-slate-50"
                        >
                            <RefreshCcw className="h-3.5 w-3.5" />
                            重置
                        </button>
                    </div>
                </article>

                <div data-testid="repo-session-card" className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                    <div className="flex items-center gap-2">
                        <FolderGit2 className="h-4 w-4 text-amber-500" />
                        <p className="text-xs font-semibold text-slate-900">{journal.repoSession.metadata.repoName}</p>
                    </div>
                    <p className="mt-1 break-all text-[10px] text-slate-500">{journal.repoSession.rootPath}</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                    <div className="flex items-center gap-2">
                        <GitBranch className="h-4 w-4 text-sky-500" />
                        <p className="text-xs font-semibold text-slate-900">工作树</p>
                    </div>
                    <div className="mt-2 grid gap-2">
                        <input
                            data-testid="managed-worktree-branch-input"
                            value={newWorktreeBranch}
                            onChange={(e) => setNewWorktreeBranch(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 outline-none focus:border-sky-400"
                            placeholder="branch"
                        />
                        <input
                            data-testid="managed-worktree-path-input"
                            value={newWorktreePath}
                            onChange={(e) => setNewWorktreePath(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 outline-none focus:border-sky-400"
                            placeholder="path"
                        />
                        <button
                            type="button"
                            data-testid="register-managed-worktree"
                            disabled={!journalHydrated || orchestratorBusy}
                            onClick={() => {
                                void applyAsyncJournalMutation({
                                    local: async (current) => registerManagedWorktree(current, { branchName: newWorktreeBranch, worktreePath: newWorktreePath }, Date.now()),
                                    server: () => registerManagedWorktreeRemote({ branchName: newWorktreeBranch, worktreePath: newWorktreePath }),
                                });
                            }}
                            className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-700 transition hover:bg-sky-100"
                        >
                            登记并聚焦
                        </button>
                    </div>
                    <div className="mt-2">
                        <WorktreeManagerPanel
                            worktrees={journal.managedWorktrees}
                            activeWorktreeId={journal.repoSession.activeWorktreeId}
                            onFocus={(worktreeId) => {
                                void applyAsyncJournalMutation({
                                    local: async (current) => focusManagedWorktree(current, { worktreeId }, Date.now()),
                                    server: () => focusManagedWorktreeRemote({ worktreeId }),
                                });
                            }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div data-testid="workbench-surface" className="flex h-screen flex-col overflow-hidden bg-[#eef2f6] p-4 text-slate-900">
            {orchestratorError ? (
                <div className="mb-3 shrink-0 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
                    Orchestrator 错误：{orchestratorError}
                </div>
            ) : null}

            {!journalHydrated ? (
                <div className="flex flex-1 items-center justify-center rounded-[28px] border border-slate-200 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.08)]">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-sky-500" />
                </div>
            ) : (
                <div className="relative min-h-0 flex-1 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.08)]">
                    <FlowiseWorkbenchShell
                        nodes={activeNodes}
                        run={worktreeScopedRun}
                        template={template}
                        renderHeader={flowiseHeader}
                        renderNodePalette={flowisePalette}
                    />

                    {activeDecision ? (
                        <div className="absolute bottom-6 left-[320px] z-10">
                            <button
                                type="button"
                                onClick={() => setRightPanelTab('decision')}
                                className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/95 px-5 py-2 text-sm font-semibold text-sky-700 shadow-lg backdrop-blur transition hover:bg-sky-50"
                            >
                                <span className="h-2 w-2 animate-pulse rounded-full bg-sky-500" />
                                等待决策 — {activeDecision.title}
                            </button>
                        </div>
                    ) : null}

                    <div className="absolute bottom-4 left-[300px] right-[380px] z-10">
                        <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-[#11141c]/96 shadow-[0_24px_48px_rgba(15,23,42,0.28)] backdrop-blur">
                            <NodeStatusRail nodes={activeNodes} activeRun={worktreeScopedRun} template={template} selectedNodeId={selectedNodeId} onSelectNode={setSelectedNodeId} />
                        </div>
                    </div>

                    <aside className="absolute right-4 top-[84px] bottom-4 z-10 w-[340px] overflow-hidden rounded-[24px] border border-slate-800/10 bg-[#142130]/96 text-stone-100 shadow-[0_30px_60px_rgba(15,23,42,0.28)] backdrop-blur">
                        <div className="flex border-b border-white/10">
                            {(['decision', 'inspector', 'artifact'] as const).map((tab) => (
                                <button
                                    key={tab}
                                    type="button"
                                    onClick={() => setRightPanelTab(tab)}
                                    className={clsx('flex-1 px-3 py-2 text-xs font-medium transition', effectiveRightTab === tab ? 'border-b-2 border-sky-500 text-white' : 'text-stone-500 hover:text-stone-300')}
                                >
                                    {tab === 'decision' ? '决策' : tab === 'inspector' ? '节点' : '产物'}
                                </button>
                            ))}
                        </div>
                        <div className="h-full overflow-y-auto p-4">
                            {effectiveRightTab === 'decision' ? (
                                <DecisionPanel
                                    decision={activeDecision}
                                    selectedOptionId={selectedRuleSource}
                                    onSelect={setSelectedRuleSource}
                                    onSubmit={() => {
                                        if (!activeDecision) return;
                                        void applyAsyncJournalMutation({
                                            local: (current) => submitRuleSourceDecision(current, { decisionId: activeDecision.id, optionId: selectedRuleSource }, Date.now()),
                                            server: () => submitRuleSourceDecisionRemote({ decisionId: activeDecision.id, optionId: selectedRuleSource }),
                                        });
                                    }}
                                />
                            ) : effectiveRightTab === 'inspector' ? (
                                inspectedNode && worktreeScopedRun ? (
                                    <NodeDetailCard node={inspectedNode} run={worktreeScopedRun} template={template} />
                                ) : (
                                    <div className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-xs text-stone-500">
                                        启动工作流后查看节点详情
                                    </div>
                                )
                            ) : (
                                <ArtifactPanel artifact={activeArtifact} />
                            )}
                        </div>
                    </aside>
                </div>
            )}
        </div>
    );
}
