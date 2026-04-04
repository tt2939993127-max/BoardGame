import type { CSSProperties, ReactNode } from 'react';
import { FrameSequencePlayer, type FrameSequenceDefinition } from '../../../components/common/animations';
import { getOptimizedImageUrls } from '../../../core/AssetLoader';
import type {
    UISceneNodeProps,
    UIScenePrefabDefinition,
} from './types';

export interface UIImagePrefabProps extends UISceneNodeProps {
    image: string;
    alt?: string;
    fit?: CSSProperties['objectFit'];
    opacity?: number;
}

export interface UIFrameSequencePrefabProps extends UISceneNodeProps {
    sequence: FrameSequenceDefinition;
    fit?: CSSProperties['objectFit'];
    eventId?: string;
}

export interface UIHotspotPrefabProps extends UISceneNodeProps {
    label: string;
    eventId: string;
    debugFill?: boolean;
}

export interface UIScenePrefabRegistry {
    get: (prefabId: string) => UIScenePrefabDefinition | undefined;
    list: () => UIScenePrefabDefinition[];
}

function buildAbsoluteStyle(rect: {
    x: number;
    y: number;
    width: number;
    height: number;
}): CSSProperties {
    return {
        position: 'absolute',
        left: rect.x,
        top: rect.y,
        width: rect.width,
        height: rect.height,
    };
}

function renderVisualLayer(
    content: ReactNode,
    rect: {
        x: number;
        y: number;
        width: number;
        height: number;
    } | null,
    clipRect: {
        x: number;
        y: number;
        width: number;
        height: number;
    } | null,
    testId?: string,
) {
    if (!rect) {
        return null;
    }

    if (!clipRect) {
        return (
            <div style={buildAbsoluteStyle(rect)} className="pointer-events-none" data-testid={testId}>
                {content}
            </div>
        );
    }

    return (
        <div
            style={{
                ...buildAbsoluteStyle(clipRect),
                overflow: 'hidden',
            }}
            className="pointer-events-none"
            data-testid={testId}
        >
            <div
                style={{
                    position: 'absolute',
                    left: rect.x - clipRect.x,
                    top: rect.y - clipRect.y,
                    width: rect.width,
                    height: rect.height,
                }}
            >
                {content}
            </div>
        </div>
    );
}

const imagePrefab: UIScenePrefabDefinition<UIImagePrefabProps> = {
    prefabId: 'image',
    version: '1.0.0',
    displayName: '静态图片',
    render: ({ clipRect, node, rect }) => {
        const props = node.props;
        const src = getOptimizedImageUrls(props.image).webp;

        return renderVisualLayer(
            <img
                src={src}
                alt={props.alt ?? ''}
                className="h-full w-full"
                style={{
                    objectFit: props.fit ?? 'contain',
                    opacity: props.opacity ?? 1,
                }}
            />,
            rect,
            clipRect,
            node.testId,
        );
    },
};

const bookTabStripPrefab: UIScenePrefabDefinition<UIImagePrefabProps> = {
    prefabId: 'book-tab-strip',
    version: '1.0.0',
    displayName: '书本书签条',
    render: (context) => imagePrefab.render(context),
};

const frameSequencePrefab: UIScenePrefabDefinition<UIFrameSequencePrefabProps> = {
    prefabId: 'frame-sequence',
    version: '1.0.0',
    displayName: '逐帧动画',
    render: ({ activeState, clipRect, emit, node, rect }) => {
        const props = node.props;

        return renderVisualLayer(
            <FrameSequencePlayer
                sequence={props.sequence}
                playbackKey={`${node.id}:${activeState ?? 'default'}`}
                onComplete={props.eventId ? () => emit(props.eventId) : undefined}
                className="h-full w-full"
                style={{ objectFit: props.fit ?? 'contain' }}
            />,
            rect,
            clipRect,
            node.testId,
        );
    },
};

const hotspotPrefab: UIScenePrefabDefinition<UIHotspotPrefabProps> = {
    prefabId: 'hotspot',
    version: '1.0.0',
    displayName: '交互热点',
    render: ({ emit, node, rect, regionRect }) => {
        const targetRect = regionRect ?? rect;
        if (!targetRect) {
            return null;
        }

        const props = node.props;
        return (
            <button
                type="button"
                aria-label={props.label}
                data-testid={node.testId}
                onClick={() => emit(props.eventId)}
                className={props.debugFill ? 'bg-cyan-400/12 border border-cyan-300/40' : 'bg-transparent'}
                style={buildAbsoluteStyle(targetRect)}
            />
        );
    },
};

export function createUIScenePrefabRegistry(prefabs: UIScenePrefabDefinition[]): UIScenePrefabRegistry {
    const registry = new Map<string, UIScenePrefabDefinition>();

    prefabs.forEach((prefab) => {
        if (registry.has(prefab.prefabId)) {
            throw new Error(`重复的 prefab 注册: ${prefab.prefabId}`);
        }
        registry.set(prefab.prefabId, prefab);
    });

    return {
        get: (prefabId) => registry.get(prefabId),
        list: () => Array.from(registry.values()),
    };
}

export const defaultUIScenePrefabRegistry = createUIScenePrefabRegistry([
    imagePrefab,
    frameSequencePrefab,
    hotspotPrefab,
    bookTabStripPrefab,
]);
