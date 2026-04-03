export interface ForkBaseline {
    upstreamName: string;
    upstreamRepoUrl: string;
    upstreamDocsUrl: string;
    localSourcePath: string;
    pinnedTag: string;
    pinnedCommit: string;
    releaseDate: string;
    license: string;
    adoptionMode: 'fork';
    integrationBoundary: string[];
    updatePolicy: {
        mode: 'pinned-tag';
        allowAutoTracking: false;
        nextAction: string;
    };
    knownRisks: string[];
}

/**
 * 单一真相：AI Repo Workbench 当前选择的上游 fork 基线。
 * 这里锁的是“已验证的上游起点”，不是运行时依赖版本。
 */
export const FLOWISE_FORK_BASELINE: ForkBaseline = {
    upstreamName: 'Flowise',
    upstreamRepoUrl: 'https://github.com/FlowiseAI/Flowise',
    upstreamDocsUrl: 'https://docs.flowiseai.com/using-flowise/agentflowv2',
    localSourcePath: 'forks/flowise',
    pinnedTag: 'flowise@3.1.1',
    pinnedCommit: '34cf285',
    releaseDate: '2026-03-23',
    license: 'Apache-2.0',
    adoptionMode: 'fork',
    integrationBoundary: [
        '复用节点画布与 workflow shell',
        '不接管 RepoSession / WorktreeTask / WorkflowRun',
        '不接管 DecisionRequest / ArtifactBundle',
        '本项目 domain/runtime 仍是唯一真相源',
    ],
    updatePolicy: {
        mode: 'pinned-tag',
        allowAutoTracking: false,
        nextAction: '后续升级必须按 tag 逐次评估并记录兼容性，不允许直接追 upstream main',
    },
    knownRisks: [
        'Flowise 公开 issue 仍显示 Node 22 存在 engine/兼容告警；当前 BoardGame 使用 Node 24.1.0，接入时必须做隔离适配。',
        'Flowise 历史上有多条安全公告；即使当前锁定到 flowise@3.1.1，后续升级仍需逐条审计 release note 与 advisory。',
        'fork 后必须把画布层和领域层解耦，否则 repo/worktree 语义会再次被上游状态模型反客为主。',
    ],
};
