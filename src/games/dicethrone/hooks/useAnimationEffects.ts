/**
 * useAnimationEffects Hook
 * 
 * 基于事件流驱动 FX 特效（伤害/治疗/状态/Token）。
 * 使用 FX 引擎（useFxBus + FeedbackPack）自动处理音效和震动。
 * 
 * @example
 * ```typescript
 * useAnimationEffects({
 *   fxBus,
 *   players: { player, opponent },
 *   currentPlayerId: rootPid,
 *   opponentId: otherPid,
 *   refs: { opponentHp, selfHp, opponentBuff, selfBuff },
 *   getEffectStartPos,
 *   locale,
 *   statusIconAtlas,
 *   damageStreamEntry,
 *   eventStreamEntries,
 * });
 * ```
 */

import { useEffect, useRef } from 'react';
import type { EventStreamEntry } from '../../../engine/types';
import type { DamageDealtEvent, HealAppliedEvent, HeroState } from '../domain/types';
import type { PlayerId } from '../../../engine/types';
import type { StatusAtlases } from '../ui/statusEffects';
import { getStatusEffectIconNode } from '../ui/statusEffects';
import { STATUS_EFFECT_META, TOKEN_META } from '../domain/statusEffects';
import { getElementCenter } from '../../../components/common/animations/FlyingEffect';
import { RESOURCE_IDS } from '../domain/resources';
import type { FxBus } from '../../../engine/fx';
import { DT_FX, resolveDamageImpactKey } from '../ui/fxSetup';

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
    /** 伤害事件流条目（用于以事件驱动伤害动画，避免重复触发） */
    damageStreamEntry?: EventStreamEntry;
    /** 事件流所有条目（用于监听 HEAL_APPLIED 事件） */
    eventStreamEntries?: EventStreamEntry[];
}

