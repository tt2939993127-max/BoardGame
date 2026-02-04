import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';

export type UgcAssetDocument = HydratedDocument<UgcAsset>;

@Schema({ timestamps: true })
export class UgcAsset {
    @Prop({ type: String, required: true, index: true, trim: true })
    assetId!: string;

    @Prop({ type: String, required: true, index: true, trim: true })
    packageId!: string;

    @Prop({ type: String, required: true, index: true, trim: true })
    ownerId!: string;

    @Prop({ type: String, required: true, enum: ['image', 'audio', 'video', 'font', 'json', 'other'] })
    type!: 'image' | 'audio' | 'video' | 'font' | 'json' | 'other';

    @Prop({ type: String, required: true })
    originalFilename!: string;

    @Prop({ type: String, required: true })
    originalFormat!: string;

    @Prop({ type: Number, required: true })
    originalSize!: number;

    @Prop({ type: String, required: true })
    uploadedAt!: string;

    @Prop({ type: String, required: true, enum: ['pending', 'processing', 'completed', 'skipped', 'failed'] })
    compressionStatus!: 'pending' | 'processing' | 'completed' | 'skipped' | 'failed';

    @Prop({ type: String, default: null })
    compressedAt?: string | null;

    @Prop({ type: Object, default: {} })
    metadata?: Record<string, unknown>;

    @Prop({ type: [Object], default: [] })
    variants!: Array<Record<string, unknown>>;

    @Prop({ type: String, default: '' })
    primaryVariantId!: string;

    createdAt!: Date;
    updatedAt!: Date;
}

export const UgcAssetSchema = SchemaFactory.createForClass(UgcAsset);

UgcAssetSchema.index({ packageId: 1, assetId: 1 }, { unique: true });
UgcAssetSchema.index({ ownerId: 1, uploadedAt: -1 });
