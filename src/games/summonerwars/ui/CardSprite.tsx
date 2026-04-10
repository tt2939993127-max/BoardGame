/**
 * 召唤师战争 - 卡牌精灵图组件
 * 使用 CardAtlas 配置精确裁切精灵图
 */

import React, { useState, useEffect } from 'react';
import type { CSSProperties } from 'react';
import { getSpriteAtlasSource, getSpriteAtlasStyle, getFrameAspectRatio } from './cardAtlas';
import { isImagePreloaded, onImageReady } from '../../../core/AssetLoader';

export interface CardSpriteProps {
  /** 精灵图源 ID */
  atlasId: string;
  /** 帧索引 */
  frameIndex: number;
  /** 额外 CSS 类名 */
  className?: string;
  /** 额外样式 */
  style?: CSSProperties;
}

/** 加载中 shimmer 背景样式 */
const SHIMMER_BG: CSSProperties = {
  backgroundColor: 'rgba(255,255,255,0.08)',
  backgroundImage: 'linear-gradient(100deg, rgba(255,255,255,0.08) 40%, rgba(255,255,255,0.22) 50%, rgba(255,255,255,0.08) 60%)',
  backgroundSize: '200% 100%',
  animation: 'img-shimmer 1.5s linear infinite',
};

/** 卡牌精灵图组件 */
export const CardSprite: React.FC<CardSpriteProps> = ({
  atlasId,
  frameIndex,
  className = '',
  style,
}) => {
  const source = getSpriteAtlasSource(atlasId);
  const imageUrl = source?.image ?? '';
  const preloaded = !source || isImagePreloaded(imageUrl);
  const [loadedImageUrl, setLoadedImageUrl] = useState(preloaded ? imageUrl : '');
  const loaded = !source || preloaded || loadedImageUrl === imageUrl;

  // 预加载图片并监听加载状态
  useEffect(() => {
    if (!source) {
      return;
    }
    if (isImagePreloaded(imageUrl)) {
      return;
    }
    let cancelled = false;

    const img = new Image();
    img.onload = () => {
      if (!cancelled) {
        setLoadedImageUrl(imageUrl);
      }
    };
    img.onerror = () => {
      if (!cancelled) {
        setLoadedImageUrl(imageUrl);
      }
    };
    img.src = imageUrl;

    if (img.complete) {
      queueMicrotask(() => {
        if (!cancelled) {
          setLoadedImageUrl(imageUrl);
        }
      });
    }

    return () => {
      cancelled = true;
    };
  }, [imageUrl, source]);

  useEffect(() => {
    if (!source) {
      return;
    }

    return onImageReady((url) => {
      if (url !== imageUrl || !isImagePreloaded(url)) {
        return;
      }
      setLoadedImageUrl(url);
    });
  }, [imageUrl, source]);

  if (!source) {
    return <div className={`bg-slate-700 ${className}`} style={style} />;
  }

  const atlasStyle = getSpriteAtlasStyle(frameIndex, source.config);
  const aspectRatio = getFrameAspectRatio(frameIndex, source.config);

  return (
    <div
      data-card-sprite="true"
      data-image-loaded={loaded ? 'true' : 'false'}
      data-atlas-id={atlasId}
      data-frame-index={frameIndex}
      className={className}
      style={{
        aspectRatio: `${aspectRatio}`,
        backgroundImage: loaded ? `url(${source.image})` : 'none',
        backgroundRepeat: 'no-repeat',
        ...atlasStyle,
        ...(loaded ? {} : SHIMMER_BG),
        transition: 'opacity 0.3s ease',
        opacity: loaded ? 1 : 0.6,
        ...style,
      }}
    />
  );
};

export default CardSprite;
