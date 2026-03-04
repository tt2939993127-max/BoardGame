import {
    Body,
    Controller,
    Delete,
    Get,
    Inject,
    Param,
    Post,
    Put,
    Req,
    Res,
    UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';

import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { createRequestI18n } from '../../shared/i18n';
import { CustomDeckService } from './custom-deck.service';
import { CreateCustomDeckDto } from './dtos/create-custom-deck.dto';
import { UpdateCustomDeckDto } from './dtos/update-custom-deck.dto';

/**
 * 自定义牌组 Controller
 * 路由前缀 /auth/custom-decks，所有端点需要 JWT 认证
 */
@Controller('auth/custom-decks')
export class CustomDeckController {
    constructor(
        @Inject(CustomDeckService)
        private readonly customDeckService: CustomDeckService,
    ) {}

    /** GET / — 获取当前用户的所有牌组列表 */
    @UseGuards(JwtAuthGuard)
    @Get()
    async list(
        @CurrentUser() currentUser: { userId: string } | null,
        @Req() req: Request,
        @Res() res: Response,
    ) {
        const { t } = createRequestI18n(req);
        if (!currentUser?.userId) {
            return this.sendError(res, 401, t('auth.error.loginRequired'));
        }

        const decks = await this.customDeckService.findAllByOwner(currentUser.userId);
        return res.json({ decks });
    }

    /** GET /:id — 获取单个牌组详情 */
    @UseGuards(JwtAuthGuard)
    @Get(':id')
    async getById(
        @CurrentUser() currentUser: { userId: string } | null,
        @Param('id') id: string,
        @Req() req: Request,
        @Res() res: Response,
    ) {
        const { t } = createRequestI18n(req);
        if (!currentUser?.userId) {
            return this.sendError(res, 401, t('auth.error.loginRequired'));
        }

        const deck = await this.customDeckService.findById(id, currentUser.userId);
        return res.json(deck);
    }

    /** POST / — 创建新牌组 */
    @UseGuards(JwtAuthGuard)
    @Post()
    async create(
        @CurrentUser() currentUser: { userId: string } | null,
        @Body() dto: CreateCustomDeckDto,
        @Req() req: Request,
        @Res() res: Response,
    ) {
        const { t } = createRequestI18n(req);
        if (!currentUser?.userId) {
            return this.sendError(res, 401, t('auth.error.loginRequired'));
        }

        const deck = await this.customDeckService.create(currentUser.userId, dto);
        return res.status(201).json(deck);
    }

    /** PUT /:id — 更新牌组 */
    @UseGuards(JwtAuthGuard)
    @Put(':id')
    async update(
        @CurrentUser() currentUser: { userId: string } | null,
        @Param('id') id: string,
        @Body() dto: UpdateCustomDeckDto,
        @Req() req: Request,
        @Res() res: Response,
    ) {
        const { t } = createRequestI18n(req);
        if (!currentUser?.userId) {
            return this.sendError(res, 401, t('auth.error.loginRequired'));
        }

        const deck = await this.customDeckService.update(id, currentUser.userId, dto);
        return res.json(deck);
    }

    /** DELETE /:id — 删除牌组 */
    @UseGuards(JwtAuthGuard)
    @Delete(':id')
    async remove(
        @CurrentUser() currentUser: { userId: string } | null,
        @Param('id') id: string,
        @Req() req: Request,
        @Res() res: Response,
    ) {
        const { t } = createRequestI18n(req);
        if (!currentUser?.userId) {
            return this.sendError(res, 401, t('auth.error.loginRequired'));
        }

        await this.customDeckService.delete(id, currentUser.userId);
        return res.json({ deleted: true });
    }

    /** 统一错误响应 */
    private sendError(res: Response, status: number, message: string) {
        return res.status(status).json({ error: message });
    }
}
