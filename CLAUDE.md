# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

This is a **greenfield project — no code exists yet.** The repository currently contains only two planning documents (`Group_Decision_OS_Plan.pdf`, `Group_Decision_OS_PRD.pdf`) and VS Code editor settings. There is no build system, no dependencies, no tests, and the directory is not a git repository. The first substantive task will be scaffolding the application; choose and commit the project structure deliberately, since none exists to follow yet.

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
