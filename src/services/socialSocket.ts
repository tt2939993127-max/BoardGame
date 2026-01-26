import { io, Socket } from 'socket.io-client';
import { AUTH_API_URL } from '../config/server';

export const SOCIAL_EVENTS = {
    // Server -> Client
    FRIEND_ONLINE: 'social:friendOnline',
    FRIEND_OFFLINE: 'social:friendOffline',
    FRIEND_REQUEST: 'social:friendRequest',
    NEW_MESSAGE: 'social:newMessage',
    GAME_INVITE: 'social:gameInvite',
    HEARTBEAT: 'social:heartbeat',

    // Client -> Server
    HEARTBEAT_ACK: 'social:heartbeat', // If needed, though normally heartbeat is just ping/pong or custom
} as const;

export interface FriendStatusPayload {
    userId: string;
}

export interface FriendRequestPayload {
    requestId: string;
    from: {
        id: string;
        username: string;
        avatar?: string;
    };
    createdAt: string;
}

export interface NewMessagePayload {
    id: string;
    from: string;
    to: string;
    content: string;
    type: 'text' | 'invite';
    createdAt: string;
}

export interface GameInvitePayload {
    inviteId: string;
    from: {
        id: string;
        username: string;
    };
    gameId?: string; // e.g. 'tic-tac-toe'
    roomId?: string;
    message?: string;
}

type EventCallback<T = any> = (payload: T) => void;

class SocialSocketService {
    private socket: Socket | null = null;
    private listeners: Map<string, Set<EventCallback>> = new Map();
    private isConnected = false;
    private token: string | null = null;

    constructor() {
        // Initialize listeners map for supported events
        Object.values(SOCIAL_EVENTS).forEach(event => {
            this.listeners.set(event, new Set());
        });
    }

    connect(token: string): void {
        if (this.socket && this.token === token) {
            if (!this.socket.connected) {
                this.socket.connect();
            }
            return;
        }

        this.token = token;

        if (!this.socket) {
            // Determine URL base. If AUTH_API_URL is absolute, use its origin.
            // Otherwise use current window origin (relying on proxy).
            const baseUrl = AUTH_API_URL.startsWith('http')
                ? new URL(AUTH_API_URL).origin
                : window.location.origin;

            console.log('[SocialSocket] Connecting to', baseUrl, 'path: /social-socket');

            this.socket = io(baseUrl, {
                path: '/social-socket',
                auth: { token },
                transports: ['websocket', 'polling'],
                reconnection: true,
                reconnectionAttempts: 5,
                reconnectionDelay: 1000,
            });

            this.setupEventHandlers();
            return;
        }

        // token 变更：复用现有 socket，避免重复注册监听
        this.socket.auth = { token };
        if (this.socket.connected) {
            this.socket.disconnect();
        }
        this.socket.connect();
    }

    private setupEventHandlers(): void {
        if (!this.socket) return;

        this.socket.on('connect', () => {
            console.log('[SocialSocket] Connected');
            this.isConnected = true;
            this.notifyListeners('connect', true);
        });

        this.socket.on('disconnect', (reason) => {
            console.log('[SocialSocket] Disconnected:', reason);
            this.isConnected = false;
            this.notifyListeners('disconnect', reason);
        });

        this.socket.on('connect_error', (error) => {
            console.error('[SocialSocket] Connection error:', error.message);
            this.isConnected = false;
        });

        // Register handlers for all social events
        Object.values(SOCIAL_EVENTS).forEach(eventName => {
            this.socket?.on(eventName, (payload) => {
                console.log(`[SocialSocket] Event ${eventName}:`, payload);
                this.notifyListeners(eventName, payload);
            });
        });
    }

    disconnect(): void {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.isConnected = false;
            this.token = null;
        }
    }

    /**
     * Subscribe to a specific event
     */
    on<T = any>(event: string, callback: EventCallback<T>): () => void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }

        this.listeners.get(event)?.add(callback);

        return () => {
            this.listeners.get(event)?.delete(callback);
        };
    }

    /**
     * Notify local listeners
     */
    private notifyListeners(event: string, payload: any): void {
        this.listeners.get(event)?.forEach(callback => {
            try {
                callback(payload);
            } catch (err) {
                console.error(`[SocialSocket] Error in listener for ${event}:`, err);
            }
        });
    }

    get connected(): boolean {
        return this.isConnected;
    }
}

export const socialSocket = new SocialSocketService();
