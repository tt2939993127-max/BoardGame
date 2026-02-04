/**
 * DiceThrone 领域内核
 */

import type { DomainCore, GameOverResult, PlayerId, RandomFn } from '../../../engine/types';
import { diceSystem } from '../../../systems/DiceSystem';
import { resourceSystem } from './resourceSystem';
import type { DiceThroneCore, DiceThroneCommand, DiceThroneEvent, HeroState, CharacterId } from './types';
import { RESOURCE_IDS } from './resources';
import { validateCommand } from './commands';
import { execute } from './execute';
import { reduce } from './reducer';
import { playerView } from './view';
import { registerDiceThroneConditions } from '../conditions';
import { ALL_TOKEN_DEFINITIONS } from './characters';
import { monkDiceDefinition } from '../monk/diceConfig';
import { monkResourceDefinitions } from '../monk/resourceConfig';
import { barbarianDiceDefinition } from '../barbarian/diceConfig';
import { barbarianResourceDefinitions } from '../barbarian/resourceConfig';

// 注册 DiceThrone 游戏特定条件（骰子组合、顺子等）
registerDiceThroneConditions();

// 注册 角色 骰子与资源定义
diceSystem.registerDefinition(monkDiceDefinition);
diceSystem.registerDefinition(barbarianDiceDefinition);
monkResourceDefinitions.forEach(def => resourceSystem.registerDefinition(def));
barbarianResourceDefinitions.forEach(def => resourceSystem.registerDefinition(def));

// ============================================================================
// 领域内核定义
// ============================================================================

export const DiceThroneDomain: DomainCore<DiceThroneCore, DiceThroneCommand, DiceThroneEvent> = {
    gameId: 'dicethrone',

    setup: (playerIds: PlayerId[], _random: RandomFn): DiceThroneCore => {
        const players: Record<PlayerId, HeroState> = {};
        const selectedCharacters: Record<PlayerId, CharacterId> = {};

        for (const pid of playerIds) {
            // 初始占位，等待选角后再按需初始化具体资源/技能/牌库
            players[pid] = {
                id: `player-${pid}`,
                characterId: 'unselected',
                resources: {},
                hand: [],
                deck: [],
                discard: [],
                statusEffects: {},
                tokens: {},
                tokenStackLimits: {},
                damageShields: [],
                abilities: [],
                abilityLevels: {},
                upgradeCardByAbilityId: {},
            };
            selectedCharacters[pid] = 'unselected';
        }

        const readyPlayers: Record<PlayerId, boolean> = {};
        for (const pid of playerIds) {
            readyPlayers[pid] = false;
        }

        return {
            players,
            selectedCharacters,
            readyPlayers,
            hostPlayerId: playerIds[0],
            hostStarted: false,
            dice: [], // 选角后再创建
            rollCount: 0,
            rollLimit: 3,
            rollDiceCount: 5,
            rollConfirmed: false,
            turnPhase: 'setup',
            activePlayerId: playerIds[0],
            startingPlayerId: playerIds[0],
            turnNumber: 1,
            pendingAttack: null,
            tokenDefinitions: ALL_TOKEN_DEFINITIONS,
            lastEffectSourceByPlayerId: {},
        };
    },

    validate: (state, command) => validateCommand(state.core, command),
    execute: (state, command, random) => execute(state, command, random),
    reduce,
    playerView,

    isGameOver: (state: DiceThroneCore): GameOverResult | undefined => {
        // 在 setup 阶段不进行胜负判定，避免血量未初始化导致误判
        if (state.turnPhase === 'setup') return undefined;

        const playerIds = Object.keys(state.players);
        const defeated = playerIds.filter(id => (state.players[id]?.resources[RESOURCE_IDS.HP] ?? 0) <= 0);
        
        if (defeated.length === 0) return undefined;
        
        if (defeated.length === playerIds.length) {
            return { draw: true };
        }
        
        if (defeated.length === 1) {
            const winner = playerIds.find(id => id !== defeated[0]);
            if (winner) return { winner };
        }
        
        return { draw: true };
    },
};

// 导出类型
export type { DiceThroneCore, DiceThroneCommand, DiceThroneEvent } from './types';
export * from './rules';

// 导出常量
export { STATUS_IDS, TOKEN_IDS, DICE_FACE_IDS } from './ids';
export { RESOURCE_IDS } from './resources';
