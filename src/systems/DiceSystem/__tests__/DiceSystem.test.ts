/**
 * DiceSystem 单元测试
 */
import { describe, it, expect } from 'vitest';
import { diceSystem } from '../DiceSystem';
import type { DiceDefinition } from '../types';
import type { RandomFn } from '../../../engine/types';

describe('DiceSystem', () => {
  const definition: DiceDefinition = {
    id: 'd6',
    name: 'D6',
    sides: 6,
    faces: [
      { value: 1, symbols: ['1'] },
      { value: 2, symbols: ['2'] },
      { value: 3, symbols: ['3'] },
      { value: 4, symbols: ['4'] },
      { value: 5, symbols: ['5'] },
      { value: 6, symbols: ['6'] },
    ],
  };

  const fixedRandom: RandomFn = {
    random: () => 0.5,
    d: () => 4,
    range: (min) => min,
    shuffle: arr => [...arr],
  };

  diceSystem.registerDefinition(definition);

  it('createDie 使用注入的随机数', () => {
    const die = diceSystem.createDie(definition.id, { id: 1 }, fixedRandom);
    expect(die.value).toBe(4);
  });

  it('rollDie 使用注入的随机数', () => {
    const die = diceSystem.createDie(definition.id, { id: 2, initialValue: 1 });
    const rolled = diceSystem.rollDie(die, fixedRandom);
    expect(rolled.value).toBe(4);
  });

  it('rollDice 使用注入的随机数', () => {
    const dice = [
      diceSystem.createDie(definition.id, { id: 3, initialValue: 1 }),
      diceSystem.createDie(definition.id, { id: 4, initialValue: 2 }),
    ];
    const result = diceSystem.rollDice(dice, fixedRandom);
    expect(result.dice.map(d => d.value)).toEqual([4, 4]);
  });
});
