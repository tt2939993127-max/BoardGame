import { useState, useEffect, useReducer, type CSSProperties, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { getLocalizedImageUrls, getPreloadedImageElement, isImagePreloaded, markImageLoaded, onImageReady, type CardPreviewRef } from '../../../core';
import { getOptimizedImageUrls, getLocalizedAssetPath, getLocalizedLocalAssetPath } from '../../../core/AssetLoader';
import { OptimizedImage } from './OptimizedImage';
import { type SpriteAtlasConfig, computeSpriteStyle } from '../../../engine/primitives/spriteAtlas';
import {
    registerCardAtlasSource,
    getCardAtlasSource,
    getLazyRegistration,
    type CardAtlasSource as RegistryCardAtlasSource,
} from './cardAtlasRegistry';

export type CardPreviewRenderer = (args: {
    previewRef: CardPreviewRef;
    locale?: string;
    className?: string;
    style?: CSSProperties;
}) => ReactNode;

export type CardSvgRenderer = (props?: Record<string, string | number>) => ReactNode;

// 向后兼容类型别名（游戏层可能直接引用）
export type CardAtlasConfig = SpriteAtlasConfig;
export type CardAtlasSource = RegistryCardAtlasSource;

const previewRendererRegistry = new Map<string, CardPreviewRenderer>();
const svgRendererRegistry = new Map<string, CardSvgRenderer>();

export function registerCardPreviewRenderer(id: string, renderer: CardPreviewRenderer): void {
    previewRendererRegistry.set(id, renderer);
}

export function registerCardSvgRenderer(id: string, renderer: CardSvgRenderer): void {
    svgRendererRegistry.set(id, renderer);
}

export { registerCardAtlasSource, getCardAtlasSource };

export function getCardPreviewRenderer(id: string): CardPreviewRenderer | undefined {
    return previewRendererRegistry.get(id);
}

export function getCardSvgRenderer(id: string): CardSvgRenderer | undefined {
    return svgRendererRegistry.get(id);
}

/** 计算图集帧的 CSS 裁切样式（委托到引擎层） */
export function getCardAtlasStyle(index: number, atlas: CardAtlasConfig): CSSProperties {
    return computeSpriteStyle(index, atlas);
}

export type CardPreviewProps = {
    previewRef?: CardPreviewRef | null;
    locale?: string; // 可选，不传则自动从 i18next 获取当前语言
    className?: string;
    style?: CSSProperties;
    alt?: string;
    title?: string;
};

const getFallbackLocale = (locale: string): string => {
    if (locale === 'zh-CN') return 'en';
    if (locale === 'en') return 'zh-CN';
    return 'en';
};

const MIN_VALID_ATLAS_DIMENSION_PX = 16;

const hasUsableAtlasImage = (img: HTMLImageElement | null | undefined): img is HTMLImageElement =>
    Boolean(img) && img.naturalWidth >= MIN_VALID_ATLAS_DIMENSION_PX && img.naturalHeight >= MIN_VALID_ATLAS_DIMENSION_PX;

const isUsableAtlasUrlLoaded = (url: string): boolean => {
    if (!isImagePreloaded(url)) return false;
    return hasUsableAtlasImage(getPreloadedImageElement(url));
};

export function getCardAtlasCandidateUrls(image: string, locale: string): string[] {
    if (image.startsWith('data:')) {
        return [image];
    }
    const localizedUrls = getLocalizedImageUrls(image, locale);
    const fallbackLocale = getFallbackLocale(locale);
    const localPrimary = getOptimizedImageUrls(getLocalizedLocalAssetPath(image, locale));
    const localFallback = getOptimizedImageUrls(getLocalizedLocalAssetPath(image, fallbackLocale));

    return [
        localizedUrls.primary.webp,
        localizedUrls.fallback.webp,
        localPrimary.webp,
        localFallback.webp,
    ].filter((url, index, list): url is string => Boolean(url) && list.indexOf(url) === index);
}

export function CardPreview({
    previewRef,
    locale,
    className,
    style,
    alt = 'Card Preview',
    title,
}: CardPreviewProps): ReactNode {
    const { i18n } = useTranslation();
    
    if (!previewRef) return null;
    const effectiveLocale = locale || i18n.language || 'zh-CN';

    if (previewRef.type === 'image') {
        return (
            <OptimizedImage
                src={previewRef.src}
                locale={effectiveLocale}
                className={className}
                style={style}
                alt={alt}
                title={title}
            />
        );
    }

    if (previewRef.type === 'atlas') {
        return (
            <AtlasCard
                atlasId={previewRef.atlasId}
                index={previewRef.index}
                locale={effectiveLocale}
                className={className}
                style={style}
                title={title}
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
    return renderer({ previewRef, locale: effectiveLocale, className, style });
}

// ============================================================================
// Atlas 精灵图卡牌（带 shimmer 占位）
// ============================================================================

interface AtlasCardProps {
    atlasId: string;
    index: number;
    locale?: string;
    className?: string;
    style?: CSSProperties;
    title?: string;
}

function AtlasCard({ atlasId, index, locale, className, style, title }: AtlasCardProps) {
    const { i18n } = useTranslation();
    const effectiveLocale = locale || i18n.language || 'zh-CN';

    // 传入 locale 以支持懒解析模式（从预加载缓存读取图片尺寸）
    const [resolvedSource, setResolvedSource] = useState(() => getCardAtlasSource(atlasId, effectiveLocale));
    const source = resolvedSource ?? getCardAtlasSource(atlasId, effectiveLocale);
    const checkUrls = source ? getCardAtlasCandidateUrls(source.image, effectiveLocale) : [];

    // 当 atlasId 或 locale 变化时，重新获取 source（修复弃牌堆图标不更新的 bug）
    useEffect(() => {
        const newSource = getCardAtlasSource(atlasId, effectiveLocale);
        setResolvedSource(newSource);
    }, [atlasId, effectiveLocale]);

    // 使用统一的 isImagePreloaded 检查（与 CriticalImageGate 共享缓存）
    const preloaded = source
        ? hasUsableAtlasImage(getPreloadedImageElement(source.image, effectiveLocale)) || checkUrls.some(isUsableAtlasUrlLoaded)
        : false;
    const [loaded, setLoaded] = useState(() => preloaded);
    const checkKey = checkUrls.join('|');
    const [activeUrl, setActiveUrl] = useState(() => checkUrls.find(isUsableAtlasUrlLoaded) ?? checkUrls[0] ?? '');

    // 只有真实加载完成（loaded）或预加载缓存已命中（preloaded）时，才允许移除 shimmer。
    // 不能仅因为 activeUrl 已解析出来就视为已加载：
    // activeUrl 只代表“选中了候选 URL”，不代表图片请求/解码已经完成。
    // 否则会出现 atlas 在真实像素尚未就绪时就提前暴露，导致“早截空、晚截有图”。
    const effectiveLoaded = loaded || preloaded;

    // 订阅后台加载完成通知：CriticalImageGate 超时放行后，
    // 精灵图在后台继续加载，完成时触发重渲染消除 shimmer
    const [, bumpTick] = useReducer((n: number) => n + 1, 0);
    useEffect(() => {
        if (!source) return;
        const localizedPath = getLocalizedAssetPath(source.image, effectiveLocale);
        const { webp } = getOptimizedImageUrls(localizedPath);
        if (!webp) return;
        // 防御竞态：订阅前图片可能已在后台加载完成，立即检查一次
        if (hasUsableAtlasImage(getPreloadedImageElement(source.image, effectiveLocale))) {
            setLoaded(true);
        }
        return onImageReady((url) => {
            if (url === webp || checkUrls.includes(url)) {
                if (!hasUsableAtlasImage(getPreloadedImageElement(url))) return;
                setActiveUrl(url);
                setLoaded(true);
                bumpTick();
            }
        });
    }, [source?.image, effectiveLocale, checkKey]);

    useEffect(() => {
        setActiveUrl(checkUrls.find(isUsableAtlasUrlLoaded) ?? checkUrls[0] ?? '');
    }, [checkKey]);

    useEffect(() => {
        // 如果已预加载，直接标记为已加载
        const preloadedUrl = checkUrls.find(isUsableAtlasUrlLoaded);
        if (preloadedUrl) {
            setActiveUrl(preloadedUrl);
            setLoaded(true);
            return;
        }
        if (checkUrls.length === 0) {
            setActiveUrl('');
            setLoaded(true);
            return;
        }
        setLoaded(false);
        let cancelled = false;
        const markReady = () => {
            if (!cancelled) {
                setLoaded(true);
            }
        };

        const tryLoad = (idx: number) => {
            if (idx >= checkUrls.length) {
                markReady(); // 全部候选都明确失败后再移除 shimmer
                return;
            }
            const url = checkUrls[idx];
            const img = new Image();
            img.onload = () => {
                if (!hasUsableAtlasImage(img)) {
                    tryLoad(idx + 1);
                    return;
                }
                // 注册到统一缓存，供其他组件复用
                markImageLoaded(source.image, effectiveLocale, img);
                markImageLoaded(url, undefined, img);
                setActiveUrl(url);
                markReady();
            };
            img.onerror = () => {
                tryLoad(idx + 1);
            };
            img.src = url;
        };

        tryLoad(0);
        return () => {
            cancelled = true;
        };
    }, [checkKey, source?.image, effectiveLocale]);

    // Fallback：source 为 undefined 时（CriticalImageGate 预加载超时/失败），
    // 自行加载图片获取尺寸，触发懒解析提升
    useEffect(() => {
        if (source) return; // 已有 source，无需 fallback
        const lazy = getLazyRegistration(atlasId);
        if (!lazy) return; // 非懒注册，无法 fallback

        let cancelled = false;
        const candidates = getCardAtlasCandidateUrls(lazy.image, effectiveLocale);

        const tryFallback = (idx: number) => {
            if (idx >= candidates.length || cancelled) return;
            const url = candidates[idx];
            const img = new Image();
            img.onload = () => {
                if (cancelled) return;
                if (!hasUsableAtlasImage(img)) {
                    tryFallback(idx + 1);
                    return;
                }
                // 注册到预加载缓存，使 getCardAtlasSource 下次能解析成功
                markImageLoaded(lazy.image, effectiveLocale, img);
                markImageLoaded(url, undefined, img);
                // 重新尝试获取 source（此时缓存已有图片，懒解析应成功）
                const newSource = getCardAtlasSource(atlasId, effectiveLocale);
                if (newSource && !cancelled) {
                    setResolvedSource(newSource);
                    setActiveUrl(url);
                    setLoaded(true);
                }
            };
            img.onerror = () => tryFallback(idx + 1);
            img.src = url;
        };

        tryFallback(0);
        return () => { cancelled = true; };
    }, [source, atlasId, effectiveLocale]);

    if (!source) {
        // 显示 shimmer 占位而非 null，等待 fallback 加载完成
        const lazy = getLazyRegistration(atlasId);
        if (lazy) {
            return (
                <div
                    className={`atlas-shimmer ${className ?? ''}`}
                    title={title}
                    style={style}
                />
            );
        }
        return null;
    }

    const atlasStyle = computeSpriteStyle(index, source.config);
    const backgroundImage = activeUrl ? `url("${activeUrl}")` : '';

    return (
        <div
            className={`${effectiveLoaded ? '' : 'atlas-shimmer'} ${className ?? ''}`}
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
