import { describe, expect, it, vi } from 'vitest';
import { GameTransportServer, type GameEngineConfig } from '../server';
import { buildAiProgressMarker } from '../onlineAiRecovery';
import { createInteractionSystem, createSimpleChoice, INTERACTION_COMMANDS } from '../../systems/InteractionSystem';
import { createSimpleChoiceSystem } from '../../systems/SimpleChoiceSystem';
import { createResponseWindowSystem, RESPONSE_WINDOW_EVENTS } from '../../systems/ResponseWindowSystem';
import type {
    CreateMatchData,
    FetchOpts,
    FetchResult,
    MatchMetadata,
    MatchStorage,
    StoredMatchState,
} from '../storage';
import type { TrainingDataRecorder, TrainingDecisionSample } from '../trainingData';
import { GAME_MANIFEST_BY_ID } from '../../../games/manifest';

type EventHandler = (...args: unknown[]) => void | Promise<void>;

type SocketEvent = {
    event: string;
    args: unknown[];
};

class MockSocket {
    readonly id: string;
    readonly sent: SocketEvent[] = [];
    readonly rooms = new Set<string>();
    disconnected = false;

    private handlers = new Map<string, EventHandler[]>();
    private namespace: MockNamespace | null = null;

    constructor(id: string) {
        this.id = id;
    }

    on(event: string, handler: EventHandler): void {
        const list = this.handlers.get(event) ?? [];
        list.push(handler);
        this.handlers.set(event, list);
    }

    bindNamespace(namespace: MockNamespace): void {
        this.namespace = namespace;
    }

    emit(event: string, ...args: unknown[]): void {
        this.sent.push({ event, args });
    }

    join(room: string): void {
        this.rooms.add(room);
    }

    to(target: string): { emit: (event: string, ...args: unknown[]) => void } {
        return {
            emit: (event: string, ...args: unknown[]) => {
                this.namespace?.emitToTarget(target, event, args, this.id);
            },
        };
    }

    disconnect(_force?: boolean): void {
        this.disconnected = true;
        const handlers = this.handlers.get('disconnect') ?? [];
        for (const handler of handlers) {
            void handler();
        }
    }

    async clientEmit(event: string, ...args: unknown[]): Promise<void> {
        const handlers = this.handlers.get(event) ?? [];
        for (const handler of handlers) {
            await handler(...args);
        }
    }
}

class MockNamespace {
    private connectionHandler: ((socket: MockSocket) => void) | null = null;
    private readonly sockets = new Map<string, MockSocket>();

    on(event: string, handler: (socket: MockSocket) => void): void {
        if (event === 'connection') {
            this.connectionHandler = handler;
        }
    }

    connectSocket(socket: MockSocket): void {
        this.sockets.set(socket.id, socket);
        socket.bindNamespace(this);
        this.connectionHandler?.(socket);
    }

    emitToTarget(
        target: string,
        event: string,
        args: unknown[],
        excludeSocketId?: string,
    ): void {
        if (target.startsWith('game:')) {
            for (const socket of this.sockets.values()) {
                if (!socket.rooms.has(target)) continue;
                if (excludeSocketId && socket.id === excludeSocketId) continue;
                socket.emit(event, ...args);
            }
            return;
        }

        const socket = this.sockets.get(target);
        if (!socket) return;
        if (excludeSocketId && socket.id === excludeSocketId) return;
        socket.emit(event, ...args);
    }

    to(target: string): { emit: (event: string, ...args: unknown[]) => void } {
        return {
            emit: (event: string, ...args: unknown[]) => {
                this.emitToTarget(target, event, args);
            },
        };
    }

    in(room: string): { fetchSockets: () => Promise<MockSocket[]> } {
        return {
            fetchSockets: async () => {
                return Array.from(this.sockets.values()).filter((socket) => socket.rooms.has(room));
            },
        };
    }
}

class MockIO {
    readonly gameNamespace = new MockNamespace();

    of(namespace: string): MockNamespace {
        if (namespace !== '/game') {
            throw new Error(`Unexpected namespace: ${namespace}`);
        }
        return this.gameNamespace;
    }
}

class InMemoryStorage implements MatchStorage {
    private readonly states = new Map<string, StoredMatchState>();
    private readonly metadata = new Map<string, MatchMetadata>();

    async connect(): Promise<void> {
        return;
    }

    async createMatch(matchID: string, data: CreateMatchData): Promise<void> {
        this.states.set(matchID, data.initialState);
        this.metadata.set(matchID, data.metadata);
    }

    async setState(matchID: string, state: StoredMatchState): Promise<void> {
        this.states.set(matchID, state);
    }

    async setMetadata(matchID: string, metadata: MatchMetadata): Promise<void> {
        this.metadata.set(matchID, metadata);
    }

    async fetch(matchID: string, opts: FetchOpts): Promise<FetchResult> {
        return {
            state: opts.state ? this.states.get(matchID) : undefined,
            metadata: opts.metadata ? this.metadata.get(matchID) : undefined,
        };
    }

    async fetchAuthMetadata(matchID: string): Promise<MatchMetadata | undefined> {
        return this.metadata.get(matchID);
    }

    async wipe(matchID: string): Promise<void> {
        this.states.delete(matchID);
        this.metadata.delete(matchID);
    }

    async listMatches(): Promise<string[]> {
        return Array.from(this.states.keys());
    }
}

const createEngineConfig = (): GameEngineConfig => ({
    gameId: 'test-game',
    domain: {
        gameId: 'test-game',
        setup: () => ({ currentPlayer: '0' }),
        validate: () => ({ valid: true }),
        execute: () => [],
        reduce: (core) => core,
    },
    systems: [],
});

const createEngineConfigWithId = (gameId: string): GameEngineConfig => {
    const base = createEngineConfig();
    return {
        ...base,
        gameId,
        domain: {
            ...base.domain,
            gameId,
        },
    };
};

const createEngineConfigWithGameOver = (): GameEngineConfig => {
    const base = createEngineConfig();
    return {
        ...base,
        domain: {
            ...base.domain,
            isGameOver: () => ({ winner: '0' }),
        },
    };
};

const createInteractiveEngineConfig = (): GameEngineConfig => ({
    gameId: 'test-game',
    domain: {
        gameId: 'test-game',
        setup: () => ({ currentPlayer: '0' }),
        validate: () => ({ valid: true }),
        execute: () => [],
        reduce: (core) => core,
    },
    systems: [
        createInteractionSystem(),
        createSimpleChoiceSystem(),
    ],
});

const createStoredState = (): StoredMatchState => ({
    G: {
        core: { currentPlayer: '0' },
        sys: { phase: 'main', turnNumber: 1 },
    },
    _stateID: 0,
    randomSeed: 'seed',
    randomCursor: 0,
});

