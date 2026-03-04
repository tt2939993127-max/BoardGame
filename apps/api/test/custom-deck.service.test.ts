import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { CacheModule } from '@nestjs/cache-manager';
import { getModelToken, MongooseModule } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Model } from 'mongoose';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

import { CustomDeckModule } from '../src/modules/custom-deck/custom-deck.module';
import { CustomDeckService } from '../src/modules/custom-deck/custom-deck.service';
import {
    CustomDeck,
    type CustomDeckDocument,
} from '../src/modules/custom-deck/schemas/custom-deck.schema';
import type { CreateCustomDeckDto } from '../src/modules/custom-deck/dtos/create-custom-deck.dto';
import type { UpdateCustomDeckDto } from '../src/modules/custom-deck/dtos/update-custom-deck.dto';

/** 测试用的牌组创建 DTO 工厂 */
function makeDeckDto(overrides?: Partial<CreateCustomDeckDto>): CreateCustomDeckDto {
    return {
        name: overrides?.name ?? '测试牌组',
        summonerId: overrides?.summonerId ?? 'test-summoner',
        summonerFaction: overrides?.summonerFaction ?? 'test-faction',
        cards: overrides?.cards ?? [
            { cardId: 'card-a', faction: 'test-faction', count: 2 },
            { cardId: 'card-b', faction: 'other-faction', count: 1 },
        ],
    };
}

