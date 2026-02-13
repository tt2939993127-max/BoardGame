import React from 'react';
import type { ImgHTMLAttributes } from 'react';
import { getOptimizedImageUrls, isImagePreloaded } from '../../../core/AssetLoader';

type OptimizedImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
    src: string;
    fallbackSrc?: string;
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

export const OptimizedImage = ({ src, fallbackSrc, alt, onError, onLoad: onLoadProp, style: styleProp, placeholder = true, className, ...rest }: OptimizedImageProps) => {
    const [useFallback, setUseFallback] = React.useState(false);
    const [loaded, setLoaded] = React.useState(() => isImagePreloaded(src));
    const [errored, setErrored] = React.useState(false);
    const imgRef = React.useRef<HTMLImageElement>(null);

    const primaryUrls = getOptimizedImageUrls(src);
    const fallbackUrls = fallbackSrc ? getOptimizedImageUrls(fallbackSrc) : null;
    const activeUrls = useFallback && fallbackUrls ? fallbackUrls : primaryUrls;
    const isSvg = isSvgSource(activeUrls.webp);

    // 缓存命中时在绘制前标记已加载（避免闪烁）；源变化时重置
    const currentSrc = activeUrls.webp;
    React.useLayoutEffect(() => {
        if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) {
            setLoaded(true);
        } else if (isImagePreloaded(src)) {
            // 门禁已预加载，浏览器缓存尚未同步到 img 元素，保持 loaded
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
            // 无备选源，标记错误状态，隐藏破碎图标
            setErrored(true);
            setLoaded(true);
        }
        onError?.(event);
    };

    const showShimmer = placeholder && !loaded;

    // 合并样式：shimmer 背景 + 淡入
    // placeholder 开启时保持 opacity:1（让 shimmer 背景可见），关闭时用 opacity:0 隐藏
    // errored 时隐藏 img 避免浏览器破碎图标
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
