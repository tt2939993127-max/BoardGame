/**
 * 外星人派系审计修复回归测试
 *
 * 覆盖本轮 P0 修复：
 * 1) alien_crop_circles 支持“任意数量”选择
 * 2) alien_terraform 支持“从基地牌库选择替换基地”
 */

import { beforeAll, describe, expect, it } from 'vitest';
import type { MatchState, RandomFn } from '../../../engine/types';
import { initAllAbilities, resetAbilityInit } from '../abilities';
import { clearRegistry } from '../domain/abilityRegistry';
import { clearBaseAbilityRegistry } from '../domain/baseAbilities';
import { clearInteractionHandlers, getInteractionHandler } from '../domain/abilityInteractionHandlers';
import { SU_EVENTS } from '../domain/types';
import type { BaseInPlay, CardInstance, MinionOnBase, PlayerState, SmashUpCore } from '../domain/types';

function makeCard(uid: string, defId: string, type: 'minion' | 'action', owner: string): CardInstance {
  return { uid, defId, type, owner };
}

function makeMinion(uid: string, defId: string, controller: string, power: number, owner?: string): MinionOnBase {
  return {
    uid,
    defId,
    controller,
    owner: owner ?? controller,
    basePower: power,
    powerModifier: 0,
    talentUsed: false,
    attachedActions: [],
  };
}

function makePlayer(id: string, overrides?: Partial<PlayerState>): PlayerState {
  return {
    id,
    vp: 0,
    hand: [],
    deck: [],
    discard: [],
    minionsPlayed: 0,
    minionLimit: 1,
    actionsPlayed: 0,
    actionLimit: 1,
    factions: ['aliens', 'pirates'] as [string, string],
    ...overrides,
  };
}

function makeBase(defId: string, minions: MinionOnBase[] = []): BaseInPlay {
  return { defId, minions, ongoingActions: [] };
}

function makeState(overrides?: Partial<SmashUpCore>): SmashUpCore {
  return {
    players: {
      '0': makePlayer('0'),
      '1': makePlayer('1'),
    },
    turnOrder: ['0', '1'],
    currentPlayerIndex: 0,
    bases: [],
    baseDeck: [],
    turnNumber: 1,
    nextUid: 100,
    ...overrides,
  };
}

function makeMatchState(core: SmashUpCore): MatchState<SmashUpCore> {
  return {
    core,
    sys: { phase: 'playCards', interaction: { current: undefined, queue: [] } } as any,
  } as MatchState<SmashUpCore>;
}

const dummyRandom: RandomFn = {
  random: () => 0.5,
  d: (max: number) => Math.max(1, Math.floor(max / 2)),
  range: (min: number, max: number) => Math.floor((min + max) / 2),
  shuffle: (arr: any[]) => [...arr],
};

beforeAll(() => {
  clearRegistry();
  clearBaseAbilityRegistry();
  clearInteractionHandlers();
  resetAbilityInit();
  initAllAbilities();
});

describe('Aliens 审计修复回归', () => {
  it('alien_crop_circles: 选择部分随从后完成，仅返回已选随从', () => {
    const core = makeState({
      players: {
        '0': makePlayer('0', {
          hand: [makeCard('a1', 'alien_crop_circles', 'action', '0')],
        }),
        '1': makePlayer('1'),
      },
      bases: [
        makeBase('base_old', [
          makeMinion('m1', 'minion_a', '0', 3),
          makeMinion('m2', 'minion_b', '1', 2),
          makeMinion('m3', 'minion_c', '1', 4),
        ]),
      ],
    });

    const chooseBase = getInteractionHandler('alien_crop_circles');
    const chooseMinion = getInteractionHandler('alien_crop_circles_choose_minion');
    expect(chooseBase).toBeDefined();
    expect(chooseMinion).toBeDefined();

    const step1 = chooseBase!(makeMatchState(core), '0', { baseIndex: 0 }, undefined, dummyRandom, 1000);
    expect(step1).toBeDefined();
    expect(step1!.events).toEqual([]);

    const step1Current = (step1!.state.sys as any).interaction.current;
    expect(step1Current?.data?.sourceId).toBe('alien_crop_circles_choose_minion');

    const step2 = chooseMinion!(
      makeMatchState(step1!.state.core),
      '0',
      { minionUid: 'm1' },
      step1Current?.data,
      dummyRandom,
      1001,
    );
    expect(step2).toBeDefined();
    expect(step2!.events).toEqual([]);

    const step2Current = (step2!.state.sys as any).interaction.current;
    const step2Ctx = (step2Current?.data as any)?.continuationContext;
    expect(step2Ctx?.selectedMinionUids).toEqual(['m1']);

    const step3 = chooseMinion!(
      makeMatchState(step2!.state.core),
      '0',
      { done: true },
      step2Current?.data,
      dummyRandom,
      1002,
    );
    expect(step3).toBeDefined();

    const returned = step3!.events.filter((e) => e.type === SU_EVENTS.MINION_RETURNED);
    expect(returned).toHaveLength(1);
    expect((returned[0] as any).payload.minionUid).toBe('m1');
  });

  it('alien_crop_circles: 直接完成选择时不返回任何随从', () => {
    const core = makeState({
      bases: [makeBase('base_old', [makeMinion('m1', 'minion_a', '0', 3)])],
    });

    const chooseMinion = getInteractionHandler('alien_crop_circles_choose_minion');
    expect(chooseMinion).toBeDefined();

    const result = chooseMinion!(
      makeMatchState(core),
      '0',
      { done: true },
      { continuationContext: { baseIndex: 0, selectedMinionUids: [] } },
      dummyRandom,
      1003,
    );

    expect(result).toBeDefined();
    expect(result!.events).toEqual([]);
  });

  it('alien_terraform: 先选被替换基地，再从基地牌库选择替换目标', () => {
    const core = makeState({
      players: {
        '0': makePlayer('0', {
          hand: [makeCard('a1', 'alien_terraform', 'action', '0')],
        }),
        '1': makePlayer('1'),
      },
      bases: [makeBase('base_old')],
      baseDeck: ['base_new_a', 'base_new_b'],
    });

    const chooseTargetBase = getInteractionHandler('alien_terraform');
    const chooseReplacement = getInteractionHandler('alien_terraform_choose_replacement');
    expect(chooseTargetBase).toBeDefined();
    expect(chooseReplacement).toBeDefined();

    const step1 = chooseTargetBase!(makeMatchState(core), '0', { baseIndex: 0 }, undefined, dummyRandom, 2000);
    expect(step1).toBeDefined();
    expect(step1!.events).toEqual([]);

    const step1Current = (step1!.state.sys as any).interaction.current;
    expect(step1Current?.data?.sourceId).toBe('alien_terraform_choose_replacement');

    const replacementValues = ((step1Current?.data?.options ?? []) as any[])
      .map((opt) => opt?.value?.newBaseDefId)
      .filter(Boolean);
    expect(replacementValues).toEqual(expect.arrayContaining(['base_new_a', 'base_new_b']));

    const step2 = chooseReplacement!(
      makeMatchState(step1!.state.core),
      '0',
      { newBaseDefId: 'base_new_b' },
      step1Current?.data,
      dummyRandom,
      2001,
    );

    expect(step2).toBeDefined();
    const replaced = step2!.events.find((e) => e.type === SU_EVENTS.BASE_REPLACED);
    expect(replaced).toBeDefined();
    expect((replaced as any).payload).toMatchObject({
      baseIndex: 0,
      oldBaseDefId: 'base_old',
      newBaseDefId: 'base_new_b',
      keepCards: true,
    });
  });
});
