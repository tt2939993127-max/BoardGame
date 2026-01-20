/**
 * 大厅 WebSocket 服务
 * 
 * 实现房间列表的实时广播订阅，替代轮询机制
 */

import { io, Socket } from 'socket.io-client';

// 服务器地址（与游戏服务器相同）
const SERVER_URL = 'http://localhost:8000';

// 大厅事件类型
export const LOBBY_EVENTS = {
    // 客户端 -> 服务器
    SUBSCRIBE_LOBBY: 'lobby:subscribe',
    UNSUBSCRIBE_LOBBY: 'lobby:unsubscribe',

    // 服务器 -> 客户端
    LOBBY_UPDATE: 'lobby:update',
    MATCH_CREATED: 'lobby:matchCreated',
    MATCH_UPDATED: 'lobby:matchUpdated',
    MATCH_ENDED: 'lobby:matchEnded',
} as const;

// 房间信息类型
export interface LobbyMatch {
    matchID: string;
    gameName: string;
    players: Array<{
        id: number;
        name?: string;
        isConnected?: boolean;
    }>;
    createdAt?: number;
    updatedAt?: number;
}

// 大厅更新回调类型
export type LobbyUpdateCallback = (matches: LobbyMatch[]) => void;

class LobbySocketService {
    private socket: Socket | null = null;
    private subscribers: Set<LobbyUpdateCallback> = new Set();
    private isConnected = false;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private currentMatches: LobbyMatch[] = [];

    /**
     * 连接到大厅 Socket 服务
     */
    connect(): void {
        if (this.socket?.connected) {
            console.log('[LobbySocket] 已连接，跳过重复连接');
            return;
        }

        console.log('[LobbySocket] 正在连接到大厅服务器...');

        this.socket = io(SERVER_URL, {
            path: '/lobby-socket',
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: this.maxReconnectAttempts,
            reconnectionDelay: 1000,
            timeout: 10000,
        });

        this.setupEventHandlers();
    }

    /**
     * 设置事件处理器
     */
    private setupEventHandlers(): void {
        if (!this.socket) return;

        this.socket.on('connect', () => {
            console.log('[LobbySocket] ✅ 连接成功');
            this.isConnected = true;
            this.reconnectAttempts = 0;

            // 自动订阅大厅更新
            this.socket?.emit(LOBBY_EVENTS.SUBSCRIBE_LOBBY);
        });

        this.socket.on('disconnect', (reason) => {
            console.log('[LobbySocket] ❌ 断开连接:', reason);
            this.isConnected = false;
        });

        this.socket.on('connect_error', (error) => {
            console.error('[LobbySocket] 连接错误:', error.message);
            this.reconnectAttempts++;
        });

        // 接收完整的房间列表更新
        this.socket.on(LOBBY_EVENTS.LOBBY_UPDATE, (matches: LobbyMatch[]) => {
            console.log('[LobbySocket] 收到大厅更新:', matches.length, '个房间');
            this.currentMatches = matches;
            this.notifySubscribers(matches);
        });

        // 接收单个房间创建事件
        this.socket.on(LOBBY_EVENTS.MATCH_CREATED, (match: LobbyMatch) => {
            console.log('[LobbySocket] 新房间创建:', match.matchID);
            this.currentMatches = [...this.currentMatches, match];
            this.notifySubscribers(this.currentMatches);
        });

        // 接收单个房间更新事件（玩家加入/离开）
        this.socket.on(LOBBY_EVENTS.MATCH_UPDATED, (match: LobbyMatch) => {
            console.log('[LobbySocket] 房间更新:', match.matchID);
            this.currentMatches = this.currentMatches.map(m =>
                m.matchID === match.matchID ? match : m
            );
            this.notifySubscribers(this.currentMatches);
        });

        // 接收房间结束事件
        this.socket.on(LOBBY_EVENTS.MATCH_ENDED, (matchID: string) => {
            console.log('[LobbySocket] 房间结束:', matchID);
            this.currentMatches = this.currentMatches.filter(m => m.matchID !== matchID);
            this.notifySubscribers(this.currentMatches);
        });
    }

    /**
     * 通知所有订阅者
     */
    private notifySubscribers(matches: LobbyMatch[]): void {
        this.subscribers.forEach(callback => {
            try {
                callback(matches);
            } catch (error) {
                console.error('[LobbySocket] 订阅者回调错误:', error);
            }
        });
    }

    /**
     * 订阅大厅更新
     */
    subscribe(callback: LobbyUpdateCallback): () => void {
        this.subscribers.add(callback);

        // 如果已有房间数据，立即通知新订阅者
        if (this.currentMatches.length > 0) {
            callback(this.currentMatches);
        }

        // 确保已连接
        if (!this.socket?.connected) {
            this.connect();
        }

        // 返回取消订阅函数
        return () => {
            this.subscribers.delete(callback);

            // 如果没有订阅者了，可选择断开连接以节省资源
            if (this.subscribers.size === 0) {
                console.log('[LobbySocket] 无订阅者，保持连接待命');
            }
        };
    }

    /**
     * 手动请求刷新房间列表
     */
    requestRefresh(): void {
        if (this.socket?.connected) {
            this.socket.emit(LOBBY_EVENTS.SUBSCRIBE_LOBBY);
        }
    }

    /**
     * 断开连接
     */
    disconnect(): void {
        if (this.socket) {
            this.socket.emit(LOBBY_EVENTS.UNSUBSCRIBE_LOBBY);
            this.socket.disconnect();
            this.socket = null;
            this.isConnected = false;
            this.currentMatches = [];
        }
    }

    /**
     * 获取连接状态
     */
    getConnectionStatus(): { connected: boolean; reconnectAttempts: number } {
        return {
            connected: this.isConnected,
            reconnectAttempts: this.reconnectAttempts,
        };
    }
}

// 导出单例实例
export const lobbySocket = new LobbySocketService();
