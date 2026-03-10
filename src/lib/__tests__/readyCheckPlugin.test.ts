import { afterEach, describe, expect, it, vi } from 'vitest';
import { readyCheckPlugin } from '../../../vite-plugins/ready-check';

type ReadyHandler = (req: unknown, res: {
    statusCode: number;
    setHeader: (name: string, value: string) => void;
    end: (body: string) => void;
}) => void;

function createFakeServer() {
    const handlers = new Map<string, ReadyHandler>();
    let closeHandler: (() => void) | null = null;

    const httpServer = {
        listening: false,
        once: vi.fn((event: string, handler: () => void) => {
            if (event === 'close') {
                closeHandler = handler;
            }
        }),
    };

    const server: any = {
        httpServer,
        middlewares: {
            use: vi.fn((route: string, handler: ReadyHandler) => {
                handlers.set(route, handler);
            }),
        },
        listen: vi.fn(async () => {
            httpServer.listening = true;
            return server;
        }),
    };

    return {
        server,
        getHandler: () => handlers.get('/__ready'),
        close: () => closeHandler?.(),
    };
}

function invokeReady(handler: ReadyHandler) {
    let body = '';
    const headers: Record<string, string> = {};
    const response = {
        statusCode: 0,
        setHeader: (name: string, value: string) => {
            headers[name] = value;
        },
        end: (payload: string) => {
            body = payload;
        },
    };

    handler({}, response);

    return {
        statusCode: response.statusCode,
        headers,
        body: JSON.parse(body),
    };
}

describe('readyCheckPlugin', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it('会在 listen 完成后才把 /__ready 置为 ready', async () => {
        vi.useFakeTimers();
        const plugin = readyCheckPlugin();
        const { server, getHandler } = createFakeServer();

        plugin.configureServer?.(server);
        const handler = getHandler();
        expect(handler).toBeDefined();

        expect(invokeReady(handler!)).toMatchObject({
            statusCode: 503,
            body: { ready: false, message: 'Server is starting...' },
        });

        await server.listen();
        await vi.advanceTimersByTimeAsync(1000);

        expect(invokeReady(handler!)).toMatchObject({
            statusCode: 200,
            body: expect.objectContaining({ ready: true }),
        });
    });

    it('服务器关闭后会重新回到 not ready', async () => {
        vi.useFakeTimers();
        const plugin = readyCheckPlugin();
        const { server, getHandler, close } = createFakeServer();

        plugin.configureServer?.(server);
        const handler = getHandler();
        expect(handler).toBeDefined();

        await server.listen();
        await vi.advanceTimersByTimeAsync(1000);
        expect(invokeReady(handler!).statusCode).toBe(200);

        close();

        expect(invokeReady(handler!)).toMatchObject({
            statusCode: 503,
            body: { ready: false, message: 'Server is starting...' },
        });
    });
});
