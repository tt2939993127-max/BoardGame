/**
 * useAnimationEffects Hook
 * 
 * 统一管理 HP 和状态效果变化的飞行动画效果。
 * 自动追踪变化并触发相应的动画，消除重复的 useEffect 逻辑。
 * 
 * @example
 * ```typescript
 * useAnimationEffects({
 *   players: { player, opponent },
 *   currentPlayerId: rootPid,
 *   opponentId: otherPid,
 *   refs: { opponentHp, selfHp, opponentBuff, selfBuff },
 *   getEffectStartPos,
 *   pushFlyingEffect,
 *   triggerOpponentShake,
 *   locale,
 *   statusIconAtlas
 * });
 * ```
 */

import { useEffect, useRef } from 'react';
import type { EventStreamEntry } from '../../../engine/types';
import type { DamageDealtEvent, HeroState } from '../domain/types';
import type { PlayerId } from '../../../engine/types';
import type { StatusAtlases } from '../ui/statusEffects';
import { getStatusEffectIconNode } from '../ui/statusEffects';
import { STATUS_EFFECT_META, TOKEN_META } from '../domain/statusEffects';
import { getElementCenter } from '../../../components/common/animations/FlyingEffect';
import {
    getHitStopPresetByDamage,
    type HitStopConfig
} from '../../../components/common/animations';
import { RESOURCE_IDS } from '../domain/resources';
import { playSound } from '../../../lib/audio/useGameAudio';
import { resolveDamageImpactKey, IMPACT_SFX } from '../audio.config';


/**
 * 动画效果配置
 */
export interface AnimationEffectsConfig {
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
    /** 推送飞行效果的函数 */
    pushFlyingEffect: (effect: {
        type: 'damage' | 'buff' | 'heal';
        content: string | React.ReactNode;
        startPos: { x: number; y: number };
        endPos: { x: number; y: number };
        color?: string;
        /** 效果强度（伤害/治疗量），影响尾迹粒子密度 */
        intensity?: number;
        /** 飞行体到达目标（冲击帧）时触发的回调，用于同步播放音效/震屏等 */
        onImpact?: () => void;
    }) => void;
    /** 触发对手震动效果的函数（可选） */
    triggerOpponentShake?: () => void;
    /** 触发钝帧效果的函数（可选） */
    triggerHitStop?: (config: HitStopConfig) => void;
    /** 触发自己受击效果的函数（可选） */
    triggerSelfImpact?: (damage: number) => void;
    /** 当前语言 */
    locale?: string;
    /** 状态图标图集配置 */
    statusIconAtlas?: StatusAtlases | null;
    /** 伤害事件流条目（用于以事件驱动伤害动画，避免重复触发） */
    damageStreamEntry?: EventStreamEntry;
}

/**
 * 管理动画效果的 Hook
 * 
 * 自动追踪 HP 和状态效果变化，触发飞行动画
 */
