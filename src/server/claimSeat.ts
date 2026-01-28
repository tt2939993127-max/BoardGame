import type { Context } from 'koa';
import jwt from 'jsonwebtoken';

export type GameJwtPayload = {
    userId?: string;
    username?: string;
};

type ClaimSeatDb = {
    fetch: (matchID: string, opts: { metadata?: boolean; state?: boolean }) => Promise<{ metadata?: any; state?: any }>;
    setMetadata: (matchID: string, metadata: any) => Promise<void>;
};

type ClaimSeatAuth = {
    generateCredentials: (ctx: Context) => Promise<string> | string;
};

const parseBearerToken = (value?: string): string | null => {
    if (!value) return null;
    const match = value.match(/^Bearer\s+(.+)$/i);
    return match ? match[1] : null;
};

const verifyGameToken = (token: string, jwtSecret: string): GameJwtPayload | null => {
    try {
        const payload = jwt.verify(token, jwtSecret) as GameJwtPayload;
        if (!payload?.userId) return null;
        return payload;
    } catch {
        return null;
    }
};

export const createClaimSeatHandler = ({
    db,
    auth,
    jwtSecret,
}: {
    db: ClaimSeatDb;
    auth: ClaimSeatAuth;
    jwtSecret: string;
}) => {
    return async (ctx: Context, matchID: string): Promise<void> => {
        const rawToken = parseBearerToken(ctx.get('authorization'));
        if (!rawToken) {
            ctx.throw(401, 'Authorization is required');
            return;
        }
        const payload = verifyGameToken(rawToken, jwtSecret);
        if (!payload?.userId) {
            ctx.throw(401, 'Invalid token');
            return;
        }

        const body = (ctx.request as { body?: { playerID?: string | number } }).body;
        const resolvedPlayerID = String(body?.playerID ?? '0');

        const { metadata, state } = await db.fetch(matchID, { metadata: true, state: true });
        if (!metadata) {
            ctx.throw(404, 'Match ' + matchID + ' not found');
            return;
        }

        const setupDataFromMeta = (metadata.setupData as { ownerKey?: string } | undefined) || undefined;
        const setupDataFromState = (state?.G?.__setupData as { ownerKey?: string } | undefined) || undefined;
        const ownerKey = setupDataFromMeta?.ownerKey ?? setupDataFromState?.ownerKey;
        const expectedOwnerKey = `user:${payload.userId}`;
        if (!ownerKey || ownerKey !== expectedOwnerKey) {
            ctx.throw(403, 'Not match owner');
            return;
        }

        const players = metadata.players as Record<string, { name?: string; credentials?: string }> | undefined;
        const player = players?.[resolvedPlayerID];
        if (!player) {
            ctx.throw(404, 'Player ' + resolvedPlayerID + ' not found');
            return;
        }

        const playerCredentials = await auth.generateCredentials(ctx);
        player.credentials = playerCredentials;
        if (!player.name && payload.username) {
            player.name = payload.username;
        }

        await db.setMetadata(matchID, metadata);
        ctx.body = { playerID: resolvedPlayerID, playerCredentials };
    };
};

export const claimSeatUtils = {
    parseBearerToken,
    verifyGameToken,
};
