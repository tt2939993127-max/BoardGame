/**
 * Adapter 集成测试 — 验证 G.sys 状态通过 boardgame.io adapter 正确持久化
 *
 * 此测试模拟 boardgame.io 的 Immer 机制：move 函数接收一个 draft 对象，
 * 只有对 draft 的直接赋值才会被追踪。验证 adapter 同时写回 core 和 sys。
 */

import { describe, it, expect } from 'vitest';
import { createGameAdapter } from '../adapter';
import { createFlowSystem, FLOW_EVENTS } from '../systems/FlowSystem';
import { createLogSystem } from '../systems/LogSystem';
import { createEventStreamSystem } from '../systems/EventStreamSystem';
import { createUndoSystem } from '../systems/UndoSystem';
import type {
    Command,
    DomainCore,
    GameEvent,
    MatchState,
    ValidationResult,
} from '../types';

// ============================================================================
// 最小测试游戏
// ============================================================================

interface TestCore {
    turnPhase: string;
    counter: number;
}

type TestCommand = Command<'INCREMENT' | 'ADVANCE_PHASE' | string>;
type TestEvent = GameEvent<'INCREMENTED' | 'SYS_PHASE_CHANGED' | string>;

const testDomain: DomainCore<TestCore, TestCommand, TestEvent> = {
    gameId: 'adapter-test',

    setup: (): TestCore => ({ turnPhase: 'phase1', counter: 0 }),

    validate: (): ValidationResult => ({ valid: true }),

    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- DomainCore signature requires 3 params
    execute: (state, command, _random): TestEvent[] => {
        if (command.type === 'INCREMENT') {
            return [{ type: 'INCREMENTED', payload: { delta: 1 }, timestamp: Date.now() }];
        }
        return [];
    },

    reduce: (core, event): TestCore => {
        if (event.type === 'INCREMENTED') {
            return { ...core, counter: core.counter + (event.payload as { delta: number }).delta };
        }
        if (event.type === FLOW_EVENTS.PHASE_CHANGED) {
            const { to } = event.payload as { from: string; to: string };
            return { ...core, turnPhase: to };
        }
        return core;
    },
};

// ============================================================================
// 模拟 boardgame.io Immer 行为
// ============================================================================

/**
 * 模拟 boardgame.io 的 move 执行：
 * 1. 创建 G 的浅拷贝作为"draft"
 * 2. 执行 move 函数（move 会直接赋值 G.core / G.sys）
 * 3. 收集 draft 上的变更，产生新状态
 *
 * 关键：只有 move 函数中对 draft 的直接属性赋值才会生效。
 * 如果 move 只写了 G.core 没写 G.sys，则 sys 保持原值。
 */
function simulateBgioMove(
    G: MatchState<TestCore>,
    moveFn: (args: { G: MatchState<TestCore>; ctx: unknown; random: unknown; playerID: string }) => void,
    playerID: string,
): MatchState<TestCore> {
    // 创建一个可追踪赋值的 proxy（简化版 Immer）
    const mutations: Partial<MatchState<TestCore>> = {};
    const draft = new Proxy(G, {
        set(_target, prop, value) {
            mutations[prop as keyof MatchState<TestCore>] = value;
            return true;
        },
        get(target, prop) {
            if (prop in mutations) return mutations[prop as keyof MatchState<TestCore>];
            return target[prop as keyof MatchState<TestCore>];
        },
    });

    const mockCtx = {
        currentPlayer: playerID,
        playOrder: ['0', '1'],
    };
    const mockRandom = {
        Number: () => 0.5,
        Die: (max: number) => Math.ceil(max / 2),
        Shuffle: <T,>(arr: T[]): T[] => [...arr],
    };

    moveFn({ G: draft, ctx: mockCtx, random: mockRandom, playerID });

    // 合并变更（模拟 Immer produce）
    return { ...G, ...mutations };
}

// ============================================================================
// 测试
// ============================================================================

