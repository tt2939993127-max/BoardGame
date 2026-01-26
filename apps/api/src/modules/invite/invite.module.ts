import { Module } from '@nestjs/common';
import { MessageModule } from '../message/message.module';
import { InviteController } from './invite.controller';
import { InviteService } from './invite.service';

@Module({
    imports: [MessageModule],
    controllers: [InviteController],
    providers: [InviteService],
})
export class InviteModule {}
