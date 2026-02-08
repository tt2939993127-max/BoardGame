import { Body, Controller, Delete, Get, Inject, Param, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { createRequestI18n } from '../../shared/i18n';
import { BanUserDto } from './dtos/ban-user.dto';
import { BulkIdsDto } from './dtos/bulk-ids.dto';
import { RoomFilterDto } from './dtos/room-filter.dto';
import { QueryMatchesDto } from './dtos/query-matches.dto';
import { QueryRoomsDto } from './dtos/query-rooms.dto';
import { QueryStatsDto } from './dtos/query-stats.dto';
import { QueryUsersDto } from './dtos/query-users.dto';
import { AdminGuard } from './guards/admin.guard';
import { Roles } from './guards/roles.decorator';
import { AdminService } from './admin.service';

@UseGuards(JwtAuthGuard, AdminGuard)
@Roles('admin')
@Controller('admin')
export class AdminController {
    constructor(@Inject(AdminService) private readonly adminService: AdminService) {}

    @Get('stats')
    async getStats(@Req() req: Request, @Res() res: Response) {
        const stats = await this.adminService.getStats();
        return res.json(stats);
    }

    @Get('stats/trend')
    async getStatsTrend(@Query() query: QueryStatsDto, @Res() res: Response) {
        const trend = await this.adminService.getStatsTrend(query.days);
        return res.json(trend);
    }

    @Get('users')
    async getUsers(@Query() query: QueryUsersDto, @Res() res: Response) {
        const result = await this.adminService.getUsers(query);
        return res.json(result);
    }

    @Get('rooms')
    async getRooms(@Query() query: QueryRoomsDto, @Res() res: Response) {
        const result = await this.adminService.getRooms(query);
        return res.json(result);
    }

    @Delete('rooms/:id')
    async destroyRoom(@Param('id') matchId: string, @Req() req: Request, @Res() res: Response) {
        const { t } = createRequestI18n(req);
        const ok = await this.adminService.destroyRoom(matchId);
        if (!ok) {
            return this.sendError(res, 404, t('admin.error.roomNotFound'));
        }
        return res.status(200).json({ message: t('admin.success.roomDestroyed'), matchID: matchId });
    }

    @Post('rooms/bulk-delete')
    async bulkDestroyRooms(@Body() body: BulkIdsDto, @Res() res: Response) {
        const result = await this.adminService.bulkDestroyRooms(body.ids || []);
        return res.status(200).json(result);
    }

    @Post('rooms/bulk-delete-by-filter')
    async bulkDestroyRoomsByFilter(@Body() body: RoomFilterDto, @Res() res: Response) {
        const result = await this.adminService.bulkDestroyRoomsByFilter(body);
        return res.status(200).json(result);
    }

    @Get('users/:id')
    async getUserDetail(@Param('id') userId: string, @Req() req: Request, @Res() res: Response) {
        const { t } = createRequestI18n(req);
        const result = await this.adminService.getUserDetail(userId);
        if (!result.ok) {
            return this.sendError(res, 404, t('admin.error.userNotFound'));
        }
        return res.json(result.data);
    }

    @Post('users/:id/ban')
    async banUser(
        @Param('id') userId: string,
        @Body() body: BanUserDto,
        @Req() req: Request,
        @Res() res: Response
    ) {
        const { t } = createRequestI18n(req);
        const reason = body.reason?.trim();
        if (!reason) {
            return this.sendError(res, 400, t('admin.error.missingBanReason'));
        }

        const result = await this.adminService.banUser(userId, reason);
        if (!result.ok) {
            const map: Record<string, { status: number; message: string }> = {
                notFound: { status: 404, message: t('admin.error.userNotFound') },
                cannotBanAdmin: { status: 400, message: t('admin.error.cannotBanAdmin') },
            };
            const payload = map[result.code];
            return this.sendError(res, payload.status, payload.message);
        }

        return res.status(201).json({ message: t('admin.success.userBanned'), user: result.user });
    }

    @Post('users/:id/unban')
    async unbanUser(@Param('id') userId: string, @Req() req: Request, @Res() res: Response) {
        const { t } = createRequestI18n(req);
        const result = await this.adminService.unbanUser(userId);
        if (!result.ok) {
            return this.sendError(res, 404, t('admin.error.userNotFound'));
        }
        return res.status(200).json({ message: t('admin.success.userUnbanned'), user: result.user });
    }

    @Delete('users/:id')
    async deleteUser(@Param('id') userId: string, @Req() req: Request, @Res() res: Response) {
        const { t } = createRequestI18n(req);
        const result = await this.adminService.deleteUser(userId);
        if (!result.ok) {
            const map: Record<string, { status: number; message: string }> = {
                notFound: { status: 404, message: t('admin.error.userNotFound') },
                cannotDeleteAdmin: { status: 400, message: t('admin.error.cannotDeleteAdmin') },
            };
            const payload = map[result.code];
            return this.sendError(res, payload.status, payload.message);
        }
        return res.status(200).json({ message: t('admin.success.userDeleted'), user: result.user });
    }

    @Post('users/bulk-delete')
    async bulkDeleteUsers(@Body() body: BulkIdsDto, @Res() res: Response) {
        const result = await this.adminService.bulkDeleteUsers(body.ids || []);
        return res.status(200).json(result);
    }

    @Get('matches')
    async getMatches(@Query() query: QueryMatchesDto, @Res() res: Response) {
        const result = await this.adminService.getMatches(query);
        return res.json(result);
    }

    @Get('matches/:id')
    async getMatchDetail(@Param('id') matchId: string, @Req() req: Request, @Res() res: Response) {
        const { t } = createRequestI18n(req);
        const match = await this.adminService.getMatchDetail(matchId);
        if (!match) {
            return this.sendError(res, 404, t('admin.error.matchNotFound'));
        }
        return res.json(match);
    }

    @Delete('matches/:id')
    async deleteMatch(@Param('id') matchId: string, @Req() req: Request, @Res() res: Response) {
        const { t } = createRequestI18n(req);
        const ok = await this.adminService.deleteMatch(matchId);
        if (!ok) {
            return this.sendError(res, 404, t('admin.error.matchNotFound'));
        }
        return res.status(200).json({ message: t('admin.success.matchDeleted'), matchID: matchId });
    }

    @Post('matches/bulk-delete')
    async bulkDeleteMatches(@Body() body: BulkIdsDto, @Res() res: Response) {
        const result = await this.adminService.bulkDeleteMatches(body.ids || []);
        return res.status(200).json(result);
    }

    private sendError(res: Response, status: number, message: string) {
        return res.status(status).json({ error: message });
    }
}
