import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { User, UserSchema } from '../auth/schemas/user.schema';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminGuard } from './guards/admin.guard';
import { MatchRecord, MatchRecordSchema } from './schemas/match-record.schema';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: User.name, schema: UserSchema },
            { name: MatchRecord.name, schema: MatchRecordSchema },
        ]),
    ],
    controllers: [AdminController],
    providers: [AdminService, AdminGuard, JwtAuthGuard, Reflector],
})
export class AdminModule {}
