import 'dotenv/config';
import 'reflect-metadata';
import { existsSync } from 'fs';
import { join } from 'path';
import type { IncomingMessage } from 'http';
import type { Socket } from 'net';
import express from 'express';
import { createProxyMiddleware, fixRequestBody } from 'http-proxy-middleware';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { MsgpackIoAdapter } from './adapters/msgpack-io.adapter';
import { createAdminTestLatencyMiddleware } from './modules/admin/admin-test-latency.middleware';
import { AdminTestLatencyService } from './modules/admin/admin-test-latency.service';
import { GlobalHttpExceptionFilter } from './shared/filters/http-exception.filter';
import logger from '../../../server/logger';
import { isNoCacheSpaEntryPath, shouldServeSpaFallback } from './spa-fallback';
import { LONG_CACHE_MAX_AGE, NO_CACHE_HEADER, isNoCacheStaticFilePath } from './spa-fallback';

const initSentryInBackground = async () => {
    const dsn = process.env.SENTRY_DSN?.trim();
    if (!dsn) {
        return;
    }

    const startedAt = Date.now();
    try {
        const Sentry = await import('@sentry/nestjs');
        Sentry.init({
            dsn,
            tracesSampleRate: 1.0,
        });
        logger.info('[API] Sentry 初始化完成', {
            duration_ms: Date.now() - startedAt,
        });
    } catch (error) {
        logger.error('[API] Sentry 初始化失败:', error);
    }
};

async function bootstrap() {
    const bootstrapStartedAt = Date.now();

    const webOrigins = process.env.WEB_ORIGINS
        ? process.env.WEB_ORIGINS.split(',').map(s => s.trim()).filter(Boolean)
        : [];
    const appWebOrigins = process.env.APP_WEB_ORIGINS
        ? process.env.APP_WEB_ORIGINS.split(',').map(s => s.trim()).filter(Boolean)
        : ['http://localhost', 'https://localhost', 'capacitor://localhost'];
    const allowedOrigins = new Set([...webOrigins, ...appWebOrigins]);
    const isDev = !process.env.WEB_ORIGINS;

    const app = await NestFactory.create(AppModule, {
        cors: {
            origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
                if (!origin) return callback(null, true);
                if (isDev && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
                    return callback(null, true);
                }
                if (allowedOrigins.has(origin)) {
                    return callback(null, true);
                }
                callback(new Error(`CORS: origin ${origin} not allowed`));
            },
            credentials: true,
        },
        rawBody: false,
    });

    app.useWebSocketAdapter(new MsgpackIoAdapter(app));

    const expressApp = app.getHttpAdapter().getInstance();
    expressApp.use(express.json({ limit: '2mb' }));
    expressApp.use(express.urlencoded({ extended: true, limit: '2mb' }));
    expressApp.use('/admin', createAdminTestLatencyMiddleware(app.get(AdminTestLatencyService)));

    const gameServerTarget =
        process.env.GAME_SERVER_PROXY_TARGET
        || process.env.GAME_SERVER_URL
        || 'http://127.0.0.1:18000';

    const gameProxy = createProxyMiddleware({
        target: gameServerTarget,
        changeOrigin: true,
        ws: true,
        pathFilter: ['/games/**', '/default/**', '/lobby-socket/**', '/socket.io/**'],
        on: {
            proxyReq: fixRequestBody,
        },
    });

    expressApp.use(gameProxy);

    const distPath = join(process.cwd(), 'dist');
    const uploadsPath = join(process.cwd(), 'uploads');
    const publicAssetsPath = join(process.cwd(), 'public/assets');

    if (existsSync(uploadsPath)) {
        expressApp.use('/assets', express.static(uploadsPath));
    }
    if (existsSync(distPath)) {
        expressApp.use('/assets', express.static(join(distPath, 'assets'), {
            maxAge: LONG_CACHE_MAX_AGE,
            immutable: true,
        }));
        expressApp.use('/fonts', express.static(join(distPath, 'fonts'), {
            maxAge: LONG_CACHE_MAX_AGE,
            immutable: true,
            etag: true,
            lastModified: true,
        }));
        expressApp.use('/logos', express.static(join(distPath, 'logos'), {
            maxAge: LONG_CACHE_MAX_AGE,
            immutable: true,
            etag: true,
            lastModified: true,
        }));
        expressApp.use('/game-data', express.static(join(distPath, 'game-data'), {
            maxAge: LONG_CACHE_MAX_AGE,
            immutable: true,
            etag: true,
            lastModified: true,
            setHeaders: (res, filePath) => {
                if (isNoCacheStaticFilePath(filePath)) {
                    res.setHeader('Cache-Control', NO_CACHE_HEADER);
                }
            },
        }));
        expressApp.use(express.static(distPath, {
            etag: true,
            lastModified: true,
            setHeaders: (res, filePath) => {
                if (isNoCacheStaticFilePath(filePath)) {
                    res.setHeader('Cache-Control', NO_CACHE_HEADER);
                }
            },
        }));

        expressApp.get('*', (req: express.Request, res: express.Response, next: express.NextFunction) => {
            if (isNoCacheSpaEntryPath(req.path)) {
                res.setHeader('Cache-Control', NO_CACHE_HEADER);
                return res.sendFile(join(distPath, 'index.html'));
            }
            if (!shouldServeSpaFallback(req.path)) return next();
            res.setHeader('Cache-Control', NO_CACHE_HEADER);
            return res.sendFile(join(distPath, 'index.html'));
        });
    }
    if (existsSync(publicAssetsPath)) {
        expressApp.use('/assets', express.static(publicAssetsPath, {
            maxAge: '7d',
            etag: true,
            lastModified: true,
        }));
    }

    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            transform: true,
        })
    );
    app.useGlobalFilters(new GlobalHttpExceptionFilter());

    const port = Number(process.env.API_SERVER_PORT) || 18001;
    const server = await app.listen(port);
    server.on('upgrade', (req: IncomingMessage, socket: Socket, head: Buffer) => {
        const url = req.url || '';
        if (url.startsWith('/lobby-socket') || url.startsWith('/socket.io')) {
            gameProxy.upgrade(req, socket, head);
        }
    });

    logger.info('[API] listening', {
        port,
        bootstrap_ms: Date.now() - bootstrapStartedAt,
    });

    void initSentryInBackground();
}

bootstrap().catch((error) => {
    logger.error('[API] 启动失败:', error);
    process.exit(1);
});
