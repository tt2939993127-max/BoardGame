import React from 'react';
import type { ImgHTMLAttributes } from 'react';
import { getOptimizedImageUrls } from '../../../core/AssetLoader';

type OptimizedImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
    src: string;
    fallbackSrc?: string;
};

const isSvgSource = (src: string) => /^data:image\/svg\+xml[;,]/i.test(src) || /\.svg(\?|#|$)/i.test(src);

export const OptimizedImage = ({ src, fallbackSrc, alt, onError, ...rest }: OptimizedImageProps) => {
    const [useFallback, setUseFallback] = React.useState(false);
    const primaryUrls = getOptimizedImageUrls(src);
    const fallbackUrls = fallbackSrc ? getOptimizedImageUrls(fallbackSrc) : null;
    const activeUrls = useFallback && fallbackUrls ? fallbackUrls : primaryUrls;
    const isSvg = isSvgSource(activeUrls.webp);
    const handleError: React.ReactEventHandler<HTMLImageElement> = (event) => {
        if (fallbackUrls && !useFallback) {
            setUseFallback(true);
        }
        onError?.(event);
    };
    if (isSvg) {
        return <img src={activeUrls.webp} alt={alt ?? ''} onError={handleError} {...rest} />;
    }
    return (
        <picture>
            <source type="image/avif" srcSet={activeUrls.avif} />
            <source type="image/webp" srcSet={activeUrls.webp} />
            <img src={activeUrls.webp} alt={alt ?? ''} onError={handleError} {...rest} />
        </picture>
    );
};
