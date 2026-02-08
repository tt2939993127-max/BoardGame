import { Module } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { FeedbackAdminController, FeedbackController } from './feedback.controller';
import { FeedbackService } from './feedback.service';
import { Feedback, FeedbackSchema } from './feedback.schema';
import { User, UserSchema } from '../auth/schemas/user.schema';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { AdminGuard } from '../admin/guards/admin.guard';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Feedback.name, schema: FeedbackSchema },
            { name: User.name, schema: UserSchema }
        ]),
    ],
    controllers: [FeedbackController, FeedbackAdminController],
    providers: [FeedbackService, JwtAuthGuard, AdminGuard, Reflector],
    exports: [FeedbackService]
})
export class FeedbackModule { }
