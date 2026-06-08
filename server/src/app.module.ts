import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { DecisionsModule } from './decisions/decisions.module';

@Module({
  imports: [PrismaModule, AuthModule, DecisionsModule],
})
export class AppModule {}
