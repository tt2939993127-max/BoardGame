/**
 * useAnimationEffects Hook
 * 
 * 基于事件流驱动 FX 特效（伤害/治疗/状态/Token）。
 * 使用 FX 引擎（useFxBus + FeedbackPack）自动处理音效和震动。
 * 
 * 事件流消费遵循 EventStreamSystem 模式 A（过滤式消费），
 * 单一游标统一处理所有事件类型，避免游标推进遗漏导致重复触发。
 */

import { useCallback, useEffect, useRef } from 'react';
import type { EventStreamEntry } from '../../../engine/types';
import type { DamageDealtEvent, HealAppliedEvent, HeroState } from '../domain/types';
import type { PlayerId } from '../../../engine/types';
import type { StatusAtlases } from '../ui/statusEffects';
import { getStatusEffectIconNode } from '../ui/statusEffects';
import { STATUS_EFFECT_META, TOKEN_META } from '../domain/statusEffects';
import { getElementCenter } from '../../../components/common/animations/FlyingEffect';
import type { FxBus, FxParams } from '../../../engine/fx';
import {
    DT_FX,
    resolveDamageImpactKey,
    resolveStatusImpactKey,
    resolveTokenImpactKey,
} from '../ui/fxSetup';
import { useVisualStateBuffer } from '../../../components/game/framework/hooks/useVisualStateBuffer';
import type { UseVisualStateBufferReturn } from '../../../components/game/framework/hooks/useVisualStateBuffer';
import { RESOURCE_IDS } from '../domain/resources';
import { useEventStreamCursor } from '../../../engine/hooks';

/** 单步描述：cue + params + HP 冻结信息 */
interface AnimStep {
    cue: string;
    params: FxParams;
    bufferKey: string;
    frozenHp: number;
    /** 伤害值（用于受击反馈强度计算），治疗步骤为 0 */
    damage: number;
}

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
    /** 获取效果起始位置的函数（基于 lastEffectSourceByPlayerId 查找） */
    getEffectStartPos: (targetId?: string) => { x: number; y: number };
    /** 获取技能槽位置的函数（直接从 abilityId 查 DOM，找不到返回屏幕中心） */
    getAbilityStartPos: (abilityId?: string) => { x: number; y: number };
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
 * 
 * 返回 damageBuffer（视觉状态缓冲）和 fxImpactMap（FX ID → buffer key 映射），
 * 供 Board 层在 FxLayer onEffectImpact 时释放对应 HP 冻结。
 */
