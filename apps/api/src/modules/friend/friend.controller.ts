import { Body, Controller, Delete, Get, Inject, Param, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { createRequestI18n } from '../../shared/i18n';
import { FriendRequestDto } from './dtos/friend.dto';
import { FriendService } from './friend.service';

@Controller('auth/friends')
export class FriendController {
    constructor(@Inject(FriendService) private readonly friendService: FriendService) {}

    @UseGuards(JwtAuthGuard)
    @Get()
    async getFriends(@CurrentUser() currentUser: { userId: string } | null, @Req() req: Request, @Res() res: Response) {
        const { t } = createRequestI18n(req);
        if (!currentUser?.userId) {
            return this.sendError(res, 401, t('auth.error.loginRequired'));
        }

        const friends = await this.friendService.getFriendList(currentUser.userId);
        return res.json({ friends });
    }

    @UseGuards(JwtAuthGuard)
    @Get('requests')
    async getRequests(@CurrentUser() currentUser: { userId: string } | null, @Req() req: Request, @Res() res: Response) {
        const { t } = createRequestI18n(req);
        if (!currentUser?.userId) {
            return this.sendError(res, 401, t('auth.error.loginRequired'));
        }

        const requests = await this.friendService.getPendingRequests(currentUser.userId);
        return res.json({ requests });
    }

    @UseGuards(JwtAuthGuard)
    @Get('search')
    async searchUsers(
        @CurrentUser() currentUser: { userId: string } | null,
        @Query('q') query: string | undefined,
        @Req() req: Request,
        @Res() res: Response
    ) {
        const { t } = createRequestI18n(req);
        if (!currentUser?.userId) {
            return this.sendError(res, 401, t('auth.error.loginRequired'));
        }

        const keyword = query?.trim() || '';
        if (!keyword) {
            return this.sendError(res, 400, t('friend.error.missingQuery'));
        }

        const users = await this.friendService.searchUsers(currentUser.userId, keyword);
        return res.json({ users });
    }

    @UseGuards(JwtAuthGuard)
    @Post('request')
    async requestFriend(
        @CurrentUser() currentUser: { userId: string } | null,
        @Body() body: FriendRequestDto,
        @Req() req: Request,
        @Res() res: Response
    ) {
        const { t } = createRequestI18n(req);
        if (!currentUser?.userId) {
            return this.sendError(res, 401, t('auth.error.loginRequired'));
        }

        const targetUserId = body.userId?.trim();
        if (!targetUserId) {
            return this.sendError(res, 400, t('friend.error.missingTargetUser'));
        }

        const result = await this.friendService.createRequest(currentUser.userId, targetUserId);
        if (!result.ok) {
            const map: Record<string, { status: number; message: string }> = {
                self: { status: 400, message: t('friend.error.cannotAddSelf') },
                userNotFound: { status: 404, message: t('friend.error.userNotFound') },
                alreadyFriends: { status: 409, message: t('friend.error.alreadyFriends') },
                requestExists: { status: 409, message: t('friend.error.requestExists') },
                incomingRequest: { status: 409, message: t('friend.error.incomingRequest') },
            };
            const payload = map[result.code];
            return this.sendError(res, payload.status, payload.message);
        }

        return res.status(201).json({
            message: t('friend.success.requestSent'),
            request: {
                id: result.request._id.toString(),
                toUser: {
                    id: result.targetUser._id.toString(),
                    username: result.targetUser.username,
                },
            },
        });
    }

    @UseGuards(JwtAuthGuard)
    @Post('accept/:id')
    async acceptRequest(
        @CurrentUser() currentUser: { userId: string } | null,
        @Param('id') requestId: string,
        @Req() req: Request,
        @Res() res: Response
    ) {
        const { t } = createRequestI18n(req);
        if (!currentUser?.userId) {
            return this.sendError(res, 401, t('auth.error.loginRequired'));
        }

        const result = await this.friendService.acceptRequest(requestId, currentUser.userId);
        if (!result.ok) {
            return this.sendError(res, 404, t('friend.error.requestNotFound'));
        }

        return res.json({
            message: t('friend.success.requestAccepted'),
            friend: {
                id: result.friendUser._id.toString(),
                username: result.friendUser.username,
            },
        });
    }

    @UseGuards(JwtAuthGuard)
    @Post('reject/:id')
    async rejectRequest(
        @CurrentUser() currentUser: { userId: string } | null,
        @Param('id') requestId: string,
        @Req() req: Request,
        @Res() res: Response
    ) {
        const { t } = createRequestI18n(req);
        if (!currentUser?.userId) {
            return this.sendError(res, 401, t('auth.error.loginRequired'));
        }

        const result = await this.friendService.rejectRequest(requestId, currentUser.userId);
        if (!result.ok) {
            return this.sendError(res, 404, t('friend.error.requestNotFound'));
        }

        return res.json({
            message: t('friend.success.requestRejected'),
            friend: {
                id: result.friendUser._id.toString(),
                username: result.friendUser.username,
            },
        });
    }

    @UseGuards(JwtAuthGuard)
    @Delete(':id')
    async deleteFriend(
        @CurrentUser() currentUser: { userId: string } | null,
        @Param('id') friendUserId: string,
        @Req() req: Request,
        @Res() res: Response
    ) {
        const { t } = createRequestI18n(req);
        if (!currentUser?.userId) {
            return this.sendError(res, 401, t('auth.error.loginRequired'));
        }

        const result = await this.friendService.deleteFriend(currentUser.userId, friendUserId);
        if (!result.ok) {
            return this.sendError(res, 404, t('friend.error.friendNotFound'));
        }

        return res.json({ message: t('friend.success.friendDeleted') });
    }

    private sendError(res: Response, status: number, message: string) {
        return res.status(status).json({ error: message });
    }
}
