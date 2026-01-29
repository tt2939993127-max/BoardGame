import type { State, Server, LogEntry, StorageAPI } from 'boardgame.io';
import { mongoStorage, MongoStorage } from './MongoStorage';

const STORAGE_TYPE = {
    SYNC: 0,
    ASYNC: 1,
} as const;

const DISCONNECT_GRACE_MS = 5 * 60 * 1000;

type StorageTypeValue = (typeof STORAGE_TYPE)[keyof typeof STORAGE_TYPE];
type OwnerType = 'user' | 'guest';
type StorageTarget = 'mongo' | 'memory';

type MatchSetupData = {
    ttlSeconds?: number;
    ownerKey?: string;
    ownerType?: OwnerType;
};

const parseSetupData = (value: unknown): MatchSetupData => {
    if (!value || typeof value !== 'object') return {};
    const raw = value as Record<string, unknown>;
    const ownerType = raw.ownerType === 'user' || raw.ownerType === 'guest' ? raw.ownerType : undefined;
    return {
        ttlSeconds: typeof raw.ttlSeconds === 'number' ? raw.ttlSeconds : undefined,
        ownerKey: typeof raw.ownerKey === 'string' ? raw.ownerKey : undefined,
        ownerType,
    };
};

const resolveSetupData = (opts: StorageAPI.CreateMatchOpts): MatchSetupData => {
    const stateG = (opts.initialState as State | undefined)?.G as Record<string, unknown> | undefined;
    const setupDataFromState = parseSetupData(stateG?.__setupData);
    const setupDataFromMetadata = parseSetupData((opts.metadata as { setupData?: unknown } | undefined)?.setupData);
    return { ...setupDataFromMetadata, ...setupDataFromState };
};

const resolveStorageTarget = (setupData: MatchSetupData): StorageTarget => {
    const ownerKey = setupData.ownerKey;
    const ownerType = setupData.ownerType;
    if (ownerType === 'user' || (ownerKey ? ownerKey.startsWith('user:') : false)) return 'mongo';
    if (ownerType === 'guest' || (ownerKey ? ownerKey.startsWith('guest:') : false)) return 'memory';
    return 'memory';
};

const hasConnectedPlayer = (metadata: Server.MatchData): boolean => {
    const players = metadata.players as Record<string, { isConnected?: boolean }> | undefined;
    if (!players) return false;
    return Object.values(players).some(player => Boolean(player?.isConnected));
};

const hasFetchResult = <O extends StorageAPI.FetchOpts>(
    result: StorageAPI.FetchResult<O>,
    opts: O
): boolean => {
    const typed = result as unknown as {
        state?: State;
        metadata?: Server.MatchData;
        log?: LogEntry[];
        initialState?: State;
    };
    if (opts.state && typeof typed.state !== 'undefined') return true;
    if (opts.metadata && typeof typed.metadata !== 'undefined') return true;
    if (opts.log && typeof typed.log !== 'undefined') return true;
    if (opts.initialState && typeof typed.initialState !== 'undefined') return true;
    return false;
};

class InMemoryStorage implements StorageAPI.Sync {
    private readonly state = new Map<string, State>();
    private readonly initial = new Map<string, State>();
    private readonly metadata = new Map<string, Server.MatchData>();
    private readonly log = new Map<string, LogEntry[]>();

    type(): StorageTypeValue {
        return STORAGE_TYPE.SYNC;
    }

    connect(): void {
        return;
    }

    createMatch(matchID: string, opts: StorageAPI.CreateMatchOpts): void {
        this.initial.set(matchID, opts.initialState);
        this.setState(matchID, opts.initialState);
        this.setMetadata(matchID, opts.metadata);
    }

    setState(matchID: string, state: State, deltalog?: LogEntry[]): void {
        if (deltalog && deltalog.length > 0) {
            const existing = this.log.get(matchID) || [];
            this.log.set(matchID, [...existing, ...deltalog]);
        }
        this.state.set(matchID, state);
    }

    setMetadata(matchID: string, metadata: Server.MatchData): void {
        this.metadata.set(matchID, metadata);
    }

    fetch<O extends StorageAPI.FetchOpts>(matchID: string, opts: O): StorageAPI.FetchResult<O> {
        const result = {} as Partial<StorageAPI.FetchFields>;
        if (opts.state) result.state = this.state.get(matchID);
        if (opts.metadata) result.metadata = this.metadata.get(matchID);
        if (opts.log) result.log = this.log.get(matchID) || [];
        if (opts.initialState) result.initialState = this.initial.get(matchID);
        return result as StorageAPI.FetchResult<O>;
    }

