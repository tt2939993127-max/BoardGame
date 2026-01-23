import 'dotenv/config'; // 加载 .env 文件
import Koa from 'koa';
import cors from '@koa/cors';
import bodyParser from 'koa-bodyparser';
import { connectDB } from './src/server/db';
import { authRouter } from './src/server/auth';

const API_PORT = Number(process.env.API_SERVER_PORT) || 18001;

async function startAPIServer() {
    // 连接数据库
    await connectDB();

    // 创建 Koa 应用
    const app = new Koa();

    // 中间件
    app.use(cors({
        origin: '*', // 开发环境允许所有来源
        credentials: true,
    }));
    app.use(bodyParser());

    // 认证路由
    app.use(authRouter.routes());
    app.use(authRouter.allowedMethods());

    // 健康检查端点
    app.use(async (ctx, next) => {
        if (ctx.path === '/health') {
            ctx.body = { status: 'ok', timestamp: new Date().toISOString() };
            return;
        }
        await next();
    });

    // 启动服务器
    app.listen(API_PORT, () => {
        console.log(`🚀 API 服务器运行在 http://localhost:${API_PORT}`);
        console.log(`   - POST /auth/register - 注册`);
        console.log(`   - POST /auth/login - 登录`);
        console.log(`   - GET /auth/me - 获取当前用户`);
        console.log(`   - POST /auth/send-email-code - 发送邮箱验证码`);
        console.log(`   - POST /auth/verify-email - 验证邮箱`);
        console.log(`   - GET /health - 健康检查`);

        // 检查 SMTP 配置
        if (process.env.SMTP_USER && process.env.SMTP_PASS) {
            console.log(`📧 SMTP 服务已配置: ${process.env.SMTP_USER}`);
        } else {
            console.log('⚠️  SMTP 服务未配置 (邮箱绑定功能不可用)');
        }
    });
}

startAPIServer().catch((error) => {
    console.error('API 服务器启动失败:', error);
    process.exit(1);
});
