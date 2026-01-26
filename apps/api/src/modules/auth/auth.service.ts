import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Cache } from 'cache-manager';
import jwt from 'jsonwebtoken';
import type { Model } from 'mongoose';
import { User, type UserDocument } from './schemas/user.schema';

const JWT_SECRET = process.env.JWT_SECRET || 'boardgame-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';
const DEFAULT_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;
const EMAIL_CODE_TTL_SECONDS = 5 * 60;

@Injectable()
export class AuthService {
    constructor(
        @InjectModel(User.name) private userModel: Model<UserDocument>,
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
    ) { }

    async findByUsername(username: string): Promise<UserDocument | null> {
        return this.userModel.findOne({ username });
    }

    async findById(userId: string): Promise<UserDocument | null> {
        return this.userModel.findById(userId).select('-password').exec() as Promise<UserDocument | null>;
    }

    async findByEmailExcludingUser(email: string, userId: string): Promise<UserDocument | null> {
        return this.userModel.findOne({ email, _id: { $ne: userId } });
    }

    async createUser(username: string, password: string): Promise<UserDocument> {
        const user = new this.userModel({ username, password });
        return user.save();
    }

    async validateUser(username: string, password: string): Promise<UserDocument | null> {
        const user = await this.userModel.findOne({ username });
        if (!user) return null;
        const isMatch = await (user as UserDocument).comparePassword(password);
        return isMatch ? user : null;
    }

    async updateEmail(userId: string, email: string): Promise<UserDocument | null> {
        return this.userModel.findByIdAndUpdate(
            userId,
            { email, emailVerified: true },
            { new: true }
        );
    }

    async updateAvatar(userId: string, avatar: string): Promise<UserDocument | null> {
        return this.userModel.findByIdAndUpdate(
            userId,
            { avatar },
            { new: true }
        );
    }

    createToken(user: UserDocument): string {
        return jwt.sign(
            { userId: user._id.toString(), username: user.username },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );
    }

    async blacklistToken(token: string): Promise<void> {
        const ttlSeconds = this.resolveTokenTtlSeconds(token);
        await this.cacheManager.set(`jwt:blacklist:${token}`, true, ttlSeconds);
    }

    async storeEmailCode(email: string, code: string): Promise<void> {
        await this.cacheManager.set(`verify:email:${email}`, code, EMAIL_CODE_TTL_SECONDS);
    }

    async verifyEmailCode(email: string, code: string): Promise<boolean> {
        const stored = await this.cacheManager.get<string>(`verify:email:${email}`);
        if (!stored || stored !== code) {
            return false;
        }
        await this.cacheManager.del(`verify:email:${email}`);
        return true;
    }

    private resolveTokenTtlSeconds(token: string): number {
        const decoded = jwt.decode(token);
        if (decoded && typeof decoded === 'object' && 'exp' in decoded) {
            const exp = (decoded as { exp?: number }).exp;
            if (exp) {
                const ttl = Math.floor(exp - Date.now() / 1000);
                return ttl > 0 ? ttl : 1;
            }
        }
        return DEFAULT_TOKEN_TTL_SECONDS;
    }
}
