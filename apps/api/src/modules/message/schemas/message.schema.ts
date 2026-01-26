import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument, Types } from 'mongoose';

export type MessageType = 'text' | 'invite';

export type MessageDocument = HydratedDocument<Message>;

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class Message {
    @Prop({ type: 'ObjectId', ref: 'User', required: true, index: true })
    from!: Types.ObjectId;

    @Prop({ type: 'ObjectId', ref: 'User', required: true, index: true })
    to!: Types.ObjectId;

    @Prop({ type: String, required: true, trim: true })
    content!: string;

    @Prop({ type: String, required: true, enum: ['text', 'invite'], default: 'text' })
    type!: MessageType;

    @Prop({ type: { matchId: String, gameName: String }, required: false })
    inviteData?: { matchId: string; gameName: string };

    @Prop({ type: Boolean, default: false })
    read!: boolean;

    createdAt!: Date;
}

export const MessageSchema = SchemaFactory.createForClass(Message);

MessageSchema.index({ from: 1, to: 1, createdAt: -1 });
MessageSchema.index({ to: 1, read: 1 });
