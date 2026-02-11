/**
 * useFxBus — FX 事件调度 Hook
 *
 * 职责：
 * 1. 接收 FxEventInput，生成唯一 id，加入活跃队列
 * 2. 根据注册选项执行并发上限、防抖、安全超时
 * 3. 特效完成后从队列移除
 *
 * 替代原 `useBoardEffects()` hook，提供更通用的接口。
 */

import { useState, useCallback, useRef } from 'react';
import type { FxRegistry } from './FxRegistry';
import type { FxCue, FxContext, FxParams, FxEvent, FxEventInput } from './types';

// ============================================================================
// ID 生成
// ============================================================================

let _fxIdCounter = 0;

function generateFxId(): string {
  return `fx-${++_fxIdCounter}-${Date.now().toString(36)}`;
}

// ============================================================================
// Hook
// ============================================================================

export interface FxBus {
  /** 推入特效事件 */
  push: (cue: FxCue, ctx: FxContext, params?: FxParams) => string | null;
  /** 推入完整事件输入 */
  pushEvent: (input: FxEventInput) => string | null;
  /** 当前活跃特效 */
  activeEffects: FxEvent[];
  /** 移除指定特效 */
  removeEffect: (id: string) => void;
  /** 注册表引用（供 FxLayer 读取） */
  registry: FxRegistry;
}

export function useFxBus(registry: FxRegistry): FxBus {
  const [effects, setEffects] = useState<FxEvent[]>([]);

  // 防抖时间戳记录：cue → lastPushTime
  const debounceMapRef = useRef(new Map<FxCue, number>());
  // 安全超时定时器：id → timeoutId
  const timeoutsRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const removeEffect = useCallback((id: string) => {
    // 清理超时定时器
    const timer = timeoutsRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timeoutsRef.current.delete(id);
    }
    setEffects(prev => prev.filter(e => e.id !== id));
  }, []);

  const pushEvent = useCallback((input: FxEventInput): string | null => {
    const entry = registry.resolve(input.cue);
    if (!entry) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[FxBus] 未注册的 cue: "${input.cue}"`);
      }
      return null;
    }

    const { maxConcurrent, debounceMs, timeoutMs } = entry.options;

    // 防抖检查
    if (debounceMs > 0) {
      const now = Date.now();
      const lastPush = debounceMapRef.current.get(input.cue) ?? 0;
      if (now - lastPush < debounceMs) return null;
      debounceMapRef.current.set(input.cue, now);
    }

    const id = generateFxId();
    const event: FxEvent = { ...input, id };

    setEffects(prev => {
      // 并发上限检查
      if (maxConcurrent > 0) {
        const cueCurrent = prev.filter(e => e.cue === input.cue);
        if (cueCurrent.length >= maxConcurrent) {
          // 移除最早的同 cue 特效
          const oldest = cueCurrent[0];
          const timer = timeoutsRef.current.get(oldest.id);
          if (timer) {
            clearTimeout(timer);
            timeoutsRef.current.delete(oldest.id);
          }
          return [...prev.filter(e => e.id !== oldest.id), event];
        }
      }
      return [...prev, event];
    });

    // 安全超时
    if (timeoutMs > 0) {
      const timer = setTimeout(() => {
        timeoutsRef.current.delete(id);
        setEffects(prev => prev.filter(e => e.id !== id));
      }, timeoutMs);
      timeoutsRef.current.set(id, timer);
    }

    return id;
  }, [registry]);

  const push = useCallback((cue: FxCue, ctx: FxContext, params?: FxParams): string | null => {
    return pushEvent({ cue, ctx, params });
  }, [pushEvent]);

  return { push, pushEvent, activeEffects: effects, removeEffect, registry };
}
