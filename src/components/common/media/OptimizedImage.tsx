import React from 'react';
import type { ImgHTMLAttributes } from 'react';
import { getOptimizedImageUrls, getLocalizedImageUrls, isImagePreloaded, isLocalizedImagePreloaded, markImageLoaded } from '../../../core/AssetLoader';

type OptimizedImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
    /** 原始资源路径（不含 locale 前缀），组件内部自动处理 locale 转换 */
    src: string;
    fallbackSrc?: string;
    /** 语言代码，传入后自动尝试 localized 路径并回退到原始路径 */
    locale?: string;
    /** 是否显示加载占位 shimmer，默认 true */
    placeholder?: boolean;
};

const isSvgSource = (src: string) => /^data:image\/svg\+xml[;,]/i.test(src) || /\.svg(\?|#|$)/i.test(src);

/** 加载中 shimmer 背景样式（CSS background-position 动画，零额外 DOM） */
export const SHIMMER_BG: React.CSSProperties = {
    backgroundColor: 'rgba(255,255,255,0.08)',
    backgroundImage: 'linear-gradient(100deg, rgba(255,255,255,0.08) 40%, rgba(255,255,255,0.22) 50%, rgba(255,255,255,0.08) 60%)',
    backgroundSize: '200% 100%',
    animation: 'img-shimmer 1.5s linear infinite',
};

/**
 * 回退层级（从高到低）：
 * 0 = localized 路径（locale 存在时）或原始路径（无 locale）
 * 1 = 原始路径（locale 存在时的自动回退）
 * 2 = fallbackSrc（显式指定的备选源）
 */
export const OptimizedImage = ({ src, fallbackSrc, locale, alt, onError, onLoad: onLoadProp, style: styleProp, placeholder = true, className, ...rest }: OptimizedImageProps) => {
    // 如果有 locale 但 localized 路径未预加载而原始路径已预加载，
    // 直接从 fallbackLevel=1（原始路径）开始，避免无效 404
    const skipLocale = Boolean(locale) && !isLocalizedImagePreloaded(src, locale!) && isImagePreloaded(src);
    const [fallbackLevel, setFallbackLevel] = React.useState(skipLocale ? 1 : 0);
    const preloaded = isImagePreloaded(src, locale) || isImagePreloaded(src);
    const [loaded, setLoaded] = React.useState(() => preloaded);
    const [errored, setErrored] = React.useState(false);
    const imgRef = React.useRef<HTMLImageElement>(null);

    // DEBUG: 组件渲染时的缓存命中和 shimmer 状态
    const debugOnce = React.useRef(false);
    if (!debugOnce.current) {
        debugOnce.current = true;
        console.warn(`[OptimizedImage] 首次渲染 src=${src} locale=${locale} preloaded=${preloaded} → loaded=${preloaded} showShimmer=${!preloaded}`);
    }

    // 预计算所有层级的 URL
    const localizedUrls = locale ? getLocalizedImageUrls(src, locale) : null;
    const level0Urls = localizedUrls ? localizedUrls.primary : getOptimizedImageUrls(src);
    const level1Urls = localizedUrls ? localizedUrls.fallback : null;
    const level2Urls = fallbackSrc ? getOptimizedImageUrls(fallbackSrc) : null;

    // 根据当前 fallbackLevel 选择活跃 URL
    let activeUrls = level0Urls;
    if (fallbackLevel === 1 && level1Urls) {
        activeUrls = level1Urls;
    } else if (fallbackLevel >= 2 && level2Urls) {
        activeUrls = level2Urls;
    } else if (fallbackLevel === 1 && !level1Urls && level2Urls) {
        activeUrls = level2Urls;
    }

    const isSvg = isSvgSource(activeUrls.webp);
    const currentSrc = activeUrls.webp;

    // src 或 locale 变化时完全重置
    React.useLayoutEffect(() => {
        const skip = Boolean(locale) && !isImagePreloaded(src, locale) && isImagePreloaded(src);
        setFallbackLevel(skip ? 1 : 0);
        setErrored(false);
        if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) {
            setLoaded(true);
        } else if (isImagePreloaded(src, locale) || isImagePreloaded(src)) {
            setLoaded(true);
        } else {
            setLoaded(false);
        }
    }, [src, locale]);

    // currentSrc 变化时（fallbackLevel 切换导致）检查新 URL 是否已缓存
    const prevSrcRef = React.useRef(currentSrc);
    React.useLayoutEffect(() => {
        if (prevSrcRef.current !== currentSrc) {
            prevSrcRef.current = currentSrc;
            if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) {
                setLoaded(true);
            } else if (isImagePreloaded(src, locale)) {
                // fallback URL 已在预加载缓存中，不显示 shimmer
                setLoaded(true);
            } else {
                setLoaded(false);
            }
            setErrored(false);
        }
    }, [currentSrc, src, locale]);

    const handleLoad: React.ReactEventHandler<HTMLImageElement> = (event) => {
        setLoaded(true);
        // 将成功加载的图片注册到缓存，同一图片的其他实例（如放大预览）可跳过 shimmer
        markImageLoaded(src, locale);
        onLoadProp?.(event);
    };

    const handleError: React.ReactEventHandler<HTMLImageElement> = (event) => {
        // DEBUG: 图片加载失败详情
        console.warn(`[OptimizedImage] onError src=${src} fallbackLevel=${fallbackLevel} currentSrc=${currentSrc}`);
        if (fallbackLevel === 0 && level1Urls) {
            // localized 失败 → 回退到原始路径
            setFallbackLevel(1);
        } else if (fallbackLevel <= 1 && level2Urls) {
            // 原始路径也失败 → 回退到 fallbackSrc
            setFallbackLevel(2);
        } else {
            // 全部失败
            setErrored(true);
            setLoaded(true);
        }
        onError?.(event);
    };

    const showShimmer = placeholder && !loaded;

    const imgStyle: React.CSSProperties = {
        ...styleProp,
        ...(showShimmer ? SHIMMER_BG : {}),
        transition: [styleProp?.transition, 'opacity 0.3s ease'].filter(Boolean).join(', '),
        opacity: errored ? 0 : loaded ? (styleProp?.opacity ?? 1) : (placeholder ? 1 : 0),
    };

    if (isSvg) {
        return <img ref={imgRef} src={activeUrls.webp} alt={alt ?? ''} onError={handleError} onLoad={handleLoad} style={imgStyle} className={className} {...rest} />;
    }

    return (
        <picture>
            <source type="image/avif" srcSet={activeUrls.avif} />
            <source type="image/webp" srcSet={activeUrls.webp} />
            <img ref={imgRef} src={activeUrls.webp} alt={alt ?? ''} onError={handleError} onLoad={handleLoad} style={imgStyle} className={className} {...rest} />
        </picture>
    );
};
