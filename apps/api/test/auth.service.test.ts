import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { CacheModule } from '@nestjs/cache-manager';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Model } from 'mongoose';
import { AuthModule } from '../src/modules/auth/auth.module';
import { AuthService } from '../src/modules/auth/auth.service';
import { User, type UserDocument } from '../src/modules/auth/schemas/user.schema';

describe('AuthService', () => {
    let mongo: MongoMemoryServer | null;
    let moduleRef: import('@nestjs/testing').TestingModule;
    let authService: AuthService;
    let userModel: Model<UserDocument>;

    beforeAll(async () => {
        const externalMongoUri = process.env.MONGO_URI;
        mongo = externalMongoUri ? null : await MongoMemoryServer.create();
        const mongoUri = externalMongoUri ?? mongo?.getUri();
        if (!mongoUri) {
            throw new Error('缺少 MongoDB 连接地址，请配置 MONGO_URI 或启用内存 MongoDB');
        }

        moduleRef = await Test.createTestingModule({
            imports: [
                CacheModule.register({ isGlobal: true }),
                MongooseModule.forRoot(mongoUri),
                AuthModule,
            ],
        }).compile();

        await moduleRef.init();

        authService = moduleRef.get(AuthService);
        userModel = moduleRef.get<Model<UserDocument>>(getModelToken(User.name));
    });

    beforeEach(async () => {
        await userModel.deleteMany({});
    });

    afterAll(async () => {
        if (moduleRef) {
            await moduleRef.close();
        }
        if (mongo) {
            await mongo.stop();
        }
    });

    it('应规范化邮箱并支持大小写查找', async () => {
        const user = await authService.createUser('tester', 'pass1234', 'Test@Example.com');
        const found = await authService.findByEmail('  test@example.com ');
        expect(found?.id).toBe(user.id);
    });

    it('重置验证码应可校验且单次有效', async () => {
        const email = 'reset@example.com';
        await authService.storeResetCode(email, '123456');
        const first = await authService.verifyResetCode(email, '123456');
        const second = await authService.verifyResetCode(email, '123456');
        expect(first).toBe('ok');
        expect(second).toBe('missing');
    });

    it('重置失败次数过多应锁定并可清除', async () => {
        const email = 'lock@example.com';
        for (let i = 0; i < 4; i += 1) {
            const result = await authService.recordResetAttempt(email);
            expect(result.locked).toBe(false);
        }
        const last = await authService.recordResetAttempt(email);
        expect(last.locked).toBe(true);

        const status = await authService.getResetAttemptStatus(email);
        expect(status).not.toBeNull();

        await authService.clearResetAttempts(email);
        const cleared = await authService.getResetAttemptStatus(email);
        expect(cleared).toBeNull();
    });
});
