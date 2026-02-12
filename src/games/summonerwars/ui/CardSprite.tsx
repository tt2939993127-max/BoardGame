/**
 * 召唤师战争 - 卡牌精灵图组件
 * 使用 CardAtlas 配置精确裁切精灵图
 */

import React, { useState, useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import { getSpriteAtlasSource, getSpriteAtlasStyle, getFrameAspectRatio } from './cardAtlas';

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
  const [loaded, setLoaded] = useState(false);
  const imageUrlRef = useRef<string>('');

  // 预加载图片并监听加载状态
  useEffect(() => {
    if (!source) {
      setLoaded(true);
      return;
    }

    const imageUrl = source.image;
    
    // 如果图片 URL 没变，不重新加载
    if (imageUrlRef.current === imageUrl && loaded) {
      return;
    }

    imageUrlRef.current = imageUrl;
    setLoaded(false);

    const img = new Image();
    img.onload = () => setLoaded(true);
    img.onerror = () => setLoaded(true); // 加载失败也标记为完成，避免一直显示占位
    img.src = imageUrl;

    // 如果图片已在缓存中，立即标记为已加载
    if (img.complete) {
      setLoaded(true);
    }
  }, [source, loaded]);

  if (!source) {
    return <div className={`bg-slate-700 ${className}`} style={style} />;
  }

  const atlasStyle = getSpriteAtlasStyle(frameIndex, source.config);
  const aspectRatio = getFrameAspectRatio(frameIndex, source.config);

  return (
    <div
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
