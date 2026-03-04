import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';

export type AdminAuditLogDocument = HydratedDocument<AdminAuditLog>;

@Schema({ timestamps: true })
export class AdminAuditLog {
    @Prop({ type: String, required: true, trim: true })
    action!: string;

    @Prop({ type: String, required: true, trim: true })
    status!: 'created' | 'exists' | 'failed';

    @Prop({ type: String, required: true, trim: true })
    actor!: string;

    @Prop({ type: String, default: null, trim: true })
    actorIp?: string | null;

    @Prop({ type: String, required: true, trim: true, lowercase: true })
    targetEmail!: string;

    @Prop({ type: String, default: null, trim: true })
    message?: string | null;
}

export const AdminAuditLogSchema = SchemaFactory.createForClass(AdminAuditLog);
