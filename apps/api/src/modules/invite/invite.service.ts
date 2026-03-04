import { Inject, Injectable } from '@nestjs/common';
import { MessageService } from '../message/message.service';

@Injectable()
export class InviteService {
    constructor(@Inject(MessageService) private readonly messageService: MessageService) {}

    async sendInvite(fromUserId: string, toUserId: string, matchId: string, gameName: string) {
        return this.messageService.sendInvite(fromUserId, toUserId, matchId, gameName);
    }
}
