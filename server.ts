import { Server as BoardgameServer, Origins } from 'boardgame.io/server';
import { Server as IOServer } from 'socket.io';
import { TicTacToe } from './src/games/default/game';

// 大厅事件常量（与前端 lobbySocket.ts 保持一致）
const LOBBY_EVENTS = {
    SUBSCRIBE_LOBBY: 'lobby:subscribe',
    UNSUBSCRIBE_LOBBY: 'lobby:unsubscribe',
    LOBBY_UPDATE: 'lobby:update',
    MATCH_CREATED: 'lobby:matchCreated',
    MATCH_UPDATED: 'lobby:matchUpdated',
    MATCH_ENDED: 'lobby:matchEnded',
} as const;

// 创建 boardgame.io 服务器
const server = BoardgameServer({
    games: [TicTacToe],
    origins: [Origins.LOCALHOST],
});

// 获取底层的 Koa 应用和数据库
const { app, db } = server;

// 存储订阅大厅的 socket 连接
const lobbySubscribers = new Set<string>();
let lobbyIO: IOServer | null = null;

// 房间信息类型（发送给前端的格式）
interface LobbyMatch {
    matchID: string;
    gameName: string;
    players: Array<{ id: number; name?: string }>;
    createdAt?: number;
    updatedAt?: number;
}

// 获取当前所有房间列表的辅助函数
const fetchAllMatches = async (): Promise<LobbyMatch[]> => {
    try {
        // boardgame.io 的 db 对象提供了 listMatches 方法
        const matchIDs = await db.listMatches({ gameName: 'TicTacToe' });
        const results: LobbyMatch[] = [];

        for (const matchID of matchIDs) {
            const match = await db.fetch(matchID, { metadata: true });
            if (!match || !match.metadata) continue;

            // 将 players 对象转换为数组格式
            const playersObj = match.metadata.players || {};
            const playersArray = Object.entries(playersObj).map(([id, data]) => ({
                id: parseInt(id, 10),
                name: (data as { name?: string })?.name,
            }));

            results.push({
                matchID,
                gameName: match.metadata.gameName || 'TicTacToe',
                players: playersArray,
                createdAt: match.metadata.createdAt,
                updatedAt: match.metadata.updatedAt,
            });
        }

        return results;
    } catch (error) {
        console.error('[LobbyIO] 获取房间列表失败:', error);
        return [];
    }
};

// 广播房间列表更新给所有订阅者
const broadcastLobbyUpdate = async () => {
    if (!lobbyIO || lobbySubscribers.size === 0) return;

    const matches = await fetchAllMatches();
    lobbyIO.emit(LOBBY_EVENTS.LOBBY_UPDATE, matches);
    console.log(`[LobbyIO] 广播房间更新: ${matches.length} 个房间 -> ${lobbySubscribers.size} 个订阅者`);
};

// 添加中间件拦截 Lobby API 调用来触发广播
app.use(async (ctx, next) => {
    await next();

    // 检测 Lobby API 调用后触发广播
    const url = ctx.url;
    const method = ctx.method;

    if (method === 'POST') {
        // 创建房间: POST /games/:name/create
        if (url.match(/^\/games\/[^/]+\/create$/)) {
            console.log('[LobbyIO] 检测到房间创建');
            setTimeout(broadcastLobbyUpdate, 100); // 短暂延迟确保数据已写入
        }
        // 加入房间: POST /games/:name/:matchID/join
        else if (url.match(/^\/games\/[^/]+\/[^/]+\/join$/)) {
            console.log('[LobbyIO] 检测到玩家加入');
            setTimeout(broadcastLobbyUpdate, 100);
        }
        // 离开房间: POST /games/:name/:matchID/leave
        else if (url.match(/^\/games\/[^/]+\/[^/]+\/leave$/)) {
            console.log('[LobbyIO] 检测到玩家离开');

            // 提取 matchID
            const matchIDMatch = url.match(/^\/games\/[^/]+\/([^/]+)\/leave$/);
            const matchID = matchIDMatch ? matchIDMatch[1] : null;

            // 延迟检查房间是否仍然存在
            setTimeout(async () => {
                if (matchID) {
                    try {
                        const match = await db.fetch(matchID, { metadata: true });

                        // 如果房间已不存在，广播 MATCH_ENDED 事件
                        if (!match) {
                            console.log(`[LobbyIO] 房间 ${matchID} 已被删除，广播 MATCH_ENDED`);
                            if (lobbyIO) {
                                lobbyIO.emit(LOBBY_EVENTS.MATCH_ENDED, matchID);
                            }
                        }
                    } catch (error) {
                        console.error('[LobbyIO] 检查房间状态失败:', error);
                    }
                }

                // 无论如何都广播更新
                await broadcastLobbyUpdate();
            }, 100);
        }
    }
});

// 启动服务器
server.run(8000).then((runningServers) => {
    console.log('🎮 游戏服务器运行在 http://localhost:8000');

    // 使用 appServer 创建独立的大厅 Socket.IO 服务器
    // 使用不同的路径避免与 boardgame.io 的 socket 冲突
    lobbyIO = new IOServer(runningServers.appServer, {
        path: '/lobby-socket',
        cors: {
            origin: ['http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174'],
            methods: ['GET', 'POST'],
            credentials: true,
        },
    });

    // 处理大厅连接
    lobbyIO.on('connection', (socket) => {
        console.log(`[LobbyIO] 新连接: ${socket.id}`);

        // 订阅大厅更新
        socket.on(LOBBY_EVENTS.SUBSCRIBE_LOBBY, async () => {
            lobbySubscribers.add(socket.id);
            console.log(`[LobbyIO] ${socket.id} 订阅大厅 (当前 ${lobbySubscribers.size} 个订阅者)`);

            // 立即发送当前房间列表
            const matches = await fetchAllMatches();
            socket.emit(LOBBY_EVENTS.LOBBY_UPDATE, matches);
        });

        // 取消订阅
        socket.on(LOBBY_EVENTS.UNSUBSCRIBE_LOBBY, () => {
            lobbySubscribers.delete(socket.id);
            console.log(`[LobbyIO] ${socket.id} 取消订阅`);
        });

        // 断开连接时清理
        socket.on('disconnect', () => {
            lobbySubscribers.delete(socket.id);
            console.log(`[LobbyIO] ${socket.id} 断开连接`);
        });
    });

    console.log('📡 大厅广播服务已启动 (path: /lobby-socket)');
});
