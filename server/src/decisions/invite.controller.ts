import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard, AuthUser } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { DecisionsService } from './decisions.service';

@UseGuards(JwtAuthGuard)
@Controller('invite')
export class InviteController {
  constructor(private readonly decisions: DecisionsService) {}

  /** Preview what you're being invited to (without joining yet). */
  @Get(':token')
  preview(@CurrentUser() user: AuthUser, @Param('token') token: string) {
    return this.decisions.previewInvite(user, token);
  }

  /** Join the decision behind this invite token. */
  @HttpCode(HttpStatus.OK)
  @Post(':token/join')
  join(@CurrentUser() user: AuthUser, @Param('token') token: string) {
    return this.decisions.joinByInvite(user, token);
  }
}
