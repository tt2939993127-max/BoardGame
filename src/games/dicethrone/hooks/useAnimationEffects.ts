/**
 * useAnimationEffects Hook
 * 
 * 基于事件流驱动 FX 特效（伤害/治疗/状态/Token）。
 * 使用 FX 引擎（useFxBus + FeedbackPack）自动处理音效和震动。
 * 
 * 事件流消费遵循 EventStreamSystem 模式 A（过滤式消费），
 * 单一游标统一处理所有事件类型，避免游标推进遗漏导致重复触发。
 */

import { useEffect, useRef } from 'react';
import type { EventStreamEntry } from '../../../engine/types';
import type { DamageDealtEvent, HealAppliedEvent, HeroState } from '../domain/types';
import type { PlayerId } from '../../../engine/types';
import type { StatusAtlases } from '../ui/statusEffects';
import { getStatusEffectIconNode } from '../ui/statusEffects';
import { STATUS_EFFECT_META, TOKEN_META } from '../domain/statusEffects';
import { getElementCenter } from '../../../components/common/animations/FlyingEffect';
import type { FxBus } from '../../../engine/fx';
import {
    DT_FX,
    resolveDamageImpactKey,
    resolveStatusImpactKey,
    resolveTokenImpactKey,
} from '../ui/fxSetup';

/**
 * 动画效果配置
 */
export interface AnimationEffectsConfig {
    /** FX Bus（用于推送特效） */
    fxBus: FxBus;
    /** 玩家状态（包含自己和对手） */
    players: {
        player: HeroState;
        opponent?: HeroState;
    };
    /** 当前玩家 ID */
    currentPlayerId: PlayerId;
    /** 对手 ID */
    opponentId: PlayerId;
    /** DOM 引用 */
    refs: {
        opponentHp: React.RefObject<HTMLDivElement | null>;
        selfHp: React.RefObject<HTMLDivElement | null>;
        opponentBuff: React.RefObject<HTMLDivElement | null>;
        selfBuff: React.RefObject<HTMLDivElement | null>;
    };
    /** 获取效果起始位置的函数 */
    getEffectStartPos: (targetId?: string) => { x: number; y: number };
    /** 当前语言 */
    locale?: string;
    /** 状态图标图集配置 */
    statusIconAtlas?: StatusAtlases | null;
    /** 事件流所有条目（统一消费伤害/治疗等事件） */
    eventStreamEntries?: EventStreamEntry[];
}

/**
 * 管理动画效果的 Hook
 * 
 * 事件流消费采用模式 A（过滤式），单一游标统一处理 DAMAGE_DEALT / HEAL_APPLIED。
 * 状态效果和 Token 变化仍基于 prev/current 快照对比。
 */
