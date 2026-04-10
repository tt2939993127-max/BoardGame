import React from 'react';
import { createScopedLogger } from '../../../lib/logger';
import {
    DICE_BG_SIZE,
    getDiceFaceFallbackSkin,
    getDiceSpritePosition,
    getDiceSpriteUrls,
} from './assets';

export interface Dice3DProps {
    /** 骰子值 (1-6) */
    value: number;
    /** 是否正在播放滚动动画 */
    isRolling: boolean;
    /** 骰子大小 (CSS 单位) */
    size?: string;
    /** 语言 */
    locale?: string;
    /** 动画序号，用于错峰滚动 */
    index?: number;
    /** 变体：default 用于骰盘，spotlight 用于特写 */
    variant?: 'default' | 'spotlight';
    /** 角色 ID，用于回退路径和兜底字形 */
    characterId?: string;
    /** 骰子定义 ID，优先从定义读取 spriteSheet */
    definitionId?: string;
}

type SpriteLoadState = 'loading' | 'ready' | 'error';
interface SpriteState {
    status: SpriteLoadState;
    url?: string;
}
const dice3DLogger = createScopedLogger('dicethrone:dice3d');
const spriteProbeStatusCache = new Map<string, 'ready' | 'error'>();
const spriteProbePromiseCache = new Map<string, Promise<'ready' | 'error'>>();
const DIRECT_IMAGE_URL_RE = /^(?:data:|blob:)/i;
const DICE3D_STYLE_ELEMENT_ID = 'dicethrone-dice3d-styles';
const DICE3D_STYLE_TEXT = `
.dice3d-perspective { perspective: 1000px; }
.dice3d-preserve-3d { transform-style: preserve-3d; }
.dice3d-backface-hidden { backface-visibility: hidden; }
@keyframes dice3d-tumble {
    0% { transform: rotateX(0) rotateY(0); }
    100% { transform: rotateX(1440deg) rotateY(1440deg); }
}
@keyframes dice3d-bonus-tumble {
    0% { transform: rotateX(0) rotateY(0); }
    100% { transform: rotateX(1440deg) rotateY(1440deg); }
}
.animate-dice3d-tumble { animation: dice3d-tumble 1s linear infinite; }
.animate-dice3d-bonus-tumble { animation: dice3d-bonus-tumble 0.8s linear infinite; }
`;

