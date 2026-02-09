import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';

import type { CreateCustomDeckDto } from './dtos/create-custom-deck.dto';
import type { UpdateCustomDeckDto } from './dtos/update-custom-deck.dto';
import { CustomDeck, type CustomDeckDocument } from './schemas/custom-deck.schema';

/** 每用户最大牌组数量 */
const MAX_DECKS_PER_USER = 20;

@Injectable()
export class CustomDeckService {
    constructor(
        @InjectModel(CustomDeck.name)
        private readonly customDeckModel: Model<CustomDeckDocument>,
    ) {}

    /**
     * 创建自定义牌组
     * - 检查用户牌组数量是否已达上限（20）
     * - 创建并返回新牌组文档
     */
    async create(
        ownerId: string,
        dto: CreateCustomDeckDto,
    ): Promise<CustomDeckDocument> {
        const count = await this.customDeckModel.countDocuments({ ownerId });
        if (count >= MAX_DECKS_PER_USER) {
            throw new BadRequestException(
                `每用户最多保存 ${MAX_DECKS_PER_USER} 个牌组`,
            );
        }

        return this.customDeckModel.create({
            ownerId,
            name: dto.name,
            summonerId: dto.summonerId,
            summonerFaction: dto.summonerFaction,
            cards: dto.cards,
        });
    }

    /**
     * 获取指定用户的所有牌组（按更新时间倒序）
     */
    async findAllByOwner(ownerId: string): Promise<CustomDeckDocument[]> {
        return this.customDeckModel
            .find({ ownerId })
            .sort({ updatedAt: -1 })
            .exec();
    }

    /**
     * 根据 ID 获取牌组，并验证所有权
     * - 牌组不存在时抛出 NotFoundException
     * - ownerId 不匹配时抛出 ForbiddenException
     */
    async findById(
        id: string,
        ownerId: string,
    ): Promise<CustomDeckDocument> {
        const deck = await this.customDeckModel.findById(id).exec();
        if (!deck) {
            throw new NotFoundException('牌组不存在');
        }
        if (deck.ownerId !== ownerId) {
            throw new ForbiddenException('无权访问此牌组');
        }
        return deck;
    }

    /**
     * 更新牌组
     * - 先通过 findById 验证存在性和所有权
     * - 仅更新 DTO 中提供的字段
     */
    async update(
        id: string,
        ownerId: string,
        dto: UpdateCustomDeckDto,
    ): Promise<CustomDeckDocument> {
        const deck = await this.findById(id, ownerId);

        if (dto.name !== undefined) deck.name = dto.name;
        if (dto.summonerId !== undefined) deck.summonerId = dto.summonerId;
        if (dto.summonerFaction !== undefined) deck.summonerFaction = dto.summonerFaction;
        if (dto.cards !== undefined) deck.cards = dto.cards;

        return deck.save();
    }

    /**
     * 删除牌组
     * - 先通过 findById 验证存在性和所有权
     * - 删除文档
     */
    async delete(id: string, ownerId: string): Promise<void> {
        const deck = await this.findById(id, ownerId);
        await deck.deleteOne();
    }
}
