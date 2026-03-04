import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';

export type UgcPackageDocument = HydratedDocument<UgcPackage>;

@Schema({ timestamps: true })
export class UgcPackage {
    @Prop({ type: String, required: true, unique: true, index: true, trim: true })
    packageId!: string;

    @Prop({ type: String, required: true, index: true, trim: true })
    ownerId!: string;

    @Prop({ type: String, required: true, trim: true })
    name!: string;

    @Prop({ type: String, default: '', trim: true })
    description?: string;

    @Prop({ type: [String], default: [] })
    tags?: string[];

    @Prop({ type: String, default: '' })
    version?: string;

    @Prop({ type: String, default: '' })
    gameId?: string;

    @Prop({ type: String, default: '' })
    coverAssetId?: string;

    @Prop({ type: String, enum: ['draft', 'published'], default: 'draft', index: true })
    status!: 'draft' | 'published';

    @Prop({ type: Object, default: null })
    manifest?: Record<string, unknown> | null;

    @Prop({ type: Date, default: null })
    publishedAt?: Date | null;

    createdAt!: Date;
    updatedAt!: Date;
}

export const UgcPackageSchema = SchemaFactory.createForClass(UgcPackage);

UgcPackageSchema.index({ status: 1, publishedAt: -1 });
UgcPackageSchema.index({ ownerId: 1, updatedAt: -1 });
