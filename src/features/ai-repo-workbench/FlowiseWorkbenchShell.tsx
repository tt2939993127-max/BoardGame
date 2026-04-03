import { useMemo, type ReactNode } from 'react';

import {
    Agentflow,
    type FlowData,
    type FlowEdge,
    type FlowNode,
    type HeaderRenderProps,
    type PaletteRenderProps,
} from '../../../forks/flowise/packages/agentflow/dist';
import '../../../forks/flowise/packages/agentflow/dist/flowise.css';

import type {
    NodeExecutionRecord,
    WorkbenchNodeStatus,
    WorkflowNodeId,
    WorkflowRun,
    WorkflowTemplateDefinition,
} from './runtime';

const FLOWISE_NODE_POSITIONS: Record<WorkflowNodeId, { x: number; y: number }> = {
    'capture-faction-intent': { x: 80, y: 80 },
    'select-rule-source': { x: 420, y: 80 },
    'acquire-rule-material': { x: 760, y: 80 },
    'transcribe-or-normalize-rules': { x: 760, y: 300 },
    'inspect-assets': { x: 420, y: 300 },
    'draft-faction-definition': { x: 80, y: 300 },
    'review-faction-definition': { x: 80, y: 520 },
    'run-e2e-validation': { x: 420, y: 520 },
    'publish-artifact-bundle': { x: 760, y: 520 },
};

const STATUS_TO_FLOWISE: Record<
    WorkbenchNodeStatus,
    {
        color: string;
        status?: 'INPROGRESS' | 'FINISHED' | 'ERROR' | 'STOPPED' | 'TERMINATED';
        warning?: string;
        error?: string;
    }
> = {
    pending: {
        color: '#cbd5e1',
    },
    running: {
        color: '#f59e0b',
        status: 'INPROGRESS',
    },
    waiting_decision: {
        color: '#0ea5e9',
        status: 'STOPPED',
        warning: '等待人工决策',
    },
    blocked: {
        color: '#fb7185',
        status: 'STOPPED',
        warning: '当前节点被阻塞',
    },
    skipped: {
        color: '#a8a29e',
        status: 'TERMINATED',
        warning: '节点被显式跳过',
    },
    completed: {
        color: '#10b981',
        status: 'FINISHED',
    },
    failed: {
        color: '#ef4444',
        status: 'ERROR',
        error: '节点执行失败',
    },
};

const NODE_KIND_REGISTRY: Record<WorkflowNodeId, string> = {
    'capture-faction-intent': 'startAgentflow',
    'select-rule-source': 'humanInputAgentflow',
    'acquire-rule-material': 'toolAgentflow',
    'transcribe-or-normalize-rules': 'customFunctionAgentflow',
    'inspect-assets': 'toolAgentflow',
    'draft-faction-definition': 'agentAgentflow',
    'review-faction-definition': 'conditionAgentflow',
    'run-e2e-validation': 'executeFlowAgentflow',
    'publish-artifact-bundle': 'directReplyAgentflow',
};

function buildInputAnchor(nodeId: WorkflowNodeId) {
    return {
        id: `${nodeId}-input-0`,
        name: 'input',
        label: 'In',
        type: 'flow',
    };
}

function buildOutputAnchor(nodeId: WorkflowNodeId) {
    return {
        id: `${nodeId}-output-0`,
        name: 'output',
        label: 'Out',
        type: 'flow',
    };
}

