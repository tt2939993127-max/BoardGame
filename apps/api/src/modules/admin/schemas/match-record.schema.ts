import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';

export type MatchRecordDocument = HydratedDocument<MatchRecord>;

export type MatchRecordPlayer = {
    id: string;
    name?: string;
    result?: string;
};

@Schema({ timestamps: true })
export class MatchRecord {
    @Prop({ type: String, required: true, unique: true })
    matchID!: string;

    @Prop({ type: String, required: true, index: true })
    gameName!: string;

    @Prop({
        type: [
            {
                id: { type: String, required: true },
                name: { type: String },
                result: { type: String },
            },
        ],
        default: [],
    })
    players!: MatchRecordPlayer[];

    @Prop({ type: String })
    winnerID?: string;

    @Prop({ type: Date, default: Date.now })
    endedAt!: Date;

    createdAt!: Date;
    updatedAt!: Date;
}

export const MatchRecordSchema = SchemaFactory.createForClass(MatchRecord);

MatchRecordSchema.index({ gameName: 1, endedAt: -1 });
