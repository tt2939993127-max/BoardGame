import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Reflector } from '@nestjs/core';
import type { Model } from 'mongoose';
import { User, type UserDocument } from '../../auth/schemas/user.schema';
import { ROLES_KEY, type Role } from './roles.decorator';

type RequestWithUser = {
    user?: {
        userId?: string;
    };
};

@Injectable()
export class AdminGuard implements CanActivate {
    constructor(
        @Inject(Reflector) private readonly reflector: Reflector,
        @InjectModel(User.name) private readonly userModel: Model<UserDocument>
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (!requiredRoles || requiredRoles.length === 0) {
            return true;
        }

        const request = context.switchToHttp().getRequest<RequestWithUser>();
        const userId = request.user?.userId;

        if (!userId) {
            throw new ForbiddenException('无权限访问');
        }

        const user = await this.userModel.findById(userId).select('role banned').lean();
        if (!user) {
            throw new ForbiddenException('无权限访问');
        }

        if (user.banned) {
            throw new ForbiddenException('账号已被封禁');
        }

        if (!requiredRoles.includes(user.role as Role)) {
            throw new ForbiddenException('无权限访问');
        }

        return true;
    }
}
