/**
 * 召唤师战争 - 未覆盖命令测试
 *
 * 覆盖以下零覆盖命令：
 * 1. SELECT_UNIT — 选择单位（设置 core.selectedUnit）
 * 2. SELECT_CUSTOM_DECK — 选择自定义牌组
 * 3. CONFIRM_ATTACK — 确认攻击（类型已定义但 execute 未实现，属于死代码）
 */

import { describe, it, expect } from 'vitest';
import { SummonerWarsDomain, SW_COMMANDS } from '../domain';
import type { SummonerWarsCore, PlayerId, FactionId } from '../domain/types';
import type { MatchState, RandomFn } from '../../../engine/types';
import { createInitialSystemState, executePipeline } from '../../../engine/pipeline';
import { createInitializedCore } from './test-helpers';

// ============================================================================
// 测试工具
// ============================================================================

const fixedRandom: RandomFn = {
    random: () => 0,
    d: () => 1,
    range: (min) => min,
    shuffle: (arr) => [...arr],
};

/** 创建完整 MatchState（含 sys） */
function createMatchState(
    playerIds: string[],
    random: RandomFn,
    options?: { faction0?: FactionId; faction1?: FactionId }
): MatchState<SummonerWarsCore> {
    const core = createInitializedCore(playerIds, random, options);
    const sys = createInitialSystemState(playerIds as PlayerId[], []);
    return { core, sys };
}

/** 创建选角阶段的 MatchState（未完成阵营选择） */
function createSetupState(playerIds: string[], random: RandomFn): MatchState<SummonerWarsCore> {
    const core = SummonerWarsDomain.setup(playerIds, random);
    const sys = createInitialSystemState(playerIds as PlayerId[], []);
    return { core, sys };
}

const pipelineConfig = { domain: SummonerWarsDomain, systems: [] as never[] };

/** 执行命令 */
function execCmd(
    state: MatchState<SummonerWarsCore>,
    type: string,
    playerId: string,
    payload: Record<string, unknown>,
    random: RandomFn = fixedRandom,
) {
    return executePipeline(
        pipelineConfig,
        state,
        { type, playerId, payload, timestamp: Date.now() },
        random,
        ['0', '1']
    );
}


// ============================================================================
// 1. SELECT_UNIT — 选择单位
// ============================================================================

describe('SELECT_UNIT 选择单位', () => {
    it('选择己方单位成功，设置 selectedUnit', () => {
        const state = createMatchState(['0', '1'], fixedRandom);
        // 找到玩家0的一个单位位置
        let unitPos: { row: number; col: number } | null = null;
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const unit = state.core.board[row]?.[col]?.unit;
                if (unit && unit.owner === '0') {
                    unitPos = { row, col };
                    break;
                }
            }
            if (unitPos) break;
        }
        expect(unitPos).toBeTruthy();

        const result = execCmd(state, SW_COMMANDS.SELECT_UNIT, '0', { position: unitPos });
        expect(result.success).toBe(true);
        if (result.success) {
            const newCore = (result.state as MatchState<SummonerWarsCore>).core;
            expect(newCore.selectedUnit).toEqual(unitPos);
        }
    });

    it('选择空位置也能成功（validate 无限制）', () => {
        const state = createMatchState(['0', '1'], fixedRandom);
        // 选择一个空位置
        const result = execCmd(state, SW_COMMANDS.SELECT_UNIT, '0', { position: { row: 3, col: 3 } });
        // SELECT_UNIT 的 validate 走 default 分支，始终返回 valid: true
        expect(result.success).toBe(true);
    });
});

// ============================================================================
// 2. SELECT_CUSTOM_DECK — 选择自定义牌组
// ============================================================================

describe('SELECT_CUSTOM_DECK 选择自定义牌组', () => {
    it('选角阶段选择自定义牌组成功', () => {
        const state = createSetupState(['0', '1'], fixedRandom);

        const deckData = {
            name: '测试牌组',
            summonerId: 'necro-summoner',
            summonerFaction: 'necromancer',
            cards: [
                { cardId: 'necro-undead-warrior', faction: 'necromancer', count: 3 },
                { cardId: 'necro-skeleton-archer', faction: 'necromancer', count: 3 },
            ],
        };

        const result = execCmd(state, SW_COMMANDS.SELECT_CUSTOM_DECK, '0', { deckData });
        expect(result.success).toBe(true);
        if (result.success) {
            const newCore = (result.state as MatchState<SummonerWarsCore>).core;
            // 应触发 FACTION_SELECTED 事件，设置阵营为 necromancer
            expect(newCore.selectedFactions['0']).toBe('necromancer');
            // 自定义牌组数据应被存储
            expect(newCore.customDeckData?.['0']).toBeTruthy();
        }
    });

    it('游戏已开始时选择自定义牌组失败', () => {
        const state = createMatchState(['0', '1'], fixedRandom);
        // 游戏已初始化（hostStarted=true）
        const deckData = {
            name: '测试牌组',
            summonerId: 'necro-summoner',
            summonerFaction: 'necromancer',
            cards: [],
        };

        const result = execCmd(state, SW_COMMANDS.SELECT_CUSTOM_DECK, '0', { deckData });
        expect(result.success).toBe(false);
    });

    it('缺少牌组数据时失败', () => {
        const state = createSetupState(['0', '1'], fixedRandom);
        const result = execCmd(state, SW_COMMANDS.SELECT_CUSTOM_DECK, '0', {});
        expect(result.success).toBe(false);
    });

    it('缺少召唤师 ID 时失败', () => {
        const state = createSetupState(['0', '1'], fixedRandom);
        const result = execCmd(state, SW_COMMANDS.SELECT_CUSTOM_DECK, '0', {
            deckData: { name: '测试', summonerFaction: 'necromancer', cards: [] },
        });
        expect(result.success).toBe(false);
    });
});

// ============================================================================
// 3. CONFIRM_ATTACK — 确认攻击（死代码）
// ============================================================================

describe('CONFIRM_ATTACK 确认攻击', () => {
    it('命令类型已定义但 execute 未实现（validate 走 default 通过）', () => {
        // CONFIRM_ATTACK 在 types.ts 中定义了接口和常量，
        // 但 execute.ts 的 switch 中没有对应 case。
        // validate.ts 的 switch 也没有对应 case，走 default 返回 valid: true。
        // 实际攻击流程通过 DECLARE_ATTACK 一步完成（包含掷骰和伤害结算）。
        const state = createMatchState(['0', '1'], fixedRandom);
        // 推进到攻击阶段
        state.core.phase = 'attack';

        const result = execCmd(state, SW_COMMANDS.CONFIRM_ATTACK, '0', {
            diceResults: ['melee', 'melee', 'special'],
        });
        // validate 通过（default），execute 无 case 所以不产生事件
        expect(result.success).toBe(true);
    });
});
