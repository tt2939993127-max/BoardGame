import React from 'react';
import type { ImgHTMLAttributes } from 'react';
import { useTranslation } from 'react-i18next';
import { getLocalizedImageUrls, getLocalizedLocalAssetPath, isImagePreloaded, markImageLoaded } from '../../../core/AssetLoader';

type OptimizedImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
    /** 原始资源路径（相对于游戏目录，如 dicethrone/images/...） */
    src: string;
    fallbackSrc?: string;
    /** 语言代码，可选，不传则自动从 i18next 获取当前语言 */
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

/** 指数退避自动重试配置 */
const AUTO_RETRY_MAX = 5;           // 最多自动重试 5 轮
const AUTO_RETRY_BASE_MS = 2000;    // 首次 2s
const AUTO_RETRY_MAX_MS = 30000;    // 上限 30s

/** 计算指数退避延迟（带 ±25% 抖动，避免多图同时重试雪崩） */
const getRetryDelay = (attempt: number) => {
    const base = Math.min(AUTO_RETRY_BASE_MS * 2 ** attempt, AUTO_RETRY_MAX_MS);
    const jitter = base * (0.75 + Math.random() * 0.5); // [0.75x, 1.25x]
    return Math.round(jitter);
};

/**
 * 判断 src 是否为真正的远端资源：
 * - /assets/... 与相对路径都视为本地资源链
 * - 指向当前页面同源 origin 的绝对 URL 也视为本地资源链
 * - 只有跨域 http/https 才按远端 CDN 处理
 */
