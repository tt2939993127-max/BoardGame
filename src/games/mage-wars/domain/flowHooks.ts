import type { FlowHooks } from '../../../engine/systems/FlowSystem';
import { MAGE_WARS_EVENTS } from './events';
import type { MageWarsCore, MageWarsPhase } from './types';
import { MAGE_WARS_PHASE_ORDER } from './types';

function resolveNextPhase(from: string): MageWarsPhase {
    const currentIndex = MAGE_WARS_PHASE_ORDER.indexOf(from as MageWarsPhase);
    if (currentIndex < 0) return MAGE_WARS_PHASE_ORDER[0];
    return MAGE_WARS_PHASE_ORDER[(currentIndex + 1) % MAGE_WARS_PHASE_ORDER.length];
}

function resolveNextPlayer(core: MageWarsCore): { playerId: string; turnNumber: number } {
    const currentIndex = core.playerOrder.indexOf(core.currentPlayerId);
    const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % core.playerOrder.length;
    return {
        playerId: core.playerOrder[nextIndex] ?? core.currentPlayerId,
        turnNumber: nextIndex === 0 ? core.turnNumber + 1 : core.turnNumber,
    };
}

export const mageWarsFlowHooks: FlowHooks<MageWarsCore> = {
    initialPhase: MAGE_WARS_PHASE_ORDER[0],

    canAdvance: ({ state }) => (state.core.gameResult || state.sys.gameover
        ? { ok: false, error: 'gameOver' }
        : { ok: true }),

    getNextPhase: ({ from }) => resolveNextPhase(from),

    onPhaseExit: ({ state, from, command }) => {
        if (from !== 'finalQuickcast') return;
        const nextPlayer = resolveNextPlayer(state.core);
        return {
            events: [{
                type: MAGE_WARS_EVENTS.TURN_ADVANCED,
                payload: {
                    fromPlayerId: state.core.currentPlayerId,
                    toPlayerId: nextPlayer.playerId,
                    turnNumber: nextPlayer.turnNumber,
                },
                sourceCommandType: command.type,
                timestamp: command.timestamp ?? 0,
            }, {
                type: MAGE_WARS_EVENTS.ACTION_READINESS_RESET,
                payload: {
                    playerId: nextPlayer.playerId,
                },
                sourceCommandType: command.type,
                timestamp: command.timestamp ?? 0,
            }],
        };
    },

    onPhaseEnter: ({ state, to, command }) => {
        if (to !== 'channel') return;
        const player = state.core.players[state.core.currentPlayerId];
        if (!player) return;
        return [{
            type: MAGE_WARS_EVENTS.MANA_CHANNELED,
            payload: {
                playerId: player.id,
                amount: player.channeling,
            },
            sourceCommandType: command.type,
            timestamp: command.timestamp ?? 0,
        }];
    },

    getCurrentPlayerId: ({ state }) => state.core.currentPlayerId,

    getActivePlayerId: ({ state, from, to }) => {
        if (from === 'finalQuickcast' && to === 'reset') {
            return resolveNextPlayer(state.core).playerId;
        }
        return state.core.currentPlayerId;
    },
};

export default mageWarsFlowHooks;
