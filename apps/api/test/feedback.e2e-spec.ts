import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { CacheModule } from '@nestjs/cache-manager';
import { ValidationPipe } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { MongooseModule } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import type { Model } from 'mongoose';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { AuthModule } from '../src/modules/auth/auth.module';
import { AuthService } from '../src/modules/auth/auth.service';
import { FeedbackModule } from '../src/modules/feedback/feedback.module';
import { Feedback, type FeedbackDocument } from '../src/modules/feedback/feedback.schema';
import { User, type UserDocument } from '../src/modules/auth/schemas/user.schema';
import { GlobalHttpExceptionFilter } from '../src/shared/filters/http-exception.filter';

describe('Feedback Module (e2e)', () => {
    let mongo: MongoMemoryServer | null;
    let app: import('@nestjs/common').INestApplication;
    let userModel: Model<UserDocument>;
    let feedbackModel: Model<FeedbackDocument>;
    let cacheManager: Cache;
    let authService: AuthService;

    beforeAll(async () => {
        const externalMongoUri = process.env.MONGO_URI;
        mongo = externalMongoUri ? null : await MongoMemoryServer.create();
        const mongoUri = externalMongoUri ?? mongo?.getUri();
        if (!mongoUri) {
            throw new Error('缺少 MongoDB 连接地址，请配置 MONGO_URI 或启用内存 MongoDB');
        }

        const moduleRef = await Test.createTestingModule({
            imports: [
                CacheModule.register({ isGlobal: true }),
                MongooseModule.forRoot(mongoUri, externalMongoUri ? { dbName: 'boardgame_test_feedback' } : undefined),
                AuthModule,
                FeedbackModule,
            ],
        }).compile();

        app = moduleRef.createNestApplication();
        userModel = moduleRef.get<Model<UserDocument>>(getModelToken(User.name));
        feedbackModel = moduleRef.get<Model<FeedbackDocument>>(getModelToken(Feedback.name));
        cacheManager = moduleRef.get<Cache>(CACHE_MANAGER);
        authService = moduleRef.get<AuthService>(AuthService);
        app.useGlobalPipes(
            new ValidationPipe({
                whitelist: true,
                transform: true,
            })
        );
        app.useGlobalFilters(new GlobalHttpExceptionFilter());
        await app.init();
    });

    beforeEach(async () => {
        await Promise.all([
            userModel.deleteMany({}),
            feedbackModel.deleteMany({}),
        ]);
        await cacheManager.reset();
    });

    afterAll(async () => {
        if (app) {
            await app.close();
        }
        if (mongo) {
            await mongo.stop();
        }
    });

    const registerUser = async ({
        username,
        email,
        code,
        role = 'user',
    }: {
        username: string;
        email: string;
        code: string;
        role?: 'user' | 'developer' | 'admin';
    }) => {
        await authService.storeEmailCode(email, code);
        const registerRes = await request(app.getHttpServer())
            .post('/auth/register')
            .send({ username, email, code, password: 'pass1234' })
            .expect(201);

        const token = registerRes.body.token as string;
        const userId = registerRes.body.user.id as string;
        if (role !== 'user') {
            await userModel.updateOne({ _id: userId }, { role });
        }

        return { token, userId };
    };

    const seedUsers = async () => {
        const { token: adminToken, userId: adminId } = await registerUser({
            username: 'admin-feedback',
            email: 'admin-feedback@example.com',
            code: '123456',
            role: 'admin',
        });

        const { token: developerToken, userId: developerId } = await registerUser({
            username: 'developer-feedback',
            email: 'developer-feedback@example.com',
            code: '112233',
            role: 'developer',
        });

        const { token: userToken, userId } = await registerUser({
            username: 'player-feedback',
            email: 'player-feedback@example.com',
            code: '654321',
        });

        return { adminToken, adminId, developerToken, developerId, userToken, userId };
    };

    it('未登录可以匿名提交反馈', async () => {
        const res = await request(app.getHttpServer())
            .post('/feedback')
            .send({ content: '匿名反馈内容' })
            .expect(201);

        expect(res.body.content).toBe('匿名反馈内容');
        expect(res.body.userId).toBeUndefined();
    });

    it('登录用户反馈会绑定 userId 且管理员可更新状态', async () => {
        const { adminToken, userToken, userId } = await seedUsers();

        const createRes = await request(app.getHttpServer())
            .post('/feedback')
            .set('Authorization', `Bearer ${userToken}`)
            .send({
                content: '反馈内容',
                type: 'bug',
                severity: 'high',
                gameName: 'tictactoe',
                actionLog: '[12:00] P1: cast card',
            })
            .expect(201);

        expect(createRes.body.content).toBe('反馈内容');
        expect(String(createRes.body.userId)).toBe(userId);
        const feedbackId = createRes.body._id as string;

        const listRes = await request(app.getHttpServer())
            .get('/admin/feedback?limit=20')
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(200);

        expect(listRes.body.items.length).toBe(1);
        expect(listRes.body.items[0]._id).toBe(feedbackId);

        const updateRes = await request(app.getHttpServer())
            .patch(`/admin/feedback/${feedbackId}/status`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ status: 'resolved' })
            .expect(200);

        expect(updateRes.body.status).toBe('resolved');
    });

    it('developer 可以查看反馈但不能更新状态', async () => {
        const { adminToken, developerToken, userToken } = await seedUsers();

        const createRes = await request(app.getHttpServer())
            .post('/feedback')
            .set('Authorization', `Bearer ${userToken}`)
            .send({
                content: 'developer visible feedback',
                type: 'bug',
                severity: 'medium',
                gameName: 'smashup',
                actionLog: '[12:30] P1: trigger ability',
            })
            .expect(201);

        const feedbackId = createRes.body._id as string;

        const listRes = await request(app.getHttpServer())
            .get('/admin/feedback?limit=20')
            .set('Authorization', `Bearer ${developerToken}`)
            .expect(200);

        expect(listRes.body.items).toHaveLength(1);
        expect(listRes.body.items[0]._id).toBe(feedbackId);

        await request(app.getHttpServer())
            .patch(`/admin/feedback/${feedbackId}/status`)
            .set('Authorization', `Bearer ${developerToken}`)
            .send({ status: 'resolved' })
            .expect(403);

        const adminListRes = await request(app.getHttpServer())
            .get('/admin/feedback?limit=20')
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(200);

        expect(adminListRes.body.items[0].status).toBe('open');
    });

    it('admin 列表支持严重程度筛选、分页，并返回调试上下文', async () => {
        const { adminToken, userToken } = await seedUsers();

        await request(app.getHttpServer())
            .post('/feedback')
            .set('Authorization', `Bearer ${userToken}`)
            .send({
                content: '低优先级反馈',
                type: 'other',
                severity: 'low',
                gameName: 'tictactoe',
            })
            .expect(201);

        await request(app.getHttpServer())
            .post('/feedback')
            .set('Authorization', `Bearer ${userToken}`)
            .send({
                content: '第一个严重问题',
                type: 'bug',
                severity: 'critical',
                gameName: 'smashup',
                actionLog: '[12:00] P1: cast card',
                clientContext: {
                    route: '/play/smashup/match/abc',
                    mode: 'online',
                    matchId: 'abc',
                    playerId: '0',
                    gameId: 'smashup',
                },
                errorContext: {
                    name: 'TypeError',
                    message: 'Cannot read properties of undefined',
                    source: 'react.error_boundary',
                },
            })
            .expect(201);

        await request(app.getHttpServer())
            .post('/feedback')
            .set('Authorization', `Bearer ${userToken}`)
            .send({
                content: '第二个严重问题',
                type: 'bug',
                severity: 'critical',
                gameName: 'smashup',
                actionLog: '[12:05] P1: trigger ability',
            })
            .expect(201);

        const listRes = await request(app.getHttpServer())
            .get('/admin/feedback?severity=critical&page=2&limit=1')
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(200);

        expect(listRes.body.total).toBe(2);
        expect(listRes.body.page).toBe(2);
        expect(listRes.body.limit).toBe(1);
        expect(listRes.body.items).toHaveLength(1);
        expect(listRes.body.items[0].content).toBe('第一个严重问题');
        expect(listRes.body.items[0].clientContext?.matchId).toBe('abc');
        expect(listRes.body.items[0].errorContext?.name).toBe('TypeError');
    });

    it('bug 类型必须附带 actionLog 或 stateSnapshot', async () => {
        const { userToken } = await seedUsers();

        await request(app.getHttpServer())
            .post('/feedback')
            .set('Authorization', `Bearer ${userToken}`)
            .send({
                content: '缺少调试信息',
                type: 'bug',
                severity: 'high',
                gameName: 'smashup',
            })
            .expect(400);

        const accepted = await request(app.getHttpServer())
            .post('/feedback')
            .set('Authorization', `Bearer ${userToken}`)
            .send({
                content: '携带日志',
                type: 'bug',
                severity: 'high',
                gameName: 'smashup',
                actionLog: '[12:00] P1: cast card',
                clientContext: {
                    route: '/play/smashup/match/abc',
                    mode: 'online',
                    matchId: 'abc',
                    playerId: '0',
                    gameId: 'smashup',
                    appVersion: 'dev',
                    userAgent: 'vitest',
                    viewport: { width: 1280, height: 720 },
                    language: 'zh-CN',
                    timezone: 'Asia/Shanghai',
                },
                errorContext: {
                    message: 'Cannot read properties of undefined',
                    name: 'TypeError',
                    stack: 'TypeError: ...',
                    source: 'react.error_boundary',
                },
            })
            .expect(201);

        expect(accepted.body.type).toBe('bug');
        expect(accepted.body.actionLog).toContain('cast card');
        expect(accepted.body.clientContext?.matchId).toBe('abc');
        expect(accepted.body.errorContext?.name).toBe('TypeError');
    });
});
