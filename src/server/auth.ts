import Router from '@koa/router';
import jwt from 'jsonwebtoken';
import { User } from './models/User';
import type { Context, Next } from 'koa';
import type { SupportedLanguage } from '../lib/i18n/types';
import { createServerI18n } from './i18n';


// JWT 密钥（生产环境应使用环境变量）
const JWT_SECRET = process.env.JWT_SECRET || 'boardgame-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';

const authRouter = new Router({ prefix: '/auth' });

/**
 * 生成 JWT Token
 */
function generateToken(userId: string, username: string): string {
    return jwt.sign(
        { userId, username },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
}

/**
 * POST /auth/register - 用户注册
 */
authRouter.post('/register', async (ctx: Context) => {
    const { t } = createServerI18n(ctx);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { username, password } = (ctx.request as any).body as { username?: string; password?: string };

    // 验证输入
    if (!username || !password) {
        ctx.status = 400;
        ctx.body = { error: t('auth.error.missingCredentials') };
        return;
    }

    if (username.length < 3 || username.length > 20) {
        ctx.status = 400;
        ctx.body = { error: t('auth.error.usernameLength') };
        return;
    }

    if (password.length < 4) {
        ctx.status = 400;
        ctx.body = { error: t('auth.error.passwordLength') };
        return;
    }

    try {
        // 检查用户名是否已存在
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            ctx.status = 409;
            ctx.body = { error: t('auth.error.usernameTaken') };
            return;
        }

        // 创建新用户
        const user = new User({ username, password });
        await user.save();

        // 生成 token
        const token = generateToken(user._id.toString(), user.username);

        ctx.status = 201;
        ctx.body = {
            message: t('auth.success.register'),
            user: { id: user._id, username: user.username },
            token,
        };
    } catch (error: any) {
        console.error('注册失败:', error);

        // 处理 Mongoose 验证错误
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map((e: any) => e.message);
            ctx.status = 400;
            ctx.body = { error: messages.join(', ') };
            return;
        }

        ctx.status = 500;
        ctx.body = { error: t('auth.error.serverError') };
    }
});

/**
 * POST /auth/login - 用户登录
 */
authRouter.post('/login', async (ctx: Context) => {
    const { t } = createServerI18n(ctx);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { username, password } = (ctx.request as any).body as { username?: string; password?: string };

    if (!username || !password) {
        ctx.status = 400;
        ctx.body = { error: t('auth.error.missingCredentials') };
        return;
    }

    try {
        // 查找用户
        const user = await User.findOne({ username });
        if (!user) {
            ctx.status = 401;
            ctx.body = { error: t('auth.error.invalidCredentials') };
            return;
        }

        // 验证密码
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            ctx.status = 401;
            ctx.body = { error: t('auth.error.invalidCredentials') };
            return;
        }

        // 生成 token
        const token = generateToken(user._id.toString(), user.username);

        ctx.body = {
            message: t('auth.success.login'),
            user: { id: user._id, username: user.username },
            token,
        };
    } catch (error) {
        console.error('登录失败:', error);
        ctx.status = 500;
        ctx.body = { error: t('auth.error.serverError') };
    }
});

/**
 * GET /auth/me - 获取当前用户信息（需要认证）
 */
authRouter.get('/me', async (ctx: Context) => {
    const { t } = createServerI18n(ctx);
    const authHeader = ctx.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        ctx.status = 401;
        ctx.body = { error: t('auth.error.missingToken') };
        return;
    }

    const token = authHeader.substring(7);

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; username: string };
        const user = await User.findById(decoded.userId).select('-password');

        if (!user) {
            ctx.status = 404;
            ctx.body = { error: t('auth.error.userNotFound') };
            return;
        }

        ctx.body = {
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                emailVerified: user.emailVerified,
                createdAt: user.createdAt
            },
        };
    } catch (error) {
        ctx.status = 401;
        ctx.body = { error: t('auth.error.invalidToken') };
    }
});

/**
 * POST /auth/send-email-code - 发送邮箱验证码
 */
authRouter.post('/send-email-code', async (ctx: Context) => {
    const { t, locale } = createServerI18n(ctx);
    const authHeader = ctx.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        ctx.status = 401;
        ctx.body = { error: t('auth.error.loginRequired') };
        return;
    }

    const token = authHeader.substring(7);

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { email } = (ctx.request as any).body as { email?: string };

        if (!email) {
            ctx.status = 400;
            ctx.body = { error: t('auth.error.missingEmail') };
            return;
        }

        // 验证邮箱格式
        const emailRegex = /^\S+@\S+\.\S+$/;
        if (!emailRegex.test(email)) {
            ctx.status = 400;
            ctx.body = { error: t('auth.error.invalidEmail') };
            return;
        }

        // 检查邮箱是否已被其他用户绑定
        const existingUser = await User.findOne({ email, _id: { $ne: decoded.userId } });
        if (existingUser) {
            ctx.status = 409;
            ctx.body = { error: t('auth.error.emailAlreadyBound') };
            return;
        }

        // 动态导入邮件服务
        const { sendVerificationEmail } = await import('./email') as {
            sendVerificationEmail: (email: string, locale?: SupportedLanguage) => Promise<{ success: boolean; message: string }>;
        };
        const result = await sendVerificationEmail(email, locale);

        if (result.success) {
            ctx.body = { message: result.message };
        } else {
            ctx.status = 500;
            ctx.body = { error: result.message };
        }
    } catch (error) {
        ctx.status = 401;
        ctx.body = { error: t('auth.error.invalidToken') };
    }
});

/**
 * POST /auth/verify-email - 验证邮箱
 */
authRouter.post('/verify-email', async (ctx: Context) => {
    const { t } = createServerI18n(ctx);
    const authHeader = ctx.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        ctx.status = 401;
        ctx.body = { error: t('auth.error.loginRequired') };
        return;
    }

    const token = authHeader.substring(7);

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { email, code } = (ctx.request as any).body as { email?: string; code?: string };

        if (!email || !code) {
            ctx.status = 400;
            ctx.body = { error: t('auth.error.missingEmailCode') };
            return;
        }

        // 动态导入邮件服务
        const { verifyCode } = await import('./email');
        const isValid = verifyCode(email, code);

        if (!isValid) {
            ctx.status = 400;
            ctx.body = { error: t('auth.error.invalidEmailCode') };
            return;
        }

        // 更新用户邮箱
        const user = await User.findByIdAndUpdate(
            decoded.userId,
            { email, emailVerified: true },
            { new: true }
        );

        if (!user) {
            ctx.status = 404;
            ctx.body = { error: t('auth.error.userNotFound') };
            return;
        }

        ctx.body = {
            message: t('auth.success.emailBound'),
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                emailVerified: user.emailVerified,
            },
        };
    } catch (error) {
        console.error('验证邮箱失败:', error);
        ctx.status = 401;
        ctx.body = { error: t('auth.error.invalidToken') };
    }
});

/**
 * JWT 验证中间件（用于保护其他路由）
 */
export async function verifyToken(ctx: Context, next: Next): Promise<void> {
    const { t } = createServerI18n(ctx);
    const authHeader = ctx.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        ctx.status = 401;
        ctx.body = { error: t('auth.error.missingToken') };
        return;
    }

    const token = authHeader.substring(7);

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; username: string };
        ctx.state.user = decoded;
        await next();
    } catch (error) {
        ctx.status = 401;
        ctx.body = { error: t('auth.error.invalidToken') };
    }
}

export { authRouter, JWT_SECRET };
