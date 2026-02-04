import type { CSSProperties, ReactNode } from 'react';
import type { CardPreviewRef } from '../../../systems/CardSystem';
import { buildLocalizedImageSet, getLocalizedAssetPath } from '../../../core';
import { OptimizedImage } from './OptimizedImage';

export type CardPreviewRenderer = (args: {
    previewRef: CardPreviewRef;
    locale?: string;
    className?: string;
    style?: CSSProperties;
}) => ReactNode;

export type CardSvgRenderer = (props?: Record<string, string | number>) => ReactNode;

export type CardAtlasConfig = {
    imageW: number;
    imageH: number;
    cols: number;
    rows: number;
    rowStarts: number[];
    rowHeights: number[];
    colStarts: number[];
    colWidths: number[];
};

export type CardAtlasSource = {
    image: string;
    config: CardAtlasConfig;
};

const previewRendererRegistry = new Map<string, CardPreviewRenderer>();
const svgRendererRegistry = new Map<string, CardSvgRenderer>();
const atlasRegistry = new Map<string, CardAtlasSource>();

export function registerCardPreviewRenderer(id: string, renderer: CardPreviewRenderer): void {
    previewRendererRegistry.set(id, renderer);
}

export function registerCardSvgRenderer(id: string, renderer: CardSvgRenderer): void {
    svgRendererRegistry.set(id, renderer);
}

export function registerCardAtlasSource(id: string, source: CardAtlasSource): void {
    atlasRegistry.set(id, source);
}

export function getCardAtlasSource(id: string): CardAtlasSource | undefined {
    return atlasRegistry.get(id);
}

export function getCardPreviewRenderer(id: string): CardPreviewRenderer | undefined {
    return previewRendererRegistry.get(id);
}

export function getCardSvgRenderer(id: string): CardSvgRenderer | undefined {
    return svgRendererRegistry.get(id);
}

export function getCardAtlasStyle(index: number, atlas: CardAtlasConfig): CSSProperties {
    const safeIndex = index % (atlas.cols * atlas.rows);
    const col = safeIndex % atlas.cols;
    const row = Math.floor(safeIndex / atlas.cols);
    const cardW = atlas.colWidths[col] ?? atlas.colWidths[0];
    const cardH = atlas.rowHeights[row] ?? atlas.rowHeights[0];
    const x = atlas.colStarts[col] ?? atlas.colStarts[0];
    const y = atlas.rowStarts[row] ?? atlas.rowStarts[0];
    const xPos = (x / (atlas.imageW - cardW)) * 100;
    const yPos = (y / (atlas.imageH - cardH)) * 100;
    const bgSizeX = (atlas.imageW / cardW) * 100;
    const bgSizeY = (atlas.imageH / cardH) * 100;
    return {
        backgroundSize: `${bgSizeX}% ${bgSizeY}%`,
        backgroundPosition: `${xPos}% ${yPos}%`,
    };
}

export type CardPreviewProps = {
    previewRef?: CardPreviewRef | null;
    locale?: string;
    className?: string;
    style?: CSSProperties;
    alt?: string;
    title?: string;
};

export function CardPreview({
    previewRef,
    locale,
    className,
    style,
    alt = 'Card Preview',
    title,
}: CardPreviewProps): ReactNode {
    if (!previewRef) return null;

    if (previewRef.type === 'image') {
        const src = getLocalizedAssetPath(previewRef.src, locale);
        return (
            <OptimizedImage
                src={src}
                fallbackSrc={previewRef.src}
                className={className}
                style={style}
                alt={alt}
                title={title}
            />
        );
    }

    if (previewRef.type === 'atlas') {
        const source = getCardAtlasSource(previewRef.atlasId);
        if (!source) return null;
        const atlasStyle = getCardAtlasStyle(previewRef.index, source.config);
        const backgroundImage = buildLocalizedImageSet(source.image, locale);
        return (
            <div
                className={className}
                title={title}
                style={{
                    backgroundImage,
                    backgroundRepeat: 'no-repeat',
                    ...atlasStyle,
                    ...style,
                }}
            />
        );
    }

    if (previewRef.type === 'svg') {
        const renderer = getCardSvgRenderer(previewRef.svgId);
        if (!renderer) return null;
        return (
            <span className={className} style={style} title={title}>
                {renderer(previewRef.props)}
            </span>
        );
    }

    const renderer = getCardPreviewRenderer(previewRef.rendererId);
    if (!renderer) return null;
    return renderer({ previewRef, locale, className, style });
}
