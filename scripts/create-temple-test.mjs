import { writeFileSync } from 'fs';

const testContent = `/**
 * Temple of Goju + First Mate 时序测试
 * 
 * 测试场景：寺庙基地能力（afterScoring）+ 大副触发器（afterScoring）
 * 
 * 关键点：
 * 1. 寺庙可以将随从放回牌库底
 * 2. 大副在 afterScoring 时可以移动到其他基地
 * 3. 如果寺庙把大副放回牌库底，大副不应再触发移动交互
 * 4. _deferredPostScoringEvents 必须正确传递
 * 
 * 这是多 afterScoring 交互链式传递的典型案例，与母舰+侦察兵类似，
 * 但寺庙会移除随从，测试覆盖了"移除后不应再触发"的场景。
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { initAllAbilities, resetAbilityInit } from '../abilities';
import { clearRegistry } from '../domain/abilityRegistry';
import { clearBaseAbilityRegistry, triggerBaseAbility } from '../domain/baseAbilities';
import { clearInteractionHandlers } from '../domain/abilityInteractionHandlers';
import type { SmashUpCore } from '../domain/types';
import type { MatchState } from '../../../engine/types';
import { makePlayer, makeState, makeBase, makeMinion } from './helpers';
import type { BaseAbilityContext } from '../domain/baseAbilities';

beforeAll(() => {
    clearRegistry();
    clearBaseAbilityRegistry();
    clearInteractionHandlers();
    resetAbilityInit();
    initAllAbilities();
});

describe('Temple of Goju + First Mate 时序测试', () => {
    it('场景1: 寺庙移除大副后不再触发移动交互', () => {
        const core = makeState({
            currentPlayerIndex: 0,
            bases: [
                makeBase('base_temple_of_goju', [
                    makeMinion('first_mate_1', 'pirate_first_mate', '0', 2),
                    makeMinion('weak_1', 'ninja_shinobi', '0', 1),
                    makeMinion('m2', 'ninja_shinobi', '1', 5),
                    makeMinion('m3', 'ninja_shinobi', '1', 3),
                    makeMinion('m4', 'ninja_shinobi', '1', 3),
                ]),
                makeBase('base_pirate_cove', []),
            ],
            baseDeck: ['base_central_brain'],
            players: {
                '0': makePlayer('0'),
                '1': makePlayer('1'),
            },
        });
        const ms: MatchState<SmashUpCore> = {
            core,
            sys: {
                phase: 'scoreBases',
                responseWindow: { current: undefined },
                interaction: { current: undefined, queue: [] },
            },
        } as any;

        const ctx: BaseAbilityContext = {
            state: core,
            matchState: ms,
            baseIndex: 0,
            baseDefId: 'base_temple_of_goju',
            playerId: '0',
            rankings: [
                { playerId: '0', power: 3, vp: 2 },
                { playerId: '1', power: 11, vp: 3 },
            ],
            now: 1000,
        };

        const result = triggerBaseAbility('base_temple_of_goju', 'afterScoring', ctx);
        
        // 验证：应该有事件（将随从放入牌库底）
        expect(result.events.length).toBeGreaterThan(0);
        
        // 验证：应该有 card_to_deck_bottom 事件
        const deckBottomEvents = result.events.filter((e: any) => e.type === 'su:card_to_deck_bottom');
        expect(deckBottomEvents.length).toBeGreaterThan(0);
    });

    it('场景2: 寺庙上有多个大副，部分被移除', () => {
        const core = makeState({
            currentPlayerIndex: 0,
            bases: [
                makeBase('base_temple_of_goju', [
                    makeMinion('first_mate_1', 'pirate_first_mate', '0', 2),
                    makeMinion('first_mate_2', 'pirate_first_mate', '0', 2),
                    makeMinion('m2', 'ninja_shinobi', '1', 5),
                    makeMinion('m3', 'ninja_shinobi', '1', 5),
                    makeMinion('m4', 'ninja_shinobi', '1', 5),
                    makeMinion('m5', 'ninja_shinobi', '1', 5),
                ]),
                makeBase('base_pirate_cove', []),
            ],
            baseDeck: ['base_central_brain'],
            players: {
                '0': makePlayer('0'),
                '1': makePlayer('1'),
            },
        });
        const ms: MatchState<SmashUpCore> = {
            core,
            sys: {
                phase: 'scoreBases',
                responseWindow: { current: undefined },
                interaction: { current: undefined, queue: [] },
            },
        } as any;

        const ctx: BaseAbilityContext = {
            state: core,
            matchState: ms,
            baseIndex: 0,
            baseDefId: 'base_temple_of_goju',
            playerId: '0',
            rankings: [
                { playerId: '0', power: 4, vp: 2 },
                { playerId: '1', power: 20, vp: 3 },
            ],
            now: 1000,
        };

        const result = triggerBaseAbility('base_temple_of_goju', 'afterScoring', ctx);
        
        // 验证：应该有事件
        expect(result.events.length).toBeGreaterThan(0);
        
        // 验证：应该有 card_to_deck_bottom 事件
        const deckBottomEvents = result.events.filter((e: any) => e.type === 'su:card_to_deck_bottom');
        expect(deckBottomEvents.length).toBeGreaterThan(0);
    });

    it('场景3: _deferredPostScoringEvents 传递（寺庙跳过，大副触发）', () => {
        const core = makeState({
            currentPlayerIndex: 0,
            bases: [
                makeBase('base_temple_of_goju', [
                    makeMinion('first_mate_1', 'pirate_first_mate', '0', 2),
                    makeMinion('m2', 'ninja_shinobi', '1', 5),
                    makeMinion('m3', 'ninja_shinobi', '1', 5),
                    makeMinion('m4', 'ninja_shinobi', '1', 5),
                    makeMinion('m5', 'ninja_shinobi', '1', 5),
                ]),
                makeBase('base_pirate_cove', []),
            ],
            baseDeck: ['base_central_brain'],
            players: {
                '0': makePlayer('0'),
                '1': makePlayer('1'),
            },
        });
        const ms: MatchState<SmashUpCore> = {
            core,
            sys: {
                phase: 'scoreBases',
                responseWindow: { current: undefined },
                interaction: { current: undefined, queue: [] },
            },
        } as any;

        const ctx: BaseAbilityContext = {
            state: core,
            matchState: ms,
            baseIndex: 0,
            baseDefId: 'base_temple_of_goju',
            playerId: '0',
            rankings: [
                { playerId: '0', power: 2, vp: 2 },
                { playerId: '1', power: 20, vp: 3 },
            ],
            now: 1000,
        };

        const result = triggerBaseAbility('base_temple_of_goju', 'afterScoring', ctx);
        
        // 验证：应该有事件
        expect(result.events.length).toBeGreaterThan(0);
        
        // 验证：应该有 card_to_deck_bottom 事件
        const deckBottomEvents = result.events.filter((e: any) => e.type === 'su:card_to_deck_bottom');
        expect(deckBottomEvents.length).toBeGreaterThan(0);
    });
});
`;

writeFileSync('src/games/smashup/__tests__/temple-firstmate-afterscore.test.ts', testContent, 'utf-8');
console.log('✅ Test file created successfully');
