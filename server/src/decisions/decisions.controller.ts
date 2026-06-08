import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthUser } from '../auth/jwt-auth.guard';
import { DecisionsService } from './decisions.service';
import { CreateDecisionDto } from './dto/create-decision.dto';
import { AddOptionDto } from './dto/add-option.dto';
import { VoteDto } from './dto/vote.dto';

@UseGuards(JwtAuthGuard)
@Controller('decisions')
export class DecisionsController {
  constructor(private readonly decisions: DecisionsService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateDecisionDto) {
    return this.decisions.create(user, dto);
  }

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.decisions.list(user);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.decisions.get(user, id);
  }

  @Post(':id/options')
  addOption(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: AddOptionDto,
  ) {
    return this.decisions.addOption(user, id, dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post(':id/open')
  open(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.decisions.open(user, id);
  }

  @HttpCode(HttpStatus.OK)
  @Post(':id/votes')
  vote(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: VoteDto,
  ) {
    return this.decisions.vote(user, id, dto.optionId);
  }

  @HttpCode(HttpStatus.OK)
  @Post(':id/lock')
  lock(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.decisions.lock(user, id);
  }

  @Get(':id/result')
  result(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.decisions.getResult(user, id);
  }
}
