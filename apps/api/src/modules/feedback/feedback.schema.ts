import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type FeedbackDocument = Feedback & Document;

export enum FeedbackType {
    BUG = 'bug',
    SUGGESTION = 'suggestion',
    OTHER = 'other'
}

export enum FeedbackSeverity {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high',
    CRITICAL = 'critical'
}

export enum FeedbackStatus {
    OPEN = 'open',
    IN_PROGRESS = 'in_progress',
    RESOLVED = 'resolved',
    CLOSED = 'closed'
}

@Schema({ timestamps: true })
export class Feedback {
    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    userId!: Types.ObjectId;

    @Prop({ type: String, required: true })
    content!: string;

    @Prop({ type: String, enum: FeedbackType, default: FeedbackType.OTHER })
    type!: FeedbackType;

    @Prop({ type: String, enum: FeedbackSeverity, default: FeedbackSeverity.LOW })
    severity!: FeedbackSeverity;

    @Prop({ type: String, enum: FeedbackStatus, default: FeedbackStatus.OPEN })
    status!: FeedbackStatus;

    @Prop({ type: String })
    gameName?: string; // Optional, if related to a specific game

    @Prop({ type: String })
    contactInfo?: string; // Optional contact info if user wants to provide
}

export const FeedbackSchema = SchemaFactory.createForClass(Feedback);
