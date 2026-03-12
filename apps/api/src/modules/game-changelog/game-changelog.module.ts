import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { AdminGuard } from '../admin/guards/admin.guard';
import { User, UserSchema } from '../auth/schemas/user.schema';
import { GameChangelogAdminController, GameChangelogPublicController } from './game-changelog.controller';
import { GameChangelog, GameChangelogSchema } from './game-changelog.schema';
import { GameChangelogService } from './game-changelog.service';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: GameChangelog.name, schema: GameChangelogSchema },
            { name: User.name, schema: UserSchema },
        ]),
    ],
    controllers: [GameChangelogAdminController, GameChangelogPublicController],
    providers: [GameChangelogService, AdminGuard, JwtAuthGuard, Reflector],
    exports: [GameChangelogService],
})
export class GameChangelogModule {}
