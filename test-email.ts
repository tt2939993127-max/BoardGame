import 'dotenv/config';
import nodemailer from 'nodemailer';

const createTransporter = (port: number) => {
    const secure = port === 465;
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.qq.com',
        port,
        secure,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
        ...(secure ? {} : { requireTLS: true }),
    });
};

async function testEmail() {
    console.log('--- 开始邮件发送测试 ---');
    console.log(`SMTP 服务器: ${process.env.SMTP_HOST}`);
    console.log(`SMTP 用户: ${process.env.SMTP_USER}`);
    console.log(`SMTP 密码: ${process.env.SMTP_PASS ? '****** (已设置)' : '未设置 (❌ 错误)'}`);

    if (!process.env.SMTP_PASS || process.env.SMTP_PASS.length !== 16) {
        console.warn('\n⚠️ 警告: QQ 邮箱授权码长度通常为 16 位。请检查您的授权码是否正确。');
    }

    const ports = [465, 587];

    for (const port of ports) {
        const transporter = createTransporter(port);

        try {
            console.log(`\n正在尝试连接邮件服务器 (端口 ${port})...`);
            await transporter.verify();
            console.log('✅ 连接成功！服务器配置正确。');

            console.log('\n正在尝试发送测试邮件...');
            const info = await transporter.sendMail({
                from: process.env.SMTP_USER,
                to: process.env.SMTP_USER, // 发给自己
                subject: '测试邮件 - BoardGame Platform',
                text: '如果你收到这封邮件，说明邮件配置完全正确！',
            });

            console.log(`✅ 邮件发送成功！Message ID: ${info.messageId}`);
            return;
        } catch (error: any) {
            console.error(`\n❌ 端口 ${port} 失败！错误详情如下：`);
            console.error('----------------------------------------');
            console.error(error);
            console.error('----------------------------------------');

            if (error.code === 'EAUTH') {
                console.log('\n💡 分析: 认证失败。通常是 邮箱账号 或 授权码 填写错误。');
                console.log('   请检查 .env 文件中的 SMTP_PASS 是否为刚才生成的 16 位授权码 (不是QQ密码!)');
                return;
            }
        }
    }

    console.log('\n❌ 所有端口均失败。可能是网络/防火墙拦截或 SMTP 服务未开启。');
}

testEmail();