    wipe(matchID: string): void {
        this.state.delete(matchID);
        this.metadata.delete(matchID);
        this.log.delete(matchID);
        this.initial.delete(matchID);
    }

    listMatches(opts?: StorageAPI.ListMatchesOpts): string[] {
        return [...this.metadata.entries()]
            .filter(([, metadata]) => {
                if (!opts) return true;
                if (opts.gameName !== undefined && metadata.gameName !== opts.gameName) return false;
                if (opts.where) {
                    if (opts.where.isGameover !== undefined) {
                        const isGameover = metadata.gameover !== undefined;
                        if (isGameover !== opts.where.isGameover) return false;
                    }
                    if (opts.where.updatedBefore !== undefined && metadata.updatedAt >= opts.where.updatedBefore) {
                        return false;
                    }
                    if (opts.where.updatedAfter !== undefined && metadata.updatedAt <= opts.where.updatedAfter) {
                        return false;
                    }
                }
                return true;
            })
            .map(([key]) => key);
    }
}

export class HybridStorage implements StorageAPI.Async {
    private readonly mongo: MongoStorage;
    private readonly memory: StorageAPI.Sync;
    private readonly matchStorage = new Map<string, StorageTarget>();
    private readonly guestOwnerIndex = new Map<string, string>();
    private readonly guestMatchOwner = new Map<string, string>();

    constructor(mongo: MongoStorage) {
        this.mongo = mongo;
        this.memory = new InMemoryStorage();
    }

    type(): StorageTypeValue {
        return STORAGE_TYPE.ASYNC;
    }

    async connect(): Promise<void> {
        this.memory.connect();
        await this.mongo.connect();
    }

    async createMatch(matchID: string, opts: StorageAPI.CreateMatchOpts): Promise<void> {
        const setupData = resolveSetupData(opts);
        const target = resolveStorageTarget(setupData);
        const ownerKey = setupData.ownerKey;

        if (target === 'memory') {
            if (ownerKey) {
                const existingMatchID = this.guestOwnerIndex.get(ownerKey);
                if (existingMatchID) {
                    this.memory.wipe(existingMatchID);
                    this.matchStorage.delete(existingMatchID);
                    this.guestMatchOwner.delete(existingMatchID);
                }
                this.guestOwnerIndex.set(ownerKey, matchID);
                this.guestMatchOwner.set(matchID, ownerKey);
            }
            this.matchStorage.set(matchID, 'memory');
            this.memory.createMatch(matchID, opts);
            return;
        }

        this.matchStorage.set(matchID, 'mongo');
        await this.mongo.createMatch(matchID, opts);
    }

    async setState(matchID: string, state: State, deltalog?: LogEntry[]): Promise<void> {
        const target = await this.resolveStorageForMatch(matchID);
        if (target === 'mongo') {
            await this.mongo.setState(matchID, state, deltalog);
            return;
        }
        if (target === 'memory') {
            this.memory.setState(matchID, state, deltalog);
            return;
        }
        console.warn(`[HybridStorage] setState 未找到房间 matchID=${matchID}`);
    }

    async setMetadata(matchID: string, metadata: Server.MatchData): Promise<void> {
        const target = await this.resolveStorageForMatch(matchID);
        if (target === 'mongo') {
            await this.mongo.setMetadata(matchID, metadata);
            return;
        }
        if (target === 'memory') {
            const nextMetadata = this.applyDisconnectionSince(metadata);
            this.memory.setMetadata(matchID, nextMetadata);
            return;
        }
        console.warn(`[HybridStorage] setMetadata 未找到房间 matchID=${matchID}`);
    }

    async fetch<O extends StorageAPI.FetchOpts>(matchID: string, opts: O): Promise<StorageAPI.FetchResult<O>> {
        const target = this.matchStorage.get(matchID);
        if (target === 'mongo') {
            return await this.mongo.fetch(matchID, opts);
        }
        if (target === 'memory') {
            return this.memory.fetch(matchID, opts) as StorageAPI.FetchResult<O>;
        }

        const mongoResult = await this.mongo.fetch(matchID, opts);
        if (hasFetchResult(mongoResult, opts)) {
            this.matchStorage.set(matchID, 'mongo');
            return mongoResult;
        }

        const memoryResult = this.memory.fetch(matchID, opts) as StorageAPI.FetchResult<O>;
        if (hasFetchResult(memoryResult, opts)) {
            this.matchStorage.set(matchID, 'memory');
            return memoryResult;
        }

        return mongoResult;
    }

