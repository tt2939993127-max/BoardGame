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

    const seedUsers = async () => {
        const adminEmail = 'admin-feedback@example.com';
        const adminCode = '123456';
        await authService.storeEmailCode(adminEmail, adminCode);
        const adminRegister = await request(app.getHttpServer())
            .post('/auth/register')
            .send({ username: 'admin-feedback', email: adminEmail, code: adminCode, password: 'pass1234' })
            .expect(201);

        const adminToken = adminRegister.body.token as string;
        const adminId = adminRegister.body.user.id as string;
        await userModel.updateOne({ _id: adminId }, { role: 'admin' });

        const userEmail = 'player-feedback@example.com';
        const userCode = '654321';
        await authService.storeEmailCode(userEmail, userCode);
        const userRegister = await request(app.getHttpServer())
            .post('/auth/register')
            .send({ username: 'player-feedback', email: userEmail, code: userCode, password: 'pass1234' })
            .expect(201);

        const userToken = userRegister.body.token as string;
        const userId = userRegister.body.user.id as string;

        return { adminToken, adminId, userToken, userId };
    };

    it('未登录提交反馈 - unauthorized', async () => {
        await request(app.getHttpServer())
            .post('/feedback')
            .send({ content: '没有登录的反馈' })
            .expect(401);
    });

    it('用户提交 + 管理员查看/更新', async () => {
        const { adminToken, userToken } = await seedUsers();

        const createRes = await request(app.getHttpServer())
            .post('/feedback')
            .set('Authorization', `Bearer ${userToken}`)
            .send({
                content: '反馈内容',
                type: 'bug',
                severity: 'high',
                gameName: 'tictactoe',
            })
            .expect(201);

        expect(createRes.body.content).toBe('反馈内容');
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
});
