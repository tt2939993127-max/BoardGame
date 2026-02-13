/**
 * useFxBus — FX 事件调度 Hook
 *
 * 职责：
 * 1. 接收 FxEventInput，生成唯一 id，加入活跃队列
 * 2. 根据注册选项执行并发上限、防抖、安全超时
 * 3. 特效完成后从队列移除
 * 4. 自动触发反馈包中 timing='immediate' 的音效和震动
 *
 * 替代原 `useBoardEffects()` hook，提供更通用的接口。
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { FxRegistry } from './FxRegistry';
import type { FxCue, FxContext, FxParams, FxEvent, FxEventInput } from './types';
import { flushRegisteredShaders } from './shader/ShaderPrecompile';
import { resolveDevFlag } from '../env';

// ============================================================================
// ID 生成
// ============================================================================

let _fxIdCounter = 0;

function generateFxId(): string {
  return `fx-${++_fxIdCounter}-${Date.now().toString(36)}`;
}

// ============================================================================
// 反馈回调类型
// ============================================================================

/** 音效播放回调 */
export type FxSoundPlayer = (key: string) => void;

/** 震动触发回调 */
export type FxShakeTrigger = (intensity: 'normal' | 'strong', type: 'impact' | 'hit') => void;

// ============================================================================
// Hook
// ============================================================================

export interface FxBusOptions {
  /** 音效播放函数（由游戏层注入） */
  playSound?: FxSoundPlayer;
  /** 震动触发函数（由游戏层注入） */
  triggerShake?: FxShakeTrigger;
}

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
  /** 触发指定事件的 on-impact 反馈（由 FxLayer 在渲染器 onImpact 时调用） */
  fireImpact: (id: string) => void;
}

export function useFxBus(registry: FxRegistry, options?: FxBusOptions): FxBus {
  const [effects, setEffects] = useState<FxEvent[]>([]);
  // 同步 ref 用于 fireImpact 查找事件上下文（避免闭包过期）
  const effectsRef = useRef<FxEvent[]>([]);
  effectsRef.current = effects;

  // 挂载时自动预编译所有自注册的 shader
  useEffect(() => {
    flushRegisteredShaders();
  }, [registry]);

  // 反馈回调 ref（避免闭包过期）
  const playSoundRef = useRef(options?.playSound);
  playSoundRef.current = options?.playSound;
  const triggerShakeRef = useRef(options?.triggerShake);
  triggerShakeRef.current = options?.triggerShake;

  // 防抖时间戳记录：cue → lastPushTime
  const debounceMapRef = useRef(new Map<FxCue, number>());
  // 安全超时定时器：id → timeoutId
  const timeoutsRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  // 事件 → 注册条目映射（用于 fireImpact 查找反馈包）
  const eventEntryMapRef = useRef(new Map<string, { cue: FxCue }>());

  const removeEffect = useCallback((id: string) => {
    // 清理超时定时器
    const timer = timeoutsRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timeoutsRef.current.delete(id);
    }
    eventEntryMapRef.current.delete(id);
    setEffects(prev => prev.filter(e => e.id !== id));
  }, []);

  /** 触发 on-impact 反馈（音效 + 震动） */
  const fireImpact = useCallback((id: string) => {
    const meta = eventEntryMapRef.current.get(id);
    if (!meta) return;
    const entry = registry.resolve(meta.cue);
    if (!entry?.feedback) return;

    // 查找对应事件以获取动态上下文（如 intensity 覆盖）
    const event = effectsRef.current.find(e => e.id === id);

    const { sound, shake } = entry.feedback;
    if (sound?.timing === 'on-impact') {
      const source = sound.source ?? 'key';
      const resolvedKey = source === 'params'
        ? (event?.params?.soundKey as string | undefined) ?? sound.key
        : sound.key;
      if (resolvedKey) {
        playSoundRef.current?.(resolvedKey);
      }
    }
    const shakeTiming = shake?.timing ?? 'on-impact';
    if (shake && shakeTiming === 'on-impact') {
      // 震动强度：优先使用事件上下文中的 intensity（支持动态覆盖）
      const dynamicIntensity = event?.ctx.intensity ?? shake.intensity;
      console.log('[FxBus] 触发震动:', { intensity: dynamicIntensity, type: shake.type });
      triggerShakeRef.current?.(dynamicIntensity, shake.type);
    }
  }, [registry]);

  const pushEvent = useCallback((input: FxEventInput): string | null => {
    const entry = registry.resolve(input.cue);
    if (!entry) {
      if (resolveDevFlag()) {
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

    // 记录事件元信息（用于 fireImpact）
    eventEntryMapRef.current.set(id, { cue: input.cue });

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
          eventEntryMapRef.current.delete(oldest.id);
          return [...prev.filter(e => e.id !== oldest.id), event];
        }
      }
      return [...prev, event];
    });

    // 安全超时
    if (timeoutMs > 0) {
      const timer = setTimeout(() => {
        timeoutsRef.current.delete(id);
        eventEntryMapRef.current.delete(id);
        setEffects(prev => prev.filter(e => e.id !== id));
      }, timeoutMs);
      timeoutsRef.current.set(id, timer);
    }

    // 自动触发 immediate 反馈
    if (entry.feedback) {
      const { sound, shake } = entry.feedback;
      if (sound?.timing === 'immediate') {
        const source = sound.source ?? 'key';
        const resolvedKey = source === 'params'
          ? (input.params?.soundKey as string | undefined) ?? sound.key
          : sound.key;
        if (resolvedKey) {
          playSoundRef.current?.(resolvedKey);
        }
      }
      const shakeTiming = shake?.timing ?? 'on-impact';
      if (shake && shakeTiming === 'immediate') {
        triggerShakeRef.current?.(shake.intensity, shake.type);
      }
    }

    return id;
  }, [registry]);

  const push = useCallback((cue: FxCue, ctx: FxContext, params?: FxParams): string | null => {
    return pushEvent({ cue, ctx, params });
  }, [pushEvent]);

  return { push, pushEvent, activeEffects: effects, removeEffect, registry, fireImpact };
}
