import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, CircleDot, Clock3, FolderGit2, GitBranch, PackageCheck, PlayCircle, RefreshCcw, Sparkles } from 'lucide-react';
import clsx from 'clsx';
import { useNavigate } from 'react-router-dom';
import {
    AI_REPO_WORKBENCH_REPO_PATH,
    advanceWorkbenchJournal,
    loadWorkbenchJournal,
    persistWorkbenchJournal,
    resetWorkbenchJournal,
    startNewFactionRun,
    submitRuleSourceDecision,
    type ArtifactBundle,
    type DecisionRequest,
    type NodeExecutionRecord,
    type RuleSourceOptionId,
    type WorkbenchJournal,
    type WorkbenchNodeStatus,
    type WorkflowNodeId,
    type WorkflowRun,
} from '../../features/ai-repo-workbench/runtime';

const NODE_LABELS: Record<WorkflowNodeId, string> = {
    'capture-faction-intent': 'capture-faction-intent',
    'select-rule-source': 'select-rule-source',
    'acquire-rule-material': 'acquire-rule-material',
    'transcribe-or-normalize-rules': 'transcribe-or-normalize-rules',
    'inspect-assets': 'inspect-assets',
    'draft-faction-definition': 'draft-faction-definition',
    'review-faction-definition': 'review-faction-definition',
    'publish-artifact-bundle': 'publish-artifact-bundle',
};

const NODE_HINTS: Record<WorkflowNodeId, string> = {
    'capture-faction-intent': '锁定 RepoSession、模板和目标派系上下文。',
    'select-rule-source': '第一个真实人工决策点，统一通过 DecisionRequest 渲染。',
    'acquire-rule-material': '把来源入口收敛成 rawSourceSet。',
    'transcribe-or-normalize-rules': '输出 normalizedRuleCorpus 和来源映射。',
    'inspect-assets': '把素材缺口结构化，不再只写“以后补”。',
    'draft-faction-definition': '生成可进入实现阶段的定义草案快照。',
    'review-faction-definition': '当前仍是结构化 stub 自动通过，已明确标注。',
    'publish-artifact-bundle': '生成 ArtifactBundle 并进入完成态。',
};

const STATUS_LABELS: Record<WorkbenchNodeStatus | WorkflowRun['status'], string> = {
    pending: '待执行',
    running: '运行中',
    waiting_decision: '等待决策',
    blocked: '阻塞',
    completed: '已完成',
    failed: '失败',
    cancelled: '已取消',
};

const STATUS_STYLES: Record<WorkbenchNodeStatus | WorkflowRun['status'], string> = {
    pending: 'border-slate-300 bg-white text-slate-500',
    running: 'border-amber-300 bg-amber-50 text-amber-800',
    waiting_decision: 'border-sky-300 bg-sky-50 text-sky-800',
    blocked: 'border-rose-300 bg-rose-50 text-rose-700',
    completed: 'border-emerald-300 bg-emerald-50 text-emerald-800',
    failed: 'border-rose-300 bg-rose-50 text-rose-700',
    cancelled: 'border-slate-300 bg-slate-100 text-slate-500',
};

