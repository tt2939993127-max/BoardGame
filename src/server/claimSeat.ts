import jwt from 'jsonwebtoken';

export type GameJwtPayload = {
    userId?: string;
    username?: string;
};

type ClaimSeatDb = {
    fetch: (matchID: string, opts: { metadata?: boolean; state?: boolean }) => Promise<{ metadata?: any; state?: any }>;
    setMetadata: (matchID: string, metadata: any) => Promise<void>;
};

type ClaimSeatContext = {
    get: (name: string) => string;
    throw: (status: number, message: string) => void;
    request: { body?: { playerID?: string | number } };
    body?: unknown;
};

type ClaimSeatAuth = {
    generateCredentials: (ctx: ClaimSeatContext) => Promise<string> | string;
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
    return async (ctx: ClaimSeatContext, matchID: string): Promise<void> => {
        const origin = ctx.get('origin');
        const authHeader = ctx.get('authorization');
        const rawToken = parseBearerToken(authHeader);
        if (!rawToken) {
            console.warn(`[claim-seat] rejected reason=missing_auth matchID=${matchID} origin=${origin || ''}`);
            ctx.throw(401, 'Authorization is required');
            return;
        }
        const payload = verifyGameToken(rawToken, jwtSecret);
        if (!payload?.userId) {
            console.warn(`[claim-seat] rejected reason=invalid_token matchID=${matchID} origin=${origin || ''} hasAuth=${!!authHeader}`);
            ctx.throw(401, 'Invalid token');
            return;
        }

        const body = ctx.request.body;
        const resolvedPlayerID = String(body?.playerID ?? '0');
        console.log(`[claim-seat] start matchID=${matchID} playerID=${resolvedPlayerID} userId=${payload.userId} origin=${origin || ''}`);

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
            console.warn(
                `[claim-seat] rejected reason=owner_mismatch matchID=${matchID} ownerKey=${ownerKey || ''} expected=${expectedOwnerKey}`
            );
            ctx.throw(403, 'Not match owner');
            return;
        }

        const players = metadata.players as Record<string, { name?: string; credentials?: string }> | undefined;
        const player = players?.[resolvedPlayerID];
        if (!player) {
            console.warn(`[claim-seat] rejected reason=player_not_found matchID=${matchID} playerID=${resolvedPlayerID}`);
            ctx.throw(404, 'Player ' + resolvedPlayerID + ' not found');
            return;
        }

        const playerCredentials = await auth.generateCredentials(ctx);
        player.credentials = playerCredentials;
        if (!player.name && payload.username) {
            player.name = payload.username;
        }

        await db.setMetadata(matchID, metadata);
        console.log(`[claim-seat] success matchID=${matchID} playerID=${resolvedPlayerID} userId=${payload.userId}`);
        ctx.body = { playerID: resolvedPlayerID, playerCredentials };
    };
};

export const claimSeatUtils = {
    parseBearerToken,
    verifyGameToken,
};
