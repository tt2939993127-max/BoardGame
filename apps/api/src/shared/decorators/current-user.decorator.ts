import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { JwtPayload } from '../guards/jwt-auth.guard';

export const CurrentUser = createParamDecorator(
    (_data: unknown, ctx: ExecutionContext): JwtPayload | null => {
        const request = ctx.switchToHttp().getRequest<{ user?: JwtPayload }>();
        return request.user ?? null;
    }
);
