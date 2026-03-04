import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SocialGateway } from '../../gateways/social.gateway';
import { User, UserSchema } from '../auth/schemas/user.schema';
import { FriendController } from './friend.controller';
import { FriendService } from './friend.service';
import { Friend, FriendSchema } from './schemas/friend.schema';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Friend.name, schema: FriendSchema },
            { name: User.name, schema: UserSchema },
        ]),
    ],
    controllers: [FriendController],
    providers: [FriendService, SocialGateway],
    exports: [FriendService, SocialGateway],
})
export class FriendModule {}
