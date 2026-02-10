import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';

export type CustomDeckDocument = HydratedDocument<CustomDeck>;

/** 序列化的单张卡牌条目（与前端 SerializedCardEntry 保持一致） */
export interface SerializedCardEntry {
    /** 卡牌基础 ID（如 'necro-undead-warrior'） */
    cardId: string;
    /** 卡牌所属阵营 */
    faction: string;
    /** 数量 */
    count: number;
}

@Schema({ timestamps: true })
export class CustomDeck {
    /** 用户 ID（牌组所有者） */
    @Prop({ type: String, required: true, index: true })
    ownerId!: string;

    /** 牌组名称 */
    @Prop({ type: String, required: true, trim: true })
    name!: string;

    /** 召唤师卡牌 ID */
    @Prop({ type: String, required: true })
    summonerId!: string;

    /** 召唤师所属阵营 */
    @Prop({ type: String, required: true })
    summonerFaction!: string;

    /** 手动选择的卡牌列表 */
    @Prop({ type: [Object], required: true })
    cards!: SerializedCardEntry[];

    /** 自由组卡模式（跳过符号匹配限制） */
    @Prop({ type: Boolean, default: false })
    freeMode!: boolean;

    createdAt!: Date;
    updatedAt!: Date;
}

export const CustomDeckSchema = SchemaFactory.createForClass(CustomDeck);

// 复合索引：按用户查询 + 按更新时间倒序排列
CustomDeckSchema.index({ ownerId: 1, updatedAt: -1 });
