import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { Document } from 'mongoose';

export type SponsorDocument = Sponsor & Document;

@Schema({ timestamps: true })
export class Sponsor {
    @Prop({ type: String, required: true, trim: true })
    name!: string;

    @Prop({ type: Number, required: true, min: 0 })
    amount!: number;

    @Prop({ type: Boolean, default: false })
    isPinned!: boolean;

    createdAt!: Date;
    updatedAt!: Date;
}

export const SponsorSchema = SchemaFactory.createForClass(Sponsor);

SponsorSchema.index({ isPinned: -1, createdAt: -1 });
