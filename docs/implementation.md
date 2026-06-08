# Group Decision OS — Implementation Guide

A concrete, build-order plan for the MVP. Derived from `Group_Decision_OS_PRD.pdf` and `Group_Decision_OS_Plan.pdf`. This is the *how*; `CLAUDE.md` holds the *what*.

> Status: nothing is built yet. This document proposes the structure; confirm stack choices with the product owner before scaffolding.

---

## 1. Architecture overview

```
┌─────────────────────┐         REST + WebSocket          ┌──────────────────────┐
│  React Native app   │  ───────────────────────────────▶ │  Node.js API (Nest)  │
│  (iOS + Android)    │ ◀───────────────────────────────  │                      │
│                     │     live result updates           │  ┌────────────────┐  │
└─────────────────────┘                                   │  │ Result Engine  │  │
        │  shareable invite link (deep link / web)         │  └────────────────┘  │
        ▼                                                  └──────────┬───────────┘
   Invited participant                                                │
                                                                      ▼
                                                            ┌──────────────────┐
                                                            │   PostgreSQL     │
                                                            └──────────────────┘
```

- **One backend, two clients eventually.** The invite link must resolve for users who don't have the app installed, so plan for a lightweight web entry point (or universal/deep links) even though the primary client is React Native.
- **The Result Engine is the heart of the system.** It is the only place that converts votes into an outcome. Keep it pure and isolated (no HTTP, no DB writes inside the calculation) so it can be unit-tested against all three voting modes.
- **Real-time is read-only.** Clients submit votes over REST; the server pushes updated tallies over WebSocket. Don't drive writes through the socket — it keeps the consistency model simple.

## 2. Recommended stack (confirm before committing)

| Layer      | Choice                | Notes                                                            |
|------------|-----------------------|-----------------------------------------------------------------|
| Backend    | NestJS (Node + TS)    | Module structure maps cleanly to the domain (see §4).           |
| ORM        | Prisma                | Schema-first, matches the entity model below; easy migrations.  |
| Database   | PostgreSQL            |                                                                 |
| Real-time  | WebSocket gateway     | NestJS has first-class `@WebSocketGateway`; avoid Firebase lock-in unless push/offline drives it. |
| Frontend   | React Native + Expo   | Expo for fast iteration + easy deep-link handling for invites.  |
| Auth       | JWT (email + magic link or password) | Keep minimal for MVP.                            |

## 3. Data model

Maps directly to the PRD entities. The two design-critical columns:

- `Decision.status` — drives the lifecycle. Locking is terminal.
- `Vote.weight` — present in the base schema so the engine handles yes/no, ranked, and weighted from day one.

```prisma
enum DecisionStatus {
  DRAFT      // creator still adding options
  VOTING     // open for votes
  LOCKED     // finalized, result computed, read-only
}

enum VoteMode {
  SIMPLE     // yes/no per option
  RANKED     // ordered preference
  WEIGHTED   // weighted points
}

model User {
  id        String     @id @default(cuid())
  name      String
  email     String     @unique
  decisions Decision[] @relation("CreatedBy")
  votes     Vote[]
}

model Decision {
  id          String         @id @default(cuid())
  title       String
  description String?
  status      DecisionStatus @default(DRAFT)
  voteMode    VoteMode       @default(SIMPLE)
  createdById String
  createdBy   User           @relation("CreatedBy", fields: [createdById], references: [id])
  inviteToken String         @unique          // backs the shareable link
  options     Option[]
  votes       Vote[]
  result      Result?
  createdAt   DateTime       @default(now())
}

model Option {
  id         String   @id @default(cuid())
  decisionId String
  decision   Decision @relation(fields: [decisionId], references: [id], onDelete: Cascade)
  title      String
  metadata   Json?    // image, price, notes — free-form per PRD
  votes      Vote[]
}

model Vote {
  id         String   @id @default(cuid())
  decisionId String
  decision   Decision @relation(fields: [decisionId], references: [id], onDelete: Cascade)
  userId     String
  user       User     @relation(fields: [userId], references: [id])
  optionId   String
  option     Option   @relation(fields: [optionId], references: [id], onDelete: Cascade)
  weight     Int      @default(1)   // rank position or weighted points; 1 for SIMPLE
  @@unique([decisionId, userId, optionId])  // one vote row per user/option
}

model Result {
  decisionId      String   @id
  decision        Decision @relation(fields: [decisionId], references: [id], onDelete: Cascade)
  winningOptionId String
  computedAt      DateTime @default(now())
  breakdown       Json     // per-option tallies, snapshotted at lock time
}
```

