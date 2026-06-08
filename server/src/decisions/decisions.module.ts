import { Module } from '@nestjs/common';
import { DecisionsService } from './decisions.service';
import { DecisionsController } from './decisions.controller';
import { InviteController } from './invite.controller';

@Module({
  providers: [DecisionsService],
  controllers: [DecisionsController, InviteController],
})
export class DecisionsModule {}
