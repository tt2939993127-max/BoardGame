import { Body, Controller, Get, Inject, Param, Post, Put, Req, Res, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import type { Request, Response } from 'express';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { createRequestI18n } from '../../shared/i18n';
import { UpdateAudioSettingsDto } from './dtos/audio-settings.dto';
import { UserSettingsService } from './user-settings.service';

@Controller('auth/user-settings')
export class UserSettingsController {
    constructor(@Inject(UserSettingsService) private readonly userSettingsService: UserSettingsService) {}

    @UseGuards(JwtAuthGuard)
    @Get('audio')
    async getAudioSettings(
        @CurrentUser() currentUser: { userId: string } | null,
        @Req() req: Request,
        @Res() res: Response
    ) {
        const { t } = createRequestI18n(req);
        if (!currentUser?.userId) {
            return this.sendError(res, 401, t('auth.error.loginRequired'));
        }

        const settings = await this.userSettingsService.getAudioSettings(currentUser.userId);
        if (!settings) {
            return res.json({ empty: true, settings: null });
        }

        return res.json({
            empty: false,
            settings: this.formatAudioSettings(settings),
        });
    }

    @UseGuards(JwtAuthGuard)
    @UsePipes(new ValidationPipe({ whitelist: true, transform: true, expectedType: UpdateAudioSettingsDto }))
    @Put('audio')
    async updateAudioSettings(
        @CurrentUser() currentUser: { userId: string } | null,
        @Body() body: UpdateAudioSettingsDto,
        @Req() req: Request,
        @Res() res: Response
    ) {
        const { t } = createRequestI18n(req);
        if (!currentUser?.userId) {
            return this.sendError(res, 401, t('auth.error.loginRequired'));
        }

        const updated = await this.userSettingsService.upsertAudioSettings(currentUser.userId, body);
        return res.status(201).json({ settings: this.formatAudioSettings(updated) });
    }

    private formatAudioSettings(settings: {
        muted: boolean;
        masterVolume: number;
        sfxVolume: number;
        bgmVolume: number;
        bgmSelections?: Record<string, Record<string, string>>;
    }) {
        return {
            muted: settings.muted,
            masterVolume: settings.masterVolume,
            sfxVolume: settings.sfxVolume,
            bgmVolume: settings.bgmVolume,
            bgmSelections: settings.bgmSelections ?? {},
        };
    }

    private sendError(res: Response, status: number, message: string) {
        return res.status(status).json({ error: message });
    }

    @UseGuards(JwtAuthGuard)
    @Get('ui-hints')
    async getSeenHints(
        @CurrentUser() currentUser: { userId: string } | null,
        @Res() res: Response
    ) {
        if (!currentUser?.userId) return res.status(401).json({ error: 'Unauthorized' });
        const seenHints = await this.userSettingsService.getSeenHints(currentUser.userId);
        return res.json({ seenHints });
    }

    @UseGuards(JwtAuthGuard)
    @Post('ui-hints/:key')
    async markHintSeen(
        @CurrentUser() currentUser: { userId: string } | null,
        @Param('key') key: string,
        @Res() res: Response
    ) {
        if (!currentUser?.userId) return res.status(401).json({ error: 'Unauthorized' });
        await this.userSettingsService.markHintSeen(currentUser.userId, key);
        return res.status(201).json({ ok: true });
    }
}
