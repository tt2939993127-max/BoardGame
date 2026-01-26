import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { User, UserSchema } from './schemas/user.schema';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';

@Module({
    imports: [CacheModule.register(), MongooseModule.forFeature([{ name: User.name, schema: UserSchema }])],
    controllers: [AuthController],
    providers: [AuthService, JwtAuthGuard],
    exports: [AuthService],
})
export class AuthModule {}
