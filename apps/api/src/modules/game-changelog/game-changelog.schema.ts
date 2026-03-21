import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';

export type GameChangelogDocument = HydratedDocument<GameChangelog>;

@Schema({ timestamps: true })
export class GameChangelog {
    @Prop({ type: String, required: true, trim: true, lowercase: true, index: true })
    gameId!: string;

    @Prop({ type: String, required: true, trim: true })
    title!: string;

    @Prop({ type: String, default: null, trim: true })
    versionLabel?: string | null;

    @Prop({ type: String, required: true, trim: true })
    content!: string;

    @Prop({ type: Boolean, default: false, index: true })
    published!: boolean;

    @Prop({ type: Boolean, default: false })
    pinned!: boolean;

    @Prop({ type: Date, default: null })
    publishedAt?: Date | null;

    @Prop({ type: String, required: true })
    createdBy!: string;

    @Prop({ type: String, required: true })
    updatedBy!: string;

    createdAt!: Date;
    updatedAt!: Date;
}

export const GameChangelogSchema = SchemaFactory.createForClass(GameChangelog);

GameChangelogSchema.index({
    gameId: 1,
    published: 1,
    pinned: -1,
    publishedAt: -1,
    createdAt: -1,
});
