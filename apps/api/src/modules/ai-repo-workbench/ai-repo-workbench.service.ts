import { ConflictException, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { execFile } from 'node:child_process';
import { access, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';
import { promisify } from 'node:util';
import {
    createInitialWorkbenchJournal,
    focusManagedWorktree,
    hydrateWorkbenchJournal,
    registerManagedWorktree,
    type OptionalWorkflowNodeId,
    type RuleSourceOptionId,
    type WorkbenchJournal,
    type WorkflowNodeId,
    type WorktreeTask,
    getWorkflowTemplateDefinition,
} from '../../../../../src/features/ai-repo-workbench/runtime';
import { NewFactionLangGraphOrchestrator } from './langgraph-orchestrator';
import { syncGraphResultToJournalPatch } from './langgraph-journal-sync';

const execFileAsync = promisify(execFile);

type GitWorktreeEntry = {
    path: string;
    branchName?: string;
    detached: boolean;
};

@Injectable()
export class AiRepoWorkbenchService {
    private readonly logger = new Logger(AiRepoWorkbenchService.name);
    private readonly repoRoot = process.cwd();
    private readonly journalPath = resolve(this.repoRoot, 'temp/ai-repo-workbench/workbench-journal.json');
    private readonly orchestrator = new NewFactionLangGraphOrchestrator();

    async getJournal(): Promise<WorkbenchJournal> {
        return this.loadJournal();
    }

    async resetJournal(now = Date.now()): Promise<WorkbenchJournal> {
        const fresh = await this.createServerInitialJournal(now);
        await this.saveJournal(fresh);
        return fresh;
    }

    async registerWorktree(
        payload: {
            branchName: string;
            worktreePath: string;
            label?: string;
        },
        now = Date.now(),
    ): Promise<WorkbenchJournal> {
        let journal = await this.loadJournal();
        const branchName = payload.branchName.trim();
        const worktreePath = resolve(payload.worktreePath.trim());
        if (!branchName || !worktreePath) {
            return journal;
        }

        const actualWorktrees = await this.listGitWorktrees();
        const discovered = actualWorktrees.find((entry) => (
            this.samePath(entry.path, worktreePath) || (!!entry.branchName && entry.branchName === branchName)
        ));

        if (!discovered) {
            await this.ensureTargetPathReady(worktreePath);
            const branchExists = await this.branchExists(branchName);
            const baseRef = journal.repoSession.defaultBranch || 'main';
            const args = branchExists
                ? ['worktree', 'add', worktreePath, branchName]
                : ['worktree', 'add', worktreePath, '-b', branchName, baseRef];
            await this.runGit(args);
        }

        journal = registerManagedWorktree(journal, {
            branchName,
            worktreePath,
            label: payload.label,
        }, now);
        journal = this.markWorktreeManagedBy(journal, journal.repoSession.activeWorktreeId, 'git-runtime');
        await this.saveJournal(journal);
        return journal;
    }

    async focusWorktree(worktreeId: string, now = Date.now()): Promise<WorkbenchJournal> {
        const journal = focusManagedWorktree(await this.loadJournal(), { worktreeId }, now);
        await this.saveJournal(journal);
        return journal;
    }

    async startNewFaction(
        payload: {
            factionName: string;
            nodeToggles?: Partial<Record<OptionalWorkflowNodeId, boolean>>;
        },
        _now = Date.now(),
    ): Promise<WorkbenchJournal> {
        const journal = await this.loadJournal();
        const activeWorktree = this.getActiveWorktreeTask(journal);
        if (!activeWorktree) {
            this.logger.warn('startNewFaction: no active worktree, returning unchanged journal');
            return journal;
        }

        const enabledNodeIds = this.resolveEnabledNodeIds('new-faction', payload.nodeToggles);

        try {
            const result = await this.orchestrator.startRun({
                factionName: payload.factionName.trim() || '星环游牧者',
                gameId: 'smashup',
                worktreePath: activeWorktree.worktreePath,
                branchName: activeWorktree.branchName,
                repoSessionId: journal.repoSession.id,
                worktreeTaskId: activeWorktree.id,
                enabledNodeIds,
            });

            const patch = syncGraphResultToJournalPatch(result);
            const nextJournal = this.applyPatchToJournal(journal, patch, activeWorktree.id);
            await this.saveJournal(nextJournal);
            this.logger.log(`startNewFaction: run ${patch.run.id} created, interrupted=${result.interrupted}, thread=${result.threadId}`);
            return nextJournal;
        } catch (error) {
            this.logger.error('startNewFaction: LangGraph execution failed', error);
            throw new InternalServerErrorException('LangGraph workflow execution failed');
        }
    }

    async submitRuleSourceDecision(
        payload: {
            decisionId: string;
            optionId: RuleSourceOptionId;
        },
        _now = Date.now(),
    ): Promise<WorkbenchJournal> {
        const journal = await this.loadJournal();
        const run = this.findRunByDecisionId(journal, payload.decisionId);
        if (!run) {
            this.logger.warn(`submitRuleSourceDecision: no run found for decision ${payload.decisionId}`);
            return journal;
        }

        const threadId = run.orchestrator?.engine === 'langgraph'
            ? run.orchestrator.threadId
            : undefined;

        if (!threadId) {
            this.logger.warn(`submitRuleSourceDecision: no LangGraph threadId for run ${run.id}`);
            return journal;
        }

        try {
            const result = await this.orchestrator.resumeDecision(threadId, {
                optionId: payload.optionId,
            });

            const patch = syncGraphResultToJournalPatch(result);
            const nextJournal = this.applyPatchToJournal(journal, patch, run.worktreeTaskId);
            await this.saveJournal(nextJournal);
            this.logger.log(`submitRuleSourceDecision: run ${run.id} resumed, status=${patch.run.status}`);
            return nextJournal;
        } catch (error) {
            this.logger.error('submitRuleSourceDecision: LangGraph resume failed', error);
            throw new InternalServerErrorException('LangGraph resume failed');
        }
    }

    async advance(_now = Date.now()): Promise<WorkbenchJournal> {
        return this.loadJournal();
    }

    // ── LangGraph helpers ───────────────────────────────────────────────

    private getActiveWorktreeTask(journal: WorkbenchJournal): WorktreeTask | undefined {
        return journal.managedWorktrees.find((t) => t.id === journal.repoSession.activeWorktreeId)
            ?? journal.managedWorktrees[0];
    }

    private findRunByDecisionId(journal: WorkbenchJournal, decisionId: string) {
        const decision = journal.decisions.find((d) => d.id === decisionId);
        if (decision) {
            return journal.runs.find((r) => r.id === decision.runId);
        }
        return journal.runs.find((r) => r.latestDecisionRequestId === decisionId);
    }

    private resolveEnabledNodeIds(
        templateId: string,
        nodeToggles?: Partial<Record<OptionalWorkflowNodeId, boolean>>,
    ): WorkflowNodeId[] {
        const template = getWorkflowTemplateDefinition(templateId as 'new-faction');
        return template.nodeOrder.filter((nodeId) => {
            const toggle = template.optionalNodeToggles.find((t) => t.nodeId === nodeId);
            if (!toggle) return true;
            return nodeToggles?.[toggle.nodeId] ?? toggle.defaultEnabled;
        });
    }

    private applyPatchToJournal(
        journal: WorkbenchJournal,
        patch: ReturnType<typeof syncGraphResultToJournalPatch>,
        worktreeTaskId: string,
    ): WorkbenchJournal {
        const now = new Date().toISOString();

        const existingRunIndex = journal.runs.findIndex((r) => r.id === patch.run.id);
        const runs = existingRunIndex >= 0
            ? journal.runs.map((r, i) => (i === existingRunIndex ? patch.run as WorkbenchJournal['runs'][number] : r))
            : [...journal.runs, patch.run as WorkbenchJournal['runs'][number]];

        const existingNodeIds = new Set(
            journal.nodeRecords.filter((r) => r.runId === patch.run.id).map((r) => r.nodeId),
        );
        const nodeRecords = existingNodeIds.size > 0
            ? journal.nodeRecords
                .filter((r) => r.runId !== patch.run.id)
                .concat(patch.nodeRecords as WorkbenchJournal['nodeRecords'])
            : [...journal.nodeRecords, ...(patch.nodeRecords as WorkbenchJournal['nodeRecords'])];

        const existingDecisionIds = new Set(journal.decisions.map((d) => d.id));
        const newDecisions = patch.decisions.filter((d) => !existingDecisionIds.has(d.id));
        const updatedDecisions = journal.decisions.map((d) => {
            const patchVersion = patch.decisions.find((pd) => pd.id === d.id);
            return patchVersion ? (patchVersion as WorkbenchJournal['decisions'][number]) : d;
        });
        const decisions = [...updatedDecisions, ...(newDecisions as WorkbenchJournal['decisions'])];

        const artifactBundles = patch.artifactBundle
            ? [...journal.artifactBundles, patch.artifactBundle as WorkbenchJournal['artifactBundles'][number]]
            : journal.artifactBundles;

        const worktreeStatus = patch.run.status === 'completed' ? 'completed' as const
            : patch.run.status === 'waiting_decision' ? 'paused' as const
            : 'running' as const;

        const managedWorktrees = journal.managedWorktrees.map((t) =>
            t.id === worktreeTaskId
                ? { ...t, status: worktreeStatus, lastRunId: patch.run.id }
                : t,
        );

        return {
            ...journal,
            updatedAt: now,
            activeRunId: patch.activeRunId,
            runs,
            nodeRecords,
            decisions,
            artifactBundles,
            managedWorktrees,
        };
    }

    // ── Journal persistence ─────────────────────────────────────────────

    private async loadJournal(): Promise<WorkbenchJournal> {
        try {
            const raw = await readFile(this.journalPath, 'utf8');
            return this.normalizeJournal(hydrateWorkbenchJournal(raw));
        } catch {
            const fresh = await this.createServerInitialJournal();
            await this.saveJournal(fresh);
            return fresh;
        }
    }

    private async saveJournal(journal: WorkbenchJournal): Promise<void> {
        await mkdir(dirname(this.journalPath), { recursive: true });
        await writeFile(this.journalPath, JSON.stringify(journal, null, 2), 'utf8');
    }

    private async createServerInitialJournal(now = Date.now()): Promise<WorkbenchJournal> {
        const currentBranch = await this.getCurrentBranch();
        const gitCommonDir = await this.getGitCommonDir();
        const fresh = createInitialWorkbenchJournal(now);
        const firstWorktree = fresh.managedWorktrees[0];

        return {
            ...fresh,
            repoSession: {
                ...fresh.repoSession,
                rootPath: this.repoRoot,
                repoFingerprint: gitCommonDir,
                metadata: {
                    ...fresh.repoSession.metadata,
                    repoName: basename(this.repoRoot),
                    currentBranch,
                },
            },
            managedWorktrees: firstWorktree
                ? [{
                    ...firstWorktree,
                    branchName: currentBranch,
                    worktreePath: this.repoRoot,
                    managedBy: 'git-runtime',
                }]
                : [],
        };
    }

    private normalizeJournal(journal: WorkbenchJournal): WorkbenchJournal {
        return {
            ...journal,
            repoSession: {
                ...journal.repoSession,
                rootPath: this.repoRoot,
                metadata: {
                    ...journal.repoSession.metadata,
                    repoName: basename(this.repoRoot),
                },
                activeWorktreeId: journal.repoSession.activeWorktreeId ?? journal.managedWorktrees[0]?.id,
            },
        };
    }

    private markWorktreeManagedBy(
        journal: WorkbenchJournal,
        worktreeId: string | undefined,
        managedBy: WorktreeTask['managedBy'],
    ): WorkbenchJournal {
        if (!worktreeId) {
            return journal;
        }
        return {
            ...journal,
            managedWorktrees: journal.managedWorktrees.map((task) => (
                task.id === worktreeId
                    ? {
                        ...task,
                        managedBy,
                    }
                    : task
            )),
        };
    }

    private async ensureTargetPathReady(targetPath: string): Promise<void> {
        try {
            await access(targetPath);
        } catch {
            await mkdir(dirname(targetPath), { recursive: true });
            return;
        }

        const entries = await readdir(targetPath);
        if (entries.length > 0) {
            throw new ConflictException(`目标路径已存在且非空，不能直接创建 git worktree: ${targetPath}`);
        }
    }

    private async branchExists(branchName: string): Promise<boolean> {
        try {
            await this.runGit(['show-ref', '--verify', '--quiet', `refs/heads/${branchName}`]);
            return true;
        } catch {
            return false;
        }
    }

    private async getCurrentBranch(): Promise<string> {
        const { stdout } = await this.runGit(['rev-parse', '--abbrev-ref', 'HEAD']);
        return stdout.trim() || 'main';
    }

    private async getGitCommonDir(): Promise<string> {
        const { stdout } = await this.runGit(['rev-parse', '--git-common-dir']);
        return resolve(this.repoRoot, stdout.trim() || '.git');
    }

    private async listGitWorktrees(): Promise<GitWorktreeEntry[]> {
        const { stdout } = await this.runGit(['worktree', 'list', '--porcelain']);
        const entries: GitWorktreeEntry[] = [];
        const blocks = stdout.split(/\r?\n\r?\n/).map((block) => block.trim()).filter(Boolean);
        for (const block of blocks) {
            const entry: GitWorktreeEntry = {
                path: '',
                detached: false,
            };
            for (const line of block.split(/\r?\n/)) {
                if (line.startsWith('worktree ')) {
                    entry.path = resolve(line.slice('worktree '.length).trim());
                } else if (line.startsWith('branch ')) {
                    entry.branchName = line.slice('branch '.length).trim().replace('refs/heads/', '');
                } else if (line === 'detached') {
                    entry.detached = true;
                }
            }
            if (entry.path) {
                entries.push(entry);
            }
        }
        return entries;
    }

    private samePath(left: string, right: string) {
        return resolve(left).toLowerCase() === resolve(right).toLowerCase();
    }

    private async runGit(args: string[]) {
        try {
            return await execFileAsync('git', args, {
                cwd: this.repoRoot,
                windowsHide: true,
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'git 命令失败';
            throw new InternalServerErrorException(message);
        }
    }
}