export function useAnimationEffects(config: AnimationEffectsConfig) {
    const {
        players: { player, opponent },
        currentPlayerId,
        opponentId,
        refs,
        getEffectStartPos,
        pushFlyingEffect,
        triggerOpponentShake,
        triggerHitStop,
        triggerSelfImpact,
        locale,
        statusIconAtlas,
        damageStreamEntry,
    } = config;

    // 首次挂载标记：跳过初始渲染的"变化"，避免刷新后历史状态被当成新变化触发动画
    const mountedRef = useRef(false);

    // 追踪上一次的 HP 值（防御性读取，player/opponent 可能 undefined）
    const prevOpponentHealthRef = useRef(opponent?.resources?.[RESOURCE_IDS.HP]);
    const prevPlayerHealthRef = useRef(player?.resources?.[RESOURCE_IDS.HP]);

    // 追踪上一次的状态效果
    const prevOpponentStatusRef = useRef<Record<string, number>>({ ...(opponent?.statusEffects || {}) });
    const prevPlayerStatusRef = useRef<Record<string, number>>({ ...(player?.statusEffects || {}) });
    // 追踪上一次的 Token
    const prevOpponentTokensRef = useRef<Record<string, number>>({ ...(opponent?.tokens || {}) });
    const prevPlayerTokensRef = useRef<Record<string, number>>({ ...(player?.tokens || {}) });
    const lastDamageEventIdRef = useRef<number | null>(null);

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

        // 解析伤害音效 key，嵌入 onImpact 回调直接播放
        const impactKey = resolveDamageImpactKey(damage, event.payload.targetId, currentPlayerId);

        if (event.payload.targetId === opponentId && opponent) {
            pushFlyingEffect({
                type: 'damage',
                content: `-${damage}`,
                intensity: damage,
                startPos: getEffectStartPos(opponentId),
                endPos: getElementCenter(refs.opponentHp.current),
                onImpact: () => {
                    playSound(impactKey);
                    triggerOpponentShake?.();
                    triggerHitStop?.(getHitStopPresetByDamage(damage));
                },
            });
            return;
        }

        if (event.payload.targetId === currentPlayerId) {
            pushFlyingEffect({
                type: 'damage',
                content: `-${damage}`,
                intensity: damage,
                startPos: getEffectStartPos(currentPlayerId),
                endPos: getElementCenter(refs.selfHp.current),
                onImpact: () => {
                    playSound(impactKey);
                    triggerSelfImpact?.(damage);
                },
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
        pushFlyingEffect,
        triggerOpponentShake,
        triggerHitStop,
        triggerSelfImpact,
    ]);

    /**
     * 监听对手 HP 变化（伤害/治疗动画）
     */
    useEffect(() => {
        if (!opponent) return;

        const currentHealth = opponent.resources?.[RESOURCE_IDS.HP] ?? 0;
        const prevHealth = prevOpponentHealthRef.current;

        if (mountedRef.current) {
            // 检测 HP 下降（受到伤害）— fallback 路径（无事件流时），无 DeferredSound 可消费
            if (!damageStreamEntry && prevHealth !== undefined && currentHealth < prevHealth) {
                const damage = prevHealth - currentHealth;
                pushFlyingEffect({
                    type: 'damage',
                    content: `-${damage}`,
                    intensity: damage,
                    startPos: getEffectStartPos(opponentId),
                    endPos: getElementCenter(refs.opponentHp.current),
                    onImpact: () => {
                        triggerOpponentShake?.();
                        triggerHitStop?.(getHitStopPresetByDamage(damage));
                    },
                });
            }

            // 检测 HP 上升（治疗）
            if (prevHealth !== undefined && currentHealth > prevHealth) {
                const heal = currentHealth - prevHealth;
                pushFlyingEffect({
                    type: 'heal',
                    content: `+${heal}`,
                    intensity: heal,
                    startPos: getEffectStartPos(opponentId),
                    endPos: getElementCenter(refs.opponentHp.current),
                });
            }
        }

        prevOpponentHealthRef.current = currentHealth;
    }, [
        opponent?.resources,
        opponent,
        damageStreamEntry,
        pushFlyingEffect,
        triggerOpponentShake,
        triggerHitStop,
        getEffectStartPos,
        opponentId,
        refs.opponentHp,
    ]);

    /**
     * 监听玩家 HP 变化（伤害/治疗动画）
     */
    useEffect(() => {
        if (!player?.resources) return;
        const currentHealth = player.resources[RESOURCE_IDS.HP] ?? 0;
        const prevHealth = prevPlayerHealthRef.current;

        if (mountedRef.current) {
            // 检测 HP 下降（受到伤害）— fallback 路径
            if (!damageStreamEntry && prevHealth !== undefined && currentHealth < prevHealth) {
                const damage = prevHealth - currentHealth;
                pushFlyingEffect({
                    type: 'damage',
                    content: `-${damage}`,
                    intensity: damage,
                    startPos: getEffectStartPos(currentPlayerId),
                    endPos: getElementCenter(refs.selfHp.current),
                    onImpact: () => {
                        triggerSelfImpact?.(damage);
                    },
                });
            }

            // 检测 HP 上升（治疗）
            if (prevHealth !== undefined && currentHealth > prevHealth) {
                const heal = currentHealth - prevHealth;
                pushFlyingEffect({
                    type: 'heal',
                    content: `+${heal}`,
                    intensity: heal,
                    startPos: getEffectStartPos(currentPlayerId),
                    endPos: getElementCenter(refs.selfHp.current),
                });
            }
        }

        prevPlayerHealthRef.current = currentHealth;
    }, [
        player.resources,
        damageStreamEntry,
        pushFlyingEffect,
        getEffectStartPos,
        currentPlayerId,
        triggerSelfImpact,
        refs.selfHp,
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

                    pushFlyingEffect({
                        type: 'buff',
                        content: getStatusEffectIconNode(info, locale, 'fly', statusIconAtlas),
                        color: info.color,
                        startPos: getEffectStartPos(opponentId),
                        endPos: getElementCenter(refs.opponentBuff.current),
                    onImpact: () => { playSound(IMPACT_SFX.STATUS_GAIN); },
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
                    pushFlyingEffect({
                        type: 'buff',
                        content: getStatusEffectIconNode(info, locale, 'fly', statusIconAtlas),
                        color: 'from-slate-400 to-slate-600',
                        startPos: getElementCenter(refs.opponentBuff.current),
                        endPos: { x: getElementCenter(refs.opponentBuff.current).x, y: getElementCenter(refs.opponentBuff.current).y - 60 },
                    onImpact: () => { playSound(IMPACT_SFX.STATUS_REMOVE); },
                    });
                }
            });
        }

        prevOpponentStatusRef.current = { ...currentStatus };
    }, [opponent?.statusEffects, opponent, pushFlyingEffect, getEffectStartPos, opponentId, locale, statusIconAtlas, refs.opponentBuff]);

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

                    pushFlyingEffect({
                        type: 'buff',
                        content: getStatusEffectIconNode(info, locale, 'fly', statusIconAtlas),
                        color: info.color,
                        startPos: getEffectStartPos(currentPlayerId),
                        endPos: getElementCenter(refs.selfBuff.current),
                        onImpact: () => { playSound(IMPACT_SFX.STATUS_GAIN); },
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
                    pushFlyingEffect({
                        type: 'buff',
                        content: getStatusEffectIconNode(info, locale, 'fly', statusIconAtlas),
                        color: 'from-slate-400 to-slate-600',
                        startPos: getElementCenter(refs.selfBuff.current),
                        endPos: { x: getElementCenter(refs.selfBuff.current).x, y: getElementCenter(refs.selfBuff.current).y - 60 },
                    onImpact: () => { playSound(IMPACT_SFX.STATUS_REMOVE); },
                    });
                }
            });
        }

        prevPlayerStatusRef.current = { ...currentStatus };
    }, [player.statusEffects, pushFlyingEffect, getEffectStartPos, currentPlayerId, locale, statusIconAtlas, refs.selfBuff]);

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

                    pushFlyingEffect({
                        type: 'buff',
                        content: getStatusEffectIconNode(info, locale, 'fly', statusIconAtlas),
                        color: info.color,
                        startPos: getEffectStartPos(opponentId),
                        endPos: getElementCenter(refs.opponentBuff.current),
                        onImpact: () => { playSound(IMPACT_SFX.TOKEN_GAIN); },
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
                    pushFlyingEffect({
                        type: 'buff',
                        content: getStatusEffectIconNode(info, locale, 'fly', statusIconAtlas),
                        color: 'from-slate-400 to-slate-600',
                        startPos: getElementCenter(refs.opponentBuff.current),
                        endPos: { x: getElementCenter(refs.opponentBuff.current).x, y: getElementCenter(refs.opponentBuff.current).y - 60 },
                        onImpact: () => { playSound(IMPACT_SFX.TOKEN_REMOVE); },
                    });
                }
            });
        }

        prevOpponentTokensRef.current = { ...currentTokens };
    }, [opponent?.tokens, opponent, pushFlyingEffect, getEffectStartPos, opponentId, locale, statusIconAtlas, refs.opponentBuff]);

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

                    pushFlyingEffect({
                        type: 'buff',
                        content: getStatusEffectIconNode(info, locale, 'fly', statusIconAtlas),
                        color: info.color,
                        startPos: getEffectStartPos(currentPlayerId),
                        endPos: getElementCenter(refs.selfBuff.current),
                        onImpact: () => { playSound(IMPACT_SFX.TOKEN_GAIN); },
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
                    pushFlyingEffect({
                        type: 'buff',
                        content: getStatusEffectIconNode(info, locale, 'fly', statusIconAtlas),
                        color: 'from-slate-400 to-slate-600',
                        startPos: getElementCenter(refs.selfBuff.current),
                        endPos: { x: getElementCenter(refs.selfBuff.current).x, y: getElementCenter(refs.selfBuff.current).y - 60 },
                        onImpact: () => { playSound(IMPACT_SFX.TOKEN_REMOVE); },
                    });
                }
            });
        }

        prevPlayerTokensRef.current = { ...currentTokens };
    }, [player.tokens, pushFlyingEffect, getEffectStartPos, currentPlayerId, locale, statusIconAtlas, refs.selfBuff]);
}