function StatusBadge({ status }: { status: WorkbenchNodeStatus | WorkflowRun['status'] }) {
    return (
        <span className={clsx('inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold', STATUS_STYLES[status])}>
            {STATUS_LABELS[status]}
        </span>
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

function TimelineCard({ node, run }: { node: NodeExecutionRecord; run: WorkflowRun }) {
    const snapshotRows = node.status === 'completed' ? formatSnapshot(node.outputSnapshot) : formatSnapshot(node.inputSnapshot);

    return (
        <article
            data-testid={`node-card-${node.nodeId}`}
            className="rounded-3xl border border-stone-200 bg-white/90 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)]"
        >
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">NodeExecutionRecord</p>
                    <h3 className="mt-2 text-lg font-semibold text-stone-900">{NODE_LABELS[node.nodeId]}</h3>
                    <p className="mt-2 text-sm leading-6 text-stone-600">{NODE_HINTS[node.nodeId]}</p>
                </div>
                <StatusBadge status={node.status} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-stone-500">
                <span className="rounded-full bg-stone-100 px-3 py-1">run: {run.id}</span>
                <span className="rounded-full bg-stone-100 px-3 py-1">attempt: {node.attempt}</span>
                {node.startedAt ? <span className="rounded-full bg-stone-100 px-3 py-1">start: {node.startedAt.slice(11, 19)}</span> : null}
                {node.finishedAt ? <span className="rounded-full bg-stone-100 px-3 py-1">end: {node.finishedAt.slice(11, 19)}</span> : null}
            </div>
            {snapshotRows.length > 0 ? (
                <dl className="mt-5 space-y-3 text-sm">
                    {snapshotRows.map(([key, value]) => (
                        <div key={key} className="rounded-2xl bg-stone-50 px-4 py-3">
                            <dt className="font-medium text-stone-800">{key}</dt>
                            <dd className="mt-1 whitespace-pre-wrap break-all text-stone-600">{value}</dd>
                        </div>
                    ))}
                </dl>
            ) : (
                <div className="mt-5 rounded-2xl border border-dashed border-stone-200 px-4 py-4 text-sm text-stone-500">
                    该节点尚未产生结构化快照。
                </div>
            )}
        </article>
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
            <section className="rounded-[28px] border border-stone-200 bg-white/90 p-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">DecisionRequest</p>
                <h3 className="mt-3 text-xl font-semibold text-stone-900">当前没有待处理决策</h3>
                <p className="mt-3 text-sm leading-6 text-stone-600">
                    一旦进入 `waiting_decision`，这里会展示统一的决策卡片，而不是散落在聊天文本里的临时问题。
                </p>
            </section>
        );
    }

    return (
        <section data-testid="decision-request-panel" className="rounded-[28px] border border-sky-200 bg-sky-50/80 p-6 shadow-[0_18px_40px_rgba(14,116,144,0.08)]">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-600">DecisionRequest</p>
            <h3 className="mt-3 text-xl font-semibold text-slate-900">{decision.title}</h3>
            <p className="mt-3 text-sm leading-6 text-slate-700">{decision.summary}</p>
            {decision.rationale ? (
                <p className="mt-3 rounded-2xl bg-white/80 px-4 py-3 text-sm leading-6 text-slate-600">{decision.rationale}</p>
            ) : null}
            <div className="mt-5 space-y-3">
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
                                'w-full rounded-3xl border px-4 py-4 text-left transition',
                                selected
                                    ? 'border-sky-500 bg-white shadow-[0_12px_30px_rgba(14,116,144,0.12)]'
                                    : 'border-sky-100 bg-white/70 hover:border-sky-300 hover:bg-white',
                            )}
                        >
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-base font-semibold text-slate-900">{option.label}</span>
                                {recommended ? (
                                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">推荐</span>
                                ) : null}
                            </div>
                            <p className="mt-2 text-sm leading-6 text-slate-600">{option.description}</p>
                        </button>
                    );
                })}
            </div>
            <div className="mt-5 flex flex-wrap gap-2 text-xs text-sky-700">
                {decision.evidenceRefs.map((ref) => (
                    <span key={ref} className="rounded-full bg-white px-3 py-1">{ref}</span>
                ))}
            </div>
            <button
                type="button"
                data-testid="submit-rule-source-decision"
                onClick={onSubmit}
                className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
                确认规则来源并继续运行
            </button>
        </section>
    );
}

