import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { CacheModule } from '@nestjs/cache-manager';
import { ValidationPipe } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { MongooseModule } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { Types, type Model } from 'mongoose';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { AuthModule } from '../src/modules/auth/auth.module';
import { AuthService } from '../src/modules/auth/auth.service';
import { AdminModule } from '../src/modules/admin/admin.module';
import { User, type UserDocument } from '../src/modules/auth/schemas/user.schema';
import { Friend, type FriendDocument } from '../src/modules/friend/schemas/friend.schema';
import { Message, type MessageDocument } from '../src/modules/message/schemas/message.schema';
import { Review, type ReviewDocument } from '../src/modules/review/schemas/review.schema';
import { MatchRecord, type MatchRecordDocument } from '../src/modules/admin/schemas/match-record.schema';
import { ROOM_MATCH_MODEL_NAME, type RoomMatchDocument } from '../src/modules/admin/schemas/room-match.schema';
import { UgcPackage, type UgcPackageDocument } from '../src/modules/ugc/schemas/ugc-package.schema';
import { UgcAsset, type UgcAssetDocument } from '../src/modules/ugc/schemas/ugc-asset.schema';
import { GlobalHttpExceptionFilter } from '../src/shared/filters/http-exception.filter';

describe('Admin Module (e2e)', () => {
    let mongo: MongoMemoryServer | null;
    let app: import('@nestjs/common').INestApplication;
    let userModel: Model<UserDocument>;
    let matchRecordModel: Model<MatchRecordDocument>;
    let roomMatchModel: Model<RoomMatchDocument>;
    let friendModel: Model<FriendDocument>;
    let messageModel: Model<MessageDocument>;
    let reviewModel: Model<ReviewDocument>;
    let ugcPackageModel: Model<UgcPackageDocument>;
    let ugcAssetModel: Model<UgcAssetDocument>;
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
                MongooseModule.forRoot(mongoUri, externalMongoUri ? { dbName: 'boardgame_test_admin' } : undefined),
                AuthModule,
                AdminModule,
            ],
        }).compile();

        app = moduleRef.createNestApplication();
        userModel = moduleRef.get<Model<UserDocument>>(getModelToken(User.name));
        authService = moduleRef.get<AuthService>(AuthService);
        matchRecordModel = moduleRef.get<Model<MatchRecordDocument>>(getModelToken(MatchRecord.name));
        roomMatchModel = moduleRef.get<Model<RoomMatchDocument>>(getModelToken(ROOM_MATCH_MODEL_NAME));
        friendModel = moduleRef.get<Model<FriendDocument>>(getModelToken(Friend.name));
        messageModel = moduleRef.get<Model<MessageDocument>>(getModelToken(Message.name));
        reviewModel = moduleRef.get<Model<ReviewDocument>>(getModelToken(Review.name));
        ugcPackageModel = moduleRef.get<Model<UgcPackageDocument>>(getModelToken(UgcPackage.name));
        ugcAssetModel = moduleRef.get<Model<UgcAssetDocument>>(getModelToken(UgcAsset.name));
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
            roomMatchModel.deleteMany({}),
            friendModel.deleteMany({}),
            messageModel.deleteMany({}),
            reviewModel.deleteMany({}),
            ugcPackageModel.deleteMany({}),
            ugcAssetModel.deleteMany({}),
        ]);
        await cacheManager.del('admin:stats');
        const store = cacheManager.store as { keys?: (pattern: string) => Promise<string[]> | string[] };
        if (store?.keys) {
            const keys = await Promise.resolve(store.keys('social:online:*'));
            if (Array.isArray(keys)) {
                await Promise.all(keys.map(key => cacheManager.del(key)));
            }
        }
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
        const adminEmail = 'admin-user@example.com';
        const adminCode = '123456';
        await authService.storeEmailCode(adminEmail, adminCode);
        const adminRegister = await request(app.getHttpServer())
            .post('/auth/register')
            .send({ username: 'admin-user', email: adminEmail, code: adminCode, password: 'pass1234' })
            .expect(201);

        const adminToken = adminRegister.body.token as string;
        const adminId = adminRegister.body.user.id as string;
        await userModel.updateOne({ _id: adminId }, { role: 'admin' });

        const userEmail = 'player-a@example.com';
        const userCode = '654321';
        await authService.storeEmailCode(userEmail, userCode);
        const userRegister = await request(app.getHttpServer())
            .post('/auth/register')
            .send({ username: 'player-a', email: userEmail, code: userCode, password: 'pass1234' })
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

    const seedRoom = async () => {
        const record = await roomMatchModel.create({
            matchID: 'room-1',
            gameName: 'tictactoe',
            metadata: {
                gameName: 'tictactoe',
                players: {
                    0: { id: 0, name: 'player-a', isConnected: true },
                    1: { id: 1, name: 'player-b', isConnected: false },
                },
                setupData: {
                    roomName: '测试房间',
                    ownerKey: 'user:test',
                    ownerType: 'user',
                    password: '1234',
                },
                createdAt: Date.now(),
                updatedAt: Date.now(),
            },
            state: {
                G: {
                    __setupData: {
                        roomName: '测试房间',
                        ownerKey: 'user:test',
                        ownerType: 'user',
                        password: '1234',
                    },
                },
            },
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
        const roomID = await seedRoom();

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

        const roomsRes = await request(app.getHttpServer())
            .get('/admin/rooms?limit=10')
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(200);

        expect(roomsRes.body.total).toBe(1);
        expect(roomsRes.body.items[0].matchID).toBe(roomID);
        expect(roomsRes.body.items[0].isLocked).toBe(true);

        await request(app.getHttpServer())
            .delete(`/admin/rooms/${roomID}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(200);

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

    it('UGC 包列表/下架/删除', async () => {
        const { adminToken } = await seedUsers();
        const now = new Date();

        await ugcPackageModel.create([
            {
                packageId: 'ugc-pub-a',
                ownerId: 'user-a',
                name: '测试 UGC 包 A',
                status: 'published',
                publishedAt: now,
                manifest: { name: 'A' },
                gameId: 'ugc-game',
                version: '1.0.0',
            },
            {
                packageId: 'ugc-draft-b',
                ownerId: 'user-b',
                name: '测试 UGC 包 B',
                status: 'draft',
                publishedAt: null,
            },
        ]);

        await ugcAssetModel.create([
            {
                assetId: 'asset-1',
                packageId: 'ugc-pub-a',
                ownerId: 'user-a',
                type: 'image',
                originalFilename: 'cover.png',
                originalFormat: 'png',
                originalSize: 1024,
                uploadedAt: now.toISOString(),
                compressionStatus: 'completed',
            },
            {
                assetId: 'asset-2',
                packageId: 'ugc-pub-a',
                ownerId: 'user-a',
                type: 'json',
                originalFilename: 'manifest.json',
                originalFormat: 'json',
                originalSize: 2048,
                uploadedAt: now.toISOString(),
                compressionStatus: 'completed',
            },
        ]);

        const listRes = await request(app.getHttpServer())
            .get('/admin/ugc/packages?limit=10')
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(200);

        expect(listRes.body.total).toBe(2);
        expect(listRes.body.items.some((item: { packageId: string }) => item.packageId === 'ugc-pub-a')).toBe(true);

        const unpublishRes = await request(app.getHttpServer())
            .post('/admin/ugc/packages/ugc-pub-a/unpublish')
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(200);

        expect(unpublishRes.body.package.status).toBe('draft');
        expect(unpublishRes.body.package.publishedAt).toBeNull();

        const deleteDraftRes = await request(app.getHttpServer())
            .delete('/admin/ugc/packages/ugc-draft-b')
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(200);

        expect(deleteDraftRes.body.deleted).toBe(true);
        expect(deleteDraftRes.body.assetsDeleted).toBe(0);
        expect(await ugcPackageModel.findOne({ packageId: 'ugc-draft-b' })).toBeNull();

        const deletePubRes = await request(app.getHttpServer())
            .delete('/admin/ugc/packages/ugc-pub-a')
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(200);

        expect(deletePubRes.body.assetsDeleted).toBe(2);
        expect(await ugcPackageModel.findOne({ packageId: 'ugc-pub-a' })).toBeNull();
        expect(await ugcAssetModel.countDocuments({ packageId: 'ugc-pub-a' })).toBe(0);
    });

    it('对局/房间/用户删除与批量删除', async () => {
        const { adminToken, userId, adminId } = await seedUsers();

        const matchA = await matchRecordModel.create({
            matchID: 'match-bulk-a',
            gameName: 'tictactoe',
            players: [
                { id: '0', name: 'player-a', result: 'win' },
                { id: '1', name: 'player-b', result: 'loss' },
            ],
            winnerID: '0',
            endedAt: new Date(),
        });
        const matchB = await matchRecordModel.create({
            matchID: 'match-bulk-b',
            gameName: 'tictactoe',
            players: [
                { id: '0', name: 'player-a', result: 'win' },
                { id: '1', name: 'player-b', result: 'loss' },
            ],
            winnerID: '0',
            endedAt: new Date(),
        });

        await request(app.getHttpServer())
            .delete(`/admin/matches/${matchA.matchID}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(200);

        expect(await matchRecordModel.findOne({ matchID: matchA.matchID })).toBeNull();

        await request(app.getHttpServer())
            .post('/admin/matches/bulk-delete')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ ids: [matchB.matchID, 'missing'] })
            .expect(200);

        expect(await matchRecordModel.findOne({ matchID: matchB.matchID })).toBeNull();

        const roomA = await roomMatchModel.create({
            matchID: 'room-bulk-a',
            gameName: 'tictactoe',
            metadata: { setupData: { roomName: '批量房间 A' } },
            state: { G: { __setupData: { roomName: '批量房间 A' } } },
        });
        const roomB = await roomMatchModel.create({
            matchID: 'room-bulk-b',
            gameName: 'tictactoe',
            metadata: { setupData: { roomName: '批量房间 B' } },
            state: { G: { __setupData: { roomName: '批量房间 B' } } },
        });
        const roomC = await roomMatchModel.create({
            matchID: 'room-bulk-c',
            gameName: 'dicethrone',
            metadata: { setupData: { roomName: '批量房间 C' } },
            state: { G: { __setupData: { roomName: '批量房间 C' } } },
        });

        await request(app.getHttpServer())
            .post('/admin/rooms/bulk-delete')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ ids: [roomA.matchID, roomB.matchID] })
            .expect(200);

        expect(await roomMatchModel.findOne({ matchID: roomA.matchID })).toBeNull();
        expect(await roomMatchModel.findOne({ matchID: roomB.matchID })).toBeNull();

        await request(app.getHttpServer())
            .post('/admin/rooms/bulk-delete-by-filter')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ gameName: 'dicethrone' })
            .expect(200);

        expect(await roomMatchModel.findOne({ matchID: roomC.matchID })).toBeNull();

        const bulkUserRes = await request(app.getHttpServer())
            .post('/admin/users/bulk-delete')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ ids: [userId, adminId, 'invalid-id'] })
            .expect(200);

        expect(bulkUserRes.body.deleted).toBe(1);
        expect(bulkUserRes.body.skipped?.length).toBe(2);
        expect(await userModel.findById(userId)).toBeNull();
        expect(await userModel.findById(adminId)).not.toBeNull();
    });

    it('删除用户 - 级联清理', async () => {
        const { adminToken, adminId, userId } = await seedUsers();
        const otherId = new Types.ObjectId();
        await friendModel.create({ user: adminId, friend: userId, status: 'accepted' });
        await messageModel.create({ from: adminId, to: userId, content: 'hi', type: 'text' });
        await reviewModel.create({ user: userId, gameId: 'tictactoe', isPositive: true, content: '好玩' });
        await matchRecordModel.create({
            matchID: 'match-delete',
            gameName: 'tictactoe',
            players: [
                { id: '0', name: 'player-a', result: 'win' },
                { id: '1', name: 'player-b', result: 'loss' },
            ],
            winnerID: '0',
            endedAt: new Date(),
        });

        await request(app.getHttpServer())
            .delete(`/admin/users/${userId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(200);

        const [user, friendCount, messageCount, reviewCount, match] = await Promise.all([
            userModel.findById(userId).lean(),
            friendModel.countDocuments({ $or: [{ user: adminId }, { friend: userId }] }),
            messageModel.countDocuments({ $or: [{ from: adminId }, { to: userId }] }),
            reviewModel.countDocuments({ user: userId }),
            matchRecordModel.findOne({ matchID: 'match-delete' }).lean(),
        ]);

        expect(user).toBeNull();
        expect(friendCount).toBe(0);
        expect(messageCount).toBe(0);
        expect(reviewCount).toBe(0);
        expect(match?.players?.some(player => player.name === '[已删除用户]')).toBe(true);

        await request(app.getHttpServer())
            .delete(`/admin/users/${adminId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(400);
    });
});
