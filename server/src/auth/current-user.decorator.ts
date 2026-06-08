import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthUser } from './jwt-auth.guard';

/** Injects the authenticated user (set by JwtAuthGuard) into a handler param. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
