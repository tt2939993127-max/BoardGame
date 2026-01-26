import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { CacheModule } from '@nestjs/cache-manager';
import { ValidationPipe } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { MongooseModule } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import type { Model } from 'mongoose';
import { AuthModule } from '../src/modules/auth/auth.module';
import { User, type UserDocument } from '../src/modules/auth/schemas/user.schema';
import { GlobalHttpExceptionFilter } from '../src/shared/filters/http-exception.filter';

describe('AuthModule (e2e)', () => {

    let mongo: MongoMemoryServer | null;
    let app: import('@nestjs/common').INestApplication;
    let userModel: Model<UserDocument>;

    beforeAll(async () => {
        const externalMongoUri = process.env.MONGO_URI;
        mongo = externalMongoUri ? null : await MongoMemoryServer.create();
        const mongoUri = externalMongoUri ?? mongo?.getUri();
        if (!mongoUri) {
            throw new Error('缺少 MongoDB 连接地址，请配置 MONGO_URI 或启用内存 MongoDB');
        }
        const moduleRef = await Test.createTestingModule({
            imports: [
                CacheModule.register(),
                MongooseModule.forRoot(mongoUri),
                AuthModule,
            ],
        }).compile();

        app = moduleRef.createNestApplication();
        userModel = moduleRef.get<Model<UserDocument>>(getModelToken(User.name));
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
        await userModel.deleteMany({});
    });

    afterAll(async () => {
        if (app) {
            await app.close();
        }
        if (mongo) {
            await mongo.stop();
        }
    });

    it('注册-登录-获取当前用户-登出流程', async () => {
        const registerRes = await request(app.getHttpServer())
            .post('/auth/register')
            .send({ username: 'test-user', password: 'pass1234' })
            .expect(201);

        expect(registerRes.body.token).toBeDefined();
        expect(registerRes.body.user.username).toBe('test-user');

        const loginRes = await request(app.getHttpServer())
            .post('/auth/login')
            .send({ username: 'test-user', password: 'pass1234' });

        expect(loginRes.status).toBe(201);

        const token = loginRes.body.token as string;
        expect(token).toBeDefined();

        await request(app.getHttpServer())
            .get('/auth/me')
            .set('Authorization', `Bearer ${token}`)
            .expect(200);

        await request(app.getHttpServer())
            .post('/auth/logout')
            .set('Authorization', `Bearer ${token}`)
            .expect(201);

        await request(app.getHttpServer())
            .get('/auth/me')
            .set('Authorization', `Bearer ${token}`)
            .expect(401);
    });

    it('更新头像流程', async () => {
        const registerRes = await request(app.getHttpServer())
            .post('/auth/register')
            .send({ username: 'test-user', password: 'pass1234' })
            .expect(201);

        const token = registerRes.body.token;

        const avatarUrl = 'https://example.com/avatar.png';
        const updateRes = await request(app.getHttpServer())
            .post('/auth/update-avatar')
            .set('Authorization', `Bearer ${token}`)
            .send({ avatar: avatarUrl })
            .expect(201);

        expect(updateRes.body.user.avatar).toBe(avatarUrl);

        const meRes = await request(app.getHttpServer())
            .get('/auth/me')
            .set('Authorization', `Bearer ${token}`)
            .expect(200);

        expect(meRes.body.user.avatar).toBe(avatarUrl);
    });
});
