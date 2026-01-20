import type { Game } from 'boardgame.io';
import { INVALID_MOVE } from 'boardgame.io/core';
import type { DiceThroneState, Die } from './types';

const INITIAL_HEALTH = 50;
const INITIAL_CP = 2;

export const DiceThroneGame: Game<DiceThroneState> = {
    name: 'dicethrone',

    setup: (ctx) => {
        const players: DiceThroneState['players'] = {};
        for (const pid of (ctx.playOrder as string[])) {
            players[pid] = {
                id: pid === '0' ? 'barbarian' : 'moon_elf',
                health: INITIAL_HEALTH,
                cp: INITIAL_CP,
                hand: [],
                deck: [], // TODO: Initialize Deck
                discard: [],
                statusEffects: {},
            };
        }

        // Initialize 5 dice
        const dice: Die[] = Array(5).fill(null).map((_, i) => ({
            id: i,
            value: 1,
            isKept: false,
            type: 'basic'
        }));

        return {
            players,
            dice,
            rollCount: 0,
            turnPhase: 'income', // Skip upkeep for first turn usually? Or start at income.
            activePlayer: (ctx.playOrder as string[])[0]
        };
    },

    moves: {
        rollDice: ({ G, random }, diceIds: number[]) => {
            if (G.turnPhase !== 'roll') return INVALID_MOVE;
            if (G.rollCount >= 3) return INVALID_MOVE;

            // Filter to only unkept dice or specifically allowed ones?
            // Usually player selects which to roll. 
            // Logic: Roll only indices provided.

            diceIds.forEach(id => {
                const die = G.dice.find(d => d.id === id);
                if (die) {
                    die.value = random.D6();
                }
            });

            G.rollCount++;
        },

        keepDice: ({ G }, diceIds: number[]) => {
            // Toggle kept state
            diceIds.forEach(id => {
                const die = G.dice.find(d => d.id === id);
                if (die) die.isKept = !die.isKept;
            });
        },

        passPhase: ({ G, events }) => {
            // Simple phase transition logic for prototype
            const phases = ['income', 'main1', 'roll', 'target', 'defend', 'main2', 'discard'];
            const currentIdx = phases.indexOf(G.turnPhase);

            if (currentIdx < phases.length - 1) {
                // Next phase
                // TODO: Type affirmation or robust transition
                // @ts-ignore
                G.turnPhase = phases[currentIdx + 1];
            } else {
                // End turn
                events.endTurn();
            }
        }
    },

    turn: {
        onBegin: ({ G }) => {
            G.rollCount = 0;
            G.turnPhase = 'income';
            // Reset dice kept status
            G.dice.forEach(d => d.isKept = false);
        },
        onEnd: () => {
            // Cleanup
        }
    }
};
