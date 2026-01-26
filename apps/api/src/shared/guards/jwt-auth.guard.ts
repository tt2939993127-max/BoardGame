import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import * as NestCommon from '@nestjs/common';
import type { Cache } from 'cache-manager';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'boardgame-secret-key-change-in-production';
const { Inject, Injectable, UnauthorizedException } = NestCommon;

export interface JwtPayload {
    userId: string;
    username: string;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
    constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<{ headers?: { authorization?: string }; user?: JwtPayload }>();
        const authHeader = request.headers?.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new UnauthorizedException('缺少登录凭证');
        }

        const token = authHeader.slice(7);

        try {
            const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
            const isBlacklisted = await this.cacheManager.get<boolean>(`jwt:blacklist:${token}`);
            if (isBlacklisted) {
                throw new UnauthorizedException('登录凭证已失效');
            }
            request.user = payload;
            return true;
        } catch (error) {
            throw new UnauthorizedException('登录凭证无效');
        }
    }
}