export function useAnimationEffects(config: AnimationEffectsConfig): {
    /** 视觉状态缓冲：HP 在飞行动画到达前保持冻结 */
    damageBuffer: UseVisualStateBufferReturn;
    /** FX 事件 ID → { bufferKey, damage } 映射，供 onEffectImpact 释放 + 触发受击反馈 */
    fxImpactMapRef: React.RefObject<Map<string, { bufferKey: string; damage: number }>>;
    /** 推进动画队列：Board 层在 onEffectComplete 中调用，播放下一步 */
    advanceQueue: (completedFxId: string) => void;
} {
    const {
        fxBus,
        players: { player, opponent },
        currentPlayerId,
        opponentId,
        refs,
        getEffectStartPos,
        getAbilityStartPos,
        locale,
        statusIconAtlas,
        eventStreamEntries = [],
    } = config;

    // ========================================================================
    // 事件流消费：通用游标（自动处理首次挂载跳过 + Undo 重置）
    // ========================================================================
    const { consumeNew } = useEventStreamCursor({ entries: eventStreamEntries });

    // 视觉状态缓冲：HP 在飞行动画到达前保持冻结
    const damageBuffer = useVisualStateBuffer();
    // FX 事件 ID → { bufferKey, damage } 映射（飞行动画到达时释放对应 key + 触发受击反馈）
    const fxImpactMapRef = useRef(new Map<string, { bufferKey: string; damage: number }>());
    // damageBuffer ref 镜像（供 effect 内同步访问）
    const damageBufferRef = useRef(damageBuffer);
    damageBufferRef.current = damageBuffer;

    /**
     * 构建单个伤害事件的 FX 参数
     * 返回 null 表示该事件不需要动画（无效目标等）
     */
    const buildDamageStep = useCallback((dmgEvent: DamageDealtEvent): AnimStep | null => {
        const damage = dmgEvent.payload.actualDamage ?? 0;
        if (damage <= 0) return null;

        const sourceId = dmgEvent.payload.sourceAbilityId ?? '';
        const isDot = sourceId.startsWith('upkeep-');
        const cue = isDot ? DT_FX.DOT_DAMAGE : DT_FX.DAMAGE;
        const soundKey = isDot ? undefined : resolveDamageImpactKey(damage, dmgEvent.payload.targetId, currentPlayerId);
        const targetPlayer = dmgEvent.payload.targetId === opponentId ? opponent : player;
        const bufferKey = `hp-${dmgEvent.payload.targetId}`;

        if (!targetPlayer) return null;

        // 计算冻结快照值（core 当前 HP + 伤害 = 攻击前 HP）
        const coreHp = targetPlayer.resources[RESOURCE_IDS.HP] ?? 0;
        const frozenHp = coreHp + damage;

        const isOpponent = dmgEvent.payload.targetId === opponentId;
        const startPos = getEffectStartPos(isOpponent ? opponentId : currentPlayerId);
        const endPos = getElementCenter(isOpponent ? refs.opponentHp.current : refs.selfHp.current);

        return {
            cue,
            params: { damage, startPos, endPos, ...(soundKey && { soundKey }) },
            bufferKey,
            frozenHp,
            damage,
        };
    }, [currentPlayerId, opponentId, opponent, player, getEffectStartPos, refs.opponentHp, refs.selfHp]);

    /**
     * 构建单个治疗事件的 FX 参数
     * 
     * 治疗起点：从触发治疗的技能槽位置飞出（sourceAbilityId），
     * 找不到技能槽时 fallback 到屏幕中心（如手牌触发的治疗）。
     * 不使用 getEffectStartPos（它查的是"对目标造成效果的来源"，
     * 治疗自己时会错误地指向对手的技能）。
     * 
     * 注意：即使 amount=0 也生成动画（barbarian thick-skin 在无心面时治疗0，
     * 但仍需播放防御技能反馈），只是不冻结 HP。
     */
    const buildHealStep = useCallback((healEvent: HealAppliedEvent): AnimStep | null => {
        const { targetId, amount, sourceAbilityId } = healEvent.payload;
        // 移除 amount <= 0 过滤，允许 0 治疗量的动画（用于技能反馈）
        // if (amount <= 0) return null;

        const targetPlayer = targetId === opponentId ? opponent : player;
        const bufferKey = `hp-${targetId}`;

        if (!targetPlayer) return null;

        // 计算冻结快照值（core 当前 HP - 治疗量 = 治疗前 HP）
        const coreHp = targetPlayer.resources[RESOURCE_IDS.HP] ?? 0;
        const frozenHp = coreHp - amount;

        const isOpponent = targetId === opponentId;
        // 治疗起点：直接从 sourceAbilityId 查技能槽位置，找不到则屏幕中心
        const startPos = getAbilityStartPos(sourceAbilityId);
        const endPos = getElementCenter(isOpponent ? refs.opponentHp.current : refs.selfHp.current);

        return {
            cue: DT_FX.HEAL,
            params: { amount, startPos, endPos },
            bufferKey,
            frozenHp,
            damage: 0,
        };
    }, [opponentId, opponent, player, getAbilityStartPos, refs.opponentHp, refs.selfHp]);

    /**
     * 统一消费事件流：伤害 + 治疗
     * 单一 effect、单一游标，无条件推进到最新 entry.id。
     * 
     * 同一批事件中的伤害和治疗按队列顺序播放（伤害先、治疗后）。
     * 事件到来时只 push 第一步，剩余步骤入队。
     * Board 层在 onEffectComplete 回调中调用 advanceQueue 推进下一步。
     * 每步都通过 push 获取 fxId，建立 fxId → bufferKey 映射。
     */
    // 待播放步骤队列（FIFO）
    const pendingStepsRef = useRef<AnimStep[]>([]);
    // 当前正在播放的 fxId（用于 advanceQueue 匹配）
    const activeFxIdRef = useRef<string | null>(null);

    /** 推入队列中的下一步，返回是否成功 */
    const pushNextStep = useCallback(() => {
        const next = pendingStepsRef.current.shift();
        if (!next) {
            activeFxIdRef.current = null;
            return;
        }
        const fxId = fxBus.push(next.cue, {}, next.params);
        if (fxId) {
            fxImpactMapRef.current.set(fxId, { bufferKey: next.bufferKey, damage: next.damage });
            activeFxIdRef.current = fxId;
        } else {
            // cue 未注册或被跳过，继续推进
            pushNextStep();
        }
    }, [fxBus]);

    /**
     * Board 层在 onEffectComplete 中调用：当前步骤动画完成后推进下一步。
     * 只在 completedFxId 匹配当前活跃步骤时才推进（避免状态/Token 特效误触发）。
     */
    const advanceQueue = useCallback((completedFxId: string) => {
        if (completedFxId === activeFxIdRef.current && pendingStepsRef.current.length > 0) {
            pushNextStep();
        }
    }, [pushNextStep]);

    useEffect(() => {
        const { entries: newEntries } = consumeNew();
        if (newEntries.length === 0) return;

        // 收集本批次的伤害和治疗步骤（伤害优先、治疗在后）
        const damageSteps: AnimStep[] = [];
        const healSteps: AnimStep[] = [];

        for (const entry of newEntries) {
            const event = entry.event as { type: string; payload: Record<string, unknown> };

            if (event.type === 'DAMAGE_DEALT') {
                const step = buildDamageStep(event as unknown as DamageDealtEvent);
                if (step) damageSteps.push(step);
            } else if (event.type === 'HEAL_APPLIED') {
                const step = buildHealStep(event as unknown as HealAppliedEvent);
                if (step) healSteps.push(step);
            }
        }

        // 合并：伤害在前、治疗在后
        const allSteps = [...damageSteps, ...healSteps];
        if (allSteps.length === 0) return;

        // 冻结所有涉及的 HP（取最早快照）
        for (const step of allSteps) {
            const currentFrozen = damageBufferRef.current.get(step.bufferKey, -1);
            if (currentFrozen === -1) {
                damageBufferRef.current.freeze(step.bufferKey, step.frozenHp);
            }
        }

        // 第一步立即 push，剩余入队
        const [first, ...rest] = allSteps;
        pendingStepsRef.current.push(...rest);

        const fxId = fxBus.push(first.cue, {}, first.params);
        if (fxId) {
            fxImpactMapRef.current.set(fxId, { bufferKey: first.bufferKey, damage: first.damage });
            activeFxIdRef.current = fxId;
        } else {
            // 首步失败，尝试推进队列
            pushNextStep();
        }
    }, [
        eventStreamEntries,
        consumeNew,
        opponentId,
        opponent,
        currentPlayerId,
        refs.opponentHp,
        refs.selfHp,
        getEffectStartPos,
        fxBus,
        buildDamageStep,
        buildHealStep,
        pushNextStep,
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
                        isRemove: true,
                        soundKey: resolveTokenImpactKey(true),
                    });
                }
            });
        }

        prevPlayerTokensRef.current = { ...currentTokens };
    }, [player.tokens, getEffectStartPos, currentPlayerId, locale, statusIconAtlas, refs.selfBuff, fxBus]);

    return { damageBuffer, fxImpactMapRef, advanceQueue };
}