describe('Adapter sys 状态持久化', () => {
    const systems = [
        createFlowSystem<TestCore>({
            hooks: {
                initialPhase: 'phase1',
                getNextPhase: ({ from }) => from === 'phase1' ? 'phase2' : 'phase1',
            },
        }),
        createLogSystem(),
        createEventStreamSystem(),
        createUndoSystem(),
    ];

    const game = createGameAdapter<TestCore, TestCommand, TestEvent>({
        domain: testDomain,
        systems,
        commandTypes: ['INCREMENT'],
    });

    // 从 game.setup 获取初始状态
    function createInitialState(): MatchState<TestCore> {
        const setupFn = game.setup!;
        return setupFn({
            ctx: { playOrder: ['0', '1'] },
            random: {
                Number: () => 0.5,
                Die: (max: number) => Math.ceil(max / 2),
                Shuffle: <T,>(arr: T[]): T[] => [...arr],
            },
        } as never);
    }

    it('INCREMENT 命令后 sys.log 应包含新条目', () => {
        const G0 = createInitialState();
        expect(G0.sys.log.entries).toHaveLength(0);

        const moveFn = (game.moves as Record<string, unknown>)['INCREMENT'] as (
            args: { G: MatchState<TestCore>; ctx: unknown; random: unknown; playerID: string },
            payload: unknown,
        ) => void;

        // 模拟 boardgame.io 执行 move
        const G1 = simulateBgioMove(
            G0,
            (args) => moveFn(args, {}),
            '0',
        );

        // core 应更新
        expect(G1.core.counter).toBe(1);

        // sys.log 应包含命令+事件条目（LogSystem afterEvents 写入）
        expect(G1.sys.log.entries.length).toBeGreaterThan(0);

        // sys.eventStream 应包含事件
        expect(G1.sys.eventStream.entries.length).toBeGreaterThan(0);
    });

    it('ADVANCE_PHASE 后 sys.phase 应更新', () => {
        const G0 = createInitialState();
        expect(G0.sys.phase).toBe('phase1');

        const moveFn = (game.moves as Record<string, unknown>)['ADVANCE_PHASE'] as (
            args: { G: MatchState<TestCore>; ctx: unknown; random: unknown; playerID: string },
            payload: unknown,
        ) => void;

        const G1 = simulateBgioMove(
            G0,
            (args) => moveFn(args, {}),
            '0',
        );

        // sys.phase 应从 phase1 → phase2（FlowSystem beforeCommand 更新）
        expect(G1.sys.phase).toBe('phase2');

        // core.turnPhase 也应更新（通过 SYS_PHASE_CHANGED reduce）
        expect(G1.core.turnPhase).toBe('phase2');
    });

    it('多次 move 后 sys 状态持续累积', () => {
        let G = createInitialState();

        const incrementMove = (game.moves as Record<string, unknown>)['INCREMENT'] as (
            args: { G: MatchState<TestCore>; ctx: unknown; random: unknown; playerID: string },
            payload: unknown,
        ) => void;

        // 执行 3 次 INCREMENT
        for (let i = 0; i < 3; i++) {
            G = simulateBgioMove(G, (args) => incrementMove(args, {}), '0');
        }

        expect(G.core.counter).toBe(3);

        // sys.log 应累积所有命令+事件
        expect(G.sys.log.entries.length).toBeGreaterThanOrEqual(6); // 3 commands + 3 events

        // sys.eventStream 应累积
        expect(G.sys.eventStream.nextId).toBeGreaterThan(1);
    });

    it('setup 返回的初始状态包含完整 sys', () => {
        const G = createInitialState();

        expect(G.sys).toBeDefined();
        expect(G.core).toBeDefined();
        expect(G.sys.phase).toBe('phase1');
        expect(G.sys.undo).toBeDefined();
        expect(G.sys.log).toBeDefined();
        expect(G.sys.eventStream).toBeDefined();
    });
});