describe('CustomDeckService', () => {
    let mongo: MongoMemoryServer | null;
    let moduleRef: import('@nestjs/testing').TestingModule;
    let service: CustomDeckService;
    let deckModel: Model<CustomDeckDocument>;

    const OWNER_A = 'user-alice';
    const OWNER_B = 'user-bob';

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
                CustomDeckModule,
            ],
        }).compile();

        await moduleRef.init();

        service = moduleRef.get(CustomDeckService);
        deckModel = moduleRef.get<Model<CustomDeckDocument>>(getModelToken(CustomDeck.name));
    });

    beforeEach(async () => {
        await deckModel.deleteMany({});
    });

    afterAll(async () => {
        if (moduleRef) {
            await moduleRef.close();
        }
        if (mongo) {
            await mongo.stop();
        }
    });

    // ─── CRUD 基础操作 ───────────────────────────────────────────

    describe('create（创建牌组）', () => {
        it('应成功创建牌组并返回完整文档', async () => {
            const dto = makeDeckDto({ name: '我的第一个牌组' });
            const result = await service.create(OWNER_A, dto);

            expect(result.ownerId).toBe(OWNER_A);
            expect(result.name).toBe('我的第一个牌组');
            expect(result.summonerId).toBe(dto.summonerId);
            expect(result.summonerFaction).toBe(dto.summonerFaction);
            expect(result.cards).toHaveLength(2);
            expect(result.cards[0].cardId).toBe('card-a');
            expect(result.cards[0].count).toBe(2);
            // timestamps 应自动生成
            expect(result.createdAt).toBeInstanceOf(Date);
            expect(result.updatedAt).toBeInstanceOf(Date);
        });

        it('应为不同用户独立创建牌组', async () => {
            await service.create(OWNER_A, makeDeckDto({ name: 'Alice 牌组' }));
            await service.create(OWNER_B, makeDeckDto({ name: 'Bob 牌组' }));

            const aliceDecks = await service.findAllByOwner(OWNER_A);
            const bobDecks = await service.findAllByOwner(OWNER_B);

            expect(aliceDecks).toHaveLength(1);
            expect(aliceDecks[0].name).toBe('Alice 牌组');
            expect(bobDecks).toHaveLength(1);
            expect(bobDecks[0].name).toBe('Bob 牌组');
        });
    });

    describe('findAllByOwner（查询用户所有牌组）', () => {
        it('无牌组时应返回空数组', async () => {
            const result = await service.findAllByOwner(OWNER_A);
            expect(result).toEqual([]);
        });

        it('应按更新时间倒序返回', async () => {
            // 创建 3 个牌组，间隔确保时间戳不同
            const deck1 = await service.create(OWNER_A, makeDeckDto({ name: '牌组1' }));
            const deck2 = await service.create(OWNER_A, makeDeckDto({ name: '牌组2' }));
            const deck3 = await service.create(OWNER_A, makeDeckDto({ name: '牌组3' }));

            // 更新第一个牌组使其 updatedAt 最新
            await service.update(
                deck1._id.toString(),
                OWNER_A,
                { name: '牌组1-已更新' } as UpdateCustomDeckDto,
            );

            const result = await service.findAllByOwner(OWNER_A);
            expect(result).toHaveLength(3);
            // 最近更新的排在最前
            expect(result[0].name).toBe('牌组1-已更新');
        });

        it('只返回指定用户的牌组，不包含其他用户', async () => {
            await service.create(OWNER_A, makeDeckDto({ name: 'Alice 牌组' }));
            await service.create(OWNER_B, makeDeckDto({ name: 'Bob 牌组' }));

            const aliceDecks = await service.findAllByOwner(OWNER_A);
            expect(aliceDecks).toHaveLength(1);
            expect(aliceDecks.every(d => d.ownerId === OWNER_A)).toBe(true);
        });
    });

    describe('findById（按 ID 查询牌组）', () => {
        it('应返回指定牌组', async () => {
            const created = await service.create(OWNER_A, makeDeckDto({ name: '查询测试' }));
            const found = await service.findById(created._id.toString(), OWNER_A);

            expect(found.name).toBe('查询测试');
            expect(found._id.toString()).toBe(created._id.toString());
        });

        it('牌组不存在时应抛出 NotFoundException', async () => {
            // 使用一个合法但不存在的 ObjectId
            const fakeId = '507f1f77bcf86cd799439011';
            await expect(service.findById(fakeId, OWNER_A))
                .rejects.toThrow(NotFoundException);
        });
    });

    describe('update（更新牌组）', () => {
        it('应只更新提供的字段', async () => {
            const created = await service.create(OWNER_A, makeDeckDto({ name: '原始名称' }));
            const id = created._id.toString();

            const updated = await service.update(id, OWNER_A, {
                name: '新名称',
            } as UpdateCustomDeckDto);

            expect(updated.name).toBe('新名称');
            // 未更新的字段保持不变
            expect(updated.summonerId).toBe('test-summoner');
            expect(updated.cards).toHaveLength(2);
        });

        it('应支持同时更新多个字段', async () => {
            const created = await service.create(OWNER_A, makeDeckDto());
            const id = created._id.toString();

            const newCards = [{ cardId: 'new-card', faction: 'new-faction', count: 3 }];
            const updated = await service.update(id, OWNER_A, {
                name: '全新牌组',
                summonerId: 'new-summoner',
                summonerFaction: 'new-faction',
                cards: newCards,
            } as UpdateCustomDeckDto);

            expect(updated.name).toBe('全新牌组');
            expect(updated.summonerId).toBe('new-summoner');
            expect(updated.summonerFaction).toBe('new-faction');
            expect(updated.cards).toHaveLength(1);
            expect(updated.cards[0].cardId).toBe('new-card');
        });
    });

    describe('delete（删除牌组）', () => {
        it('应成功删除牌组', async () => {
            const created = await service.create(OWNER_A, makeDeckDto());
            const id = created._id.toString();

            await service.delete(id, OWNER_A);

            // 删除后查询应抛出 NotFoundException
            await expect(service.findById(id, OWNER_A))
                .rejects.toThrow(NotFoundException);
        });

        it('删除后不影响其他牌组', async () => {
            const deck1 = await service.create(OWNER_A, makeDeckDto({ name: '保留' }));
            const deck2 = await service.create(OWNER_A, makeDeckDto({ name: '删除' }));

            await service.delete(deck2._id.toString(), OWNER_A);

            const remaining = await service.findAllByOwner(OWNER_A);
            expect(remaining).toHaveLength(1);
            expect(remaining[0].name).toBe('保留');
        });
    });

    // ─── 权限隔离 ────────────────────────────────────────────────

    describe('权限隔离（用户只能操作自己的牌组）', () => {
        it('findById：访问他人牌组应抛出 ForbiddenException', async () => {
            const aliceDeck = await service.create(OWNER_A, makeDeckDto({ name: 'Alice 私有' }));

            await expect(service.findById(aliceDeck._id.toString(), OWNER_B))
                .rejects.toThrow(ForbiddenException);
        });

        it('update：更新他人牌组应抛出 ForbiddenException', async () => {
            const aliceDeck = await service.create(OWNER_A, makeDeckDto());

            await expect(
                service.update(aliceDeck._id.toString(), OWNER_B, {
                    name: '恶意修改',
                } as UpdateCustomDeckDto),
            ).rejects.toThrow(ForbiddenException);

            // 确认原始数据未被修改
            const original = await service.findById(aliceDeck._id.toString(), OWNER_A);
            expect(original.name).toBe('测试牌组');
        });

        it('delete：删除他人牌组应抛出 ForbiddenException', async () => {
            const aliceDeck = await service.create(OWNER_A, makeDeckDto());

            await expect(service.delete(aliceDeck._id.toString(), OWNER_B))
                .rejects.toThrow(ForbiddenException);

            // 确认牌组仍然存在
            const stillExists = await service.findById(aliceDeck._id.toString(), OWNER_A);
            expect(stillExists).toBeTruthy();
        });
    });

    // ─── 数量上限 ────────────────────────────────────────────────

    describe('数量上限（每用户最多 20 个牌组）', () => {
        it('达到 20 个上限后应抛出 BadRequestException', async () => {
            // 批量创建 20 个牌组
            const createPromises = Array.from({ length: 20 }, (_, i) =>
                service.create(OWNER_A, makeDeckDto({ name: `牌组${i + 1}` })),
            );
            await Promise.all(createPromises);

            // 第 21 个应被拒绝
            await expect(
                service.create(OWNER_A, makeDeckDto({ name: '超出上限' })),
            ).rejects.toThrow(BadRequestException);

            // 确认数据库中确实只有 20 个
            const allDecks = await service.findAllByOwner(OWNER_A);
            expect(allDecks).toHaveLength(20);
        });

        it('不同用户的牌组数量互不影响', async () => {
            // Alice 创建 20 个
            const alicePromises = Array.from({ length: 20 }, (_, i) =>
                service.create(OWNER_A, makeDeckDto({ name: `Alice-${i}` })),
            );
            await Promise.all(alicePromises);

            // Bob 仍然可以创建
            const bobDeck = await service.create(OWNER_B, makeDeckDto({ name: 'Bob 牌组' }));
            expect(bobDeck.ownerId).toBe(OWNER_B);
        });

        it('删除后可以重新创建', async () => {
            // 创建 20 个
            const decks = await Promise.all(
                Array.from({ length: 20 }, (_, i) =>
                    service.create(OWNER_A, makeDeckDto({ name: `牌组${i}` })),
                ),
            );

            // 删除一个
            await service.delete(decks[0]._id.toString(), OWNER_A);

            // 现在可以再创建一个
            const newDeck = await service.create(OWNER_A, makeDeckDto({ name: '新牌组' }));
            expect(newDeck.name).toBe('新牌组');

            const allDecks = await service.findAllByOwner(OWNER_A);
            expect(allDecks).toHaveLength(20);
        });
    });
});
