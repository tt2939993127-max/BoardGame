/**
 * Cardia FlowHooks
 * 定义回合流程和阶段转换逻辑
 */

import type { FlowHooks } from '../../../engine/systems/FlowSystem';
import type { CardiaCore, GamePhase } from './core-types';
import type { CardiaEvent } from './events';
import { PHASE_ORDER } from './core-types';
import { CARDIA_EVENTS } from './events';
import { ABILITY_IDS } from './ids';

/**
 * Cardia 回合流程钩子
 */
export const cardiaFlowHooks: FlowHooks<CardiaCore> = {
    /**
     * 初始阶段
     */
    initialPhase: 'play',
    
    /**
     * 获取下一个阶段
     */
    getNextPhase: ({ from, state }) => {
        const currentPhase = state.core.phase;
        
        // 阶段循环：play → ability → end → play
        switch (currentPhase) {
            case 'play':
                // 当双方都打出卡牌后，进入能力阶段
                // 这个转换由 execute 中的 PLAY_CARD 命令触发
                return 'ability';
            
            case 'ability':
                // 能力阶段结束后，进入回合结束阶段
                // 这个转换由 ACTIVATE_ABILITY 或 SKIP_ABILITY 命令触发
                return 'end';
            
            case 'end':
                // 回合结束后，回到打出卡牌阶段
                // 这个转换由 END_TURN 命令触发
                return 'play';
            
            default:
                return 'play';
        }
    },
    
    /**
     * 获取当前活跃玩家ID
     */
    getActivePlayerId: ({ state }) => {
        const { core } = state;
        
        // 在能力阶段，只有失败者可以操作
        if (core.phase === 'ability' && core.currentEncounter) {
            return core.currentEncounter.loserId || core.currentPlayerId;
        }
        
        // 在其他阶段，当前玩家可以操作
        return core.currentPlayerId;
    },
    
    /**
     * 阶段进入时的钩子（可选）
     */
    onPhaseEnter: ({ phase, state }) => {
        const events: CardiaEvent[] = [];
        const timestamp = Date.now();
        
        // 回合开始时：触发持续效果
        if (phase === 'play') {
            for (const playerId of state.core.playerOrder) {
                const player = state.core.players[playerId];
                
                // 大法师：每回合抽1张
                if (player.tags.tags[`Ongoing.${ABILITY_IDS.ARCHMAGE}`]) {
                    events.push({
                        type: CARDIA_EVENTS.CARD_DRAWN,
                        timestamp,
                        payload: {
                            playerId,
                            count: 1,
                        },
                    });
                }
                
                // 顾问：如果上一次遭遇你获胜且对手失败，你获得1个印戒
                if (player.tags.tags[`Ongoing.${ABILITY_IDS.ADVISOR}`]) {
                    const prev = state.core.previousEncounter;
                    if (prev && prev.winnerId === playerId && prev.loserId) {
                        // 上一次遭遇该玩家获胜且对手失败（不是平局）
                        events.push({
                            type: CARDIA_EVENTS.SIGNET_GRANTED,
                            timestamp,
                            payload: {
                                playerId,
                                cardUid: player.currentCard?.uid || '',  // 印戒放在当前卡牌上
                                newTotal: player.signets + 1,
                            },
                        });
                    }
                }
            }
        }
        
        return events;
    },
    
    /**
     * 阶段退出时的钩子（可选）
     */
    onPhaseExit: ({ phase, state }) => {
        // 可以在这里添加阶段退出时的逻辑
        // 例如：清理临时状态
        return [];
    },
    
    /**
     * 自动推进检查
     * 
     * 在 ability 阶段，当以下情况发生时自动推进到 end 阶段：
     * 1. 所有交互完成后（INTERACTION_RESOLVED 事件）
     * 2. 玩家跳过能力（ABILITY_SKIPPED 事件）
     * 
     * 注意：不在 ABILITY_ACTIVATED 事件时立即检查，因为 FlowSystem（优先级25）
     * 会在 CardiaEventSystem（优先级50）之前执行，此时 ABILITY_INTERACTION_REQUESTED
     * 事件还未被添加到 events 数组中。正确的做法是只在交互完成或跳过能力时自动推进。
     */
    onAutoContinueCheck: ({ state, events }) => {
        const { core, sys } = state;
        
        // 只在 ability 阶段检查
        if (core.phase !== 'ability') {
            return;
        }
        
        // 检查是否有交互正在进行
        const hasCurrentInteraction = !!sys.interaction.current;
        const hasQueuedInteractions = sys.interaction.queue.length > 0;
        
        // 如果还有交互未完成，不自动推进
        if (hasCurrentInteraction || hasQueuedInteractions) {
            return;
        }
        
        // 在以下情况自动推进：
        // 1. 交互完成（INTERACTION_RESOLVED 事件）
        // 2. 玩家跳过能力（ABILITY_SKIPPED 事件）
        const shouldAutoContinue = events.some(e => 
            e.type === 'SYS_INTERACTION_RESOLVED' || 
            e.type === CARDIA_EVENTS.ABILITY_SKIPPED
        );
        
        if (!shouldAutoContinue) {
            return;
        }
        
        // 获取失败者 ID（能力阶段的活跃玩家）
        const activePlayerId = core.currentEncounter?.loserId || core.currentPlayerId;
        
        console.log('[CardiaFlowHooks] Auto-continue check: interaction resolved or ability skipped, advancing to end phase');
        
        return {
            autoContinue: true,
            playerId: activePlayerId,
        };
    },
};

export default cardiaFlowHooks;
