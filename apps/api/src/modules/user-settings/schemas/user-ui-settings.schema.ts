import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument, Types } from 'mongoose';

export type UserUISettingsDocument = HydratedDocument<UserUISettings>;

@Schema({ timestamps: true })
export class UserUISettings {
    @Prop({ type: 'ObjectId', ref: 'User', required: true })
    userId!: Types.ObjectId;

    /** 已读过的提示 key 集合（如 'buff-icon-click-hint'） */
    @Prop({ type: [String], default: [] })
    seenHints!: string[];

    createdAt!: Date;
    updatedAt!: Date;
}

export const UserUISettingsSchema = SchemaFactory.createForClass(UserUISettings);
UserUISettingsSchema.index({ userId: 1 }, { unique: true });
