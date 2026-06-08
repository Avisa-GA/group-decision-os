# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

The **MVP vertical slice is built and verified end-to-end**: Create Decision → Add Options → Open Voting → Vote → Lock → Result, across a real backend and the mobile client. See `docs/implementation.md` for the full build plan and what remains.

## Repo layout

```
GDO/
  server/                # NestJS + Prisma backend (the API + DB + result engine)
  group-decision-os/     # Expo / React Native client (expo-router, TypeScript)
  docker-compose.yml     # local Postgres 16
  docs/implementation.md # full implementation guide
```

## Commands

**Backend** (`cd server`): requires Postgres — `docker compose up -d` from the repo root first.
- `npm run start:dev` — watch-mode API on `http://localhost:3000`
- `npm test` — Jest (the result engine has the meaningful coverage; run a single test with `npx jest result.engine`)
- `npx prisma migrate dev` — apply/author migrations after editing `prisma/schema.prisma`
- `npx prisma studio` — inspect the DB

**Mobile** (`cd group-decision-os`):
- `npm run web` / `npm run ios` / `npm run android` — Expo dev server (web target is used for automated verification since no simulator is installed here)
- `npx tsc --noEmit` — type-check

## Architecture notes (the non-obvious parts)

- **The result engine (`server/src/results/result.engine.ts`) is pure and the heart of the system** — `tally(options, votes, mode)` does the vote→outcome math with zero I/O, so it is exhaustively unit-tested. `DecisionsService` calls it and persists the snapshot. Only SIMPLE mode is implemented; RANKED/WEIGHTED throw by design until built.
- **Status is the core invariant.** `Decision.status` (DRAFT→VOTING→LOCKED, lock is terminal) gates everything, enforced in `DecisionsService` (not just the client): options mutate only in DRAFT, votes only in VOTING, nothing in LOCKED. The mobile `app/decisions/[id].tsx` screen renders a different UI per status.
- **Auth is lightweight by design** — `POST /auth/identify` takes a name (+ optional email) and returns a JWT; no passwords. A plain `JwtAuthGuard` (no Passport) attaches `{id, name}` to the request.
- **Mobile ↔ backend** via `group-decision-os/lib/api.ts` (typed fetch client, base URL `http://localhost:3000`). Token persists through `lib/storage.ts`, which uses SecureStore on native and localStorage on web.

### Original greenfield note (historical)

The repo began as planning docs (`*.pdf`) plus an Expo Hello World; the slice above was the first build.

## Product: Group Decision OS

A structured group decision-making platform that replaces unstructured polling (group chats, calls) with a formal workflow: create a decision, add options, invite participants, vote, lock a result, and keep a history. Targets both casual groups (families, roommates, travel groups) and small teams; the initial niche is car buying.

**Core user flow:** Create Decision → Add Options → Invite Participants (via shareable link) → Voting Phase → Result → History Saved.

**Explicit non-goals** (keep scope honest against these): not a social network, not e-commerce/booking, not a chat/messaging app, and not a replacement for domain platforms like Uber/Airbnb.

## Domain model

The PRD defines these core entities — preserve these relationships when building the schema:

- **User**: id, name, email
- **Decision**: id, title, description, createdBy, status — `status` drives the lifecycle (draft → voting → locked). A locked decision is final and produces a summary.
- **Option**: id, decisionId, title, metadata (e.g. image, price, notes)
- **Vote**: id, decisionId, userId, optionId, weight — `weight` exists in the base model because voting supports yes/no, ranked, and weighted modes. Design the vote-counting / result engine to handle all three rather than assuming simple tallies.
- **Result**: decisionId, winningOptionId — produced by the result engine that resolves a decision into an outcome.

## Planned tech stack (from PRD — suggested, not yet locked in)

- **Frontend:** React Native (iOS + Android)
- **Backend:** Node.js (NestJS or Express)
- **Database:** PostgreSQL
- **Real-time** (live results display): WebSockets or Firebase
- **Hosting:** AWS / GCP

When the user confirms framework choices, set up the corresponding build/lint/test commands and update this file with them — they don't exist yet.

## MVP scope

Build only these first: decision creation, option management, voting (yes/no, rank, weighted), simple result calculation, real-time results, final decision lock + summary, and shareable invite links. Defer post-MVP features (AI recommendations, confidence scoring, anonymous voting, role-based voting, analytics) unless explicitly asked.