function ArtifactPanel({ artifact }: { artifact: ArtifactBundle | null }) {
    if (!artifact) {
        return (
            <section className="rounded-[28px] border border-stone-200 bg-white/90 p-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">ArtifactBundle</p>
                <h3 className="mt-3 text-xl font-semibold text-stone-900">ArtifactBundle 尚未生成</h3>
                <p className="mt-3 text-sm leading-6 text-stone-600">
                    完成 `publish-artifact-bundle` 后，这里会显示规则来源索引、规范化规则文本、素材核对清单、定义快照和决策日志。
                </p>
            </section>
        );
    }

    return (
        <section data-testid="artifact-bundle-panel" className="rounded-[28px] border border-emerald-200 bg-white/95 p-6 shadow-[0_18px_40px_rgba(5,150,105,0.08)]">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-600">ArtifactBundle</p>
                    <h3 className="mt-3 text-xl font-semibold text-stone-900">{artifact.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-stone-600">{artifact.summary}</p>
                </div>
                <StatusBadge status="completed" />
            </div>
            <div className="mt-5 grid gap-4">
                <div className="rounded-3xl bg-emerald-50 p-4">
                    <p className="text-sm font-semibold text-stone-900">规则来源索引</p>
                    <pre className="mt-2 whitespace-pre-wrap break-words text-xs leading-6 text-stone-700">{JSON.stringify(artifact.outputs.ruleSourceIndex, null, 2)}</pre>
                </div>
                <div className="rounded-3xl bg-stone-50 p-4">
                    <p className="text-sm font-semibold text-stone-900">规范化规则文本</p>
                    <pre className="mt-2 whitespace-pre-wrap break-words text-xs leading-6 text-stone-700">{JSON.stringify(artifact.outputs.normalizedRuleCorpus, null, 2)}</pre>
                </div>
                <div className="rounded-3xl bg-stone-50 p-4">
                    <p className="text-sm font-semibold text-stone-900">素材核对清单</p>
                    <pre className="mt-2 whitespace-pre-wrap break-words text-xs leading-6 text-stone-700">{JSON.stringify(artifact.outputs.assetChecklist, null, 2)}</pre>
                </div>
                <div className="rounded-3xl bg-stone-50 p-4">
                    <p className="text-sm font-semibold text-stone-900">派系定义快照</p>
                    <pre className="mt-2 whitespace-pre-wrap break-words text-xs leading-6 text-stone-700">{JSON.stringify(artifact.outputs.factionDefinitionSnapshot, null, 2)}</pre>
                </div>
                <div className="rounded-3xl bg-stone-50 p-4">
                    <p className="text-sm font-semibold text-stone-900">决策日志</p>
                    <pre className="mt-2 whitespace-pre-wrap break-words text-xs leading-6 text-stone-700">{JSON.stringify(artifact.outputs.decisionLog, null, 2)}</pre>
                </div>
            </div>
            <div className="mt-5 rounded-3xl border border-dashed border-stone-200 px-4 py-4 text-sm text-stone-600">
                <span className="font-semibold text-stone-900">e2eStatus</span>: {artifact.outputs.e2eStatus}
                <p className="mt-2 leading-6">
                    这里的 `e2eStatus` 仍是工作流内的交付字段，因此保持 `not_applicable`；本次页面本身的 Playwright 截图证据会写入独立 evidence 文档。
                </p>
            </div>
        </section>
    );
}

export default function AIRepoWorkbench() {
    const navigate = useNavigate();
    const [journal, setJournal] = useState<WorkbenchJournal>(() => loadWorkbenchJournal());
    const [factionName, setFactionName] = useState('星环游牧者');
    const [selectedRuleSource, setSelectedRuleSource] = useState<RuleSourceOptionId>('wiki');

    const activeRun = useMemo(
        () => journal.runs.find((run) => run.id === journal.activeRunId) ?? null,
        [journal.activeRunId, journal.runs],
    );
    const activeNodes = useMemo(
        () => journal.nodeRecords.filter((record) => record.runId === activeRun?.id),
        [activeRun?.id, journal.nodeRecords],
    );
    const activeDecision = useMemo(
        () => journal.decisions.find((decision) => decision.runId === activeRun?.id && !decision.resolution) ?? null,
        [activeRun?.id, journal.decisions],
    );
    const activeArtifact = useMemo(
        () => journal.artifactBundles.find((bundle) => bundle.id === activeRun?.latestArtifactBundleId) ?? null,
        [activeRun?.latestArtifactBundleId, journal.artifactBundles],
    );

    useEffect(() => {
        persistWorkbenchJournal(journal);
    }, [journal]);

    useEffect(() => {
        if (activeRun?.status !== 'running') {
            return undefined;
        }

        const timer = window.setInterval(() => {
            setJournal((current) => advanceWorkbenchJournal(current, Date.now()));
        }, 300);

        return () => window.clearInterval(timer);
    }, [activeRun?.id, activeRun?.status]);

    const progressSummary = useMemo(() => {
        if (!activeNodes.length) {
            return { completed: 0, total: 0 };
        }
        return {
            completed: activeNodes.filter((node) => node.status === 'completed').length,
            total: activeNodes.length,
        };
    }, [activeNodes]);

    return (
        <div data-testid="workbench-surface" className="min-h-screen bg-[linear-gradient(180deg,#f6f1e7_0%,#efe4d4_45%,#f9f6ef_100%)] text-stone-900">
            <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 xl:px-8">
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-[28px] border border-white/70 bg-white/75 px-5 py-4 shadow-[0_18px_50px_rgba(120,53,15,0.06)] backdrop-blur-sm">
                    <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-stone-500">AI Repo Workbench</p>
                        <div className="mt-2 flex flex-wrap items-center gap-3">
                            <h1 data-testid="workbench-page-heading" className="text-3xl font-semibold tracking-tight text-stone-950">AI 仓库工作台</h1>
                            <StatusBadge status={activeRun?.status ?? 'pending'} />
                        </div>
                        <p className="mt-2 max-w-4xl text-sm leading-7 text-stone-600">
                            桌面工作台视图：左侧管理模板和仓库上下文，中间查看 WorkflowRun 与节点时间线，右侧固定展示 DecisionRequest 与 ArtifactBundle。
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => navigate('/')}
                        className="inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-stone-400 hover:bg-stone-50"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        返回大厅
                    </button>
                </div>

                <div className="mt-6 grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)_380px]">
                    <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
                        <article data-testid="template-new-faction-card" className="rounded-[28px] border border-stone-200 bg-white/92 p-5 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">Template</p>
                                    <h2 className="mt-3 text-2xl font-semibold text-stone-950">new-faction</h2>
                                    <p className="mt-3 text-sm leading-7 text-stone-600">
                                        首版只开放这一条正式模板。它覆盖规则来源选择、规则规范化、素材检查、派系定义草案和 ArtifactBundle 发布。
                                    </p>
                                </div>
                                <div className="rounded-3xl bg-amber-100 p-3 text-amber-700">
                                    <Sparkles className="h-5 w-5" />
                                </div>
                            </div>
                            <div className="mt-5 flex flex-wrap gap-2 text-xs text-stone-700">
                                <span className="rounded-full bg-stone-900 px-3 py-1.5 font-semibold text-white">模板唯一真相</span>
                                <span className="rounded-full border border-stone-300 bg-stone-50 px-3 py-1.5">local-first</span>
                                <span className="rounded-full border border-stone-300 bg-stone-50 px-3 py-1.5">repo-centric</span>
                            </div>
                            <label className="mt-6 block">
                                <span className="text-sm font-medium text-stone-700">派系名称</span>
                                <input
                                    value={factionName}
                                    onChange={(event) => setFactionName(event.target.value)}
                                    className="mt-2 w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 text-sm outline-none transition focus:border-stone-500 focus:bg-white"
                                    placeholder="输入本轮 new-faction 目标名"
                                />
                            </label>
                            <div className="mt-6 grid gap-3">
                                <button
                                    type="button"
                                    data-testid="start-new-faction-run"
                                    onClick={() => setJournal((current) => startNewFactionRun(current, { factionName }, Date.now()))}
                                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-stone-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-stone-800"
                                >
                                    <PlayCircle className="h-4 w-4" />
                                    启动 new-faction
                                </button>
                                <button
                                    type="button"
                                    data-testid="reset-workbench-journal"
                                    onClick={() => setJournal(resetWorkbenchJournal(Date.now()))}
                                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm font-semibold text-stone-700 transition hover:border-stone-400 hover:bg-stone-50"
                                >
                                    <RefreshCcw className="h-4 w-4" />
                                    重置演示数据
                                </button>
                            </div>
                        </article>

                        <div data-testid="repo-session-card" className="rounded-[28px] border border-stone-200 bg-white/92 p-5 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
                            <div className="flex items-center gap-3 text-stone-900">
                                <FolderGit2 className="h-5 w-5 text-amber-700" />
                                <div>
                                    <p className="text-xs uppercase tracking-[0.24em] text-stone-400">RepoSession</p>
                                    <p className="mt-1 text-lg font-semibold">{journal.repoSession.metadata.repoName}</p>
                                </div>
                            </div>
                            <div className="mt-4 space-y-3 text-sm text-stone-600">
                                <p className="break-all rounded-2xl bg-stone-50 px-4 py-3">{journal.repoSession.rootPath}</p>
                                <div className="flex items-center justify-between rounded-2xl bg-stone-50 px-4 py-3">
                                    <span>sourceType</span>
                                    <span className="font-medium text-stone-900">{journal.repoSession.sourceType}</span>
                                </div>
                                <div className="flex items-center justify-between rounded-2xl bg-stone-50 px-4 py-3">
                                    <span>productMode</span>
                                    <span className="font-medium text-stone-900">{journal.repoSession.metadata.productMode}</span>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-[28px] border border-stone-200 bg-white/92 p-5 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
                            <div className="flex items-center gap-3 text-stone-900">
                                <GitBranch className="h-5 w-5 text-sky-700" />
                                <div>
                                    <p className="text-xs uppercase tracking-[0.24em] text-stone-400">WorktreeTask</p>
                                    <p className="mt-1 text-lg font-semibold">{journal.worktreeTask.branchName}</p>
                                </div>
                            </div>
                            <div className="mt-4 space-y-3 text-sm text-stone-600">
                                <div className="flex items-center justify-between rounded-2xl bg-stone-50 px-4 py-3">
                                    <span>taskKind</span>
                                    <span className="font-medium text-stone-900">{journal.worktreeTask.taskKind}</span>
                                </div>
                                <div className="flex items-center justify-between rounded-2xl bg-stone-50 px-4 py-3">
                                    <span>status</span>
                                    <StatusBadge status={journal.worktreeTask.status === 'ready' ? 'pending' : journal.worktreeTask.status} />
                                </div>
                            </div>
                        </div>

                        <section className="grid gap-4 rounded-[28px] border border-stone-200 bg-white/92 p-5 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
                            <div className="rounded-3xl bg-stone-50 p-4">
                                <div className="flex items-center gap-3">
                                    <CircleDot className="h-5 w-5 text-sky-700" />
                                    <div>
                                        <p className="text-xs uppercase tracking-[0.24em] text-stone-400">Surface</p>
                                        <p className="mt-1 font-semibold text-stone-900">Workbench Surface</p>
                                    </div>
                                </div>
                                <p className="mt-3 text-sm leading-6 text-stone-600">桌面布局优先，主工作区、上下文栏和侧边决策栏并列存在。</p>
                            </div>
                            <div className="rounded-3xl bg-stone-50 p-4">
                                <div className="flex items-center gap-3">
                                    <CheckCircle2 className="h-5 w-5 text-emerald-700" />
                                    <div>
                                        <p className="text-xs uppercase tracking-[0.24em] text-stone-400">Runtime</p>
                                        <p className="mt-1 font-semibold text-stone-900">LocalRuntime Journal</p>
                                    </div>
                                </div>
                                <p className="mt-3 text-sm leading-6 text-stone-600">运行态保存在浏览器 localStorage，结构化保留 WorkflowRun、DecisionRequest 和 ArtifactBundle。</p>
                            </div>
                            <div className="rounded-3xl bg-stone-50 p-4">
                                <div className="flex items-center gap-3">
                                    <PackageCheck className="h-5 w-5 text-amber-700" />
                                    <div>
                                        <p className="text-xs uppercase tracking-[0.24em] text-stone-400">Stub Boundary</p>
                                        <p className="mt-1 font-semibold text-stone-900">Structured Stub</p>
                                    </div>
                                </div>
                                <p className="mt-3 text-sm leading-6 text-stone-600">只有规则来源是本轮真实人工决策；其余节点仍是结构化 stub，并明确标边界。</p>
                            </div>
                        </section>
                    </aside>

                    <main className="min-w-0 space-y-6">
                        <article className="rounded-[28px] border border-stone-200 bg-white/92 p-6 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
                            <div className="flex flex-wrap items-start justify-between gap-4">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">WorkflowRun</p>
                                    {activeRun ? (
                                        <>
                                            <h2 className="mt-3 text-2xl font-semibold text-stone-950">{activeRun.title}</h2>
                                            <p className="mt-2 text-sm leading-7 text-stone-600">
                                                currentNode: {activeRun.currentNodeId ?? '已到完成态'} / checkpointVersion: {activeRun.checkpointVersion}
                                            </p>
                                        </>
                                    ) : (
                                        <>
                                            <h2 className="mt-3 text-2xl font-semibold text-stone-950">还没有运行中的 WorkflowRun</h2>
                                            <p className="mt-2 text-sm leading-7 text-stone-600">
                                                从左侧模板区启动一次 `new-faction`，中间主工作区会立即接管节点推进与运行态显示。
                                            </p>
                                        </>
                                    )}
                                </div>
                                {activeRun ? <StatusBadge status={activeRun.status} /> : null}
                            </div>
                            <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_240px]">
                                <div>
                                    <div className="overflow-hidden rounded-full bg-stone-100">
                                        <div
                                            className="h-3 rounded-full bg-[linear-gradient(90deg,#0f766e_0%,#14b8a6_100%)] transition-all"
                                            style={{
                                                width: `${progressSummary.total > 0 ? (progressSummary.completed / progressSummary.total) * 100 : 0}%`,
                                            }}
                                        />
                                    </div>
                                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-stone-600">
                                        <span>{progressSummary.completed} / {progressSummary.total} 节点已完成</span>
                                        <span>startedAt: {activeRun?.startedAt.slice(11, 19) ?? '--:--:--'}</span>
                                    </div>
                                </div>
                                <div className="grid gap-3 text-sm text-stone-600">
                                    <div className="rounded-2xl bg-stone-50 px-4 py-3">
                                        <p className="text-xs uppercase tracking-[0.2em] text-stone-400">Current Template</p>
                                        <p className="mt-1 font-semibold text-stone-900">new-faction</p>
                                    </div>
                                    <div className="rounded-2xl bg-stone-50 px-4 py-3">
                                        <p className="text-xs uppercase tracking-[0.2em] text-stone-400">Repo Path</p>
                                        <p className="mt-1 break-all text-stone-700">{AI_REPO_WORKBENCH_REPO_PATH}</p>
                                    </div>
                                </div>
                            </div>
                        </article>

                        <section className="rounded-[28px] border border-stone-200 bg-white/92 p-6 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
                            <div className="mb-4 flex items-center gap-3">
                                <Clock3 className="h-5 w-5 text-stone-500" />
                                <div>
                                    <h2 className="text-2xl font-semibold text-stone-950">节点时间线</h2>
                                    <p className="mt-1 text-sm text-stone-600">把当前 run 的节点推进放在中间主工作区，不再做成长页面附属卡片流。</p>
                                </div>
                            </div>
                            <div className="grid gap-4">
                                {activeNodes.length > 0 ? (
                                    activeNodes.map((node) => <TimelineCard key={node.nodeId} node={node} run={activeRun as WorkflowRun} />)
                                ) : (
                                    <div className="rounded-[24px] border border-dashed border-stone-300 bg-white/70 px-6 py-10 text-sm leading-7 text-stone-600">
                                        启动模板后，这里会按 NodeExecutionRecord 逐步展示 `pending / running / waiting_decision / completed`。
                                    </div>
                                )}
                            </div>
                        </section>
                    </main>

                    <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
                        <DecisionPanel
                            decision={activeDecision}
                            selectedOptionId={selectedRuleSource}
                            onSelect={setSelectedRuleSource}
                            onSubmit={() => {
                                if (!activeDecision) return;
                                setJournal((current) => submitRuleSourceDecision(current, {
                                    decisionId: activeDecision.id,
                                    optionId: selectedRuleSource,
                                }, Date.now()));
                            }}
                        />
                        <ArtifactPanel artifact={activeArtifact} />
                    </aside>
                </div>
            </div>
        </div>
    );
}
