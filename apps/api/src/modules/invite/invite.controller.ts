import { Body, Controller, Inject, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { createRequestI18n } from '../../shared/i18n';
import { SendInviteDto } from './dtos/invite.dto';
import { InviteService } from './invite.service';

@Controller('auth/invites')
export class InviteController {
    constructor(@Inject(InviteService) private readonly inviteService: InviteService) {}

    @UseGuards(JwtAuthGuard)
    @Post('send')
    async sendInvite(
        @CurrentUser() currentUser: { userId: string } | null,
        @Body() body: SendInviteDto,
        @Req() req: Request,
        @Res() res: Response
    ) {
        const { t } = createRequestI18n(req);
        if (!currentUser?.userId) {
            return this.sendError(res, 401, t('auth.error.loginRequired'));
        }

        const result = await this.inviteService.sendInvite(
            currentUser.userId,
            body.toUserId.trim(),
            body.matchId.trim(),
            body.gameName.trim()
        );

        if (!result.ok) {
            const map: Record<string, { status: number; message: string }> = {
                userNotFound: { status: 404, message: t('invite.error.userNotFound') },
                notFriend: { status: 403, message: t('invite.error.notFriend') },
                invalidTarget: { status: 400, message: t('invite.error.invalidTarget') },
            };
            const payload = map[result.code];
            return this.sendError(res, payload.status, payload.message);
        }

        return res.status(201).json({
            message: t('invite.success.sent'),
            invite: {
                id: result.message._id.toString(),
                toUser: {
                    id: result.toUser._id.toString(),
                    username: result.toUser.username,
                },
                matchId: result.message.inviteData?.matchId,
                gameName: result.message.inviteData?.gameName,
            },
        });
    }

    private sendError(res: Response, status: number, message: string) {
        return res.status(status).json({ error: message });
    }
}
