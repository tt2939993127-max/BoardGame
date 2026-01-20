import Router from '@koa/router';
import jwt from 'jsonwebtoken';
import { User } from './models/User';
import type { Context, Next } from 'koa';

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
    const { username, password } = ctx.request.body as { username?: string; password?: string };

    // 验证输入
    if (!username || !password) {
        ctx.status = 400;
        ctx.body = { error: '用户名和密码不能为空' };
        return;
    }

    if (username.length < 3 || username.length > 20) {
        ctx.status = 400;
        ctx.body = { error: '用户名长度应在 3-20 个字符之间' };
        return;
    }

    if (password.length < 4) {
        ctx.status = 400;
        ctx.body = { error: '密码长度至少为 4 个字符' };
        return;
    }

    try {
        // 检查用户名是否已存在
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            ctx.status = 409;
            ctx.body = { error: '用户名已被占用' };
            return;
        }

        // 创建新用户
        const user = new User({ username, password });
        await user.save();

        // 生成 token
        const token = generateToken(user._id.toString(), user.username);

        ctx.status = 201;
        ctx.body = {
            message: '注册成功',
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
        ctx.body = { error: '服务器错误，请稍后重试' };
    }
});

/**
 * POST /auth/login - 用户登录
 */
authRouter.post('/login', async (ctx: Context) => {
    const { username, password } = ctx.request.body as { username?: string; password?: string };

    if (!username || !password) {
        ctx.status = 400;
        ctx.body = { error: '用户名和密码不能为空' };
        return;
    }

    try {
        // 查找用户
        const user = await User.findOne({ username });
        if (!user) {
            ctx.status = 401;
            ctx.body = { error: '用户名或密码错误' };
            return;
        }

        // 验证密码
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            ctx.status = 401;
            ctx.body = { error: '用户名或密码错误' };
            return;
        }

        // 生成 token
        const token = generateToken(user._id.toString(), user.username);

        ctx.body = {
            message: '登录成功',
            user: { id: user._id, username: user.username },
            token,
        };
    } catch (error) {
        console.error('登录失败:', error);
        ctx.status = 500;
        ctx.body = { error: '服务器错误，请稍后重试' };
    }
});

/**
 * GET /auth/me - 获取当前用户信息（需要认证）
 */
authRouter.get('/me', async (ctx: Context) => {
    const authHeader = ctx.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        ctx.status = 401;
        ctx.body = { error: '未提供认证令牌' };
        return;
    }

    const token = authHeader.substring(7);

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; username: string };
        const user = await User.findById(decoded.userId).select('-password');

        if (!user) {
            ctx.status = 404;
            ctx.body = { error: '用户不存在' };
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
        ctx.body = { error: '无效的认证令牌' };
    }
});

/**
 * POST /auth/send-email-code - 发送邮箱验证码
 */
authRouter.post('/send-email-code', async (ctx: Context) => {
    const authHeader = ctx.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        ctx.status = 401;
        ctx.body = { error: '请先登录' };
        return;
    }

    const token = authHeader.substring(7);

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
        const { email } = ctx.request.body as { email?: string };

        if (!email) {
            ctx.status = 400;
            ctx.body = { error: '请输入邮箱地址' };
            return;
        }

        // 验证邮箱格式
        const emailRegex = /^\S+@\S+\.\S+$/;
        if (!emailRegex.test(email)) {
            ctx.status = 400;
            ctx.body = { error: '请输入有效的邮箱地址' };
            return;
        }

        // 检查邮箱是否已被其他用户绑定
        const existingUser = await User.findOne({ email, _id: { $ne: decoded.userId } });
        if (existingUser) {
            ctx.status = 409;
            ctx.body = { error: '该邮箱已被其他账户绑定' };
            return;
        }

        // 动态导入邮件服务
        const { sendVerificationEmail } = await import('./email');
        const result = await sendVerificationEmail(email);

        if (result.success) {
            ctx.body = { message: result.message };
        } else {
            ctx.status = 500;
            ctx.body = { error: result.message };
        }
    } catch (error) {
        ctx.status = 401;
        ctx.body = { error: '无效的认证令牌' };
    }
});

/**
 * POST /auth/verify-email - 验证邮箱
 */
authRouter.post('/verify-email', async (ctx: Context) => {
    const authHeader = ctx.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        ctx.status = 401;
        ctx.body = { error: '请先登录' };
        return;
    }

    const token = authHeader.substring(7);

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
        const { email, code } = ctx.request.body as { email?: string; code?: string };

        if (!email || !code) {
            ctx.status = 400;
            ctx.body = { error: '请输入邮箱和验证码' };
            return;
        }

        // 动态导入邮件服务
        const { verifyCode } = await import('./email');
        const isValid = verifyCode(email, code);

        if (!isValid) {
            ctx.status = 400;
            ctx.body = { error: '验证码错误或已过期' };
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
            ctx.body = { error: '用户不存在' };
            return;
        }

        ctx.body = {
            message: '邮箱绑定成功',
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
        ctx.body = { error: '无效的认证令牌' };
    }
});

/**
 * JWT 验证中间件（用于保护其他路由）
 */
export async function verifyToken(ctx: Context, next: Next): Promise<void> {
    const authHeader = ctx.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        ctx.status = 401;
        ctx.body = { error: '未提供认证令牌' };
        return;
    }

    const token = authHeader.substring(7);

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; username: string };
        ctx.state.user = decoded;
        await next();
    } catch (error) {
        ctx.status = 401;
        ctx.body = { error: '无效的认证令牌' };
    }
}

export { authRouter, JWT_SECRET };
