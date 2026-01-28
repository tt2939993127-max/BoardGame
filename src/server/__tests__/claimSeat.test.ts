import { describe, it, expect } from 'vitest';
import jwt from 'jsonwebtoken';
import { createClaimSeatHandler } from '../claimSeat';

type TestState = { G?: { __setupData?: { ownerKey?: string } } };

const buildMetadata = (ownerKey: string, playerName?: string) => ({
    gameName: 'tictactoe',
    players: {
        0: { id: 0, name: playerName },
        1: { id: 1, name: 'P1' },
    },
    setupData: { ownerKey },
    createdAt: Date.now(),
    updatedAt: Date.now(),
});

describe('claim-seat handler', () => {
    it('登录用户 claim-seat 回填用户名并签发凭据', async () => {
        const jwtSecret = 'test-secret';
        const token = jwt.sign({ userId: 'u1', username: 'Alice' }, jwtSecret);
        const metadata = buildMetadata('user:u1');
        const state: TestState = { G: { __setupData: { ownerKey: 'user:u1' } } };
        let saved: Record<string, any> | null = null;

        const handler = createClaimSeatHandler({
            db: {
                fetch: async () => ({ metadata, state }),
                setMetadata: async (_id, nextMetadata) => {
                    saved = nextMetadata as Record<string, any>;
                },
            },
            auth: { generateCredentials: () => 'new-cred' },
            jwtSecret,
        });

        const ctx = {
            get: (name: string) => (name === 'authorization' ? `Bearer ${token}` : ''),
            request: { body: { playerID: '0' } },
            throw: (status: number, message: string) => {
                throw new Error(`${status}:${message}`);
            },
            body: undefined as unknown,
        };

        await handler(ctx as any, 'match-1');
        expect((saved as any)?.players?.['0']?.name).toBe('Alice');
        expect((saved as any)?.players?.['0']?.credentials).toBe('new-cred');
        expect((ctx.body as { playerCredentials?: string })?.playerCredentials).toBe('new-cred');
    });

    it('游客 claim-seat 使用 guestId 且回填昵称', async () => {
        const jwtSecret = 'test-secret';
        const metadata = buildMetadata('guest:g1');
        const state: TestState = { G: { __setupData: { ownerKey: 'guest:g1' } } };
        let saved: Record<string, any> | null = null;

        const handler = createClaimSeatHandler({
            db: {
                fetch: async () => ({ metadata, state }),
                setMetadata: async (_id, nextMetadata) => {
                    saved = nextMetadata as Record<string, any>;
                },
            },
            auth: { generateCredentials: () => 'guest-cred' },
            jwtSecret,
        });

        const ctx = {
            get: () => '',
            request: { body: { playerID: '0', guestId: 'g1', playerName: '游客001' } },
            throw: (status: number, message: string) => {
                throw new Error(`${status}:${message}`);
            },
            body: undefined as unknown,
        };

        await handler(ctx as any, 'match-2');
        expect((saved as any)?.players?.['0']?.name).toBe('游客001');
        expect((saved as any)?.players?.['0']?.credentials).toBe('guest-cred');
    });
});
