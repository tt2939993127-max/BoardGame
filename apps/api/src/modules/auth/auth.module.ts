import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AdminInitService } from './admin-init.service';
import { AdminAuditLog, AdminAuditLogSchema } from './schemas/admin-audit-log.schema';
import { User, UserSchema } from './schemas/user.schema';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: User.name, schema: UserSchema },
            { name: AdminAuditLog.name, schema: AdminAuditLogSchema },
        ]),
    ],
    controllers: [AuthController],
    providers: [AuthService, AdminInitService, JwtAuthGuard],
    exports: [AuthService, AdminInitService],
})
export class AuthModule {}
