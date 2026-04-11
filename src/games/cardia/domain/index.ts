import type { DomainCore, PlayerId, RandomFn, GameOverResult } from '../../../engine/types';
import type { CardiaCore, CardiaCommand, CardiaEvent, PlayerState, PlayedCard } from './types';
import { ABILITY_IDS } from './ids';
import { createPlayerState } from './utils';
import { createInitialDeck, drawCards } from './setupDeck';
import validate from './validate';
import execute from './execute';
import reduce from './reduce';

// 导出注册表
export { default as abilityRegistry } from './abilityRegistry';
export { default as cardRegistry, getCardsByDeckVariant, getCardsByFaction, getCardByInfluence } from './cardRegistry';
export { default as locationRegistry } from './locationRegistry';
export * from './ids';
export * from './abilityRegistry';
export * from './cardRegistry';
export * from './locationRegistry';

/**
 * 卡迪亚领域内核
 */
export const CardiaDomain: DomainCore<CardiaCore, CardiaCommand, CardiaEvent> = {
    gameId: 'cardia',
    
    /**
     * 初始化游戏状态
     */
    setup: (playerIds: PlayerId[], random: RandomFn, setupData?: any): CardiaCore => {
        // 从 setupData 读取牌组选择，默认使用 I 牌组
        const deckVariant = (setupData?.deckVariant as 'I' | 'II') || 'I';
        
        // 为每个玩家创建初始状态
        const players: Record<PlayerId, PlayerState> = {};
        
        for (const playerId of playerIds) {
            // 创建初始牌库（16张卡牌，已洗牌）
            const deck = createInitialDeck(playerId, deckVariant, random);
            
            // 抽取初始手牌（5张）
            const { drawn: initialHand, remaining: remainingDeck } = drawCards(deck, 5);
            
            // 创建玩家状态
            const playerState = createPlayerState(playerId);
            playerState.hand = initialHand;
            playerState.deck = remainingDeck;
            
            players[playerId] = playerState;
        }
        
        return {
            players,
            playerOrder: [playerIds[0], playerIds[1]],
            currentPlayerId: playerIds[0],
            turnNumber: 1,
            phase: 'play',
            encounterHistory: [],
            deckVariant,
            targetSignets: 5,  // 默认目标5个印戒
            
            // 能力系统状态
            ongoingAbilities: [],
            modifierTokens: [],
            delayedEffects: [],
            
            // 特殊状态标记
            revealFirstNextEncounter: null,
            forcedPlayOrderNextEncounter: null,
            mechanicalSpiritActive: null,
        };
    },
    
    /**
     * 命令校验
     */
    validate,
    
    /**
     * 命令执行
     */
    execute,
    
    /**
     * 事件应用到状态
     */
    reduce,
    
    /**
     * 游戏结束判定
     * 
     * ⚠️ 重要：印戒胜利条件在所有阶段都检查（修复：之前只在 end 阶段检查，导致游戏继续到 7+ 印戒）
     * - 优先级1：直接胜利标记（gameWonBy）
     * - 优先级2：印戒胜利条件（任何阶段）
     * - 优先级3：无牌可打胜利条件（play 阶段）
     * - 优先级4：特殊能力胜利条件（ability 阶段）
     */
    isGameOver: (core): GameOverResult | undefined => {
        // 优先检查直接胜利标记（精灵能力等）
        if (core.gameWonBy) {
            return {
                winner: core.gameWonBy,
            };
        }
        
        // 导入 getTotalSignets 辅助函数
        const getTotalSignets = (player: PlayerState) => {
            return player.playedCards.reduce((sum: number, card: PlayedCard) => sum + card.signets, 0);
        };
        
        // ⚠️ 关键修复：在所有阶段都检查印戒胜利条件
        // 原因：印戒在 play 阶段授予（遭遇解析时），但之前只在 end 阶段检查，导致游戏继续到 7+ 印戒
        const signetsCount: Record<PlayerId, number> = {};
        for (const playerId of core.playerOrder) {
            const player = core.players[playerId];
            signetsCount[playerId] = getTotalSignets(player);
        }
        
        // 找出所有达到目标印戒数的玩家
        const playersWithEnoughSignets = core.playerOrder.filter(
            pid => signetsCount[pid] >= core.targetSignets
        );
        
        if (playersWithEnoughSignets.length > 0) {
            // 如果多个玩家同时达到目标，比较印戒数量
            if (playersWithEnoughSignets.length > 1) {
                const maxSignets = Math.max(...playersWithEnoughSignets.map(pid => signetsCount[pid]));
                const winnersWithMaxSignets = playersWithEnoughSignets.filter(
                    pid => signetsCount[pid] === maxSignets
                );
                
                // 如果有多个玩家拥有相同的最高印戒数，判定为平局
                if (winnersWithMaxSignets.length > 1) {
                    return { draw: true };
                }
                // 只有一个玩家拥有最高印戒数，该玩家获胜
                return { winner: winnersWithMaxSignets[0] };
            }
            // 只有一个玩家达到目标，该玩家获胜
            return { winner: playersWithEnoughSignets[0] };
        }
        
        // ⚠️ 阶段特定检查：无牌可打的胜利条件（仅 play 阶段）
        if (core.phase === 'play') {
            const playersWithoutCards = core.playerOrder.filter(playerId => {
                const player = core.players[playerId];
                return player.hand.length === 0 && player.deck.length === 0;
            });
            
            // 如果只有一方无法出牌，对手获胜
            if (playersWithoutCards.length === 1) {
                const loser = playersWithoutCards[0];
                const winner = core.playerOrder.find(pid => pid !== loser)!;
                return { winner };
            }
            
            // 如果双方都无法出牌，比较印戒数量
            if (playersWithoutCards.length === 2) {
                const signetsCount: Record<PlayerId, number> = {};
                for (const playerId of core.playerOrder) {
                    const player = core.players[playerId];
                    signetsCount[playerId] = getTotalSignets(player);
                }
                
                const p1Signets = signetsCount[core.playerOrder[0]];
                const p2Signets = signetsCount[core.playerOrder[1]];
                
                if (p1Signets > p2Signets) {
                    return { winner: core.playerOrder[0] };
                } else if (p2Signets > p1Signets) {
                    return { winner: core.playerOrder[1] };
                } else {
                    return { draw: true };
                }
            }
        }
        
        // ⚠️ 阶段特定检查：特殊能力胜利条件（仅 ability 阶段）
        if (core.phase === 'ability') {
            for (const playerId of core.playerOrder) {
                const player = core.players[playerId];
                const totalSignets = getTotalSignets(player);
                
                // 精灵能力：如果激活了精灵能力且有5个印戒，立即获胜
                const hasElfAbility = core.ongoingAbilities.some(
                    a => a.abilityId === ABILITY_IDS.ELF && a.playerId === playerId
                );
                if (hasElfAbility && totalSignets >= 5) {
                    return {
                        winner: playerId,
                    };
                }
                
                // 机械精灵能力：如果激活了机械精灵且在当前遭遇中获胜，立即获胜
                if (core.mechanicalSpiritActive && core.mechanicalSpiritActive.playerId === playerId) {
                    // 检查最近一次遭遇是否该玩家获胜
                    if (core.previousEncounter && core.previousEncounter.winnerId === playerId) {
                        return {
                            winner: playerId,
                        };
                    }
                }
            }
        }
        
        // 没有任何胜利条件触发，游戏继续
        return undefined;
    },
};

export default CardiaDomain;

