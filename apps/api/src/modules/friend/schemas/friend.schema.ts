import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument, Types } from 'mongoose';

export type FriendStatus = 'pending' | 'accepted' | 'blocked';

export type FriendDocument = HydratedDocument<Friend>;

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class Friend {
    @Prop({ type: 'ObjectId', ref: 'User', required: true, index: true })
    user!: Types.ObjectId;

    @Prop({ type: 'ObjectId', ref: 'User', required: true, index: true })
    friend!: Types.ObjectId;

    @Prop({ type: String, required: true, enum: ['pending', 'accepted', 'blocked'], default: 'pending' })
    status!: FriendStatus;

    createdAt!: Date;
}

export const FriendSchema = SchemaFactory.createForClass(Friend);

FriendSchema.index({ user: 1, friend: 1 }, { unique: true });
