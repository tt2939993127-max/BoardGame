import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CustomDeck, CustomDeckSchema } from './schemas/custom-deck.schema';
import { CustomDeckController } from './custom-deck.controller';
import { CustomDeckService } from './custom-deck.service';

/** 自定义牌组模块 — 提供牌组 CRUD 能力 */
@Module({
    imports: [
        MongooseModule.forFeature([
            { name: CustomDeck.name, schema: CustomDeckSchema },
        ]),
    ],
    controllers: [CustomDeckController],
    providers: [CustomDeckService],
    exports: [CustomDeckService],
})
export class CustomDeckModule {}
