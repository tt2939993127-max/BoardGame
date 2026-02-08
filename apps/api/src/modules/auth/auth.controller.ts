import { Body, Controller, Get, Inject, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { CookieOptions, Request, Response } from 'express';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { createRequestI18n } from '../../shared/i18n';
import { generateCode, sendPasswordResetEmailWithCode, sendVerificationEmailWithCode } from '../../../../../src/server/email';
import { AuthService } from './auth.service';
import { ChangePasswordDto, LoginDto, RegisterDto, SendEmailCodeDto, SendRegisterCodeDto, SendResetCodeDto, ResetPasswordDto, VerifyEmailDto, UpdateAvatarDto } from './dtos/auth.dto';

const REFRESH_COOKIE_NAME = 'refresh_token';
const REFRESH_COOKIE_PATH = '/auth';

@Controller('auth')
export class AuthController {
    constructor(@Inject(AuthService) private readonly authService: AuthService) { }

    @Post('send-register-code')
    async sendRegisterCode(@Body() body: SendRegisterCodeDto, @Req() req: Request, @Res() res: Response) {
        const { t, locale } = createRequestI18n(req);
        const email = body.email?.trim();

        if (!email) {
            return this.sendError(res, 400, t('auth.error.missingEmail'));
        }

        const emailRegex = /^\S+@\S+\.\S+$/;
        if (!emailRegex.test(email)) {
            return this.sendError(res, 400, t('auth.error.invalidEmail'));
        }

        const existingUser = await this.authService.findByEmail(email);
        if (existingUser) {
            return this.sendError(res, 409, t('auth.error.emailAlreadyUsed'));
        }

        const code = generateCode();
        const result = await sendVerificationEmailWithCode(email, code, locale);
        if (!result.success) {
            return this.sendError(res, 500, result.message);
        }

        await this.authService.storeEmailCode(email, code);

        return res.json({ message: result.message });
    }

    @Post('send-reset-code')
    async sendResetCode(@Body() body: SendResetCodeDto, @Req() req: Request, @Res() res: Response) {
        const { t, locale } = createRequestI18n(req);
        const email = body.email?.trim();

        if (!email) {
            return this.sendError(res, 400, t('auth.error.missingEmail'));
        }

        const emailRegex = /^\S+@\S+\.\S+$/;
        if (!emailRegex.test(email)) {
            return this.sendError(res, 400, t('auth.error.invalidEmail'));
        }

        const clientIp = this.resolveClientIp(req);
        const sendStatus = await this.authService.getResetSendStatus(email, clientIp);
        if (sendStatus) {
            return this.sendError(res, 429, t('auth.error.resetSendTooFrequent', { seconds: sendStatus.retryAfterSeconds }));
        }

        const existingUser = await this.authService.findByEmail(email);
        if (!existingUser) {
            await this.authService.markResetSend(email, clientIp);
            return this.sendError(res, 404, t('auth.error.emailNotRegistered'));
        }

        const code = generateCode();
        const result = await sendPasswordResetEmailWithCode(email, code, locale);
        if (!result.success) {
            return this.sendError(res, 500, result.message);
        }

        await this.authService.storeResetCode(email, code);
        await this.authService.markResetSend(email, clientIp);
        return res.json({ message: t('auth.success.resetCodeSent') });
    }

    @Post('register')
    async register(@Body() body: RegisterDto, @Req() req: Request, @Res() res: Response) {
        const { t } = createRequestI18n(req);
        const { username, email, code, password } = body;

        if (!username || !email || !code || !password) {
            return this.sendError(res, 400, t('auth.error.missingRegisterFields'));
        }

        if (username.length < 2 || username.length > 20) {
            return this.sendError(res, 400, t('auth.error.usernameLength'));
        }

        if (password.length < 4) {
            return this.sendError(res, 400, t('auth.error.passwordLength'));
        }

        const emailRegex = /^\S+@\S+\.\S+$/;
        if (!emailRegex.test(email)) {
            return this.sendError(res, 400, t('auth.error.invalidEmail'));
        }

        // 验证邮箱验证码
        const emailCodeStatus = await this.authService.verifyEmailCode(email, code);
        if (emailCodeStatus !== 'ok') {
            const messageKey = emailCodeStatus === 'missing'
                ? 'auth.error.emailCodeExpired'
                : 'auth.error.emailCodeMismatch';
            return this.sendError(res, 400, t(messageKey));
        }

        // username 不再要求唯一（仅昵称）；邮箱仍为唯一标识。
        const existingEmail = await this.authService.findByEmail(email);
        if (existingEmail) {
            return this.sendError(res, 409, t('auth.error.emailAlreadyUsed'));
        }

        const user = await this.authService.createUser(username, password, email);
        const token = this.authService.createToken(user);
        const refreshToken = await this.authService.issueRefreshToken(user._id.toString());
        this.setRefreshCookie(res, refreshToken.token, refreshToken.expiresAt);

        return res.status(201).json({
            message: t('auth.success.register'),
            user: {
                id: user._id.toString(),
                username: user.username,
                email: user.email,
                emailVerified: user.emailVerified,
                role: user.role,
                banned: user.banned,
            },
            token,
        });
    }

    @Post('reset-password')
    async resetPassword(@Body() body: ResetPasswordDto, @Req() req: Request, @Res() res: Response) {
        const { t } = createRequestI18n(req);
        const email = body.email?.trim();
        const code = body.code?.trim();
        const newPassword = body.newPassword ?? '';

        if (!email || !code || !newPassword) {
            return this.sendError(res, 400, t('auth.error.missingResetFields'));
        }

        const emailRegex = /^\S+@\S+\.\S+$/;
        if (!emailRegex.test(email)) {
            return this.sendError(res, 400, t('auth.error.invalidEmail'));
        }

        if (newPassword.length < 4) {
            return this.sendError(res, 400, t('auth.error.passwordLength'));
        }

        const attemptStatus = await this.authService.getResetAttemptStatus(email);
        if (attemptStatus) {
            return this.sendError(res, 429, t('auth.error.resetLocked', { seconds: attemptStatus.retryAfterSeconds }));
        }

        const resetCodeStatus = await this.authService.verifyResetCode(email, code);
        if (resetCodeStatus !== 'ok') {
            const failure = await this.authService.recordResetAttempt(email);
            if (failure.locked) {
                return this.sendError(res, 429, t('auth.error.resetLocked', { seconds: failure.retryAfterSeconds ?? 0 }));
            }
            const messageKey = resetCodeStatus === 'missing'
                ? 'auth.error.resetCodeExpired'
                : 'auth.error.resetCodeMismatch';
            return this.sendError(res, 400, t(messageKey));
        }

        const user = await this.authService.findByEmail(email);
        if (!user) {
            return this.sendError(res, 400, t('auth.error.invalidResetCode'));
        }

        await this.authService.updatePassword(user._id.toString(), newPassword);
        await this.authService.clearResetAttempts(email);
        await this.authService.revokeRefreshTokensForUser(user._id.toString());

        return res.json({ message: t('auth.success.passwordReset') });
    }

    @Post('login')
    async login(@Body() body: LoginDto, @Req() req: Request, @Res() res: Response) {
        const { t } = createRequestI18n(req);
        const { account, password } = body;

        if (!account || !password) {
            return this.sendAuthFailure(res, 'AUTH_MISSING_CREDENTIALS', t('auth.error.missingCredentials'));
        }

        const trimmedAccount = account.trim();
        const emailRegex = /^\S+@\S+\.\S+$/;
        if (!emailRegex.test(trimmedAccount)) {
            return this.sendAuthFailure(res, 'AUTH_INVALID_EMAIL', t('auth.error.invalidEmail'));
        }

        const clientIp = this.resolveClientIp(req);
        const lockStatus = await this.authService.getLoginLockStatus(trimmedAccount, clientIp);
        if (lockStatus) {
            return this.sendAuthFailure(res, 'AUTH_LOGIN_LOCKED', t('auth.error.loginLocked', { seconds: lockStatus.retryAfterSeconds }), {
                retryAfterSeconds: lockStatus.retryAfterSeconds,
            });
        }

        const user = await this.authService.validateUser(trimmedAccount, password);
        if (!user) {
            const failure = await this.authService.recordLoginFailure(trimmedAccount, clientIp);
            if (failure.locked) {
                return this.sendAuthFailure(res, 'AUTH_LOGIN_LOCKED', t('auth.error.loginLocked', { seconds: failure.retryAfterSeconds ?? 0 }), {
                    retryAfterSeconds: failure.retryAfterSeconds ?? 0,
                });
            }
            return this.sendAuthFailure(res, 'AUTH_INVALID_CREDENTIALS', t('auth.error.invalidCredentials'));
        }

        await this.authService.clearLoginFailures(trimmedAccount, clientIp);
        const token = this.authService.createToken(user);
        const refreshToken = await this.authService.issueRefreshToken(user._id.toString());
        this.setRefreshCookie(res, refreshToken.token, refreshToken.expiresAt);

        return this.sendAuthSuccess(res, 'AUTH_LOGIN_OK', t('auth.success.login'), {
            token,
            user: {
                id: user._id.toString(),
                username: user.username,
                email: user.email,
                emailVerified: user.emailVerified,
                role: user.role,
                banned: user.banned,
            },
        });
    }

    @UseGuards(JwtAuthGuard)
    @Get('me')
    async me(@CurrentUser() currentUser: { userId: string } | null, @Req() req: Request, @Res() res: Response) {
        const { t } = createRequestI18n(req);
        if (!currentUser?.userId) {
            return this.sendError(res, 401, t('auth.error.invalidToken'));
        }

        const user = await this.authService.findById(currentUser.userId);
        if (!user) {
            return this.sendError(res, 404, t('auth.error.userNotFound'));
        }

        return res.json({
            user: {
                id: user._id.toString(),
                username: user.username,
                email: user.email,
                emailVerified: user.emailVerified,
                lastOnline: user.lastOnline ?? null,
                avatar: user.avatar ?? null,
                role: user.role,
                banned: user.banned,
                bannedAt: user.bannedAt ?? null,
                bannedReason: user.bannedReason ?? null,
                createdAt: user.createdAt,
            },
        });
    }

    @UseGuards(JwtAuthGuard)
    @Post('send-email-code')
    async sendEmailCode(
        @CurrentUser() currentUser: { userId: string } | null,
        @Body() body: SendEmailCodeDto,
        @Req() req: Request,
        @Res() res: Response
    ) {
        const { t, locale } = createRequestI18n(req);
        const email = body.email?.trim();

        if (!currentUser?.userId) {
            return this.sendError(res, 401, t('auth.error.loginRequired'));
        }

        if (!email) {
            return this.sendError(res, 400, t('auth.error.missingEmail'));
        }

        const emailRegex = /^\S+@\S+\.\S+$/;
        if (!emailRegex.test(email)) {
            return this.sendError(res, 400, t('auth.error.invalidEmail'));
        }

        const existingUser = await this.authService.findByEmailExcludingUser(email, currentUser.userId);
        if (existingUser) {
            return this.sendError(res, 409, t('auth.error.emailAlreadyBound'));
        }

        const code = generateCode();
        const result = await sendVerificationEmailWithCode(email, code, locale);
        if (!result.success) {
            return this.sendError(res, 500, result.message);
        }

        await this.authService.storeEmailCode(email, code);

        return res.json({ message: result.message });
    }

    @UseGuards(JwtAuthGuard)
    @Post('verify-email')
    async verifyEmail(
        @CurrentUser() currentUser: { userId: string } | null,
        @Body() body: VerifyEmailDto,
        @Req() req: Request,
        @Res() res: Response
    ) {
        const { t } = createRequestI18n(req);
        const email = body.email?.trim();
        const code = body.code?.trim();

        if (!currentUser?.userId) {
            return this.sendError(res, 401, t('auth.error.loginRequired'));
        }

        if (!email || !code) {
            return this.sendError(res, 400, t('auth.error.missingEmailCode'));
        }

        const emailCodeStatus = await this.authService.verifyEmailCode(email, code);
        if (emailCodeStatus !== 'ok') {
            const messageKey = emailCodeStatus === 'missing'
                ? 'auth.error.emailCodeExpired'
                : 'auth.error.emailCodeMismatch';
            return this.sendError(res, 400, t(messageKey));
        }

        const user = await this.authService.updateEmail(currentUser.userId, email);
        if (!user) {
            return this.sendError(res, 404, t('auth.error.userNotFound'));
        }

        return res.json({
            message: t('auth.success.emailBound'),
            user: {
                id: user._id.toString(),
                username: user.username,
                email: user.email,
                emailVerified: user.emailVerified,
                role: user.role,
                banned: user.banned,
            },
        });
    }

    @UseGuards(JwtAuthGuard)
    @Post('update-avatar')
    async updateAvatar(
        @CurrentUser() currentUser: { userId: string } | null,
        @Body() body: UpdateAvatarDto,
        @Req() req: Request,
        @Res() res: Response
    ) {
        const { t } = createRequestI18n(req);
        if (!currentUser?.userId) {
            return this.sendError(res, 401, t('auth.error.loginRequired'));
        }

        const user = await this.authService.updateAvatar(currentUser.userId, body.avatar);
        if (!user) {
            return this.sendError(res, 404, t('auth.error.userNotFound'));
        }

        return res.json({
            message: t('auth.success.avatarUpdated') || 'Avatar updated',
            user: {
                id: user._id.toString(),
                username: user.username,
                avatar: user.avatar,
                role: user.role,
                banned: user.banned,
            },
        });
    }

    @Post('refresh')
    async refresh(@Req() req: Request, @Res() res: Response) {
        const { t } = createRequestI18n(req);
        const refreshToken = this.extractRefreshToken(req);
        if (!refreshToken) {
            return this.sendAuthFailure(res, 'AUTH_MISSING_TOKEN', t('auth.error.missingToken'));
        }

        const rotation = await this.authService.rotateRefreshToken(refreshToken);
        if (rotation.status === 'invalid' || rotation.status === 'reuse') {
            this.clearRefreshCookie(res);
            return this.sendAuthFailure(res, 'AUTH_INVALID_TOKEN', t('auth.error.invalidToken'));
        }

        const user = await this.authService.findById(rotation.userId);
        if (!user) {
            await this.authService.revokeRefreshTokensForUser(rotation.userId);
            this.clearRefreshCookie(res);
            return this.sendAuthFailure(res, 'AUTH_USER_NOT_FOUND', t('auth.error.userNotFound'));
        }

        const token = this.authService.createToken(user);
        this.setRefreshCookie(res, rotation.token, rotation.expiresAt);

        return this.sendAuthSuccess(res, 'AUTH_REFRESH_OK', t('auth.success.refreshToken'), { token });
    }

    @UseGuards(JwtAuthGuard)
    @Post('logout')
    async logout(@Req() req: Request, @Res() res: Response) {
        const { t } = createRequestI18n(req);
        const token = this.extractToken(req);

        if (!token) {
            return this.sendAuthFailure(res, 'AUTH_MISSING_TOKEN', t('auth.error.missingToken'));
        }

        await this.authService.blacklistToken(token);
        const refreshToken = this.extractRefreshToken(req);
        if (refreshToken) {
            await this.authService.revokeRefreshToken(refreshToken);
        }
        this.clearRefreshCookie(res);
        return this.sendAuthSuccess(res, 'AUTH_LOGOUT_OK', t('auth.success.logout'), {});
    }

    @UseGuards(JwtAuthGuard)
    @Post('change-password')
    async changePassword(
        @CurrentUser() currentUser: { userId: string } | null,
        @Body() body: ChangePasswordDto,
        @Req() req: Request,
        @Res() res: Response
    ) {
        const { t } = createRequestI18n(req);
        if (!currentUser?.userId) {
            return this.sendError(res, 401, t('auth.error.loginRequired'));
        }

        const currentPassword = body.currentPassword ?? '';
        const newPassword = body.newPassword ?? '';

        if (!currentPassword || !newPassword) {
            return this.sendError(res, 400, t('auth.error.missingPasswordFields'));
        }

        if (newPassword.length < 4) {
            return this.sendError(res, 400, t('auth.error.passwordLength'));
        }

        const user = await this.authService.validateUserById(currentUser.userId, currentPassword);
        if (!user) {
            return this.sendError(res, 401, t('auth.error.invalidCredentials'));
        }

        await this.authService.updatePassword(currentUser.userId, newPassword);
        return res.json({ message: t('auth.success.passwordUpdated') });
    }

    private extractToken(request: Request): string | null {
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return null;
        }
        return authHeader.slice(7);
    }

    private extractRefreshToken(request: Request): string | null {
        const cookieHeader = request.headers.cookie;
        if (!cookieHeader) {
            return null;
        }

        const parts = cookieHeader.split(';');
        for (const part of parts) {
            const [key, ...rest] = part.trim().split('=');
            if (key === REFRESH_COOKIE_NAME) {
                return decodeURIComponent(rest.join('='));
            }
        }

        return null;
    }

    private setRefreshCookie(res: Response, token: string, expiresAt: number) {
        res.cookie(REFRESH_COOKIE_NAME, token, {
            ...this.getRefreshCookieBaseOptions(),
            expires: new Date(expiresAt * 1000),
        });
    }

    private clearRefreshCookie(res: Response) {
        res.clearCookie(REFRESH_COOKIE_NAME, this.getRefreshCookieBaseOptions());
    }

    private sendAuthSuccess(
        res: Response,
        code: string,
        message: string,
        data: Record<string, unknown>
    ) {
        return res.status(200).json({
            success: true,
            code,
            message,
            data,
        });
    }

    private sendAuthFailure(
        res: Response,
        code: string,
        message: string,
        data: Record<string, unknown> = {}
    ) {
        return res.status(200).json({
            success: false,
            code,
            message,
            data,
        });
    }

    private resolveClientIp(req: Request): string | null {
        const forwarded = req.headers['x-forwarded-for'];
        if (Array.isArray(forwarded) && forwarded.length > 0) {
            return forwarded[0]?.split(',')[0]?.trim() ?? null;
        }
        if (typeof forwarded === 'string' && forwarded.length > 0) {
            return forwarded.split(',')[0]?.trim() ?? null;
        }
        return req.socket.remoteAddress ?? null;
    }

    private getRefreshCookieBaseOptions(): CookieOptions {
        const isProd = process.env.NODE_ENV === 'production';
        const sameSite: CookieOptions['sameSite'] = isProd ? 'none' : 'lax';
        return {
            httpOnly: true,
            secure: isProd,
            sameSite,
            path: REFRESH_COOKIE_PATH,
        };
    }

    private sendError(res: Response, status: number, message: string) {
        return res.status(status).json({ error: message });
    }
}
