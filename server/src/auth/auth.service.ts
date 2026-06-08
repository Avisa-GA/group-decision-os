import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { IdentifyDto } from './dto/identify.dto';

/**
 * Lightweight identity for the MVP: a user "identifies" with a name (and
 * optional email) and receives a JWT. No passwords — the goal is a frictionless
 * create/join flow. Real accounts can layer on later without changing callers.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async identify(dto: IdentifyDto) {
    // Find-or-create. Email (when given) is the stable identifier; otherwise we
    // always create a fresh anonymous-ish user keyed only by name.
    let user = dto.email
      ? await this.prisma.user.findUnique({ where: { email: dto.email } })
      : null;

    if (!user) {
      user = await this.prisma.user.create({
        data: { name: dto.name, email: dto.email },
      });
    }

    const token = await this.jwt.signAsync({ sub: user.id, name: user.name });
    return { token, user: { id: user.id, name: user.name, email: user.email } };
  }
}
