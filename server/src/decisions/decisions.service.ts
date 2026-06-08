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

/** Max people who can JOIN a decision via invite, on top of the owner. */
export const MAX_INVITEES = 5;

@Injectable()
export class DecisionsService {
  constructor(private readonly prisma: PrismaService) {}

  create(user: AuthUser, dto: CreateDecisionDto) {
    return this.prisma.decision.create({
      data: {
        title: dto.title,
        description: dto.description,
        createdById: user.id,
        // The creator is a participant (OWNER) from the start.
        participants: { create: { userId: user.id, role: 'OWNER' } },
      },
    });
  }

  /**
   * History list — ONLY decisions the user created. Invitees never appear here,
   * so they can't see (or enumerate) decisions; they reach their one decision
   * via the invite link instead.
   */
  list(user: AuthUser) {
    return this.prisma.decision.findMany({
      where: { createdById: user.id },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { options: true, votes: true } } },
    });
  }

  /** Full decision view — restricted to participants (owner or invitee). */
  async get(user: AuthUser, id: string) {
    const decision = await this.prisma.decision.findUnique({
      where: { id },
      include: {
        options: { orderBy: { createdAt: 'asc' } },
        votes: true,
        result: true,
        createdBy: { select: { id: true, name: true } },
        participants: {
          orderBy: { joinedAt: 'asc' },
          select: { userId: true, role: true, user: { select: { id: true, name: true } } },
        },
      },
    });
    if (!decision) throw new NotFoundException('Decision not found');

    const isOwner = decision.createdById === user.id;
    const isMember = decision.participants.some((p) => p.userId === user.id);
    // Non-participants are told it doesn't exist (don't reveal other decisions).
    if (!isOwner && !isMember) throw new NotFoundException('Decision not found');

    const counts = new Map<string, number>();
    for (const vote of decision.votes) {
      counts.set(vote.optionId, (counts.get(vote.optionId) ?? 0) + 1);
    }
    const myVote = decision.votes.find((v) => v.userId === user.id) ?? null;
    const memberCount = decision.participants.filter((p) => p.role === 'MEMBER').length;

    return {
      id: decision.id,
      title: decision.title,
      description: decision.description,
      status: decision.status,
      voteMode: decision.voteMode,
      // Only the owner gets the invite token (they do the inviting).
      inviteToken: isOwner ? decision.inviteToken : undefined,
      createdBy: decision.createdBy,
      isOwner,
      participantCount: memberCount + 1, // members + owner
      slotsLeft: Math.max(0, MAX_INVITEES - memberCount),
      participants: decision.participants.map((p) => ({
        id: p.user.id,
        name: p.user.name,
        role: p.role,
        voted: decision.votes.some((v) => v.userId === p.userId),
      })),
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

  // Any participant (owner or invitee) can add options while in DRAFT.
  async addOption(user: AuthUser, id: string, dto: AddOptionDto) {
    const decision = await this.requireParticipant(id, user);
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
    return this.prisma.decision.update({ where: { id }, data: { status: 'VOTING' } });
  }

  // Any participant may vote (one vote per person; re-voting replaces it).
  async vote(user: AuthUser, id: string, optionId: string) {
    const decision = await this.requireParticipant(id, user);
    if (decision.status !== 'VOTING') {
      throw new BadRequestException('Voting is not open for this decision');
    }
    const option = await this.prisma.option.findUnique({ where: { id: optionId } });
    if (!option || option.decisionId !== id) {
      throw new BadRequestException('Option does not belong to this decision');
    }
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
        create: { decisionId: id, winningOptionId: outcome.winningOptionId, tie: outcome.tie, breakdown },
        update: { winningOptionId: outcome.winningOptionId, tie: outcome.tie, breakdown },
      }),
      this.prisma.decision.update({ where: { id }, data: { status: 'LOCKED' } }),
    ]);

    return this.get(user, id);
  }

  async getResult(user: AuthUser, id: string) {
    await this.requireParticipant(id, user);
    const result = await this.prisma.result.findUnique({ where: { decisionId: id } });
    if (!result) throw new NotFoundException('Decision has not been locked yet');
    return result;
  }

  // ---- Invite flow ----

  /** Preview an invite before joining (no membership required). */
  async previewInvite(user: AuthUser, token: string) {
    const decision = await this.prisma.decision.findUnique({
      where: { inviteToken: token },
      include: {
        createdBy: { select: { name: true } },
        participants: { select: { userId: true, role: true } },
      },
    });
    if (!decision) throw new NotFoundException('Invite not found');

    const isOwner = decision.createdById === user.id;
    const isMember = decision.participants.some((p) => p.userId === user.id);
    const memberCount = decision.participants.filter((p) => p.role === 'MEMBER').length;

    return {
      decisionId: decision.id,
      title: decision.title,
      description: decision.description,
      invitedBy: decision.createdBy.name,
      alreadyIn: isOwner || isMember,
      full: memberCount >= MAX_INVITEES,
      slotsLeft: Math.max(0, MAX_INVITEES - memberCount),
    };
  }

  /** Join a decision via its invite token (idempotent, capped at MAX_INVITEES). */
  async joinByInvite(user: AuthUser, token: string) {
    const decision = await this.prisma.decision.findUnique({
      where: { inviteToken: token },
      include: { participants: { select: { userId: true, role: true } } },
    });
    if (!decision) throw new NotFoundException('Invite not found');

    const isOwner = decision.createdById === user.id;
    const already = decision.participants.some((p) => p.userId === user.id);
    if (isOwner || already) return { decisionId: decision.id };

    const memberCount = decision.participants.filter((p) => p.role === 'MEMBER').length;
    if (memberCount >= MAX_INVITEES) {
      throw new ForbiddenException(`This decision is full — up to ${MAX_INVITEES} people can join.`);
    }

    await this.prisma.decisionParticipant.create({
      data: { decisionId: decision.id, userId: user.id, role: 'MEMBER' },
    });
    return { decisionId: decision.id };
  }

  // ---- guards ----

  private async requireDecision(id: string): Promise<Decision> {
    const decision = await this.prisma.decision.findUnique({ where: { id } });
    if (!decision) throw new NotFoundException('Decision not found');
    return decision;
  }

  /** Decision must exist and the user must be owner or an invited participant. */
  private async requireParticipant(id: string, user: AuthUser): Promise<Decision> {
    const decision = await this.requireDecision(id);
    if (decision.createdById === user.id) return decision;
    const membership = await this.prisma.decisionParticipant.findUnique({
      where: { decisionId_userId: { decisionId: id, userId: user.id } },
    });
    if (!membership) throw new NotFoundException('Decision not found');
    return decision;
  }

  private requireOwner(decision: Decision, user: AuthUser) {
    if (decision.createdById !== user.id) {
      throw new ForbiddenException('Only the decision owner can do that');
    }
  }
}
