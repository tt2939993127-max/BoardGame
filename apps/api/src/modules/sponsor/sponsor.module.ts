import { Module } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { AdminGuard } from '../admin/guards/admin.guard';
import { User, UserSchema } from '../auth/schemas/user.schema';
import { SponsorAdminController, SponsorController } from './sponsor.controller';
import { SponsorService } from './sponsor.service';
import { Sponsor, SponsorSchema } from './sponsor.schema';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Sponsor.name, schema: SponsorSchema },
            { name: User.name, schema: UserSchema },
        ]),
    ],
    controllers: [SponsorController, SponsorAdminController],
    providers: [SponsorService, JwtAuthGuard, AdminGuard, Reflector],
    exports: [SponsorService],
})
export class SponsorModule {}