/**
 * 管理动画效果的 Hook
 * 
 * 自动追踪 HP 和状态效果变化，触发 FX 特效
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
        damageStreamEntry,
        eventStreamEntries = [],
    } = config;

    // 首次挂载标记：跳过初始渲染的"变化"，避免刷新后历史状态被当成新变化触发动画
    const mountedRef = useRef(false);

    // 追踪上一次的状态效果
    const prevOpponentStatusRef = useRef<Record<string, number>>({ ...(opponent?.statusEffects || {}) });
    const prevPlayerStatusRef = useRef<Record<string, number>>({ ...(player?.statusEffects || {}) });
    // 追踪上一次的 Token
    const prevOpponentTokensRef = useRef<Record<string, number>>({ ...(opponent?.tokens || {}) });
    const prevPlayerTokensRef = useRef<Record<string, number>>({ ...(player?.tokens || {}) });
    // 首次挂载时将指针推进到当前最新伤害事件，跳过历史事件（防止刷新重播）
    const lastDamageEventIdRef = useRef<number | null>(damageStreamEntry?.id ?? null);
    // 追踪最后处理的治疗事件 ID
    const lastHealEventIdRef = useRef<number | null>(null);

    // 首次挂载后标记为已就绪，后续 effect 才允许触发动画
    useEffect(() => {
        // 延迟一帧标记，确保所有 ref 都已用当前状态初始化
        const raf = requestAnimationFrame(() => { mountedRef.current = true; });
        return () => cancelAnimationFrame(raf);
    }, []);

    /**
     * 基于事件流触发伤害动画（优先于 HP 变化）
     */
    useEffect(() => {
        if (!damageStreamEntry) return;

        const event = damageStreamEntry.event as DamageDealtEvent;
        if (event.type !== 'DAMAGE_DEALT') return;
        if (lastDamageEventIdRef.current === damageStreamEntry.id) return;
        lastDamageEventIdRef.current = damageStreamEntry.id;

        const damage = event.payload.actualDamage ?? 0;
        if (damage <= 0) return;

        // 解析伤害音效 key，注入 params.soundKey
        const soundKey = resolveDamageImpactKey(damage, event.payload.targetId, currentPlayerId);

        if (event.payload.targetId === opponentId && opponent) {
            fxBus.push(DT_FX.DAMAGE, {}, {
                damage,
                startPos: getEffectStartPos(opponentId),
                endPos: getElementCenter(refs.opponentHp.current),
                soundKey, // 动态音效 key
            });
            return;
        }

        if (event.payload.targetId === currentPlayerId) {
            fxBus.push(DT_FX.DAMAGE, {}, {
                damage,
                startPos: getEffectStartPos(currentPlayerId),
                endPos: getElementCenter(refs.selfHp.current),
                soundKey, // 动态音效 key
            });
        }
    }, [
        damageStreamEntry,
        opponentId,
        opponent,
        currentPlayerId,
        refs.opponentHp,
        refs.selfHp,
        getEffectStartPos,
        fxBus,
    ]);

    /**
     * 基于事件流触发治疗动画（独立于 HP 变化）
     */
    useEffect(() => {
        if (!mountedRef.current) return;
        if (eventStreamEntries.length === 0) return;

        // 从最新的事件开始向前查找未处理的 HEAL_APPLIED 事件
        for (let i = eventStreamEntries.length - 1; i >= 0; i--) {
            const entry = eventStreamEntries[i];
            
            // 跳过已处理的事件
            if (lastHealEventIdRef.current !== null && entry.id <= lastHealEventIdRef.current) {
                break;
            }

            const event = entry.event as HealAppliedEvent;
            if (event.type !== 'HEAL_APPLIED') continue;

            const { targetId, amount } = event.payload;
            
            // 跳过 amount=0 的治疗（无实际效果）
            if (amount <= 0) continue;

            // 标记为已处理
            if (lastHealEventIdRef.current === null || entry.id > lastHealEventIdRef.current) {
                lastHealEventIdRef.current = entry.id;
            }

            // 触发治疗动画
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

    /**
     * 监听对手状态效果变化（增益/减益/移除动画）
     */
    useEffect(() => {
        if (!opponent) return;

        const prevStatus = prevOpponentStatusRef.current;
        const currentStatus = opponent.statusEffects || {};

        if (mountedRef.current) {
            // 检查每个状态效果的层数变化（增加）
            Object.entries(currentStatus).forEach(([effectId, stacks]) => {
                const prevStacks = prevStatus[effectId] ?? 0;

                if (stacks > prevStacks) {
                    const info = STATUS_EFFECT_META[effectId] || {
                        icon: '✨',
                        color: 'from-slate-500 to-slate-600'
                    };

                    fxBus.push(DT_FX.STATUS, {}, {
                        content: getStatusEffectIconNode(info, locale, 'fly', statusIconAtlas),
                        color: info.color,
                        startPos: getEffectStartPos(opponentId),
                        endPos: getElementCenter(refs.opponentBuff.current),
                    });
                }
            });

            // 检查状态效果移除（层数减少或消失）
            Object.entries(prevStatus).forEach(([effectId, prevStacks]) => {
                const currentStacks = currentStatus[effectId] ?? 0;
                if (prevStacks > 0 && currentStacks < prevStacks) {
                    const info = STATUS_EFFECT_META[effectId] || {
                        icon: '✨',
                        color: 'from-slate-500 to-slate-600'
                    };
                    fxBus.push(DT_FX.STATUS, {}, {
                        content: getStatusEffectIconNode(info, locale, 'fly', statusIconAtlas),
                        color: 'from-slate-400 to-slate-600',
                        startPos: getElementCenter(refs.opponentBuff.current),
                        endPos: { x: getElementCenter(refs.opponentBuff.current).x, y: getElementCenter(refs.opponentBuff.current).y - 60 },
                        isRemove: true,
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
                    const info = STATUS_EFFECT_META[effectId] || {
                        icon: '✨',
                        color: 'from-slate-500 to-slate-600'
                    };

                    fxBus.push(DT_FX.STATUS, {}, {
                        content: getStatusEffectIconNode(info, locale, 'fly', statusIconAtlas),
                        color: info.color,
                        startPos: getEffectStartPos(currentPlayerId),
                        endPos: getElementCenter(refs.selfBuff.current),
                    });
                }
            });

            Object.entries(prevStatus).forEach(([effectId, prevStacks]) => {
                const currentStacks = currentStatus[effectId] ?? 0;
                if (prevStacks > 0 && currentStacks < prevStacks) {
                    const info = STATUS_EFFECT_META[effectId] || {
                        icon: '✨',
                        color: 'from-slate-500 to-slate-600'
                    };
                    fxBus.push(DT_FX.STATUS, {}, {
                        content: getStatusEffectIconNode(info, locale, 'fly', statusIconAtlas),
                        color: 'from-slate-400 to-slate-600',
                        startPos: getElementCenter(refs.selfBuff.current),
                        endPos: { x: getElementCenter(refs.selfBuff.current).x, y: getElementCenter(refs.selfBuff.current).y - 60 },
                        isRemove: true,
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
                    const info = TOKEN_META[tokenId] || {
                        icon: '✨',
                        color: 'from-slate-500 to-slate-600'
                    };

                    fxBus.push(DT_FX.TOKEN, {}, {
                        content: getStatusEffectIconNode(info, locale, 'fly', statusIconAtlas),
                        color: info.color,
                        startPos: getEffectStartPos(opponentId),
                        endPos: getElementCenter(refs.opponentBuff.current),
                    });
                }
            });

            Object.entries(prevTokens).forEach(([tokenId, prevStacks]) => {
                const currentStacks = currentTokens[tokenId] ?? 0;
                if (prevStacks > 0 && currentStacks < prevStacks) {
                    const info = TOKEN_META[tokenId] || {
                        icon: '✨',
                        color: 'from-slate-500 to-slate-600'
                    };
                    fxBus.push(DT_FX.TOKEN, {}, {
                        content: getStatusEffectIconNode(info, locale, 'fly', statusIconAtlas),
                        color: 'from-slate-400 to-slate-600',
                        startPos: getElementCenter(refs.opponentBuff.current),
                        endPos: { x: getElementCenter(refs.opponentBuff.current).x, y: getElementCenter(refs.opponentBuff.current).y - 60 },
                        isRemove: true,
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
                    const info = TOKEN_META[tokenId] || {
                        icon: '✨',
                        color: 'from-slate-500 to-slate-600'
                    };

                    fxBus.push(DT_FX.TOKEN, {}, {
                        content: getStatusEffectIconNode(info, locale, 'fly', statusIconAtlas),
                        color: info.color,
                        startPos: getEffectStartPos(currentPlayerId),
                        endPos: getElementCenter(refs.selfBuff.current),
                    });
                }
            });

            Object.entries(prevTokens).forEach(([tokenId, prevStacks]) => {
                const currentStacks = currentTokens[tokenId] ?? 0;
                if (prevStacks > 0 && currentStacks < prevStacks) {
                    const info = TOKEN_META[tokenId] || {
                        icon: '✨',
                        color: 'from-slate-500 to-slate-600'
                    };
                    fxBus.push(DT_FX.TOKEN, {}, {
                        content: getStatusEffectIconNode(info, locale, 'fly', statusIconAtlas),
                        color: 'from-slate-400 to-slate-600',
                        startPos: getElementCenter(refs.selfBuff.current),
                        endPos: { x: getElementCenter(refs.selfBuff.current).x, y: getElementCenter(refs.selfBuff.current).y - 60 },
                        isRemove: true,
                    });
                }
            });
        }

        prevPlayerTokensRef.current = { ...currentTokens };
    }, [player.tokens, getEffectStartPos, currentPlayerId, locale, statusIconAtlas, refs.selfBuff, fxBus]);
}
