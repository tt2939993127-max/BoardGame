import { Body, Controller, Get, Inject, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { createRequestI18n } from '../../shared/i18n';
import { generateCode, sendVerificationEmailWithCode } from '../../../../../src/server/email';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto, SendEmailCodeDto, SendRegisterCodeDto, VerifyEmailDto, UpdateAvatarDto } from './dtos/auth.dto';

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

    @Post('register')
    async register(@Body() body: RegisterDto, @Req() req: Request, @Res() res: Response) {
        const { t } = createRequestI18n(req);
        const { username, email, code, password } = body;

        if (!username || !email || !code || !password) {
            return this.sendError(res, 400, t('auth.error.missingRegisterFields'));
        }

        if (username.length < 3 || username.length > 20) {
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
        const isCodeValid = await this.authService.verifyEmailCode(email, code);
        if (!isCodeValid) {
            return this.sendError(res, 400, t('auth.error.invalidEmailCode'));
        }

        const existingUsername = await this.authService.findByUsername(username);
        if (existingUsername) {
            return this.sendError(res, 409, t('auth.error.usernameTaken'));
        }

        const existingEmail = await this.authService.findByEmail(email);
        if (existingEmail) {
            return this.sendError(res, 409, t('auth.error.emailAlreadyUsed'));
        }

        const user = await this.authService.createUser(username, password, email);
        const token = this.authService.createToken(user);

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

    @Post('login')
    async login(@Body() body: LoginDto, @Req() req: Request, @Res() res: Response) {
        const { t } = createRequestI18n(req);
        const { username, password } = body;

        if (!username || !password) {
            return this.sendError(res, 400, t('auth.error.missingCredentials'));
        }

        const user = await this.authService.validateUser(username, password);
        if (!user) {
            return this.sendError(res, 401, t('auth.error.invalidCredentials'));
        }

        const token = this.authService.createToken(user);

        return res.json({
            message: t('auth.success.login'),
            user: {
                id: user._id.toString(),
                username: user.username,
                role: user.role,
                banned: user.banned,
            },
            token,
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

        const isValid = await this.authService.verifyEmailCode(email, code);
        if (!isValid) {
            return this.sendError(res, 400, t('auth.error.invalidEmailCode'));
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

    @UseGuards(JwtAuthGuard)
    @Post('logout')
    async logout(@Req() req: Request, @Res() res: Response) {
        const { t } = createRequestI18n(req);
        const token = this.extractToken(req);

        if (!token) {
            return this.sendError(res, 401, t('auth.error.missingToken'));
        }

        await this.authService.blacklistToken(token);
        return res.json({ message: t('auth.success.logout') });
    }

    private extractToken(request: Request): string | null {
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return null;
        }
        return authHeader.slice(7);
    }

    private sendError(res: Response, status: number, message: string) {
        return res.status(status).json({ error: message });
    }
}
