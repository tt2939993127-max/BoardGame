#!/usr/bin/env node
/**
 * JWT Token 调试工具
 * 用于验证 token 是否有效、是否过期、payload 内容
 */

import jwt from 'jsonwebtoken';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 读取 .env 文件
const envPath = join(__dirname, '..', '.env');
const envContent = readFileSync(envPath, 'utf-8');
const JWT_SECRET = envContent.match(/JWT_SECRET=(.+)/)?.[1]?.trim();

if (!JWT_SECRET) {
    console.error('❌ 未找到 JWT_SECRET');
    process.exit(1);
}

console.log('✅ JWT_SECRET:', JWT_SECRET.substring(0, 10) + '...');

// 从命令行参数获取 token
const token = process.argv[2];

if (!token) {
    console.log('\n用法: node scripts/debug-token.mjs <your_token>');
    console.log('\n示例:');
    console.log('  1. 打开浏览器控制台');
    console.log('  2. 输入: localStorage.getItem("auth_token")');
    console.log('  3. 复制 token 并运行: node scripts/debug-token.mjs <token>');
    process.exit(0);
}

console.log('\n🔍 验证 Token...\n');

try {
    // 解码 token（不验证签名）
    const decoded = jwt.decode(token, { complete: true });
    console.log('📦 Token 结构:');
    console.log('  Header:', JSON.stringify(decoded.header, null, 2));
    console.log('  Payload:', JSON.stringify(decoded.payload, null, 2));

    // 验证 token
    const verified = jwt.verify(token, JWT_SECRET);
    console.log('\n✅ Token 验证成功！');
    console.log('  userId:', verified.userId);
    console.log('  username:', verified.username);
    
    // 检查过期时间
    if (verified.exp) {
        const expiresAt = new Date(verified.exp * 1000);
        const now = new Date();
        const remainingDays = Math.floor((expiresAt - now) / (1000 * 60 * 60 * 24));
        
        console.log('\n⏰ 过期时间:');
        console.log('  到期时间:', expiresAt.toLocaleString('zh-CN'));
        console.log('  剩余天数:', remainingDays, '天');
        
        if (remainingDays < 0) {
            console.log('  ❌ Token 已过期！');
        } else if (remainingDays < 7) {
            console.log('  ⚠️  Token 即将过期！');
        } else {
            console.log('  ✅ Token 有效');
        }
    }
} catch (error) {
    console.error('\n❌ Token 验证失败！');
    console.error('  错误:', error.message);
    
    if (error.name === 'TokenExpiredError') {
        console.error('  原因: Token 已过期');
        console.error('  过期时间:', new Date(error.expiredAt).toLocaleString('zh-CN'));
    } else if (error.name === 'JsonWebTokenError') {
        console.error('  原因: Token 格式错误或签名无效');
        console.error('  可能的原因:');
        console.error('    1. JWT_SECRET 不一致');
        console.error('    2. Token 被篡改');
        console.error('    3. Token 格式错误');
    } else if (error.name === 'NotBeforeError') {
        console.error('  原因: Token 尚未生效');
    }
    
    process.exit(1);
}
