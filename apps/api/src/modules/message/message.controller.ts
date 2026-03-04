import { Body, Controller, Get, Inject, Param, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { PaginationQueryDto } from '../../shared/dtos/pagination.dto';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { createRequestI18n } from '../../shared/i18n';
import { SendMessageDto } from './dtos/message.dto';
import { MessageService } from './message.service';

@Controller('auth/messages')
export class MessageController {
    constructor(@Inject(MessageService) private readonly messageService: MessageService) { }

    @UseGuards(JwtAuthGuard)
    @Get('conversations')
    async getConversations(@CurrentUser() currentUser: { userId: string } | null, @Req() req: Request, @Res() res: Response) {
        const { t } = createRequestI18n(req);
        if (!currentUser?.userId) {
            return this.sendError(res, 401, t('auth.error.loginRequired'));
        }

        const conversations = await this.messageService.getConversationList(currentUser.userId);
        return res.json({ conversations });
    }

    @UseGuards(JwtAuthGuard)
    @Get(':userId')
    async getHistory(
        @CurrentUser() currentUser: { userId: string } | null,
        @Param('userId') targetUserId: string,
        @Query() query: PaginationQueryDto,
        @Req() req: Request,
        @Res() res: Response
    ) {
        const { t } = createRequestI18n(req);
        if (!currentUser?.userId) {
            return this.sendError(res, 401, t('auth.error.loginRequired'));
        }

        const result = await this.messageService.getMessageHistory(currentUser.userId, targetUserId, query.page, query.limit);
        if (!result.ok) {
            const map: Record<string, { status: number; message: string }> = {
                userNotFound: { status: 404, message: t('message.error.userNotFound') },
                notFriend: { status: 403, message: t('message.error.notFriend') },
            };
            const payload = map[result.code];
            return this.sendError(res, payload.status, payload.message);
        }

        return res.json({
            targetUser: result.targetUser,
            messages: result.messages,
            pagination: result.pagination,
        });
    }

    @UseGuards(JwtAuthGuard)
    @Post('send')
    async sendMessage(
        @CurrentUser() currentUser: { userId: string } | null,
        @Body() body: SendMessageDto,
        @Req() req: Request,
        @Res() res: Response
    ) {
        const { t } = createRequestI18n(req);
        if (!currentUser?.userId) {
            return this.sendError(res, 401, t('auth.error.loginRequired'));
        }

        let result;
        if (body.type === 'invite') {
            try {
                const data = JSON.parse(body.content);
                if (!data.matchId || !data.gameName) throw new Error('Missing matchId or gameName');
                result = await this.messageService.sendInvite(
                    currentUser.userId,
                    body.toUserId.trim(),
                    data.matchId,
                    data.gameName
                );
            } catch {
                return this.sendError(res, 400, 'Invalid invite data');
            }
        } else {
            result = await this.messageService.sendMessage(
                currentUser.userId,
                body.toUserId.trim(),
                body.content.trim()
            );
        }

        if (!result.ok) {
            const map: Record<string, { status: number; message: string }> = {
                userNotFound: { status: 404, message: t('message.error.userNotFound') },
                notFriend: { status: 403, message: t('message.error.notFriend') },
                invalidTarget: { status: 400, message: t('message.error.invalidTarget') },
            };
            const payload = map[result.code];
            return this.sendError(res, payload.status, payload.message);
        }

        return res.status(201).json({
            message: t('message.success.sent'),
            messageData: {
                id: result.message._id.toString(),
                toUser: {
                    id: result.toUser._id.toString(),
                    username: result.toUser.username,
                },
            },
        });
    }

    @UseGuards(JwtAuthGuard)
    @Post('read/:userId')
    async markRead(
        @CurrentUser() currentUser: { userId: string } | null,
        @Param('userId') targetUserId: string,
        @Req() req: Request,
        @Res() res: Response
    ) {
        const { t } = createRequestI18n(req);
        if (!currentUser?.userId) {
            return this.sendError(res, 401, t('auth.error.loginRequired'));
        }

        const result = await this.messageService.markRead(currentUser.userId, targetUserId);
        if (!result.ok) {
            const map: Record<string, { status: number; message: string }> = {
                userNotFound: { status: 404, message: t('message.error.userNotFound') },
                notFriend: { status: 403, message: t('message.error.notFriend') },
            };
            const payload = map[result.code];
            return this.sendError(res, payload.status, payload.message);
        }

        return res.json({ message: t('message.success.read'), updated: result.updated });
    }

    private sendError(res: Response, status: number, message: string) {
        return res.status(status).json({ error: message });
    }
}