const isRemoteUrl = (url: string) => {
    if (!/^https?:\/\//i.test(url)) return false;
    if (typeof window === 'undefined' || !window.location?.origin) return true;
    try {
        return new URL(url, window.location.href).origin !== window.location.origin;
    } catch {
        return true;
    }
};

/** 为 URL 追加重试参数，绕过浏览器对失败请求的缓存 */
const appendRetryParam = (url: string, retry: number) => {
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}retry=${retry}`;
};

export const OptimizedImage = ({
    src,
    fallbackSrc: _fallbackSrc,
    locale,
    alt,
    onError,
    onLoad: onLoadProp,
    onDragStart,
    style: styleProp,
    placeholder = true,
    className,
    draggable = false,
    ...rest
}: OptimizedImageProps) => {
    const { i18n } = useTranslation();
    const effectiveLocale = locale || i18n.language || 'zh-CN';
    const [fallbackLevel, setFallbackLevel] = React.useState(0);
    const preloaded = isImagePreloaded(src, effectiveLocale);
    const [loaded, setLoaded] = React.useState(() => preloaded);
    const [errored, setErrored] = React.useState(false);
    const [objectUrl, setObjectUrl] = React.useState<string | null>(null);
    const [localFetchDebug, setLocalFetchDebug] = React.useState('idle');
    const imgRef = React.useRef<HTMLImageElement>(null);
    /** 自动重试轮次（所有回退用尽后从 0 开始计数） */
    const autoRetryRef = React.useRef(0);
    const retryTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    /** 重置回退链，从 CDN 首选路径重新开始 */
    const resetFallbackChain = React.useCallback(() => {
        retryTimerRef.current = null;
        setFallbackLevel(0);
        setErrored(false);
        setLoaded(false);
    }, []);

    // CDN 国际化路径（包含语言回退）
    const localizedUrls = React.useMemo(() => {
        return getLocalizedImageUrls(src, effectiveLocale);
    }, [src, effectiveLocale]);
    const cdnUrl = localizedUrls.primary.webp;
    const cdnFallbackUrl = localizedUrls.fallback.webp; // 语言回退 URL

    // 本地降级路径（/assets/i18n/{locale}/...compressed/xxx.webp）
    const localUrl = React.useMemo(() => {
        if (!isRemoteUrl(cdnUrl)) return cdnUrl; // 已经是本地路径，无需再构造 fallback
        // 只有远端 URL 才需要从原始 src 构建本地国际化压缩路径
        const localBase = getLocalizedLocalAssetPath(src, effectiveLocale);
        const base = localBase.replace(/\.[^/.]+$/, '');
        const lastSlash = base.lastIndexOf('/');
        const dir = lastSlash >= 0 ? base.substring(0, lastSlash) : '';
        const filename = lastSlash >= 0 ? base.substring(lastSlash + 1) : base;
        if (dir.endsWith('/compressed') || dir === 'compressed') {
            return `${base}.webp`;
        }
        return dir ? `${dir}/compressed/${filename}.webp` : `compressed/${filename}.webp`;
    }, [cdnUrl, src, effectiveLocale]);

    const fallbackCandidates = React.useMemo(() => {
        const candidates: Array<{ url: string; label: string }> = [];
        const pushCandidate = (url: string, label: string) => {
            if (!url) return;
            if (candidates.some(candidate => candidate.url === url)) return;
            candidates.push({ url, label });
        };

        // 本地 /assets/... 主链路：只保留 primary + language fallback，
        // 不再套用远端 CDN 的 retry/local fallback 逻辑，避免把本地图片走歪。
        pushCandidate(cdnUrl, 'primary');
        pushCandidate(cdnFallbackUrl, 'language-fallback');
        if (isRemoteUrl(cdnUrl)) {
            pushCandidate(appendRetryParam(cdnUrl, 1), 'retry');
            pushCandidate(localUrl, 'local');
        }

        return candidates;
    }, [cdnFallbackUrl, cdnUrl, localUrl]);

    const currentCandidate = fallbackCandidates[Math.min(fallbackLevel, Math.max(fallbackCandidates.length - 1, 0))];
    const currentSrc = currentCandidate?.url ?? cdnUrl;
    const isLocalFallback = currentCandidate?.label === 'local';
    const isLocalPrimary = !isRemoteUrl(currentSrc);
    const renderedSrc = objectUrl ?? currentSrc;

    const isSvg = isSvgSource(renderedSrc);
    
    // 同步修正：如果 loaded 为 false 但缓存已就绪，立即同步为 true，
    // 避免 useLayoutEffect 异步更新导致的一帧 shimmer 闪烁
    const effectiveLoaded = loaded || preloaded;

    // src 或 locale 变化时完全重置
    React.useLayoutEffect(() => {
        setFallbackLevel(0);
        setErrored(false);
        autoRetryRef.current = 0;
        if (retryTimerRef.current) {
            clearTimeout(retryTimerRef.current);
            retryTimerRef.current = null;
        }
        if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) {
            setLoaded(true);
        } else if (isImagePreloaded(src, effectiveLocale)) {
            setLoaded(true);
        } else if (!isRemoteUrl(cdnUrl)) {
            // 本地主链路默认先按可显示处理，避免 /assets/... 资源被错误套进远端加载状态机后长时间黑屏。
            setLoaded(true);
        } else {
            setLoaded(false);
        }
    }, [src, effectiveLocale, cdnUrl]);

    // currentSrc 变化时（fallbackLevel 切换导致）检查新 URL 是否已缓存
    const prevSrcRef = React.useRef(currentSrc);
    React.useLayoutEffect(() => {
        if (prevSrcRef.current !== currentSrc) {
            prevSrcRef.current = currentSrc;
            setObjectUrl(null);
            setLocalFetchDebug('idle');
            if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) {
                setLoaded(true);
            } else if (isImagePreloaded(src, effectiveLocale)) {
                setLoaded(true);
            } else {
                setLoaded(false);
            }
            setErrored(false);
        }
    }, [currentSrc, src, effectiveLocale]);

    // 本地 /assets/... 资源：先 fetch 成 blob 再喂给 <img>，
    // 规避开发环境里部分 webp 在直接 <img src="/assets/..."> 链路上挂住的问题。
    React.useEffect(() => {
        if (!isLocalPrimary || isSvg) return undefined;
        let cancelled = false;
        let nextObjectUrl: string | null = null;
        setLocalFetchDebug('fetching');

        void (async () => {
            try {
                const response = await fetch(currentSrc, { credentials: 'same-origin' });
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                const blob = await response.blob();
                if (cancelled) return;
                setLoaded(false);
                nextObjectUrl = URL.createObjectURL(blob);
                setObjectUrl(nextObjectUrl);
                setLocalFetchDebug('blob-ready');
            } catch (error) {
                if (!cancelled) {
                    setObjectUrl(null);
                    setLocalFetchDebug(`fetch-error:${error instanceof Error ? error.message : 'unknown'}`);
                }
            }
        })();

        return () => {
            cancelled = true;
            if (nextObjectUrl) {
                URL.revokeObjectURL(nextObjectUrl);
            }
        };
    }, [currentSrc, isLocalPrimary, isSvg]);

    // 某些浏览器/资源组合下，img 已经拿到尺寸，但 onload 事件没有稳定触发；
    // 这会让组件一直停在 shimmer/黑底占位。这里补一个基于 DOM 实际状态的兜底收敛。
    React.useEffect(() => {
        if (loaded || errored) return undefined;
        let frameId = 0;
        let cancelled = false;

        const settleFromDom = () => {
            if (cancelled) return;
            const img = imgRef.current;
            if (img?.complete && img.naturalWidth > 0) {
                markImageLoaded(src, effectiveLocale, img);
                setLoaded(true);
                return;
            }
            frameId = window.requestAnimationFrame(settleFromDom);
        };

        frameId = window.requestAnimationFrame(settleFromDom);
        return () => {
            cancelled = true;
            if (frameId) {
                window.cancelAnimationFrame(frameId);
            }
        };
    }, [effectiveLocale, errored, loaded, renderedSrc, src]);

    const handleLoad: React.ReactEventHandler<HTMLImageElement> = (event) => {
        setLoaded(true);
        autoRetryRef.current = 0; // 加载成功，重置重试计数
        markImageLoaded(src, effectiveLocale, event.currentTarget);
        if (isLocalFallback) {
            console.warn('[OptimizedImage] CDN 不可用，已降级到本地资源:', src);
        }
        onLoadProp?.(event);
    };

    const handleError: React.ReactEventHandler<HTMLImageElement> = (event) => {
        console.error('[OptimizedImage] ❌ 图片加载失败:', {
            src,
            currentSrc,
            fallbackLevel,
            isCdn: isCdnUrl(cdnUrl),
            autoRetryCount: autoRetryRef.current,
            error: event.type
        });
        
        const hasMoreFallback = fallbackLevel + 1 < fallbackCandidates.length;
        if (!hasMoreFallback) {
            const attempt = autoRetryRef.current;
            if (attempt < AUTO_RETRY_MAX) {
                // 指数退避自动重试：重置回退链从头再来
                autoRetryRef.current = attempt + 1;
                const delay = getRetryDelay(attempt);
                console.warn(`[OptimizedImage] 所有回退已用尽，${delay}ms 后自动重试（第 ${attempt + 1}/${AUTO_RETRY_MAX} 轮）:`, src);
                retryTimerRef.current = setTimeout(resetFallbackChain, delay);
            } else {
                // 超过最大重试次数，最终放弃
                console.error('[OptimizedImage] 加载失败（已达最大重试次数）:', src);
                setErrored(true);
                setLoaded(true);
                onError?.(event);
            }
            return;
        }
        // 还有回退层级，推进到下一级
        const nextLevel = fallbackLevel + 1;
        console.warn(`[OptimizedImage] 加载失败，尝试回退 level ${nextLevel} (${fallbackCandidates[nextLevel]?.label ?? 'unknown'}):`, src);
        setFallbackLevel(nextLevel);
    };

    // 监听网络恢复事件：断网恢复后立即重试，不等定时器
    React.useEffect(() => {
        if (!errored && autoRetryRef.current === 0) return; // 没有失败过，不需要监听
        const handleOnline = () => {
            if (autoRetryRef.current > 0 && autoRetryRef.current < AUTO_RETRY_MAX) {
                console.info('[OptimizedImage] 网络恢复，立即重试:', src);
                if (retryTimerRef.current) {
                    clearTimeout(retryTimerRef.current);
                }
                resetFallbackChain();
            }
        };
        window.addEventListener('online', handleOnline);
        return () => window.removeEventListener('online', handleOnline);
    }, [errored, src, resetFallbackChain]);

    // 组件卸载时清理定时器
    React.useEffect(() => {
        return () => {
            if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
        };
    }, []);

    const showShimmer = placeholder && !effectiveLoaded;

    const imgStyle: React.CSSProperties = {
        ...styleProp,
        ...(showShimmer ? SHIMMER_BG : {}),
        transition: [styleProp?.transition, 'opacity 0.3s ease'].filter(Boolean).join(', '),
        opacity: errored ? 0 : effectiveLoaded ? (styleProp?.opacity ?? 1) : (placeholder ? 1 : 0),
    };

    const handleDragStart: React.DragEventHandler<HTMLImageElement> = (event) => {
        if (draggable !== true) {
            event.preventDefault();
        }
        onDragStart?.(event);
    };

    if (isSvg) {
        return (
            <img
                ref={imgRef}
                src={renderedSrc}
                alt={alt ?? ''}
                draggable={draggable}
                onDragStart={handleDragStart}
                onError={handleError}
                onLoad={handleLoad}
                style={imgStyle}
                className={className}
                data-debug-current-src={currentSrc}
                data-debug-rendered-src={renderedSrc}
                data-debug-object-url={objectUrl ?? ''}
                data-debug-local-fetch={localFetchDebug}
                {...rest}
            />
        );
    }

    return (
        <img
            ref={imgRef}
            src={renderedSrc}
            alt={alt ?? ''}
            draggable={draggable}
            onDragStart={handleDragStart}
            onError={handleError}
            onLoad={handleLoad}
            style={imgStyle}
            className={className}
            data-debug-current-src={currentSrc}
            data-debug-rendered-src={renderedSrc}
            data-debug-object-url={objectUrl ?? ''}
            data-debug-local-fetch={localFetchDebug}
            {...rest}
        />
    );
};
