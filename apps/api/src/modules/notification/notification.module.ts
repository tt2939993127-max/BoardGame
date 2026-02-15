import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { AdminGuard } from '../admin/guards/admin.guard';
import { User, UserSchema } from '../auth/schemas/user.schema';
import { SystemNotification, SystemNotificationSchema } from './notification.schema';
import { NotificationService } from './notification.service';
import { NotificationAdminController, NotificationPublicController } from './notification.controller';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: SystemNotification.name, schema: SystemNotificationSchema },
            { name: User.name, schema: UserSchema },
        ]),
    ],
    controllers: [NotificationAdminController, NotificationPublicController],
    providers: [NotificationService, AdminGuard, JwtAuthGuard, Reflector],
    exports: [NotificationService],
})
export class NotificationModule {}