function buildFlowiseNode(
    node: NodeExecutionRecord,
    template: WorkflowTemplateDefinition,
    currentNodeId?: string,
): FlowNode {
    const nodeDefinition = template.nodeDefinitions[node.nodeId];
    const nodeKind = NODE_KIND_REGISTRY[node.nodeId];
    const statusMeta = STATUS_TO_FLOWISE[node.status];
    const isStartNode = node.nodeId === 'capture-faction-intent';
    const isTerminalNode = node.nodeId === 'publish-artifact-bundle';

    return {
        id: node.nodeId,
        type: 'agentflowNode',
        position: FLOWISE_NODE_POSITIONS[node.nodeId],
        data: {
            id: node.nodeId,
            name: nodeKind,
            label: nodeDefinition.label,
            description: nodeDefinition.hint,
            hint: node.nodeId === currentNodeId ? '当前停留节点' : undefined,
            color: statusMeta.color,
            hideInput: isStartNode,
            selected: node.nodeId === currentNodeId,
            status: statusMeta.status,
            warning: statusMeta.warning,
            error: node.errorSummary ?? statusMeta.error,
            inputAnchors: isStartNode ? [] : [buildInputAnchor(node.nodeId)],
            outputAnchors: isTerminalNode ? [] : [buildOutputAnchor(node.nodeId)],
            outputs: isTerminalNode
                ? []
                : [
                      {
                          label: 'Next',
                          name: 'next',
                          type: 'flow',
                      },
                  ],
            inputValues: {
                status: node.status,
                attempt: node.attempt,
                current: node.nodeId === currentNodeId,
            },
        },
    };
}

function buildFlowiseEdge(sourceId: WorkflowNodeId, targetId: WorkflowNodeId): FlowEdge {
    return {
        id: `${sourceId}-->${targetId}`,
        source: sourceId,
        target: targetId,
        sourceHandle: `${sourceId}-output-0`,
        targetHandle: `${targetId}-input-0`,
        type: 'default',
        animated: false,
    };
}

function buildFlowData({
    nodes,
    run,
    template,
}: {
    nodes: NodeExecutionRecord[];
    run: WorkflowRun | null;
    template: WorkflowTemplateDefinition;
}): FlowData {
    const orderedNodes = template.nodeOrder
        .map((nodeId) => nodes.find((node) => node.nodeId === nodeId))
        .filter((node): node is NodeExecutionRecord => Boolean(node));

    const flowNodes = orderedNodes.map((node) => buildFlowiseNode(node, template, run?.currentNodeId));
    const flowEdges = orderedNodes.slice(0, -1).map((node, index) => buildFlowiseEdge(node.nodeId, orderedNodes[index + 1].nodeId));

    return {
        nodes: flowNodes,
        edges: flowEdges,
        viewport: {
            x: 0,
            y: 0,
            zoom: 0.82,
        },
    };
}

export function FlowiseWorkbenchShell({
    nodes,
    run,
    template,
    renderHeader,
    renderNodePalette,
}: {
    nodes: NodeExecutionRecord[];
    run: WorkflowRun | null;
    template: WorkflowTemplateDefinition;
    renderHeader?: (props: HeaderRenderProps) => ReactNode;
    renderNodePalette?: (props: PaletteRenderProps) => ReactNode;
}) {
    const flowData = useMemo(() => buildFlowData({ nodes, run, template }), [nodes, run, template]);
    const flowKey = useMemo(
        () => [
            run?.id ?? 'no-run',
            run?.currentNodeId ?? 'idle',
            ...nodes.map((node) => `${node.nodeId}:${node.status}:${node.attempt}`),
        ].join('|'),
        [nodes, run?.currentNodeId, run?.id],
    );

    return (
        <div data-testid="flowise-shell-panel" className="flex h-full min-h-[420px] flex-col overflow-hidden rounded-[24px] border border-stone-200 bg-white">
            <div className="min-h-0 flex-1 bg-[#f8fafc]">
                <Agentflow
                    key={flowKey}
                    apiBaseUrl="/"
                    initialFlow={flowData}
                    readOnly
                    renderHeader={renderHeader as never}
                    renderNodePalette={renderNodePalette as never}
                    showDefaultHeader={!renderHeader}
                    showDefaultPalette={!renderNodePalette}
                    enableGenerator={false}
                    isDarkMode={false}
                    components={[]}
                />
            </div>
        </div>
    );
}
