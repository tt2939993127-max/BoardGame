import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/boardgame';

async function seed() {
    console.log('正在连接数据库:', MONGO_URI);
    try {
        await mongoose.connect(MONGO_URI);

        // 定义简单的 Schema 以匹配现有表结构
        const UserSchema = new mongoose.Schema({
            username: { type: String, required: true, unique: true },
            password: { type: String, required: true },
            role: { type: String, enum: ['user', 'admin'], default: 'user' },
            banned: { type: Boolean, default: false },
            emailVerified: { type: Boolean, default: false }
        }, { timestamps: true, collection: 'users' }); // 明确指定 collection 为 users

        const UserModel = mongoose.model('User', UserSchema);

        const existing = await UserModel.findOne({ username: 'admin' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('admin', salt);

        if (existing) {
            console.log('admin 用户已存在，正在更新密码和角色...');
            existing.password = hashedPassword;
            existing.role = 'admin';
            await existing.save();
        } else {
            console.log('正在创建 admin 用户...');
            await UserModel.create({
                username: 'admin',
                password: hashedPassword,
                role: 'admin',
                emailVerified: true
            });
        }

        console.log('✅ Admin 账号配置成功！');
        console.log('用户名: admin');
        console.log('密  码: admin');
    } catch (error) {
        console.error('❌ 执行失败:', error);
    } finally {
        await mongoose.disconnect();
    }
}

seed();
