import React from 'react';
import type { ImgHTMLAttributes } from 'react';
import { getOptimizedImageUrls, getLocalizedImageUrls, isImagePreloaded } from '../../../core/AssetLoader';

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

export const OptimizedImage = ({ src, fallbackSrc, locale, alt, onError, onLoad: onLoadProp, style: styleProp, placeholder = true, className, ...rest }: OptimizedImageProps) => {
    const [useFallback, setUseFallback] = React.useState(false);
    // 预加载缓存以原始路径为 key，所以用 src（原始路径）检查
    const [loaded, setLoaded] = React.useState(() => isImagePreloaded(src));
    const [errored, setErrored] = React.useState(false);
    const imgRef = React.useRef<HTMLImageElement>(null);

    // 生成 localized + 原始的 URL 集合
    const localizedUrls = locale ? getLocalizedImageUrls(src, locale) : null;
    const primaryUrls = localizedUrls ? localizedUrls.primary : getOptimizedImageUrls(src);
    const originalUrls = localizedUrls ? localizedUrls.fallback : null;
    const fallbackUrls = fallbackSrc ? getOptimizedImageUrls(fallbackSrc) : null;

    // 活跃 URL：优先 localized → 原始 → fallbackSrc
    const activeUrls = useFallback && fallbackUrls ? fallbackUrls : primaryUrls;
    const isSvg = isSvgSource(activeUrls.webp);

    const currentSrc = activeUrls.webp;
    React.useLayoutEffect(() => {
        if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) {
            setLoaded(true);
        } else if (isImagePreloaded(src)) {
            setLoaded(true);
        } else {
            setLoaded(false);
        }
        setErrored(false);
    }, [currentSrc, src]);

    const handleLoad: React.ReactEventHandler<HTMLImageElement> = (event) => {
        setLoaded(true);
        onLoadProp?.(event);
    };
    const handleError: React.ReactEventHandler<HTMLImageElement> = (event) => {
        if (fallbackUrls && !useFallback) {
            setUseFallback(true);
        } else {
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

    // 构建 <source> 链：localized avif → localized webp → 原始 avif → 原始 webp
    return (
        <picture>
            <source type="image/avif" srcSet={activeUrls.avif} />
            <source type="image/webp" srcSet={activeUrls.webp} />
            {originalUrls && originalUrls.avif !== activeUrls.avif && (
                <source type="image/avif" srcSet={originalUrls.avif} />
            )}
            {originalUrls && originalUrls.webp !== activeUrls.webp && (
                <source type="image/webp" srcSet={originalUrls.webp} />
            )}
            <img ref={imgRef} src={activeUrls.webp} alt={alt ?? ''} onError={handleError} onLoad={handleLoad} style={imgStyle} className={className} {...rest} />
        </picture>
    );
};
