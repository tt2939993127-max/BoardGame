import mongoose from 'mongoose';

// MongoDB 连接字符串（本地默认值）
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/boardgame';

/**
 * 连接到 MongoDB 数据库
 */
export async function connectDB(): Promise<void> {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ MongoDB 连接成功');
    } catch (error) {
        console.error('❌ MongoDB 连接失败:', error);
        process.exit(1);
    }
}

/**
 * 断开 MongoDB 连接
 */
export async function disconnectDB(): Promise<void> {
    await mongoose.disconnect();
    console.log('MongoDB 已断开连接');
}

export default mongoose;
