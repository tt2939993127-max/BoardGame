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
import { AdminModule } from '../src/modules/admin/admin.module';
import { User, type UserDocument } from '../src/modules/auth/schemas/user.schema';
import { MatchRecord, type MatchRecordDocument } from '../src/modules/admin/schemas/match-record.schema';
import { GlobalHttpExceptionFilter } from '../src/shared/filters/http-exception.filter';

describe('Admin Module (e2e)', () => {
    let mongo: MongoMemoryServer | null;
    let app: import('@nestjs/common').INestApplication;
    let userModel: Model<UserDocument>;
    let matchRecordModel: Model<MatchRecordDocument>;
    let cacheManager: Cache;

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
                MongooseModule.forRoot(mongoUri),
                AuthModule,
                AdminModule,
            ],
        }).compile();

        app = moduleRef.createNestApplication();
        userModel = moduleRef.get<Model<UserDocument>>(getModelToken(User.name));
        matchRecordModel = moduleRef.get<Model<MatchRecordDocument>>(getModelToken(MatchRecord.name));
        cacheManager = moduleRef.get<Cache>(CACHE_MANAGER);
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
            matchRecordModel.deleteMany({}),
        ]);
        await cacheManager.del('admin:stats');
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
        const adminRegister = await request(app.getHttpServer())
            .post('/auth/register')
            .send({ username: 'admin-user', password: 'pass1234' })
            .expect(201);

        const adminToken = adminRegister.body.token as string;
        const adminId = adminRegister.body.user.id as string;
        await userModel.updateOne({ _id: adminId }, { role: 'admin' });

        const userRegister = await request(app.getHttpServer())
            .post('/auth/register')
            .send({ username: 'player-a', password: 'pass1234' })
            .expect(201);

        const userToken = userRegister.body.token as string;
        const userId = userRegister.body.user.id as string;

        return { adminToken, adminId, userToken, userId };
    };

    const seedMatch = async () => {
        const record = await matchRecordModel.create({
            matchID: 'match-1',
            gameName: 'tictactoe',
            players: [
                { id: '0', name: 'player-a', result: 'win' },
                { id: '1', name: 'player-b', result: 'loss' },
            ],
            winnerID: '0',
            endedAt: new Date(),
        });
        return record.matchID as string;
    };

    it('非管理员访问 - forbidden', async () => {
        const { userToken } = await seedUsers();
        await request(app.getHttpServer())
            .get('/admin/stats')
            .set('Authorization', `Bearer ${userToken}`)
            .expect(403);
    });

    it('管理员统计/用户/对局查询', async () => {
        const { adminToken, userId } = await seedUsers();
        const matchID = await seedMatch();

        const statsRes = await request(app.getHttpServer())
            .get('/admin/stats')
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(200);

        expect(statsRes.body.totalUsers).toBe(2);
        expect(statsRes.body.todayUsers).toBe(2);
        expect(statsRes.body.totalMatches).toBe(1);
        expect(statsRes.body.todayMatches).toBe(1);
        expect(statsRes.body.bannedUsers).toBe(0);
        expect(statsRes.body.onlineUsers).toBe(0);
        expect(statsRes.body.activeUsers24h).toBe(0);

        const trendRes = await request(app.getHttpServer())
            .get('/admin/stats/trend?days=7')
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(200);

        expect(trendRes.body.days).toBe(7);
        expect(trendRes.body.dailyUsers.length).toBe(7);
        expect(trendRes.body.dailyMatches.length).toBe(7);
        expect(trendRes.body.dailyUsers.reduce((sum: number, item: { count: number }) => sum + item.count, 0)).toBe(2);
        expect(trendRes.body.dailyMatches.reduce((sum: number, item: { count: number }) => sum + item.count, 0)).toBe(1);

        const usersRes = await request(app.getHttpServer())
            .get('/admin/users?limit=10')
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(200);

        const player = usersRes.body.items.find((item: { username: string }) => item.username === 'player-a');
        expect(player?.matchCount).toBe(1);

        const detailRes = await request(app.getHttpServer())
            .get(`/admin/users/${userId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(200);

        expect(detailRes.body.stats.totalMatches).toBe(1);
        expect(detailRes.body.stats.wins).toBe(1);
        expect(detailRes.body.recentMatches.length).toBe(1);

        const matchesRes = await request(app.getHttpServer())
            .get('/admin/matches?limit=10')
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(200);

        expect(matchesRes.body.total).toBe(1);

        const matchDetailRes = await request(app.getHttpServer())
            .get(`/admin/matches/${matchID}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(200);

        expect(matchDetailRes.body.matchID).toBe(matchID);
    });

    it('封禁/解封用户流程', async () => {
        const { adminToken, userId } = await seedUsers();

        const banRes = await request(app.getHttpServer())
            .post(`/admin/users/${userId}/ban`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ reason: '违规行为' })
            .expect(201);

        expect(banRes.body.user.banned).toBe(true);

        const unbanRes = await request(app.getHttpServer())
            .post(`/admin/users/${userId}/unban`)
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(200);

        expect(unbanRes.body.user.banned).toBe(false);
    });

    it('封禁管理员 - cannotBanAdmin', async () => {
        const { adminToken, adminId } = await seedUsers();
        await request(app.getHttpServer())
            .post(`/admin/users/${adminId}/ban`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ reason: '测试' })
            .expect(400);
    });
});
