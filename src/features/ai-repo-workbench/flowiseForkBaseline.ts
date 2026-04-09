import {
    FLOWISE_HOST_BASELINE,
    FLOW_HOST_WORKFLOW_PACK_SUMMARIES,
    type FlowHostBaseline,
    type WorkflowPackSummary,
} from '@flow-host/core';

export interface ForkBaseline extends FlowHostBaseline {
    releaseDate: string;
    license: string;
    adoptionMode: 'fork';
    updatePolicy: {
        mode: 'pinned-tag';
        allowAutoTracking: false;
        nextAction: string;
    };
    knownRisks: string[];
}

export interface WorkbenchFlowHostCatalog {
    baseline: ForkBaseline;
    workflowPacks: WorkflowPackSummary[];
}

/**
 * 单一真相：AI Repo Workbench 当前选择的上游 fork 基线。
 * flow-host 提供跨项目复用的通用宿主基线，这里只补 BoardGame 私有约束。
 */
export const FLOWISE_FORK_BASELINE: ForkBaseline = {
    ...FLOWISE_HOST_BASELINE,
    localSourcePath: '../flowise-fork',
    releaseDate: '2026-03-23',
    license: 'Apache-2.0',
    adoptionMode: 'fork',
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

export const AI_REPO_WORKBENCH_FLOW_HOST_CATALOG: WorkbenchFlowHostCatalog = {
    baseline: FLOWISE_FORK_BASELINE,
    workflowPacks: FLOW_HOST_WORKFLOW_PACK_SUMMARIES,
};
