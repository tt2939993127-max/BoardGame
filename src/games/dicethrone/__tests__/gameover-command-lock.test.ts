import { describe, expect, it } from 'vitest';
import { executePipeline } from '../../../engine/pipeline';
import { DiceThroneDomain } from '../domain';
import { cmd, createHeroMatchup, fixedRandom, testSystems } from './test-utils';

describe('DiceThrone 终局命令锁', () => {
    it('胜利结果已经出现后，攻击方不能再掷攻击骰', () => {
        const state = createHeroMatchup('barbarian', 'monk')(['0', '1'], fixedRandom);
        state.sys.phase = 'offensiveRoll';
        state.core.activePlayerId = '0';
        state.core.rollCount = 0;
        state.sys.gameover = { winner: '0' };
        const diceBefore = state.core.dice;

        const result = executePipeline(
            { domain: DiceThroneDomain, systems: testSystems },
            state,
            cmd('ROLL_DICE', '0'),
            fixedRandom,
            ['0', '1'],
        );

        expect(result.success).toBe(false);
        expect(result.error).toBe('game_over');
        expect(result.state.core.dice).toBe(diceBefore);
        expect(result.state.sys.phase).toBe('offensiveRoll');
    });
});
