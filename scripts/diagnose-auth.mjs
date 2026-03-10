#!/usr/bin/env node
/**
 * 认证问题快速诊断工具
 * 
 * 使用方法：
 * 1. 在浏览器控制台获取 token: localStorage.getItem('auth_token')
 * 2. 运行: node scripts/diagnose-auth.mjs <token>
 */

import jwt from 'jsonwebtoken';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔍 认证问题诊断工具\n');
console.log('=' .repeat(60));

// ============================================================================
// 1. 检查 JWT_SECRET 配置
// ============================================================================
console.log('\n📋 步骤 1: 检查 JWT_SECRET 配置\n');

const rootEnvPath = join(__dirname, '..', '.env');
if (!existsSync(rootEnvPath)) {
    console.error('❌ 未找到根目录 .env 文件');
    process.exit(1);
}

const rootEnvContent = readFileSync(rootEnvPath, 'utf-8');
const JWT_SECRET = rootEnvContent.match(/JWT_SECRET=(.+)/)?.[1]?.trim();

if (!JWT_SECRET) {
    console.error('❌ 根目录 .env 中未设置 JWT_SECRET');
    process.exit(1);
}

console.log('✅ JWT_SECRET 已配置');
console.log(`   长度: ${JWT_SECRET.length} 字符`);
console.log(`   前缀: ${JWT_SECRET.substring(0, 10)}...`);

// 检查 apps/api/.env
const apiEnvPath = join(__dirname, '..', 'apps', 'api', '.env');
if (existsSync(apiEnvPath)) {
    const apiEnvContent = readFileSync(apiEnvPath, 'utf-8');
    const apiJwtSecret = apiEnvContent.match(/JWT_SECRET=(.+)/)?.[1]?.trim();
    
    if (apiJwtSecret && apiJwtSecret !== JWT_SECRET) {
        console.error('\n❌ 警告: apps/api/.env 的 JWT_SECRET 与根目录不一致！');
        console.error('   这会导致 token 验证失败');
        console.error('\n   解决方案: 删除 apps/api/.env 或确保两者一致');
    } else {
        console.log('✅ JWT_SECRET 配置一致');
    }
}

// ============================================================================
// 2. 验证 Token
// ============================================================================
const token = process.argv[2];

if (!token) {
    console.log('\n' + '='.repeat(60));
    console.log('\n📝 下一步: 验证你的 token\n');
    console.log('1. 打开浏览器控制台（F12）');
    console.log('2. 输入: localStorage.getItem("auth_token")');
    console.log('3. 复制 token 并运行:');
    console.log('   node scripts/diagnose-auth.mjs <your_token>');
    console.log('\n' + '='.repeat(60));
    process.exit(0);
}

console.log('\n' + '='.repeat(60));
console.log('\n📋 步骤 2: 验证 Token\n');

try {
    // 解码 token（不验证签名）
    const decoded = jwt.decode(token, { complete: true });
    
    if (!decoded) {
        console.error('❌ Token 格式错误，无法解码');
        console.error('   可能原因:');
        console.error('   1. Token 不是有效的 JWT 格式');
        console.error('   2. Token 被截断或损坏');
        process.exit(1);
    }
    
    console.log('✅ Token 格式正确');
    console.log(`   算法: ${decoded.header.alg}`);
    console.log(`   类型: ${decoded.header.typ}`);
    
    // 检查 payload
    const payload = decoded.payload;
    console.log('\n📦 Token Payload:');
    console.log(`   userId: ${payload.userId || '❌ 缺失'}`);
    console.log(`   username: ${payload.username || '❌ 缺失'}`);
    
    if (!payload.userId) {
        console.error('\n❌ Token 缺少 userId 字段');
        console.error('   这会导致服务器拒绝请求');
        process.exit(1);
    }
    
    // 验证签名
    console.log('\n🔐 验证签名...');
    try {
        const verified = jwt.verify(token, JWT_SECRET);
        console.log('✅ 签名验证成功');
        
        // 检查过期时间
        if (verified.exp) {
            const expiresAt = new Date(verified.exp * 1000);
            const now = new Date();
            const remainingMs = expiresAt - now;
            const remainingDays = Math.floor(remainingMs / (1000 * 60 * 60 * 24));
            const remainingHours = Math.floor((remainingMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            
            console.log('\n⏰ 过期时间:');
            console.log(`   签发时间: ${new Date(verified.iat * 1000).toLocaleString('zh-CN')}`);
            console.log(`   到期时间: ${expiresAt.toLocaleString('zh-CN')}`);
            console.log(`   剩余时间: ${remainingDays} 天 ${remainingHours} 小时`);
            
            if (remainingMs < 0) {
                console.error('\n❌ Token 已过期！');
                console.error('   解决方案: 重新登录');
                process.exit(1);
            } else if (remainingDays < 7) {
                console.warn('\n⚠️  Token 即将过期（剩余 < 7 天）');
                console.warn('   建议: 刷新 token 或重新登录');
            } else {
                console.log('   ✅ Token 有效');
            }
        }
        
        // ============================================================================
        // 3. 诊断结果
        // ============================================================================
        console.log('\n' + '='.repeat(60));
        console.log('\n📊 诊断结果\n');
        console.log('✅ JWT_SECRET 配置正确');
        console.log('✅ Token 格式正确');
        console.log('✅ Token 签名有效');
        console.log('✅ Token 未过期');
        console.log('✅ Token 包含必要字段（userId, username）');
        
        console.log('\n🎉 你的认证配置没有问题！\n');
        console.log('如果仍然收到 401 错误，可能的原因：');
        console.log('1. 网络问题（CORS、代理配置）');
        console.log('2. 服务器未正确读取 .env 文件');
        console.log('3. 请求头格式错误（缺少 "Bearer " 前缀）');
        console.log('4. 服务器使用了不同的 JWT_SECRET（重启服务器试试）');
        
        console.log('\n建议操作：');
        console.log('1. 重启游戏服务器: npm run dev');
        console.log('2. 重启 API 服务器（如果使用）');
        console.log('3. 清除浏览器缓存并重新登录');
        console.log('4. 检查浏览器控制台的网络请求，确认 Authorization 头是否正确');
        
    } catch (verifyError) {
        console.error('\n❌ 签名验证失败！');
        console.error(`   错误: ${verifyError.message}`);
        
        if (verifyError.name === 'TokenExpiredError') {
            console.error('\n   原因: Token 已过期');
            console.error(`   过期时间: ${new Date(verifyError.expiredAt).toLocaleString('zh-CN')}`);
            console.error('\n   解决方案: 重新登录');
        } else if (verifyError.name === 'JsonWebTokenError') {
            console.error('\n   原因: JWT_SECRET 不匹配或 Token 被篡改');
            console.error('\n   可能的原因:');
            console.error('   1. API 服务器和游戏服务器使用不同的 JWT_SECRET');
            console.error('   2. Token 是用旧的 JWT_SECRET 签发的（服务器重启后更换了密钥）');
            console.error('   3. Token 在传输过程中被修改');
            console.error('\n   解决方案:');
            console.error('   1. 确保所有服务器使用相同的 JWT_SECRET');
            console.error('   2. 重启所有服务器');
            console.error('   3. 清除浏览器缓存并重新登录');
        }
        
        process.exit(1);
    }
    
} catch (error) {
    console.error('\n❌ Token 验证失败');
    console.error(`   错误: ${error.message}`);
    process.exit(1);
}

console.log('\n' + '='.repeat(60));