## 4. Backend module layout (NestJS)

```
src/
  decisions/      decisions.controller.ts, decisions.service.ts, dto/
  options/        nested under a decision
  votes/          vote submission + validation against decision status
  results/        result.engine.ts (pure), results.service.ts (persists)
  realtime/       results.gateway.ts (WebSocket)
  auth/           jwt strategy, guards
  prisma/         prisma.service.ts
```

Keep `result.engine.ts` free of NestJS/Prisma imports — it takes options + votes + mode and returns `{ winningOptionId, breakdown }`. Everything testable in isolation.

## 5. API surface (MVP)

| Method | Path                                  | Purpose                                         |
|--------|---------------------------------------|-------------------------------------------------|
| POST   | `/auth/login`                         | Email login → JWT                               |
| POST   | `/decisions`                          | Create decision (status `DRAFT`)                |
| GET    | `/decisions/:id`                      | Fetch decision + options + live tallies         |
| POST   | `/decisions/:id/options`              | Add an option (only while `DRAFT`)              |
| POST   | `/decisions/:id/open`                 | `DRAFT` → `VOTING`                               |
| GET    | `/invite/:token`                      | Resolve invite link → decision (joins voter)    |
| POST   | `/decisions/:id/votes`                | Submit vote(s); rejected unless `VOTING`        |
| POST   | `/decisions/:id/lock`                 | Run engine, write `Result`, `VOTING` → `LOCKED` |
| GET    | `/decisions/:id/result`              | Final winner + breakdown                        |
| GET    | `/decisions`                          | History for current user                        |
| WS     | `decision:{id}` channel               | Push tally updates on each new vote             |

**Status guards are the core invariant:** options only mutable in `DRAFT`, votes only accepted in `VOTING`, nothing mutable in `LOCKED`. Enforce in the service layer, not just the client.

## 6. Result engine — the three modes

| Mode      | Vote shape                              | Winner rule                                              |
|-----------|-----------------------------------------|---------------------------------------------------------|
| SIMPLE    | one option per user, `weight = 1`       | Most votes. Tie → flag tie in breakdown, no auto-pick.   |
| RANKED    | N rows per user, `weight` = rank        | Borda-style: lower rank = more points; highest total wins. |
| WEIGHTED  | points distributed across options       | Highest summed `weight` wins.                            |

Always return a full `breakdown` (per-option totals) alongside the winner so the result page can show the spread, and ties are surfaced rather than silently resolved.

## 7. Build order (phased)

**Phase 1 — backend core (no real-time, no app yet)**
1. Scaffold NestJS + Prisma + Postgres; run first migration.
2. Auth (JWT) + User.
3. Decisions + Options CRUD with status guards.
4. Vote submission (SIMPLE mode only).
5. Result engine (SIMPLE) + lock flow. **Unit-test the engine first.**

**Phase 2 — complete the loop**
6. Invite token + `/invite/:token` join flow.
7. RANKED and WEIGHTED modes in the engine + tests.
8. WebSocket gateway pushing live tallies.

**Phase 3 — React Native client**
9. Auth + create/list decisions.
10. Option management + voting screens (all three modes).
11. Live result screen over WebSocket.
12. Deep-link handling for invite links.

**Defer to post-MVP** (do not build unless asked): AI recommendations, confidence scoring, anonymous voting, role-based voting, decision analytics.

## 8. Testing priorities

- **Result engine: exhaustive unit tests** across all three modes including ties, single-option, and zero-vote edge cases. This is where correctness matters most and where bugs are silent.
- **Status-transition guards:** assert that out-of-phase mutations (vote on `DRAFT`, edit option on `LOCKED`) are rejected.
- Integration test the full happy path: create → options → open → vote → lock → result.
