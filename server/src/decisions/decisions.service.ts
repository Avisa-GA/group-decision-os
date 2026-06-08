import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Decision, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../auth/jwt-auth.guard';
import { tally } from '../results/result.engine';
import { CreateDecisionDto } from './dto/create-decision.dto';
import { AddOptionDto } from './dto/add-option.dto';

@Injectable()
export class DecisionsService {
  constructor(private readonly prisma: PrismaService) {}

  create(user: AuthUser, dto: CreateDecisionDto) {
    return this.prisma.decision.create({
      data: {
        title: dto.title,
        description: dto.description,
        createdById: user.id,
      },
    });
  }

  /** History: decisions created by the current user, newest first. */
  list(user: AuthUser) {
    return this.prisma.decision.findMany({
      where: { createdById: user.id },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { options: true, votes: true } } },
    });
  }

  /** Full decision view: options with live tallies, the caller's vote, result. */
  async get(user: AuthUser, id: string) {
    const decision = await this.prisma.decision.findUnique({
      where: { id },
      include: {
        options: { orderBy: { createdAt: 'asc' } },
        votes: true,
        result: true,
        createdBy: { select: { id: true, name: true } },
      },
    });
    if (!decision) throw new NotFoundException('Decision not found');

    const counts = new Map<string, number>();
    for (const vote of decision.votes) {
      counts.set(vote.optionId, (counts.get(vote.optionId) ?? 0) + 1);
    }
    const myVote = decision.votes.find((v) => v.userId === user.id) ?? null;

    return {
      id: decision.id,
      title: decision.title,
      description: decision.description,
      status: decision.status,
      voteMode: decision.voteMode,
      inviteToken: decision.inviteToken,
      createdBy: decision.createdBy,
      isOwner: decision.createdById === user.id,
      totalVotes: decision.votes.length,
      myVoteOptionId: myVote?.optionId ?? null,
      options: decision.options.map((o) => ({
        id: o.id,
        title: o.title,
        metadata: o.metadata,
        votes: counts.get(o.id) ?? 0,
      })),
      result: decision.result
        ? {
            winningOptionId: decision.result.winningOptionId,
            tie: decision.result.tie,
            breakdown: decision.result.breakdown,
          }
        : null,
    };
  }

  async addOption(user: AuthUser, id: string, dto: AddOptionDto) {
    const decision = await this.requireDecision(id);
    this.requireOwner(decision, user);
    if (decision.status !== 'DRAFT') {
      throw new BadRequestException('Options can only be added while the decision is a draft');
    }
    return this.prisma.option.create({
      data: {
        decisionId: id,
        title: dto.title,
        metadata: (dto.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async open(user: AuthUser, id: string) {
    const decision = await this.requireDecision(id);
    this.requireOwner(decision, user);
    if (decision.status !== 'DRAFT') {
      throw new BadRequestException('Only a draft decision can be opened for voting');
    }
    const optionCount = await this.prisma.option.count({ where: { decisionId: id } });
    if (optionCount < 2) {
      throw new BadRequestException('Add at least two options before opening voting');
    }
    return this.prisma.decision.update({
      where: { id },
      data: { status: 'VOTING' },
    });
  }

  async vote(user: AuthUser, id: string, optionId: string) {
    const decision = await this.requireDecision(id);
    if (decision.status !== 'VOTING') {
      throw new BadRequestException('Voting is not open for this decision');
    }
    const option = await this.prisma.option.findUnique({ where: { id: optionId } });
    if (!option || option.decisionId !== id) {
      throw new BadRequestException('Option does not belong to this decision');
    }
    // One vote per (decision, user) in SIMPLE mode; re-voting replaces it.
    await this.prisma.vote.upsert({
      where: { decisionId_userId: { decisionId: id, userId: user.id } },
      create: { decisionId: id, userId: user.id, optionId, weight: 1 },
      update: { optionId },
    });
    return this.get(user, id);
  }

  async lock(user: AuthUser, id: string) {
    const decision = await this.requireDecision(id);
    this.requireOwner(decision, user);
    if (decision.status !== 'VOTING') {
      throw new BadRequestException('Only a decision in voting can be locked');
    }

    const options = await this.prisma.option.findMany({ where: { decisionId: id } });
    const votes = await this.prisma.vote.findMany({ where: { decisionId: id } });

    const outcome = tally(
      options.map((o) => ({ id: o.id })),
      votes.map((v) => ({ optionId: v.optionId, weight: v.weight })),
      decision.voteMode,
    );

    const breakdown = outcome.breakdown as unknown as Prisma.InputJsonValue;
    await this.prisma.$transaction([
      this.prisma.result.upsert({
        where: { decisionId: id },
        create: {
          decisionId: id,
          winningOptionId: outcome.winningOptionId,
          tie: outcome.tie,
          breakdown,
        },
        update: {
          winningOptionId: outcome.winningOptionId,
          tie: outcome.tie,
          breakdown,
        },
      }),
      this.prisma.decision.update({ where: { id }, data: { status: 'LOCKED' } }),
    ]);

    return this.get(user, id);
  }

  async getResult(user: AuthUser, id: string) {
    const result = await this.prisma.result.findUnique({ where: { decisionId: id } });
    if (!result) {
      throw new NotFoundException('Decision has not been locked yet');
    }
    return result;
  }

  private async requireDecision(id: string): Promise<Decision> {
    const decision = await this.prisma.decision.findUnique({ where: { id } });
    if (!decision) throw new NotFoundException('Decision not found');
    return decision;
  }

  private requireOwner(decision: Decision, user: AuthUser) {
    if (decision.createdById !== user.id) {
      throw new ForbiddenException('Only the decision owner can do that');
    }
  }
}