const createMetadata = (credentials: string): MatchMetadata => ({
    gameName: 'test-game',
    players: {
        '0': {
            name: '玩家0',
            credentials,
            isConnected: false,
        },
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
    setupData: {},
});

const createOnlineAiRecoveryMetadata = (): MatchMetadata => ({
    gameName: 'test-game',
    players: {
        '0': {
            name: '玩家0',
            credentials: 'cred-0',
            isConnected: false,
        },
        '1': {
            name: 'AI 1',
            credentials: 'cred-1',
            isConnected: false,
        },
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
    setupData: {
        enableAi: true,
        seatControllers: {
            '0': { type: 'human' },
            '1': { type: 'local-ai' },
        },
    },
});

const createOnlineAiRecoveryState = (overrides?: {
    activePlayerId?: string;
    phase?: string;
    interaction?: unknown;
    responseWindow?: unknown;
}): StoredMatchState => ({
    G: {
        core: {
            activePlayerId: overrides?.activePlayerId ?? '1',
            currentPlayerIndex: overrides?.activePlayerId === '0' ? 0 : 1,
            turnOrder: ['0', '1'],
        },
        sys: {
            phase: overrides?.phase ?? 'main2',
            turnNumber: 4,
            eventStream: { nextId: 1 },
            interaction: overrides?.interaction ?? {
                current: undefined,
                queue: [],
                isBlocked: false,
            },
            responseWindow: overrides?.responseWindow ?? {
                current: undefined,
            },
        },
    },
    _stateID: 0,
    randomSeed: 'seed',
    randomCursor: 0,
});

const hasEvent = (socket: MockSocket, event: string, predicate?: (args: unknown[]) => boolean): boolean => {
    return socket.sent.some((item) => item.event === event && (predicate ? predicate(item.args) : true));
};

const nextTick = async (): Promise<void> => {
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
};

class MockTrainingDataRecorder implements TrainingDataRecorder {
    readonly samples: TrainingDecisionSample[] = [];

    recordDecisionSample(sample: TrainingDecisionSample): void {
        this.samples.push(sample);
    }
}

class FailingTrainingDataRecorder implements TrainingDataRecorder {
    recordDecisionSample(): Promise<void> {
        return Promise.reject(new Error('disk-full'));
    }
}

describe('ResponseWindowSystem（重复打开去重）', () => {
    const createResponseWindowState = (overrides?: {
        current?: {
            id: string;
            windowType: string;
            sourceId?: string;
            responderQueue: string[];
            currentResponderIndex?: number;
            passedPlayers?: string[];
        };
    }) => ({
        core: {},
        sys: {
            phase: 'main2',
            interaction: {
                current: undefined,
                queue: [],
                isBlocked: false,
            },
            responseWindow: {
                current: overrides?.current
                    ? {
                        ...overrides.current,
                        currentResponderIndex: overrides.current.currentResponderIndex ?? 0,
                        passedPlayers: overrides.current.passedPlayers ?? [],
                    }
                    : undefined,
            },
        },
        _stateID: 0,
        randomSeed: 'seed',
        randomCursor: 0,
    });

    it('当前窗口已存在时，语义等价的 OPENED 事件不应重置响应者进度', () => {
        const system = createResponseWindowSystem();
        const state = createResponseWindowState({
            current: {
                id: 'rw-current',
                windowType: 'afterRollConfirmed',
                responderQueue: ['0', '1'],
                currentResponderIndex: 1,
                passedPlayers: ['0'],
            },
        });

        const result = system.afterEvents?.({
            state: state as any,
            events: [{
                type: RESPONSE_WINDOW_EVENTS.OPENED,
                payload: {
                    windowId: 'rw-duplicate',
                    responderQueue: ['0', '1'],
                    windowType: 'afterRollConfirmed',
                },
                timestamp: 1,
            }],
        });

        expect(result).toBeUndefined();
        expect(state.sys.responseWindow.current).toMatchObject({
            id: 'rw-current',
            currentResponderIndex: 1,
            passedPlayers: ['0'],
        });
    });

    it('同一批事件中 CLOSED 后紧接语义等价 OPENED 时，不应立即 reopen', () => {
        const system = createResponseWindowSystem();
        const state = createResponseWindowState({
            current: {
                id: 'rw-before-close',
                windowType: 'afterRollConfirmed',
                responderQueue: ['0'],
            },
        });

        const result = system.afterEvents?.({
            state: state as any,
            events: [
                {
                    type: RESPONSE_WINDOW_EVENTS.CLOSED,
                    payload: {
                        windowId: 'rw-before-close',
                        allPassed: true,
                    },
                    timestamp: 1,
                },
                {
                    type: RESPONSE_WINDOW_EVENTS.OPENED,
                    payload: {
                        windowId: 'rw-reopen-duplicate',
                        responderQueue: ['0'],
                        windowType: 'afterRollConfirmed',
                    },
                    timestamp: 2,
                },
            ],
        });

        expect(result).toBeTruthy();
        expect((result as { state: typeof state }).state.sys.responseWindow.current).toBeUndefined();
    });

    it('同一批事件中 CLOSED 后若出现非响应窗口业务事件，再收到 OPENED 应允许重新打开', () => {
        const system = createResponseWindowSystem();
        const state = createResponseWindowState({
            current: {
                id: 'rw-before-close',
                windowType: 'afterRollConfirmed',
                responderQueue: ['0'],
            },
        });

        const result = system.afterEvents?.({
            state: state as any,
            events: [
                {
                    type: RESPONSE_WINDOW_EVENTS.CLOSED,
                    payload: {
                        windowId: 'rw-before-close',
                        allPassed: true,
                    },
                    timestamp: 1,
                },
                {
                    type: 'ROLL_CONFIRMED',
                    payload: { playerId: '1' },
                    timestamp: 2,
                },
                {
                    type: RESPONSE_WINDOW_EVENTS.OPENED,
                    payload: {
                        windowId: 'rw-reopen-legit',
                        responderQueue: ['0'],
                        windowType: 'afterRollConfirmed',
                    },
                    timestamp: 3,
                },
            ],
        });

        expect(result).toBeTruthy();
        expect((result as { state: typeof state }).state.sys.responseWindow.current).toMatchObject({
            id: 'rw-reopen-legit',
            windowType: 'afterRollConfirmed',
            responderQueue: ['0'],
        });
    });

    it('冷却期内即使出现业务事件，语义等价窗口也不应重复 reopen', () => {
        const system = createResponseWindowSystem({ reopenDedupeCooldownMs: 5 });
        const state = createResponseWindowState({
            current: {
                id: 'rw-before-close',
                windowType: 'afterRollConfirmed',
                responderQueue: ['0'],
            },
        });

        const result = system.afterEvents?.({
            state: state as any,
            events: [
                {
                    type: RESPONSE_WINDOW_EVENTS.CLOSED,
                    payload: {
                        windowId: 'rw-before-close',
                        allPassed: true,
                    },
                    timestamp: 10,
                },
                {
                    type: 'ROLL_CONFIRMED',
                    payload: { playerId: '1' },
                    timestamp: 11,
                },
                {
                    type: RESPONSE_WINDOW_EVENTS.OPENED,
                    payload: {
                        windowId: 'rw-reopen-cooled',
                        responderQueue: ['0'],
                        windowType: 'afterRollConfirmed',
                    },
                    timestamp: 12,
                },
            ],
        });

        expect(result).toBeTruthy();
        expect((result as { state: typeof state }).state.sys.responseWindow.current).toBeUndefined();
    });

    it('冷却期结束后应允许语义等价窗口重新打开', () => {
        const system = createResponseWindowSystem({ reopenDedupeCooldownMs: 5 });
        const state = createResponseWindowState({
            current: {
                id: 'rw-before-close',
                windowType: 'afterRollConfirmed',
                responderQueue: ['0'],
            },
        });

        const result = system.afterEvents?.({
            state: state as any,
            events: [
                {
                    type: RESPONSE_WINDOW_EVENTS.CLOSED,
                    payload: {
                        windowId: 'rw-before-close',
                        allPassed: true,
                    },
                    timestamp: 10,
                },
                {
                    type: 'ROLL_CONFIRMED',
                    payload: { playerId: '1' },
                    timestamp: 11,
                },
                {
                    type: RESPONSE_WINDOW_EVENTS.OPENED,
                    payload: {
                        windowId: 'rw-reopen-after-cooldown',
                        responderQueue: ['0'],
                        windowType: 'afterRollConfirmed',
                    },
                    timestamp: 20,
                },
            ],
        });

        expect(result).toBeTruthy();
        expect((result as { state: typeof state }).state.sys.responseWindow.current).toMatchObject({
            id: 'rw-reopen-after-cooldown',
            windowType: 'afterRollConfirmed',
            responderQueue: ['0'],
        });
    });
});

describe('buildAiProgressMarker（响应窗口语义指纹）', () => {
    it('响应窗口 id 变化不应被视为进展', () => {
        const baseState = createOnlineAiRecoveryState({
            responseWindow: {
                current: {
                    id: 'rw-1',
                    windowType: 'afterRollConfirmed',
                    responderQueue: ['1'],
                    currentResponderIndex: 0,
                    passedPlayers: [],
                },
            },
        });
        const reopenedState = {
            ...baseState,
            G: {
                ...baseState.G,
                sys: {
                    ...baseState.G.sys,
                    eventStream: { nextId: 99 },
                    responseWindow: {
                        current: {
                            id: 'rw-2',
                            windowType: 'afterRollConfirmed',
                            responderQueue: ['1'],
                            currentResponderIndex: 0,
                            passedPlayers: [],
                        },
                    },
                },
            },
        };

        expect(buildAiProgressMarker(baseState as any))
            .toBe(buildAiProgressMarker(reopenedState as any));
    });
});

describe('GameTransportServer（离座与重连）', () => {
    it('setupMatch 应返回初始化后的随机游标', async () => {
        const io = new MockIO();
        const storage = new InMemoryStorage();
        const randomEngine: GameEngineConfig = {
            ...createEngineConfig(),
            domain: {
                ...createEngineConfig().domain,
                setup: (_playerIds, random) => ({
                    currentPlayer: '0',
                    initRoll: random.d(6),
                }),
            },
        };

        const server = new GameTransportServer({
            io: io as unknown as any,
            storage,
            games: [randomEngine],
        });

        const result = await server.setupMatch('match-seed', 'test-game', ['0', '1'], 'seed-1');

        expect(result).toBeTruthy();
        expect(result?.randomCursor).toBeGreaterThan(0);
    });

    it('setupMatch 应把 AI 座位写入 undo 状态', async () => {
        const io = new MockIO();
        const storage = new InMemoryStorage();
        const server = new GameTransportServer({
            io: io as unknown as any,
            storage,
            games: [createEngineConfig()],
        });

        const result = await server.setupMatch('match-ai-undo', 'test-game', ['0', '1'], 'seed-ai', {
            seatControllers: {
                '0': { type: 'human' },
                '1': { type: 'local-ai' },
            },
        });

        expect(result?.state.sys.undo.aiSeatIds).toEqual(['1']);
    });

    it('setupMatch 应透传 setupData 到 domain.setup', async () => {
        const io = new MockIO();
        const storage = new InMemoryStorage();
        const setupData = { firstPlayerId: '1', tag: 'from-test' };
        let receivedSetupData: unknown;

        const engineWithSetupData: GameEngineConfig = {
            ...createEngineConfig(),
            domain: {
                ...createEngineConfig().domain,
                setup: (_playerIds, _random, incomingSetupData) => {
                    receivedSetupData = incomingSetupData;
                    return { currentPlayer: '0' };
                },
            },
        };

        const server = new GameTransportServer({
            io: io as unknown as any,
            storage,
            games: [engineWithSetupData],
        });

        const result = await server.setupMatch(
            'match-setup-data',
            'test-game',
            ['0', '1'],
            'seed-2',
            setupData,
        );

        expect(result).toBeTruthy();
        expect(receivedSetupData).toEqual(setupData);
    });

    it('offline adjudication should use domain cancel command for dt card interaction', async () => {
        const io = new MockIO();
        const storage = new InMemoryStorage();
        let lastCommandType: string | undefined;

        const initialState: StoredMatchState = {
            G: {
                core: { currentPlayer: '0' },
                sys: {
                    phase: 'main',
                    turnNumber: 1,
                    interaction: {
                        current: {
                            id: 'dt-interaction-1',
                            kind: 'dt:card-interaction',
                            playerId: '0',
                            data: {
                                id: 'interaction-1',
                                playerId: '0',
                                sourceCardId: 'card-1',
                            },
                        },
                        queue: [],
                    },
                },
            },
            _stateID: 0,
            randomSeed: 'seed',
            randomCursor: 0,
        };

        await storage.createMatch('match-offline-dt', {
            initialState,
            metadata: createMetadata('offline-cred'),
        });

        const engineConfig: GameEngineConfig = {
            ...createEngineConfig(),
            domain: {
                ...createEngineConfig().domain,
                validate: (_state, command) => {
                    lastCommandType = command.type;
                    return { valid: true };
                },
                execute: () => [],
            },
        };

        const server = new GameTransportServer({
            io: io as unknown as any,
            storage,
            games: [engineConfig],
        });

        const serverInternal = server as unknown as {
            loadMatch: (matchID: string) => Promise<unknown>;
            runOfflineAdjudication: (match: unknown, playerID: string) => Promise<void>;
        };

        const match = await serverInternal.loadMatch('match-offline-dt');
        expect(match).toBeTruthy();

        await serverInternal.runOfflineAdjudication(match, '0');

        expect(lastCommandType).toBe('SYS_INTERACTION_CANCEL'); // 已迁移到 InteractionSystem
    });

    it.each([
        ['simple-choice', 'SYS_INTERACTION_CANCEL'],
        ['dt:token-response', 'SKIP_TOKEN_RESPONSE'],
        ['dt:bonus-dice', 'SKIP_BONUS_DICE_REROLL'],
    ])('离线裁决应按 kind=%s 映射命令 %s', async (kind, expectedCommand) => {
        const io = new MockIO();
        const storage = new InMemoryStorage();
        let lastCommandType: string | undefined;

        const initialState: StoredMatchState = {
            G: {
                core: { currentPlayer: '0' },
                sys: {
                    phase: 'main',
                    turnNumber: 1,
                    interaction: {
                        current: {
                            id: `interaction-${kind}`,
                            kind,
                            playerId: '0',
                            data: {},
                        },
                        queue: [],
                    },
                },
            },
            _stateID: 0,
            randomSeed: 'seed',
            randomCursor: 0,
        };

        await storage.createMatch(`match-offline-${kind}`, {
            initialState,
            metadata: createMetadata('offline-cred'),
        });

        const engineConfig: GameEngineConfig = {
            ...createEngineConfig(),
            domain: {
                ...createEngineConfig().domain,
                validate: (_state, command) => {
                    lastCommandType = command.type;
                    return { valid: true };
                },
                execute: () => [],
            },
        };

        const server = new GameTransportServer({
            io: io as unknown as any,
            storage,
            games: [engineConfig],
        });

        const serverInternal = server as unknown as {
            loadMatch: (matchID: string) => Promise<unknown>;
            runOfflineAdjudication: (match: unknown, playerID: string) => Promise<void>;
        };

        const match = await serverInternal.loadMatch(`match-offline-${kind}`);
        expect(match).toBeTruthy();

        await serverInternal.runOfflineAdjudication(match, '0');

        expect(lastCommandType).toBe(expectedCommand);
    });

    it('sync should reject stale credentials after metadata refresh', async () => {
        const io = new MockIO();
        const storage = new InMemoryStorage();
        const initialMetadata = createMetadata('old-cred');
        await storage.createMatch('match-1', {
            initialState: createStoredState(),
            metadata: initialMetadata,
        });

        const server = new GameTransportServer({
            io: io as unknown as any,
            storage,
            games: [createEngineConfig()],
            authenticate: async (_matchID, playerID, credentials, metadata) => {
                return metadata.players[playerID]?.credentials === credentials;
            },
        });
        server.start();

        const oldSocket = new MockSocket('socket-old');
        io.gameNamespace.connectSocket(oldSocket);
        await oldSocket.clientEmit('sync', 'match-1', '0', 'old-cred');
        expect(hasEvent(oldSocket, 'state:sync')).toBe(true);

        const refreshedMetadata: MatchMetadata = {
            ...initialMetadata,
            players: {
                ...initialMetadata.players,
                '0': {
                    ...initialMetadata.players['0'],
                    credentials: 'new-cred',
                },
            },
            updatedAt: Date.now(),
        };
        await storage.setMetadata('match-1', refreshedMetadata);

        // 不更新 active match 缓存，验证 sync 会主动读取存储层最新 metadata。
        await oldSocket.clientEmit('sync', 'match-1', '0', 'old-cred');
        expect(hasEvent(oldSocket, 'error', (args) => args[1] === 'unauthorized')).toBe(true);

        const newSocket = new MockSocket('socket-new');
        io.gameNamespace.connectSocket(newSocket);
        await newSocket.clientEmit('sync', 'match-1', '0', 'new-cred');
        expect(hasEvent(newSocket, 'state:sync')).toBe(true);
        expect(hasEvent(newSocket, 'error', (args) => args[1] === 'unauthorized')).toBe(false);
    });

    it('sync should prefer auth metadata provider for active matches', async () => {
        const io = new MockIO();
        const storage = new InMemoryStorage();
        await storage.createMatch('match-auth-provider', {
            initialState: createStoredState(),
            metadata: createMetadata('cred-auth-provider'),
        });

        const fetchSpy = vi.spyOn(storage, 'fetch');
        const authMetadataSpy = vi.spyOn(storage, 'fetchAuthMetadata');

        const server = new GameTransportServer({
            io: io as unknown as any,
            storage,
            games: [createEngineConfig()],
            authenticate: async (_matchID, playerID, credentials, metadata) => {
                return metadata.players[playerID]?.credentials === credentials;
            },
        });
        server.start();

        const socket = new MockSocket('socket-auth-provider');
        io.gameNamespace.connectSocket(socket);
        await socket.clientEmit('sync', 'match-auth-provider', '0', 'cred-auth-provider');

        fetchSpy.mockClear();
        authMetadataSpy.mockClear();
        socket.sent.length = 0;

        await socket.clientEmit('sync', 'match-auth-provider', '0', 'cred-auth-provider');

        expect(authMetadataSpy).toHaveBeenCalledTimes(1);
        expect(fetchSpy).not.toHaveBeenCalled();
        expect(hasEvent(socket, 'state:sync')).toBe(true);
    });

    it('sync should not wait for metadata persistence before emitting state:sync', async () => {
        const io = new MockIO();
        const storage = new InMemoryStorage();
        await storage.createMatch('match-sync-fast', {
            initialState: createStoredState(),
            metadata: createMetadata('cred-fast'),
        });

        let resolvePersist: (() => void) | null = null;
        const persistBlocked = new Promise<void>((resolve) => {
            resolvePersist = resolve;
        });
        const setMetadataSpy = vi.spyOn(storage, 'setMetadata').mockImplementation(async (matchID, metadata) => {
            await persistBlocked;
            return InMemoryStorage.prototype.setMetadata.call(storage, matchID, metadata);
        });

        const server = new GameTransportServer({
            io: io as unknown as any,
            storage,
            games: [createEngineConfig()],
            authenticate: async (_matchID, playerID, credentials, metadata) => {
                return metadata.players[playerID]?.credentials === credentials;
            },
        });
        server.start();

        const socket = new MockSocket('socket-sync-fast');
        io.gameNamespace.connectSocket(socket);

        const syncPromise = socket.clientEmit('sync', 'match-sync-fast', '0', 'cred-fast');
        await nextTick();

        expect(hasEvent(socket, 'state:sync')).toBe(true);
        expect(setMetadataSpy).toHaveBeenCalledTimes(1);

        resolvePersist?.();
        await syncPromise;
    });

    it('离座后断开旧连接，使用新凭证可继续同一 seat 进度', async () => {
        const io = new MockIO();
        const storage = new InMemoryStorage();
        const initialMetadata = createMetadata('seat-cred-old');
        await storage.createMatch('match-2', {
            initialState: createStoredState(),
            metadata: initialMetadata,
        });

        const server = new GameTransportServer({
            io: io as unknown as any,
            storage,
            games: [createEngineConfig()],
            authenticate: async (_matchID, playerID, credentials, metadata) => {
                return metadata.players[playerID]?.credentials === credentials;
            },
        });
        server.start();

        const oldSocket = new MockSocket('socket-seat-old');
        io.gameNamespace.connectSocket(oldSocket);
        await oldSocket.clientEmit('sync', 'match-2', '0', 'seat-cred-old');
        expect(hasEvent(oldSocket, 'state:sync')).toBe(true);

        const leftMetadata: MatchMetadata = {
            ...initialMetadata,
            players: {
                ...initialMetadata.players,
                '0': {
                    isConnected: false,
                },
            },
            updatedAt: Date.now(),
        };
        await storage.setMetadata('match-2', leftMetadata);
        server.updateMatchMetadata('match-2', leftMetadata);
        server.disconnectPlayer('match-2', '0', { disconnectSockets: true });
        await nextTick();
        expect(oldSocket.disconnected).toBe(true);

        const rejoinMetadata: MatchMetadata = {
            ...leftMetadata,
            players: {
                ...leftMetadata.players,
                '0': {
                    name: '接替玩家',
                    credentials: 'seat-cred-new',
                    isConnected: false,
                },
            },
            updatedAt: Date.now(),
        };
        await storage.setMetadata('match-2', rejoinMetadata);
        server.updateMatchMetadata('match-2', rejoinMetadata);

        const newSocket = new MockSocket('socket-seat-new');
        io.gameNamespace.connectSocket(newSocket);
        await newSocket.clientEmit('sync', 'match-2', '0', 'seat-cred-new');
        expect(hasEvent(newSocket, 'state:sync')).toBe(true);
        expect(hasEvent(newSocket, 'error', (args) => args[1] === 'unauthorized')).toBe(false);
    });

    it('不应通过 /game socket 暴露 test:injectState', async () => {
        const io = new MockIO();
        const storage = new InMemoryStorage();
        const initialState = createStoredState();
        await storage.createMatch('match-no-socket-inject', {
            initialState,
            metadata: createMetadata('cred-0'),
        });

        const server = new GameTransportServer({
            io: io as unknown as any,
            storage,
            games: [createEngineConfig()],
            authenticate: async (_matchID, playerID, credentials, metadata) => {
                return metadata.players[playerID]?.credentials === credentials;
            },
        });
        server.start();

        const socket = new MockSocket('socket-no-inject');
        io.gameNamespace.connectSocket(socket);
        await socket.clientEmit('sync', 'match-no-socket-inject', '0', 'cred-0');
        expect(hasEvent(socket, 'state:sync')).toBe(true);

        const injectedState = createStoredState().G as { core: { currentPlayer: string } };
        injectedState.core.currentPlayer = '1';

        await socket.clientEmit('test:injectState', 'match-no-socket-inject', injectedState);

        const persisted = await storage.fetch('match-no-socket-inject', { state: true });
        expect((persisted.state?.G as { core: { currentPlayer: string } }).core.currentPlayer).toBe('0');
        expect(hasEvent(socket, 'test:injectState:success')).toBe(false);
        expect(hasEvent(socket, 'test:injectState:error')).toBe(false);
    });

    it('成功命令后应采集训练决策样本', async () => {
        const io = new MockIO();
        const storage = new InMemoryStorage();
        const recorder = new MockTrainingDataRecorder();

        await storage.createMatch('match-train-1', {
            initialState: createStoredState(),
            metadata: createMetadata('cred-0'),
        });

        const server = new GameTransportServer({
            io: io as unknown as any,
            storage,
            games: [createEngineConfigWithGameOver()],
            trainingDataRecorder: recorder,
            rulesVersion: 'test-rules-v1',
            authenticate: async (_matchID, playerID, credentials, metadata) => {
                return metadata.players[playerID]?.credentials === credentials;
            },
        });
        server.start();

        const socket = new MockSocket('socket-train-1');
        io.gameNamespace.connectSocket(socket);
        await socket.clientEmit('sync', 'match-train-1', '0', 'cred-0');
        await socket.clientEmit('command', 'match-train-1', 'TEST_CMD', { foo: 'bar' }, 'cred-0');

        expect(recorder.samples).toHaveLength(1);
        expect(recorder.samples[0]).toMatchObject({
            rulesVersion: 'test-rules-v1',
            gameId: 'test-game',
            matchId: 'match-train-1',
            playerId: '0',
            seatControllerType: 'human',
            stateIdBefore: 0,
            stateIdAfter: 1,
            command: {
                type: 'TEST_CMD',
                payload: { foo: 'bar' },
            },
            legalActions: [],
        });
        expect(recorder.samples[0].preState).toBeTruthy();
        expect(recorder.samples[0].postState).toBeTruthy();
    });

    it('training recorder 失败不应影响命令执行', async () => {
        const io = new MockIO();
        const storage = new InMemoryStorage();

        await storage.createMatch('match-train-fail', {
            initialState: createStoredState(),
            metadata: createMetadata('cred-0'),
        });

        const server = new GameTransportServer({
            io: io as unknown as any,
            storage,
            games: [createEngineConfigWithGameOver()],
            trainingDataRecorder: new FailingTrainingDataRecorder(),
            authenticate: async (_matchID, playerID, credentials, metadata) => {
                return metadata.players[playerID]?.credentials === credentials;
            },
        });
        server.start();

        const socket = new MockSocket('socket-train-fail');
        io.gameNamespace.connectSocket(socket);
        await socket.clientEmit('sync', 'match-train-fail', '0', 'cred-0');
        await socket.clientEmit('command', 'match-train-fail', 'TEST_CMD', { foo: 'bar' }, 'cred-0');
        await nextTick();

        const persisted = await storage.fetch('match-train-fail', { state: true });
        expect(persisted.state?._stateID).toBe(1);
        expect(hasEvent(socket, 'error')).toBe(false);
    });

    it('训练采集应在达到时长门槛后才写入', async () => {
        vi.useFakeTimers();
        const now = Date.now();
        const minDurationMs = 10 * 60 * 1000;

        try {
            const io = new MockIO();
            const storage = new InMemoryStorage();
            const recorder = new MockTrainingDataRecorder();

            await storage.createMatch('match-train-duration', {
                initialState: createStoredState(),
                metadata: {
                    ...createMetadata('cred-duration'),
                    createdAt: now,
                    updatedAt: now,
                },
            });

            const server = new GameTransportServer({
                io: io as unknown as any,
                storage,
                games: [createEngineConfig()],
                trainingDataRecorder: recorder,
                trainingDataMinMatchDurationMs: minDurationMs,
                authenticate: async (_matchID, playerID, credentials, metadata) => {
                    return metadata.players[playerID]?.credentials === credentials;
                },
            });
            server.start();

            const socket = new MockSocket('socket-train-duration');
            io.gameNamespace.connectSocket(socket);
            await socket.clientEmit('sync', 'match-train-duration', '0', 'cred-duration');
            await socket.clientEmit('command', 'match-train-duration', 'TEST_CMD', { foo: 'bar' }, 'cred-duration');

            expect(recorder.samples).toHaveLength(0);

            vi.setSystemTime(now + minDurationMs + 1000);
            await socket.clientEmit('command', 'match-train-duration', 'TEST_CMD_2', { foo: 'baz' }, 'cred-duration');

            expect(recorder.samples).toHaveLength(2);
            expect(recorder.samples[0].command.type).toBe('TEST_CMD');
            expect(recorder.samples[1].command.type).toBe('TEST_CMD_2');
        } finally {
            vi.useRealTimers();
        }
    });

    it('默认应跳过 AI seat 的训练样本，只记录真人 seat', async () => {
        const io = new MockIO();
        const storage = new InMemoryStorage();
        const recorder = new MockTrainingDataRecorder();

        await storage.createMatch('match-train-human-only', {
            initialState: createStoredState(),
            metadata: {
                ...createMetadata('cred-ai'),
                players: {
                    '0': { name: '玩家0', credentials: 'cred-ai', isConnected: false },
                    '1': { name: 'AI 玩家1', credentials: 'cred-ai-seat-1', isConnected: false },
                },
                setupData: {
                    seatControllers: {
                        '0': { type: 'human' },
                        '1': { type: 'local-ai' },
                    },
                },
            },
        });

        const server = new GameTransportServer({
            io: io as unknown as any,
            storage,
            games: [createEngineConfigWithGameOver()],
            trainingDataRecorder: recorder,
            authenticate: async (_matchID, playerID, credentials, metadata) => {
                return metadata.players[playerID]?.credentials === credentials;
            },
        });
        server.start();

        const socket = new MockSocket('socket-train-human-only');
        io.gameNamespace.connectSocket(socket);
        await socket.clientEmit('sync', 'match-train-human-only', '0', 'cred-ai');
        await socket.clientEmit('command', 'match-train-human-only', 'TEST_CMD', { foo: 'bar' }, 'cred-ai');

        expect(recorder.samples).toHaveLength(1);
        expect(recorder.samples[0]).toMatchObject({
            playerId: '0',
            seatControllerType: 'human',
        });

        await server.executeCommand('match-train-human-only', '1', 'AI_CMD', { auto: true });

        expect(recorder.samples).toHaveLength(1);
    });

    it('manifest 声明 all-seats 时应继续采集 AI seat 样本', async () => {
        const io = new MockIO();
        const storage = new InMemoryStorage();
        const recorder = new MockTrainingDataRecorder();
        const previousManifest = GAME_MANIFEST_BY_ID['test-game'];

        GAME_MANIFEST_BY_ID['test-game'] = {
            ...GAME_MANIFEST_BY_ID.tictactoe,
            id: 'test-game',
            ai: {
                ...GAME_MANIFEST_BY_ID.tictactoe.ai!,
                capture: true,
                capturePolicy: 'all-seats',
            },
        };

        try {
            await storage.createMatch('match-train-all-seats', {
                initialState: createStoredState(),
                metadata: {
                    ...createMetadata('cred-ai-all'),
                    players: {
                        '0': { name: '玩家0', credentials: 'cred-ai-all', isConnected: false },
                        '1': { name: 'AI 玩家1', credentials: 'cred-ai-seat-1', isConnected: false },
                    },
                    setupData: {
                        seatControllers: {
                            '0': { type: 'human' },
                            '1': { type: 'local-ai' },
                        },
                    },
                },
            });

            const server = new GameTransportServer({
                io: io as unknown as any,
                storage,
                games: [createEngineConfigWithGameOver()],
                trainingDataRecorder: recorder,
                authenticate: async (_matchID, playerID, credentials, metadata) => {
                    return metadata.players[playerID]?.credentials === credentials;
                },
            });
            server.start();

            const socket = new MockSocket('socket-train-all-seats');
            io.gameNamespace.connectSocket(socket);
            await socket.clientEmit('sync', 'match-train-all-seats', '0', 'cred-ai-all');
            await server.executeCommand('match-train-all-seats', '1', 'AI_CMD', { auto: true });

            expect(recorder.samples).toHaveLength(1);
            expect(recorder.samples[0]).toMatchObject({
                playerId: '1',
                seatControllerType: 'local-ai',
                command: {
                    type: 'AI_CMD',
                    payload: { auto: true },
                },
            });
        } finally {
            if (previousManifest) {
                GAME_MANIFEST_BY_ID['test-game'] = previousManifest;
            } else {
                delete GAME_MANIFEST_BY_ID['test-game'];
            }
        }
    });

    it('online AI watchdog 在 active-turn 卡死时应持续推进直到交还给真人回合（或遇到 blocker/步数上限）', async () => {
        const io = new MockIO();
        const storage = new InMemoryStorage();
        const feedbackReporter = vi.fn(async () => undefined);

        await storage.createMatch('match-watchdog-success', {
            initialState: createOnlineAiRecoveryState(),
            metadata: createOnlineAiRecoveryMetadata(),
        });

        const server = new GameTransportServer({
            io: io as unknown as any,
            storage,
            games: [createEngineConfig()],
            onlineAiRecoveryTickMs: 0,
            onlineAiRecoveryTimeoutMs: 0,
            onlineAiRecoveryMaxAdvanceSteps: 4,
            onlineAiFeedbackReporter: feedbackReporter,
        });

        const serverInternal = server as unknown as {
            loadMatch: (matchID: string) => Promise<any>;
            runOnlineAiRecoveryTick: () => Promise<void>;
            executeCommandInternal: (
                match: any,
                playerID: string,
                commandType: string,
                payload: unknown,
            ) => Promise<boolean>;
        };

        const match = await serverInternal.loadMatch('match-watchdog-success');
        expect(match).toBeTruthy();

        const executeSpy = vi.spyOn(serverInternal, 'executeCommandInternal').mockImplementation(async (activeMatch, _playerID, commandType) => {
            if (commandType !== 'ADVANCE_PHASE') {
                return false;
            }
            if (activeMatch.state.sys.phase === 'main2') {
                activeMatch.state = {
                    ...activeMatch.state,
                    core: {
                        ...activeMatch.state.core,
                        activePlayerId: '1',
                        currentPlayerIndex: 1,
                    },
                    sys: {
                        ...activeMatch.state.sys,
                        phase: 'discard',
                    },
                };
                return true;
            }
            if (activeMatch.state.sys.phase === 'discard') {
                activeMatch.state = {
                    ...activeMatch.state,
                    core: {
                        ...activeMatch.state.core,
                        activePlayerId: '0',
                        currentPlayerIndex: 0,
                    },
                    sys: {
                        ...activeMatch.state.sys,
                        phase: 'main1',
                        turnNumber: 5,
                    },
                };
                return true;
            }
            return true;
        });

        await serverInternal.runOnlineAiRecoveryTick();
        await serverInternal.runOnlineAiRecoveryTick();
        await serverInternal.runOnlineAiRecoveryTick();
        await nextTick();
        await nextTick();
        await nextTick();

        // main2 -> discard -> main1（交还到玩家0）
        expect(executeSpy).toHaveBeenCalledTimes(2);
        expect(match.state.sys.phase).toBe('main1');
        expect(match.state.sys.turnNumber).toBe(5);
        expect(match.state.core.activePlayerId).toBe('0');
        expect(feedbackReporter).toHaveBeenCalledTimes(1);
        expect(feedbackReporter).toHaveBeenCalledWith(expect.objectContaining({
            matchId: 'match-watchdog-success',
            playerId: '1',
            incidentKind: 'force-end-turn-success',
        }));
    });

    it('online AI watchdog 在 summonerwars 应使用 END_PHASE 推进阶段', async () => {
        const io = new MockIO();
        const storage = new InMemoryStorage();
        const feedbackReporter = vi.fn(async () => undefined);

        await storage.createMatch('match-watchdog-sw-end-phase', {
            initialState: createOnlineAiRecoveryState(),
            metadata: {
                ...createOnlineAiRecoveryMetadata(),
                gameName: 'summonerwars',
            },
        });

        const server = new GameTransportServer({
            io: io as unknown as any,
            storage,
            games: [createEngineConfigWithId('summonerwars')],
            onlineAiRecoveryTickMs: 0,
            onlineAiRecoveryTimeoutMs: 0,
            onlineAiRecoveryMaxAdvanceSteps: 1,
            onlineAiFeedbackReporter: feedbackReporter,
        });

        const serverInternal = server as unknown as {
            loadMatch: (matchID: string) => Promise<any>;
            executeCommandInternal: (
                match: any,
                playerID: string,
                commandType: string,
                payload: unknown,
            ) => Promise<boolean>;
            runOnlineAiRecoverySequence: (
                match: any,
                tracker: any,
                candidate: any,
                progressMarkerBeforeRecovery: string,
                seatControllers: Record<string, { type: 'human' | 'local-ai' | 'remote-ai' }>,
            ) => Promise<void>;
        };

        const match = await serverInternal.loadMatch('match-watchdog-sw-end-phase');
        expect(match).toBeTruthy();

        const executeSpy = vi.spyOn(serverInternal, 'executeCommandInternal').mockImplementation(async (activeMatch, _playerID, commandType) => {
            if (commandType !== 'sw:end_phase') {
                return false;
            }
            activeMatch.state = {
                ...activeMatch.state,
                sys: {
                    ...activeMatch.state.sys,
                    phase: 'discard',
                },
            };
            return true;
        });

        const candidate = {
            playerId: '1',
            reason: 'active-turn',
            resolution: {
                playerId: '1',
                attemptKey: 'force-end-turn:1:test',
                source: 'local-ai',
                action: {
                    actionId: 'force-end-turn:test',
                    kind: 'force-end-turn',
                    label: '强制结束 AI 回合',
                    commands: [{ type: 'ADVANCE_PHASE', payload: {} }],
                },
            },
        };
        const tracker = {
            key: 'test',
            firstSeenAt: Date.now(),
            autoSubmittedAt: null,
            lastReportedFailureReason: null,
            failureCount: 0,
        };
        const progressMarker = buildAiProgressMarker(match.state);
        await serverInternal.runOnlineAiRecoverySequence(
            match,
            tracker,
            candidate,
            progressMarker,
            {
                '0': { type: 'human' },
                '1': { type: 'local-ai' },
            },
        );

        // 初始 + 一次 follow-up（maxAdvanceSteps=1）都应映射成 sw:end_phase
        expect(executeSpy).toHaveBeenCalledTimes(2);
        expect(executeSpy).toHaveBeenNthCalledWith(
            1,
            expect.anything(),
            '1',
            'sw:end_phase',
            expect.anything(),
        );
        expect(executeSpy).toHaveBeenNthCalledWith(
            2,
            expect.anything(),
            '1',
            'sw:end_phase',
            expect.anything(),
        );
    });

    it('online AI watchdog 不得在当前轮到 human 时误触发恢复', async () => {
        const io = new MockIO();
        const storage = new InMemoryStorage();
        const feedbackReporter = vi.fn(async () => undefined);

        await storage.createMatch('match-watchdog-human-guard', {
            initialState: createOnlineAiRecoveryState({
                activePlayerId: '0',
                phase: 'main2',
            }),
            metadata: createOnlineAiRecoveryMetadata(),
        });

        const server = new GameTransportServer({
            io: io as unknown as any,
            storage,
            games: [createEngineConfig()],
            onlineAiRecoveryTickMs: 0,
            onlineAiRecoveryTimeoutMs: 0,
            onlineAiFeedbackReporter: feedbackReporter,
        });

        const serverInternal = server as unknown as {
            loadMatch: (matchID: string) => Promise<any>;
            runOnlineAiRecoveryTick: () => Promise<void>;
            executeCommandInternal: (
                match: any,
                playerID: string,
                commandType: string,
                payload: unknown,
            ) => Promise<boolean>;
        };

        await serverInternal.loadMatch('match-watchdog-human-guard');
        const executeSpy = vi.spyOn(serverInternal, 'executeCommandInternal');

        await serverInternal.runOnlineAiRecoveryTick();
        await serverInternal.runOnlineAiRecoveryTick();
        await nextTick();

        expect(executeSpy).not.toHaveBeenCalled();
        expect(feedbackReporter).not.toHaveBeenCalled();
    });

    it('online AI watchdog 缺少 enableAi 标记时仍应根据 seatControllers 启动', async () => {
        const io = new MockIO();
        const storage = new InMemoryStorage();
        const feedbackReporter = vi.fn(async () => undefined);

        await storage.createMatch('match-watchdog-stale-seat-controllers', {
            initialState: createOnlineAiRecoveryState({
                activePlayerId: '1',
                phase: 'main2',
            }),
            metadata: {
                ...createOnlineAiRecoveryMetadata(),
                setupData: {
                    seatControllers: {
                        '0': { type: 'human' },
                        '1': { type: 'local-ai' },
                    },
                },
            },
        });

        const server = new GameTransportServer({
            io: io as unknown as any,
            storage,
            games: [createEngineConfig()],
            onlineAiRecoveryTickMs: 0,
            onlineAiRecoveryTimeoutMs: 0,
            onlineAiFeedbackReporter: feedbackReporter,
        });

        const serverInternal = server as unknown as {
            loadMatch: (matchID: string) => Promise<any>;
            runOnlineAiRecoveryTick: () => Promise<void>;
            executeCommandInternal: (
                match: any,
                playerID: string,
                commandType: string,
                payload: unknown,
            ) => Promise<boolean>;
        };

        const match = await serverInternal.loadMatch('match-watchdog-stale-seat-controllers');
        const executeSpy = vi.spyOn(serverInternal, 'executeCommandInternal').mockImplementation(async (activeMatch, _playerID, commandType) => {
            if (commandType !== 'ADVANCE_PHASE') {
                return false;
            }
            activeMatch.state = {
                ...activeMatch.state,
                sys: {
                    ...activeMatch.state.sys,
                    phase: 'main1',
                    turnNumber: (activeMatch.state.sys?.turnNumber ?? 0) + 1,
                },
                core: {
                    ...activeMatch.state.core,
                    activePlayerId: '0',
                    currentPlayerIndex: 0,
                },
            };
            return true;
        });

        await serverInternal.runOnlineAiRecoveryTick();
        await serverInternal.runOnlineAiRecoveryTick();
        await nextTick();

        expect(executeSpy).toHaveBeenCalled();
        expect(match.state.core.activePlayerId).toBe('0');
        expect(match.state.sys.phase).toBe('main1');
        expect(feedbackReporter).toHaveBeenCalledWith(expect.objectContaining({
            matchId: 'match-watchdog-stale-seat-controllers',
            playerId: '1',
            incidentKind: 'force-end-turn-success',
        }));
    });

    it('online AI watchdog 在 responseWindow 当前响应者为 human 时不得误触发强制结束 AI 回合', async () => {
        const io = new MockIO();
        const storage = new InMemoryStorage();
        const feedbackReporter = vi.fn(async () => undefined);

        await storage.createMatch('match-watchdog-response-window-human', {
            initialState: createOnlineAiRecoveryState({
                activePlayerId: '1', // AI 回合
                phase: 'main2',
                responseWindow: {
                    current: {
                        id: 'rw-1',
                        windowType: 'test',
                        responderQueue: ['0'], // 轮到 human 响应
                        currentResponderIndex: 0,
                        passedPlayers: [],
                    },
                },
            }),
            metadata: createOnlineAiRecoveryMetadata(),
        });

        const server = new GameTransportServer({
            io: io as unknown as any,
            storage,
            games: [createEngineConfig()],
            onlineAiRecoveryTickMs: 0,
            onlineAiRecoveryTimeoutMs: 0,
            onlineAiFeedbackReporter: feedbackReporter,
        });

        const serverInternal = server as unknown as {
            loadMatch: (matchID: string) => Promise<any>;
            runOnlineAiRecoveryTick: () => Promise<void>;
            executeCommandInternal: (
                match: any,
                playerID: string,
                commandType: string,
                payload: unknown,
            ) => Promise<boolean>;
        };

        await serverInternal.loadMatch('match-watchdog-response-window-human');
        const executeSpy = vi.spyOn(serverInternal, 'executeCommandInternal');

        await serverInternal.runOnlineAiRecoveryTick();
        await serverInternal.runOnlineAiRecoveryTick();
        await nextTick();

        expect(executeSpy).not.toHaveBeenCalled();
        expect(feedbackReporter).not.toHaveBeenCalled();
    });

    it('online AI watchdog 失败反馈应按 incident key 去重冷却', async () => {
        const io = new MockIO();
        const storage = new InMemoryStorage();
        const feedbackReporter = vi.fn(async () => undefined);

        await storage.createMatch('match-watchdog-failure', {
            initialState: createOnlineAiRecoveryState(),
            metadata: createOnlineAiRecoveryMetadata(),
        });

        const server = new GameTransportServer({
            io: io as unknown as any,
            storage,
            games: [createEngineConfig()],
            onlineAiRecoveryTickMs: 0,
            onlineAiRecoveryTimeoutMs: 0,
            onlineAiRecoveryFailureReportThreshold: 1,
            onlineAiFeedbackReporter: feedbackReporter,
        });

        const serverInternal = server as unknown as {
            loadMatch: (matchID: string) => Promise<any>;
            runOnlineAiRecoveryTick: () => Promise<void>;
            executeCommandInternal: (
                match: any,
                playerID: string,
                commandType: string,
                payload: unknown,
            ) => Promise<boolean>;
        };

        await serverInternal.loadMatch('match-watchdog-failure');
        vi.spyOn(serverInternal, 'executeCommandInternal').mockResolvedValue(false);

        await serverInternal.runOnlineAiRecoveryTick();
        await serverInternal.runOnlineAiRecoveryTick();
        await nextTick();
        await serverInternal.runOnlineAiRecoveryTick();
        await serverInternal.runOnlineAiRecoveryTick();
        await nextTick();

        expect(feedbackReporter).toHaveBeenCalledTimes(1);
        expect(feedbackReporter).toHaveBeenCalledWith(expect.objectContaining({
            matchId: 'match-watchdog-failure',
            playerId: '1',
            incidentKind: 'force-end-turn-failed',
        }));
    });

    it('online AI watchdog 自动反馈应携带交互选项与可选性诊断信息', async () => {
        const io = new MockIO();
        const storage = new InMemoryStorage();
        const feedbackReporter = vi.fn(async () => undefined);

        await storage.createMatch('match-watchdog-option-diagnostics', {
            initialState: createOnlineAiRecoveryState({
                interaction: {
                    current: {
                        id: 'visible-choice-1',
                        kind: 'simple-choice',
                        playerId: '1',
                        data: {
                            sourceId: 'dt-test-visible-choice',
                            title: 'interaction.chooseTarget',
                            multi: { min: 1 },
                            options: [
                                {
                                    id: 'option-disabled',
                                    label: '被禁用目标',
                                    disabled: true,
                                    disabledReason: '目标已失效',
                                    value: { targetId: 'm-1' },
                                },
                                {
                                    id: 'option-manual',
                                    label: '只能人工决定',
                                    value: { targetId: 'm-2' },
                                },
                            ],
                        },
                    },
                    queue: [],
                    isBlocked: false,
                },
            }),
            metadata: createOnlineAiRecoveryMetadata(),
        });

        const server = new GameTransportServer({
            io: io as unknown as any,
            storage,
            games: [createEngineConfig()],
            onlineAiRecoveryTickMs: 0,
            onlineAiRecoveryTimeoutMs: 0,
            onlineAiRecoveryFailureReportThreshold: 1,
            onlineAiFeedbackReporter: feedbackReporter,
        });

        const serverInternal = server as unknown as {
            loadMatch: (matchID: string) => Promise<any>;
            runOnlineAiRecoveryTick: () => Promise<void>;
            executeCommandInternal: (
                match: any,
                playerID: string,
                commandType: string,
                payload: unknown,
            ) => Promise<boolean>;
        };

        await serverInternal.loadMatch('match-watchdog-option-diagnostics');
        vi.spyOn(serverInternal, 'executeCommandInternal').mockResolvedValue(false);

        await serverInternal.runOnlineAiRecoveryTick();
        await serverInternal.runOnlineAiRecoveryTick();
        await nextTick();

        expect(feedbackReporter).toHaveBeenCalledTimes(1);
        const payload = feedbackReporter.mock.calls[0]?.[0] as { stateSnapshot?: string } | undefined;
        expect(typeof payload?.stateSnapshot).toBe('string');
        const snapshot = JSON.parse(payload!.stateSnapshot!);

        expect(snapshot.interaction?.seat?.options).toContainEqual(expect.objectContaining({
            id: 'option-disabled',
            disabled: true,
            disabledReason: '目标已失效',
        }));
        expect(snapshot.interaction?.seat?.options).toContainEqual(expect.objectContaining({
            id: 'option-manual',
        }));
        expect(snapshot.interaction?.seatSelectability).toMatchObject({
            totalOptions: 2,
            enabledOptions: 1,
            disabledOptions: 1,
            selectionState: 'manual-selection-required',
            disabledOptionIds: ['option-disabled'],
            enabledOptionIds: ['option-manual'],
        });
    });

    it('online AI watchdog 应能识别 dt:card-interaction 无可选目标并携带 reason 取消交互', async () => {
        const io = new MockIO();
        const storage = new InMemoryStorage();

        await storage.createMatch('match-watchdog-dt-card-empty', {
            initialState: {
                G: {
                    core: {
                        activePlayerId: '1',
                        currentPlayerIndex: 1,
                        turnOrder: ['0', '1'],
                        players: {
                            '0': { statusEffects: {}, tokens: {} },
                            '1': { statusEffects: {}, tokens: {} },
                        },
                    },
                    sys: {
                        phase: 'main2',
                        turnNumber: 4,
                        eventStream: { nextId: 1 },
                        interaction: {
                            current: {
                                id: 'dt-interaction-empty',
                                kind: 'dt:card-interaction',
                                playerId: '1',
                                data: {
                                    type: 'selectStatus',
                                    targetPlayerIds: ['0', '1'],
                                    requiresTargetWithStatus: true,
                                },
                            },
                            queue: [],
                            isBlocked: false,
                        },
                        responseWindow: {
                            current: undefined,
                        },
                    },
                },
                _stateID: 0,
                randomSeed: 'seed',
                randomCursor: 0,
            },
            metadata: createOnlineAiRecoveryMetadata(),
        });

        const server = new GameTransportServer({
            io: io as unknown as any,
            storage,
            games: [createEngineConfig()],
            onlineAiRecoveryTickMs: 0,
            onlineAiRecoveryTimeoutMs: 0,
        });

        const serverInternal = server as unknown as {
            loadMatch: (matchID: string) => Promise<any>;
            runOnlineAiRecoveryTick: () => Promise<void>;
            executeCommandInternal: (
                match: any,
                playerID: string,
                commandType: string,
                payload: unknown,
            ) => Promise<boolean>;
        };

        await serverInternal.loadMatch('match-watchdog-dt-card-empty');

        let firstCommand: { type: string; payload: unknown } | null = null;
        vi.spyOn(serverInternal, 'executeCommandInternal').mockImplementation(async (_match, _playerID, commandType, payload) => {
            if (!firstCommand) {
                firstCommand = { type: commandType, payload };
            }
            return true;
        });

        await serverInternal.runOnlineAiRecoveryTick();
        await serverInternal.runOnlineAiRecoveryTick();
        await nextTick();

        expect(firstCommand).toEqual({
            type: 'SYS_INTERACTION_CANCEL',
            payload: { reason: 'empty-options' },
        });
    });

    it('online AI watchdog 响应循环时应强制关闭响应窗口', async () => {
        const io = new MockIO();
        const storage = new InMemoryStorage();

        await storage.createMatch('match-watchdog-response-loop', {
            initialState: createOnlineAiRecoveryState({
                responseWindow: {
                    current: {
                        id: 'response-loop-1',
                        windowType: 'afterCardPlayed',
                        sourceId: 'card-1',
                        responderQueue: ['1'],
                        currentResponderIndex: 0,
                    },
                },
            }),
            metadata: createOnlineAiRecoveryMetadata(),
        });

        const server = new GameTransportServer({
            io: io as unknown as any,
            storage,
            games: [createEngineConfig()],
            onlineAiRecoveryTickMs: 0,
            onlineAiRecoveryTimeoutMs: 0,
            onlineAiRecoveryMaxAdvanceSteps: 1,
        });

        const serverInternal = server as unknown as {
            loadMatch: (matchID: string) => Promise<any>;
            runOnlineAiRecoveryTick: () => Promise<void>;
            executeCommandInternal: (
                match: any,
                playerID: string,
                commandType: string,
                payload: unknown,
            ) => Promise<boolean>;
        };

        await serverInternal.loadMatch('match-watchdog-response-loop');

        const executed: string[] = [];
        vi.spyOn(serverInternal, 'executeCommandInternal').mockImplementation(async (_match, _playerID, commandType) => {
            executed.push(commandType);
            return true;
        });

        await serverInternal.runOnlineAiRecoveryTick();
        await serverInternal.runOnlineAiRecoveryTick();
        await nextTick();
        await serverInternal.runOnlineAiRecoveryTick();
        await nextTick();

        expect(executed).toContain('SYS_RESPONSE_WINDOW_FORCE_CLOSE');
    });

    it('AI 走无解交互 emergency skip 时，服务端应立即自动反馈', async () => {
        const io = new MockIO();
        const storage = new InMemoryStorage();
        const feedbackReporter = vi.fn(async () => undefined);

        const interaction = createSimpleChoice(
            'unsat-choice',
            '1',
            '测试无解交互',
            [{
                id: 'only-disabled',
                label: '唯一但不可选',
                value: { targetId: 'm-1' },
                disabled: true,
                disabledReason: '目标已失效',
            }],
            { sourceId: 'test-unsat-choice' },
        );

        await storage.createMatch('match-unsat-auto-feedback', {
            initialState: {
                G: {
                    core: {
                        activePlayerId: '1',
                        currentPlayerIndex: 1,
                        turnOrder: ['0', '1'],
                    },
                    sys: {
                        phase: 'main2',
                        turnNumber: 4,
                        eventStream: { nextId: 1 },
                        interaction: {
                            current: interaction,
                            queue: [],
                            isBlocked: false,
                        },
                        responseWindow: {
                            current: undefined,
                        },
                    },
                },
                _stateID: 0,
                randomSeed: 'seed',
                randomCursor: 0,
            },
            metadata: createOnlineAiRecoveryMetadata(),
        });

        const server = new GameTransportServer({
            io: io as unknown as any,
            storage,
            games: [createInteractiveEngineConfig()],
            onlineAiFeedbackReporter: feedbackReporter,
        });

        const serverInternal = server as unknown as {
            loadMatch: (matchID: string) => Promise<any>;
            executeCommandInternal: (
                match: any,
                playerID: string,
                commandType: string,
                payload: unknown,
            ) => Promise<boolean>;
        };

        const match = await serverInternal.loadMatch('match-unsat-auto-feedback');
        const success = await serverInternal.executeCommandInternal(
            match,
            '1',
            INTERACTION_COMMANDS.RESPOND,
            { optionId: '__emergency_skip__' },
        );

        expect(success).toBe(true);
        expect(feedbackReporter).toHaveBeenCalledTimes(1);
        expect(feedbackReporter).toHaveBeenCalledWith(expect.objectContaining({
            matchId: 'match-unsat-auto-feedback',
            playerId: '1',
            incidentKind: 'unsatisfiable-interaction-auto-skipped',
            reason: 'all-options-disabled',
        }));

        const payload = feedbackReporter.mock.calls[0]?.[0] as { stateSnapshot?: string } | undefined;
        const snapshot = JSON.parse(payload?.stateSnapshot ?? '{}');
        expect(snapshot.interaction?.seatSelectability).toMatchObject({
            totalOptions: 2,
            enabledOptions: 1,
            disabledOptions: 1,
            selectionState: 'recoverable-option-available',
        });
        expect(snapshot.interaction?.seatUnsatisfiableReason).toBe('all-options-disabled');
        expect(snapshot.interaction?.seat?.options).toContainEqual(expect.objectContaining({
            id: '__emergency_skip__',
        }));
    });
});

