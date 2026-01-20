import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

/**
 * 用户文档接口
 */
export interface IUser extends Document {
    username: string;
    password: string;
    email?: string;
    emailVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
    // 方法
    comparePassword(candidatePassword: string): Promise<boolean>;
}

/**
 * 用户 Schema
 */
const UserSchema = new Schema<IUser>(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            minlength: 3,
            maxlength: 20,
        },
        password: {
            type: String,
            required: true,
            minlength: 4,
        },
        email: {
            type: String,
            unique: true,
            sparse: true, // 允许多个 null 值
            trim: true,
            lowercase: true,
            match: [/^\S+@\S+\.\S+$/, '请输入有效的邮箱地址'],
        },
        emailVerified: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true, // 自动添加 createdAt 和 updatedAt
    }
);

/**
 * 保存前对密码进行哈希处理
 */
UserSchema.pre('save', async function () {
    // 只在密码被修改时重新哈希
    if (!this.isModified('password')) {
        return;
    }

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

/**
 * 验证密码方法
 */
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.password);
};

export const User = mongoose.model<IUser>('User', UserSchema);
