import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

export interface AuthUser {
  id: string;
  name: string;
}

/**
 * Verifies the Bearer JWT and attaches { id, name } to request.user.
 * Plain @nestjs/jwt — no Passport — since the token is the whole auth story.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);
    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string; name: string }>(
        token,
      );
      (request as Request & { user: AuthUser }).user = {
        id: payload.sub,
        name: payload.name,
      };
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
    return true;
  }

  private extractToken(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
