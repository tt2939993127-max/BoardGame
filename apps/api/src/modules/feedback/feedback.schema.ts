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

export interface FeedbackClientContext {
    route?: string;
    mode?: string;
    matchId?: string;
    playerId?: string;
    gameId?: string;
    appVersion?: string;
    userAgent?: string;
    viewport?: {
        width: number;
        height: number;
    };
    language?: string;
    timezone?: string;
}

export interface FeedbackErrorContext {
    message?: string;
    name?: string;
    stack?: string;
    source?: string;
}

@Schema({ timestamps: true })
export class Feedback {
    @Prop({ type: Types.ObjectId, ref: 'User', required: false })
    userId?: Types.ObjectId;

    @Prop({ type: String, required: true })
    content!: string;

    @Prop({ type: String, enum: FeedbackType, default: FeedbackType.OTHER })
    type!: FeedbackType;

    @Prop({ type: String, enum: FeedbackSeverity, default: FeedbackSeverity.LOW })
    severity!: FeedbackSeverity;

    @Prop({ type: String, enum: FeedbackStatus, default: FeedbackStatus.OPEN })
    status!: FeedbackStatus;

    @Prop({ type: String })
    gameName?: string;

    @Prop({ type: String })
    contactInfo?: string;

    @Prop({ type: String })
    actionLog?: string;

    @Prop({ type: String })
    stateSnapshot?: string;

    @Prop({ type: Object })
    clientContext?: FeedbackClientContext;

    @Prop({ type: Object })
    errorContext?: FeedbackErrorContext;
}

export const FeedbackSchema = SchemaFactory.createForClass(Feedback);

