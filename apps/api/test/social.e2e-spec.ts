import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { CacheModule } from '@nestjs/cache-manager';
import { ValidationPipe } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { MongooseModule } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Model } from 'mongoose';
import request from 'supertest';
import { AuthModule } from '../src/modules/auth/auth.module';
import { User, type UserDocument } from '../src/modules/auth/schemas/user.schema';
import { FriendModule } from '../src/modules/friend/friend.module';
import { Friend, type FriendDocument } from '../src/modules/friend/schemas/friend.schema';
import { InviteModule } from '../src/modules/invite/invite.module';
import { MessageModule } from '../src/modules/message/message.module';
import { Message, type MessageDocument } from '../src/modules/message/schemas/message.schema';
import { GlobalHttpExceptionFilter } from '../src/shared/filters/http-exception.filter';

describe('Social Modules (e2e)', () => {

    let mongo: MongoMemoryServer | null;
    let app: import('@nestjs/common').INestApplication;
    let userModel: Model<UserDocument>;
    let friendModel: Model<FriendDocument>;
    let messageModel: Model<MessageDocument>;

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
                FriendModule,
                MessageModule,
                InviteModule,
            ],
        }).compile();

        app = moduleRef.createNestApplication();
        userModel = moduleRef.get<Model<UserDocument>>(getModelToken(User.name));
        friendModel = moduleRef.get<Model<FriendDocument>>(getModelToken(Friend.name));
        messageModel = moduleRef.get<Model<MessageDocument>>(getModelToken(Message.name));
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
            friendModel.deleteMany({}),
            messageModel.deleteMany({}),
        ]);
    });

    afterAll(async () => {
        if (app) {
            await app.close();
        }
        if (mongo) {
            await mongo.stop();
        }
    });

    it('好友请求/消息/邀请流程', async () => {
        const registerA = await request(app.getHttpServer())
            .post('/auth/register')
            .send({ username: 'alice', password: 'pass1234' })
            .expect(201);

        const registerB = await request(app.getHttpServer())
            .post('/auth/register')
            .send({ username: 'bob', password: 'pass1234' })
            .expect(201);

        const tokenA = registerA.body.token as string;
        const tokenB = registerB.body.token as string;
        const userAId = registerA.body.user.id as string;
        const userBId = registerB.body.user.id as string;

        const requestRes = await request(app.getHttpServer())
            .post('/auth/friends/request')
            .set('Authorization', `Bearer ${tokenA}`)
            .send({ userId: userBId })
            .expect(201);

        const requestId = requestRes.body.request.id as string;
        expect(requestId).toBeDefined();

        const pendingRes = await request(app.getHttpServer())
            .get('/auth/friends/requests')
            .set('Authorization', `Bearer ${tokenB}`)
            .expect(200);

        expect(pendingRes.body.requests.length).toBe(1);

        await request(app.getHttpServer())
            .post(`/auth/friends/accept/${requestId}`)
            .set('Authorization', `Bearer ${tokenB}`)
            .expect(201);

        const friendListRes = await request(app.getHttpServer())
            .get('/auth/friends')
            .set('Authorization', `Bearer ${tokenA}`)
            .expect(200);

        const friendIds = friendListRes.body.friends.map((item: { id: string }) => item.id);
        expect(friendIds).toContain(userBId);

        await request(app.getHttpServer())
            .post('/auth/messages/send')
            .set('Authorization', `Bearer ${tokenA}`)
            .send({ toUserId: userBId, content: 'hello' })
            .expect(201);

        const conversationsRes = await request(app.getHttpServer())
            .get('/auth/messages/conversations')
            .set('Authorization', `Bearer ${tokenB}`)
            .expect(200);

        expect(conversationsRes.body.conversations.length).toBe(1);
        expect(conversationsRes.body.conversations[0].user.id).toBe(userAId);

        const historyRes = await request(app.getHttpServer())
            .get(`/auth/messages/${userAId}`)
            .set('Authorization', `Bearer ${tokenB}`)
            .expect(200);

        expect(historyRes.body.messages.length).toBeGreaterThan(0);

        await request(app.getHttpServer())
            .post(`/auth/messages/read/${userAId}`)
            .set('Authorization', `Bearer ${tokenB}`)
            .expect(201);

        await request(app.getHttpServer())
            .post('/auth/invites/send')
            .set('Authorization', `Bearer ${tokenA}`)
            .send({ toUserId: userBId, matchId: 'match-1', gameName: 'tictactoe' })
            .expect(201);
    });
});
