import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SystemNotificationDocument = SystemNotification & Document;

@Schema({ timestamps: true, collection: 'notifications' })
export class SystemNotification {
    /** 通知标题 */
    @Prop({ type: String, required: true })
    title!: string;

    /** 通知正文（支持简单 Markdown） */
    @Prop({ type: String, required: true })
    content!: string;

    /** 过期时间，过期后前端不再展示 */
    @Prop({ type: Date })
    expiresAt?: Date;

    /** 是否已发布（草稿 vs 已发布） */
    @Prop({ type: Boolean, default: true })
    published!: boolean;
}

export const SystemNotificationSchema = SchemaFactory.createForClass(SystemNotification);

SystemNotificationSchema.index({ published: 1, expiresAt: 1 });
SystemNotificationSchema.index({ createdAt: -1 });