export function useAnimationEffects(config: AnimationEffectsConfig) {
    const {
        fxBus,
        players: { player, opponent },
        currentPlayerId,
        opponentId,
        refs,
        getEffectStartPos,
        locale,
        statusIconAtlas,
        eventStreamEntries = [],
    } = config;

    // ========================================================================
    // 事件流消费：模式 A（过滤式），单一游标
    // ========================================================================
    const lastSeenIdRef = useRef<number>(-1);
    const isFirstMountRef = useRef(true);

    // 首次挂载：将指针推进到末尾，跳过历史事件（防止刷新重播）
    useEffect(() => {
        if (isFirstMountRef.current && eventStreamEntries.length > 0) {
            lastSeenIdRef.current = eventStreamEntries[eventStreamEntries.length - 1].id;
            isFirstMountRef.current = false;
        }
    }, [eventStreamEntries]);

    /**
     * 统一消费事件流：伤害 + 治疗
     * 单一 effect、单一游标，无条件推进到最新 entry.id
     */
    useEffect(() => {
        if (isFirstMountRef.current) return;
        if (eventStreamEntries.length === 0) return;

        const newEntries = eventStreamEntries.filter(e => e.id > lastSeenIdRef.current);
        if (newEntries.length === 0) return;

        // 无条件推进游标，无论事件类型
        lastSeenIdRef.current = newEntries[newEntries.length - 1].id;

        for (const entry of newEntries) {
            const event = entry.event as { type: string; payload: Record<string, unknown> };

            // ---- 伤害动画 ----
            if (event.type === 'DAMAGE_DEALT') {
                const dmgEvent = event as unknown as DamageDealtEvent;
                const damage = dmgEvent.payload.actualDamage ?? 0;
                if (damage <= 0) continue;

                const sourceId = dmgEvent.payload.sourceAbilityId ?? '';
                const isDot = sourceId.startsWith('upkeep-');
                const cue = isDot ? DT_FX.DOT_DAMAGE : DT_FX.DAMAGE;
                const soundKey = isDot ? undefined : resolveDamageImpactKey(damage, dmgEvent.payload.targetId, currentPlayerId);

                if (dmgEvent.payload.targetId === opponentId && opponent) {
                    fxBus.push(cue, {}, {
                        damage,
                        startPos: getEffectStartPos(opponentId),
                        endPos: getElementCenter(refs.opponentHp.current),
                        ...(soundKey && { soundKey }),
                    });
                } else if (dmgEvent.payload.targetId === currentPlayerId) {
                    fxBus.push(cue, {}, {
                        damage,
                        startPos: getEffectStartPos(currentPlayerId),
                        endPos: getElementCenter(refs.selfHp.current),
                        ...(soundKey && { soundKey }),
                    });
                }
                continue;
            }

            // ---- 治疗动画 ----
            if (event.type === 'HEAL_APPLIED') {
                const healEvent = event as unknown as HealAppliedEvent;
                const { targetId, amount } = healEvent.payload;
                if (amount <= 0) continue;

                if (targetId === opponentId && opponent) {
                    fxBus.push(DT_FX.HEAL, {}, {
                        amount,
                        startPos: getEffectStartPos(opponentId),
                        endPos: getElementCenter(refs.opponentHp.current),
                    });
                } else if (targetId === currentPlayerId) {
                    fxBus.push(DT_FX.HEAL, {}, {
                        amount,
                        startPos: getEffectStartPos(currentPlayerId),
                        endPos: getElementCenter(refs.selfHp.current),
                    });
                }
            }
        }
    }, [
        eventStreamEntries,
        opponentId,
        opponent,
        currentPlayerId,
        refs.opponentHp,
        refs.selfHp,
        getEffectStartPos,
        fxBus,
    ]);

    // ========================================================================
    // 状态效果 / Token 变化：基于 prev/current 快照对比
    // ========================================================================

    // 首次挂载标记（用于快照对比类 effect，与事件流游标独立）
    const mountedRef = useRef(false);

    // 追踪上一次的状态效果
    const prevOpponentStatusRef = useRef<Record<string, number>>({ ...(opponent?.statusEffects || {}) });
    const prevPlayerStatusRef = useRef<Record<string, number>>({ ...(player?.statusEffects || {}) });
    // 追踪上一次的 Token
    const prevOpponentTokensRef = useRef<Record<string, number>>({ ...(opponent?.tokens || {}) });
    const prevPlayerTokensRef = useRef<Record<string, number>>({ ...(player?.tokens || {}) });

    // 首次挂载后标记为已就绪
    useEffect(() => {
        const raf = requestAnimationFrame(() => { mountedRef.current = true; });
        return () => cancelAnimationFrame(raf);
    }, []);

    /**
     * 监听对手状态效果变化（增益/减益/移除动画）
     */
    useEffect(() => {
        if (!opponent) return;

        const prevStatus = prevOpponentStatusRef.current;
        const currentStatus = opponent.statusEffects || {};

        if (mountedRef.current) {
            Object.entries(currentStatus).forEach(([effectId, stacks]) => {
                const prevStacks = prevStatus[effectId] ?? 0;
                if (stacks > prevStacks) {
                    const info = STATUS_EFFECT_META[effectId] || { icon: '✨', color: 'from-slate-500 to-slate-600' };
                    fxBus.push(DT_FX.STATUS, {}, {
                        content: getStatusEffectIconNode(info, locale, 'fly', statusIconAtlas),
                        color: info.color,
                        startPos: getEffectStartPos(opponentId),
                        endPos: getElementCenter(refs.opponentBuff.current),
                        soundKey: resolveStatusImpactKey(false),
                    });
                }
            });

            Object.entries(prevStatus).forEach(([effectId, prevStacks]) => {
                const currentStacks = currentStatus[effectId] ?? 0;
                if (prevStacks > 0 && currentStacks < prevStacks) {
                    const info = STATUS_EFFECT_META[effectId] || { icon: '✨', color: 'from-slate-500 to-slate-600' };
                    fxBus.push(DT_FX.STATUS, {}, {
                        content: getStatusEffectIconNode(info, locale, 'fly', statusIconAtlas),
                        color: 'from-slate-400 to-slate-600',
                        startPos: getElementCenter(refs.opponentBuff.current),
                        endPos: { x: getElementCenter(refs.opponentBuff.current).x, y: getElementCenter(refs.opponentBuff.current).y - 60 },
                        isRemove: true,
                        soundKey: resolveStatusImpactKey(true),
                    });
                }
            });
        }

        prevOpponentStatusRef.current = { ...currentStatus };
    }, [opponent?.statusEffects, opponent, getEffectStartPos, opponentId, locale, statusIconAtlas, refs.opponentBuff, fxBus]);

    /**
     * 监听玩家状态效果变化（增益/减益/移除动画）
     */
    useEffect(() => {
        const prevStatus = prevPlayerStatusRef.current;
        const currentStatus = player.statusEffects || {};

        if (mountedRef.current) {
            Object.entries(currentStatus).forEach(([effectId, stacks]) => {
                const prevStacks = prevStatus[effectId] ?? 0;
                if (stacks > prevStacks) {
                    const info = STATUS_EFFECT_META[effectId] || { icon: '✨', color: 'from-slate-500 to-slate-600' };
                    fxBus.push(DT_FX.STATUS, {}, {
                        content: getStatusEffectIconNode(info, locale, 'fly', statusIconAtlas),
                        color: info.color,
                        startPos: getEffectStartPos(currentPlayerId),
                        endPos: getElementCenter(refs.selfBuff.current),
                        soundKey: resolveStatusImpactKey(false),
                    });
                }
            });

            Object.entries(prevStatus).forEach(([effectId, prevStacks]) => {
                const currentStacks = currentStatus[effectId] ?? 0;
                if (prevStacks > 0 && currentStacks < prevStacks) {
                    const info = STATUS_EFFECT_META[effectId] || { icon: '✨', color: 'from-slate-500 to-slate-600' };
                    fxBus.push(DT_FX.STATUS, {}, {
                        content: getStatusEffectIconNode(info, locale, 'fly', statusIconAtlas),
                        color: 'from-slate-400 to-slate-600',
                        startPos: getElementCenter(refs.selfBuff.current),
                        endPos: { x: getElementCenter(refs.selfBuff.current).x, y: getElementCenter(refs.selfBuff.current).y - 60 },
                        isRemove: true,
                        soundKey: resolveStatusImpactKey(true),
                    });
                }
            });
        }

        prevPlayerStatusRef.current = { ...currentStatus };
    }, [player.statusEffects, getEffectStartPos, currentPlayerId, locale, statusIconAtlas, refs.selfBuff, fxBus]);

    /**
     * 监听对手 Token 变化（获得/消耗动画）
     */
    useEffect(() => {
        if (!opponent) return;

        const prevTokens = prevOpponentTokensRef.current;
        const currentTokens = opponent.tokens || {};

        if (mountedRef.current) {
            Object.entries(currentTokens).forEach(([tokenId, stacks]) => {
                const prevStacks = prevTokens[tokenId] ?? 0;
                if (stacks > prevStacks) {
                    const info = TOKEN_META[tokenId] || { icon: '✨', color: 'from-slate-500 to-slate-600' };
                    fxBus.push(DT_FX.TOKEN, {}, {
                        content: getStatusEffectIconNode(info, locale, 'fly', statusIconAtlas),
                        color: info.color,
                        startPos: getEffectStartPos(opponentId),
                        endPos: getElementCenter(refs.opponentBuff.current),
                        soundKey: resolveTokenImpactKey(false),
                    });
                }
            });

            Object.entries(prevTokens).forEach(([tokenId, prevStacks]) => {
                const currentStacks = currentTokens[tokenId] ?? 0;
                if (prevStacks > 0 && currentStacks < prevStacks) {
                    const info = TOKEN_META[tokenId] || { icon: '✨', color: 'from-slate-500 to-slate-600' };
                    fxBus.push(DT_FX.TOKEN, {}, {
                        content: getStatusEffectIconNode(info, locale, 'fly', statusIconAtlas),
                        color: 'from-slate-400 to-slate-600',
                        startPos: getElementCenter(refs.opponentBuff.current),
                        endPos: { x: getElementCenter(refs.opponentBuff.current).x, y: getElementCenter(refs.opponentBuff.current).y - 60 },
                        isRemove: true,
                        soundKey: resolveTokenImpactKey(true),
                    });
                }
            });
        }

        prevOpponentTokensRef.current = { ...currentTokens };
    }, [opponent?.tokens, opponent, getEffectStartPos, opponentId, locale, statusIconAtlas, refs.opponentBuff, fxBus]);

    /**
     * 监听玩家 Token 变化（获得/消耗动画）
     */
    useEffect(() => {
        const prevTokens = prevPlayerTokensRef.current;
        const currentTokens = player.tokens || {};

        if (mountedRef.current) {
            Object.entries(currentTokens).forEach(([tokenId, stacks]) => {
                const prevStacks = prevTokens[tokenId] ?? 0;
                if (stacks > prevStacks) {
                    const info = TOKEN_META[tokenId] || { icon: '✨', color: 'from-slate-500 to-slate-600' };
                    fxBus.push(DT_FX.TOKEN, {}, {
                        content: getStatusEffectIconNode(info, locale, 'fly', statusIconAtlas),
                        color: info.color,
                        startPos: getEffectStartPos(currentPlayerId),
                        endPos: getElementCenter(refs.selfBuff.current),
                        soundKey: resolveTokenImpactKey(false),
                    });
                }
            });

            Object.entries(prevTokens).forEach(([tokenId, prevStacks]) => {
                const currentStacks = currentTokens[tokenId] ?? 0;
                if (prevStacks > 0 && currentStacks < prevStacks) {
                    const info = TOKEN_META[tokenId] || { icon: '✨', color: 'from-slate-500 to-slate-600' };
                    fxBus.push(DT_FX.TOKEN, {}, {
                        content: getStatusEffectIconNode(info, locale, 'fly', statusIconAtlas),
                        color: 'from-slate-400 to-slate-600',
                        startPos: getElementCenter(refs.selfBuff.current),
                        endPos: { x: getElementCenter(refs.selfBuff.current).x, y: getElementCenter(refs.selfBuff.current).y - 60 },
                        isRemove: true,
                        soundKey: resolveTokenImpactKey(true),
                    });
                }
            });
        }

        prevPlayerTokensRef.current = { ...currentTokens };
    }, [player.tokens, getEffectStartPos, currentPlayerId, locale, statusIconAtlas, refs.selfBuff, fxBus]);
}
