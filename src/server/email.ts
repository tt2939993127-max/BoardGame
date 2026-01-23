import nodemailer from 'nodemailer';
import { DEFAULT_LANGUAGE, type SupportedLanguage } from '../lib/i18n/types';
import { tServer } from './i18n';

/**
 * 邮件服务配置
 * 
 * 使用前请在环境变量中配置：
 * - SMTP_HOST: SMTP 服务器地址 (如 smtp.qq.com)
 * - SMTP_PORT: SMTP 端口 (如 465)
 * - SMTP_USER: 邮箱账号
 * - SMTP_PASS: 邮箱授权码 (不是密码)
 */

// 验证码存储 (简易实现，生产环境建议使用 Redis)
const verificationCodes: Map<string, { code: string; expires: number }> = new Map();

// 创建邮件传输器
const createTransporter = () => {
    const host = process.env.SMTP_HOST || 'smtp.qq.com';
    const port = parseInt(process.env.SMTP_PORT || '465');
    const secure = port === 465;

    return nodemailer.createTransport({
        host,
        port,
        secure,
        auth: {
            user: process.env.SMTP_USER || '',
            pass: process.env.SMTP_PASS || '',
        },
        ...(secure ? {} : { requireTLS: true }),
    });
};

/**
 * 生成 6 位数字验证码
 */
export function generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * 发送验证码邮件
 */
export async function sendVerificationEmail(
    email: string,
    locale: SupportedLanguage = DEFAULT_LANGUAGE,
): Promise<{ success: boolean; message: string }> {
    const smtpUser = process.env.SMTP_USER;
    const t = (key: string, params?: Record<string, string | number>) => tServer(locale, key, params);

    if (!smtpUser || !process.env.SMTP_PASS) {
        console.error('SMTP 配置缺失，请设置环境变量');
        return { success: false, message: t('email.error.missingConfig') };
    }

    const code = generateCode();
    const expires = Date.now() + 5 * 60 * 1000; // 5 分钟有效期

    // 存储验证码
    verificationCodes.set(email, { code, expires });

    const transporter = createTransporter();

    try {
        await transporter.sendMail({
            from: `"${t('email.template.senderName')}" <${smtpUser}>`,
            to: email,
            subject: t('email.subject'),
            html: `
                <div style="font-family: 'Georgia', serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #fcfbf9; border: 1px solid #e5e0d0;">
                    <h2 style="color: #433422; margin-bottom: 24px; text-align: center;">${t('email.template.title')}</h2>
                    <p style="color: #8c7b64; font-size: 14px; line-height: 1.6;">
                        ${t('email.template.intro')}
                    </p>
                    <div style="background: #f3f0e6; padding: 20px; text-align: center; margin: 24px 0; border: 1px solid #e5e0d0;">
                        <span style="font-size: 32px; font-weight: bold; color: #433422; letter-spacing: 8px;">${code}</span>
                    </div>
                    <p style="color: #8c7b64; font-size: 12px;">
                        ${t('email.template.note', { minutes: 5 })}
                    </p>
                    <hr style="border: none; border-top: 1px solid #e5e0d0; margin: 24px 0;" />
                    <p style="color: #c0a080; font-size: 10px; text-align: center;">
                        ${t('email.template.footer')}
                    </p>
                </div>
            `,
        });

        console.log(`验证码已发送至 ${email}: ${code}`);
        return { success: true, message: t('email.success.sent') };
    } catch (error) {
        console.error('发送邮件失败 (网络原因):', error);

        // --- 模拟模式 Fallback ---
        console.log('\n==================================================');
        console.log(' [开发模式] 模拟邮件发送');
        console.log(` 收件人: ${email}`);
        console.log(` 验证码: ${code}  <--- 请使用此验证码`);
        console.log('==================================================\n');

        return { success: true, message: t('email.info.devFallback') };
    }
}

/**
 * 验证验证码
 */
export function verifyCode(email: string, code: string): boolean {
    const stored = verificationCodes.get(email);

    if (!stored) {
        return false;
    }

    if (Date.now() > stored.expires) {
        verificationCodes.delete(email);
        return false;
    }

    if (stored.code !== code) {
        return false;
    }

    // 验证成功，删除验证码
    verificationCodes.delete(email);
    return true;
}

/**
 * 清理过期验证码 (可选，定期调用)
 */
export function cleanupExpiredCodes(): void {
    const now = Date.now();
    for (const [email, data] of verificationCodes.entries()) {
        if (now > data.expires) {
            verificationCodes.delete(email);
        }
    }
}