    async wipe(matchID: string): Promise<void> {
        const target = await this.resolveStorageForMatch(matchID);
        if (target === 'mongo') {
            await this.mongo.wipe(matchID);
        } else if (target === 'memory') {
            this.wipeMemoryMatch(matchID);
        }
        this.matchStorage.delete(matchID);
    }

    async listMatches(opts?: StorageAPI.ListMatchesOpts): Promise<string[]> {
        const mongoMatches = await this.mongo.listMatches(opts);
        const memoryMatches = this.memory.listMatches(opts);
        const merged = new Set<string>([...mongoMatches, ...memoryMatches]);
        return Array.from(merged);
    }

    async cleanupEphemeralMatches(graceMs = DISCONNECT_GRACE_MS): Promise<number> {
        const cleanedMongo = await this.mongo.cleanupEphemeralMatches();
        const now = Date.now();
        let cleanedMemory = 0;

        const memoryMatches = this.memory.listMatches();
        for (const matchID of memoryMatches) {
            const { metadata } = this.memory.fetch(matchID, { metadata: true }) as StorageAPI.FetchResult<{
                metadata: true;
            }>;
            if (!metadata) continue;
            const setupData = parseSetupData((metadata as { setupData?: unknown }).setupData);
            const ttlSeconds = setupData.ttlSeconds ?? 0;
            if (ttlSeconds !== 0) continue;

            const metaWith = metadata as Server.MatchData & { disconnectedSince?: number | null };
            const connected = hasConnectedPlayer(metadata);
            if (connected) {
                if (metaWith.disconnectedSince) {
                    delete metaWith.disconnectedSince;
                    this.memory.setMetadata(matchID, metadata);
                }
                continue;
            }

            const disconnectedSince = typeof metaWith.disconnectedSince === 'number' ? metaWith.disconnectedSince : undefined;
            if (!disconnectedSince) {
                metaWith.disconnectedSince = now;
                this.memory.setMetadata(matchID, metadata);
                continue;
            }

            if (now - disconnectedSince >= graceMs) {
                this.wipeMemoryMatch(matchID);
                cleanedMemory += 1;
            }
        }

        const total = cleanedMongo + cleanedMemory;
        if (total > 0) {
            console.log(`[HybridStorage] 清理临时房间: ${total} 个 (mongo=${cleanedMongo}, memory=${cleanedMemory})`);
        }
        return total;
    }

    private async resolveStorageForMatch(matchID: string): Promise<StorageTarget | null> {
        const cached = this.matchStorage.get(matchID);
        if (cached) return cached;

        const mongoCheck = await this.mongo.fetch(matchID, { metadata: true });
        if (mongoCheck?.metadata) {
            this.matchStorage.set(matchID, 'mongo');
            return 'mongo';
        }

        const memoryCheck = this.memory.fetch(matchID, { metadata: true }) as StorageAPI.FetchResult<{ metadata: true }>;
        if (memoryCheck?.metadata) {
            this.matchStorage.set(matchID, 'memory');
            return 'memory';
        }

        return null;
    }

    private wipeMemoryMatch(matchID: string): void {
        this.memory.wipe(matchID);
        const ownerKey = this.guestMatchOwner.get(matchID);
        if (ownerKey) {
            this.guestOwnerIndex.delete(ownerKey);
            this.guestMatchOwner.delete(matchID);
        }
    }

    private applyDisconnectionSince(metadata: Server.MatchData): Server.MatchData {
        const setupData = parseSetupData((metadata as { setupData?: unknown }).setupData);
        const ttlSeconds = setupData.ttlSeconds ?? 0;
        const nextMetadata = metadata as Server.MatchData & { disconnectedSince?: number | null };
        if (ttlSeconds !== 0) {
            if (nextMetadata.disconnectedSince) {
                delete nextMetadata.disconnectedSince;
            }
            return metadata;
        }

        const connected = hasConnectedPlayer(metadata);
        if (connected) {
            if (nextMetadata.disconnectedSince) {
                delete nextMetadata.disconnectedSince;
            }
            return metadata;
        }

        if (!nextMetadata.disconnectedSince) {
            nextMetadata.disconnectedSince = Date.now();
        }
        return metadata;
    }
}

export const hybridStorage = new HybridStorage(mongoStorage);
