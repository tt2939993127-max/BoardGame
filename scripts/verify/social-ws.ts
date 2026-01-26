import { io } from 'socket.io-client';
import { setTimeout as delay } from 'node:timers/promises';

const API_BASE_URL = process.env.API_BASE_URL || 'http://127.0.0.1:18001';
const DEFAULT_HEADERS = { 'Content-Type': 'application/json' };

const requestJson = async (path: string, options: RequestInit = {}) => {
    const response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers: {
            ...DEFAULT_HEADERS,
            ...(options.headers || {}),
        },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(`${path} 请求失败: ${response.status} ${JSON.stringify(data)}`);
    }
    return data;
};

const waitForHealth = async () => {
    for (let attempt = 0; attempt < 30; attempt += 1) {
        try {
            const response = await fetch(`${API_BASE_URL}/health`);
            if (response.ok) {
                return;
            }
        } catch {
            // ignore
        }
        await delay(1000);
    }
    throw new Error('API 服务未就绪');
};

const connectSocket = async (token: string) => new Promise<ReturnType<typeof io>>((resolve, reject) => {
    const socket = io(API_BASE_URL, {
        path: '/social-socket',
        auth: { token },
        transports: ['websocket'],
    });
    socket.once('connect', () => resolve(socket));
    socket.once('connect_error', (error) => reject(error));
});

const waitEvent = async <T>(socket: ReturnType<typeof io>, event: string, timeoutMs = 12000) => {
    return Promise.race([
        new Promise<T>((resolve) => socket.once(event, resolve)),
        delay(timeoutMs).then(() => {
            throw new Error(`等待事件超时: ${event}`);
        }),
    ]);
};

const run = async () => {
    await waitForHealth();

    const suffix = Date.now();
    const password = 'pass1234';
    const userAName = `ws-a-${suffix}`;
    const userBName = `ws-b-${suffix}`;

    const userA = await requestJson('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username: userAName, password }),
    });
    const userB = await requestJson('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username: userBName, password }),
    });

    await requestJson('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: userAName, password }),
    });

    const tokenA = userA.token as string;
    const tokenB = userB.token as string;
    const userBId = userB.user.id as string;

    const socketB = await connectSocket(tokenB);

    const friendRequestPromise = waitEvent(socketB, 'social:friendRequest');
    const requestRes = await requestJson('/auth/friends/request', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenA}` },
        body: JSON.stringify({ userId: userBId }),
    });

    await friendRequestPromise;

    await requestJson(`/auth/friends/accept/${requestRes.request.id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenB}` },
    });

    const friendOnlinePromise = waitEvent(socketB, 'social:friendOnline');
    const socketA = await connectSocket(tokenA);
    await friendOnlinePromise;

    const newMessagePromise = waitEvent(socketB, 'social:newMessage');
    await requestJson('/auth/messages/send', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenA}` },
        body: JSON.stringify({ toUserId: userBId, content: 'hello' }),
    });
    await newMessagePromise;

    const gameInvitePromise = waitEvent(socketB, 'social:gameInvite');
    await requestJson('/auth/invites/send', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenA}` },
        body: JSON.stringify({ toUserId: userBId, matchId: `match-${suffix}`, gameName: 'tictactoe' }),
    });
    await gameInvitePromise;

    const friendOfflinePromise = waitEvent(socketB, 'social:friendOffline', 35000);
    socketA.disconnect();
    await friendOfflinePromise;

    socketB.disconnect();
    console.log('✅ WebSocket 连接与事件推送验证通过');
};

run().catch((error) => {
    console.error('❌ WebSocket 验证失败:', error);
    process.exitCode = 1;
});