const isRemoteUrl = (url: string) => {
    if (!/^https?:\/\//i.test(url)) return false;
    if (typeof window === 'undefined' || !window.location?.origin) return true;
    try {
        return new URL(url, window.location.href).origin !== window.location.origin;
    } catch {
        return true;
    }
};

const shouldLoadViaBlob = (candidateUrl: string) => (
    !DIRECT_IMAGE_URL_RE.test(candidateUrl) && !isRemoteUrl(candidateUrl)
);

const probeSpriteUrl = (candidateUrl: string) => {
    const cachedStatus = spriteProbeStatusCache.get(candidateUrl);
    if (cachedStatus) {
        return Promise.resolve(cachedStatus);
    }

    const existingPromise = spriteProbePromiseCache.get(candidateUrl);
    if (existingPromise) {
        return existingPromise;
    }

    const probePromise = new Promise<'ready' | 'error'>((resolve) => {
        const finalize = (result: 'ready' | 'error') => {
            spriteProbeStatusCache.set(candidateUrl, result);
            spriteProbePromiseCache.delete(candidateUrl);
            resolve(result);
        };

        try {
            const image = new Image();
            image.decoding = 'async';
            image.onload = () => finalize('ready');
            image.onerror = () => finalize('error');
            image.src = candidateUrl;

            if (image.complete) {
                queueMicrotask(() => finalize(image.naturalWidth > 0 ? 'ready' : 'error'));
            }
        } catch {
            finalize('error');
        }
    });

    spriteProbePromiseCache.set(candidateUrl, probePromise);
    return probePromise;
};

const loadLocalSpriteBlobUrl = async (candidateUrl: string) => {
    if (typeof fetch === 'undefined' || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
        return { status: 'error' as const };
    }

    try {
        const response = await fetch(candidateUrl, { credentials: 'same-origin' });
        if (!response.ok) {
            return { status: 'error' as const };
        }
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        const probeResult = await probeSpriteUrl(objectUrl);
        if (probeResult !== 'ready') {
            URL.revokeObjectURL(objectUrl);
            return { status: 'error' as const };
        }
        return {
            status: 'ready' as const,
            url: objectUrl,
        };
    } catch {
        return { status: 'error' as const };
    }
};

/** 3D 骰子组件 */
export const Dice3D = ({
    value,
    isRolling,
    size = '4.5vw',
    locale,
    index = 0,
    variant = 'default',
    characterId = 'monk',
    definitionId,
}: Dice3DProps) => {
    const translateZ = `calc(${size} / 2)`;
    const localObjectUrlRef = React.useRef<string | null>(null);

    const faces = [
        { id: 1, trans: `translateZ(${translateZ})` },
        { id: 6, trans: `rotateY(180deg) rotateZ(180deg) translateZ(${translateZ})` },
        { id: 3, trans: `rotateY(90deg) translateZ(${translateZ})` },
        { id: 4, trans: `rotateY(-90deg) translateZ(${translateZ})` },
        { id: 2, trans: `rotateX(90deg) translateZ(${translateZ})` },
        { id: 5, trans: `rotateX(-90deg) translateZ(${translateZ})` },
    ];

    const spriteUrls = React.useMemo(
        () => getDiceSpriteUrls(definitionId, characterId, locale),
        [characterId, definitionId, locale],
    );
    const [spriteState, setSpriteState] = React.useState<SpriteState>(() => {
        const initialUrl = spriteUrls[0];
        const cachedStatus = initialUrl ? spriteProbeStatusCache.get(initialUrl) : undefined;
        if (cachedStatus === 'ready' && initialUrl) {
            return { status: 'ready', url: initialUrl };
        }
        if (cachedStatus === 'error') {
            return { status: 'error', url: undefined };
        }
        return {
            status: spriteUrls.length > 0 ? 'loading' : 'error',
            url: initialUrl,
        };
    });

    const clearLocalObjectUrl = React.useCallback(() => {
        if (localObjectUrlRef.current) {
            URL.revokeObjectURL(localObjectUrlRef.current);
            localObjectUrlRef.current = null;
        }
    }, []);

    React.useEffect(() => {
        if (typeof document === 'undefined') return;
        if (document.getElementById(DICE3D_STYLE_ELEMENT_ID)) return;
        const style = document.createElement('style');
        style.id = DICE3D_STYLE_ELEMENT_ID;
        style.textContent = DICE3D_STYLE_TEXT;
        document.head.appendChild(style);
    }, []);

    React.useEffect(() => {
        dice3DLogger.debug('sprite-candidates', {
            definitionId: definitionId ?? null,
            characterId,
            locale: locale ?? null,
            spriteUrls,
        });
    }, [characterId, definitionId, locale, spriteUrls]);

    React.useEffect(() => {
        if (!spriteUrls.length) {
            dice3DLogger.warn('sprite-candidates-empty', {
                definitionId: definitionId ?? null,
                characterId,
                locale: locale ?? null,
            });
            setSpriteState({ status: 'error', url: undefined });
            return undefined;
        }

        if (typeof Image === 'undefined') {
            dice3DLogger.warn('image-constructor-unavailable', {
                definitionId: definitionId ?? null,
                characterId,
                locale: locale ?? null,
                selectedUrl: spriteUrls[0],
            });
            clearLocalObjectUrl();
            setSpriteState({ status: 'ready', url: spriteUrls[0] });
            return undefined;
        }

        const firstCachedUrl = spriteUrls.find((url) => !shouldLoadViaBlob(url) && spriteProbeStatusCache.get(url) === 'ready');
        if (firstCachedUrl) {
            clearLocalObjectUrl();
            setSpriteState({ status: 'ready', url: firstCachedUrl });
            return undefined;
        }

        clearLocalObjectUrl();
        setSpriteState({ status: 'loading', url: undefined });
        let cancelled = false;

        const tryLoad = async (index: number): Promise<void> => {
            if (cancelled) return;
            if (index >= spriteUrls.length) {
                dice3DLogger.error('sprite-all-failed', {
                    definitionId: definitionId ?? null,
                    characterId,
                    locale: locale ?? null,
                    spriteUrls,
                });
                setSpriteState({ status: 'error', url: undefined });
                return;
            }

            const candidateUrl = spriteUrls[index];
            dice3DLogger.debug('sprite-probe-start', {
                index,
                candidateUrl,
                viaBlob: shouldLoadViaBlob(candidateUrl),
            });

            const loaded = shouldLoadViaBlob(candidateUrl)
                ? await loadLocalSpriteBlobUrl(candidateUrl)
                : { status: await probeSpriteUrl(candidateUrl), url: candidateUrl };
            if (cancelled) return;

            if (loaded.status === 'ready' && loaded.url) {
                dice3DLogger.info('sprite-probe-success', {
                    index,
                    candidateUrl,
                    resolvedUrl: loaded.url,
                });
                clearLocalObjectUrl();
                if (shouldLoadViaBlob(candidateUrl)) {
                    localObjectUrlRef.current = loaded.url;
                }
                setSpriteState({ status: 'ready', url: loaded.url });
                return;
            }

            dice3DLogger.warn('sprite-probe-fail', {
                index,
                candidateUrl,
            });
            await tryLoad(index + 1);
        };
        void tryLoad(0);

        return () => {
            cancelled = true;
            clearLocalObjectUrl();
        };
    }, [characterId, clearLocalObjectUrl, definitionId, locale, spriteUrls]);

    React.useEffect(() => {
        dice3DLogger.debug('sprite-render-state', {
            definitionId: definitionId ?? null,
            characterId,
            locale: locale ?? null,
            spriteLoadState: spriteState.status,
            resolvedSpriteUrl: spriteState.url ?? null,
        });
    }, [characterId, definitionId, locale, spriteState.status, spriteState.url]);

    const getFinalTransform = (val: number) => {
        switch (val) {
            case 1: return 'rotateX(0deg) rotateY(0deg)';
            case 6: return 'rotateX(180deg) rotateY(0deg)';
            case 2: return 'rotateX(-90deg) rotateY(0deg)';
            case 5: return 'rotateX(90deg) rotateY(0deg)';
            case 3: return 'rotateX(0deg) rotateY(-90deg)';
            case 4: return 'rotateX(0deg) rotateY(90deg)';
            default: return 'rotateY(0deg)';
        }
    };

    const isSpotlight = variant === 'spotlight';
    const resolvedSpriteUrl = spriteState.url;
    const isSpriteReady = spriteState.status === 'ready' && Boolean(resolvedSpriteUrl);
    const animationClass = isSpotlight ? 'animate-dice3d-bonus-tumble' : 'animate-dice3d-tumble';
    const borderRadius = isSpotlight ? 'rounded-[1vw]' : 'rounded-[0.5vw]';
    const borderStyle = isSpotlight ? 'border-2 border-slate-600/50' : 'border border-slate-700/50';
    const boxShadow = isSpotlight ? 'inset 0 0 2vw rgba(0,0,0,0.8)' : 'inset 0 0 1vw rgba(0,0,0,0.8)';
    const transitionDuration = isSpotlight ? '600ms' : '1000ms';

    return (
        <div
            className="relative dice3d-perspective"
            style={{ width: size, height: size }}
            data-testid="dice-3d"
            data-sprite-ready={isSpriteReady ? 'true' : 'false'}
            data-definition-id={definitionId ?? ''}
            data-sprite-candidates={String(spriteUrls.length)}
            data-sprite-url={resolvedSpriteUrl ?? ''}
        >
            <div
                className={`relative w-full h-full dice3d-preserve-3d ${isRolling ? animationClass : ''}`}
                style={{
                    transform: isRolling
                        ? `rotateX(${720 + index * 90}deg) rotateY(${720 + index * 90}deg)`
                        : getFinalTransform(value),
                    transition: isRolling ? 'none' : `transform ${transitionDuration} ease-out`,
                }}
            >
                {faces.map((face) => {
                    const { xPos, yPos } = getDiceSpritePosition(face.id);
                    const needsFlip = face.id === 1 || face.id === 6;
                    const faceTransform = needsFlip ? `${face.trans} rotateZ(180deg)` : face.trans;
                    const fallbackSkin = getDiceFaceFallbackSkin(face.id, definitionId, characterId);

                    return (
                        <div
                            key={face.id}
                            className={`absolute inset-0 flex items-center justify-center bg-slate-900 ${borderRadius} dice3d-backface-hidden ${borderStyle} shadow-inner overflow-hidden`}
                            style={{
                                transform: faceTransform,
                                backgroundImage: isSpriteReady && resolvedSpriteUrl ? `url("${resolvedSpriteUrl}")` : undefined,
                                backgroundSize: isSpriteReady ? DICE_BG_SIZE : undefined,
                                backgroundPosition: isSpriteReady ? `${xPos}% ${yPos}%` : undefined,
                                background: isSpriteReady ? undefined : fallbackSkin.faceBackground,
                                borderColor: isSpriteReady ? undefined : fallbackSkin.faceBorder,
                                boxShadow,
                                imageRendering: 'auto',
                            }}
                            data-face-id={face.id}
                            data-face-symbol={isSpriteReady ? undefined : fallbackSkin.faceId ?? String(face.id)}
                            data-face-fallback={isSpriteReady ? 'false' : 'true'}
                        >
                            {!isSpriteReady && (
                                <>
                                    <span
                                        className="select-none font-black leading-none"
                                        style={{
                                            color: fallbackSkin.textColor,
                                            textShadow: fallbackSkin.textShadow,
                                            fontSize: isSpotlight ? '42%' : '36%',
                                            letterSpacing: '0.02em',
                                        }}
                                    >
                                        {fallbackSkin.glyph}
                                    </span>
                                    <span
                                        className="absolute right-[10%] top-[10%] flex min-w-[24%] items-center justify-center rounded-full border px-[0.12em] py-[0.05em] text-center font-bold leading-none"
                                        style={{
                                            background: fallbackSkin.badgeBackground,
                                            borderColor: fallbackSkin.badgeBorder,
                                            color: fallbackSkin.captionColor,
                                            fontSize: isSpotlight ? '18%' : '16%',
                                            boxShadow: '0 2px 8px rgba(15,23,42,0.28)',
                                        }}
                                    >
                                        {fallbackSkin.label}
                                    </span>
                                </>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Dice3D;
