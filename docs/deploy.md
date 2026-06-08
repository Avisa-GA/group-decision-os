# Deploying Group Decision OS for free

Free stack: **Neon** (Postgres) · **Render** (NestJS API) · **Vercel** (Expo web).
Everything needed is already in the repo — `server/render.yaml`, `server/Dockerfile`,
and `group-decision-os/vercel.json`. You connect the accounts; deploys are config-driven.

Order matters: **DB → API → Web** (each step produces a value the next one needs).

---

## 1. Database — Neon

1. Sign up at <https://neon.tech> and create a project (pick a region near you).
2. From the dashboard, copy the **connection string** (looks like
   `postgresql://USER:PASSWORD@ep-xxxx.REGION.aws.neon.tech/neondb?sslmode=require`).
3. Keep it handy — it becomes `DATABASE_URL` in step 2.

> Migrations run automatically against this DB from Render (`prisma migrate deploy`),
> so you don't run anything locally. The committed migrations in
> `server/prisma/migrations/` are the source of truth.

## 2. API — Render

1. Sign up at <https://render.com> and connect your GitHub (the `Avisa-GA/group-decision-os` repo).
2. **New + → Blueprint**, select the repo. Render detects `server/render.yaml` and
   proposes a free web service named `gdo-api` (it already knows `rootDir: server`,
   the build, and the start command).
3. When prompted for env vars, set **`DATABASE_URL`** to the Neon string from step 1.
   (`JWT_SECRET` is generated automatically; leave it.)
4. Create/Apply. First build takes a few minutes — it installs deps, generates the
   Prisma client, builds, runs `prisma migrate deploy`, then starts.
5. Copy the service URL, e.g. `https://gdo-api.onrender.com`. Verify it's alive:
   `curl -X POST https://gdo-api.onrender.com/auth/identify -H 'content-type: application/json' -d '{"name":"test"}'`
   → should return a JWT.

> **Free-tier cold starts:** the service sleeps after ~15 min idle; the next request
> takes ~50s to wake. Fine for a demo, noticeable in use. Upgrading the Render plan
> (or moving the API to Fly.io with the included `Dockerfile`) removes this.

## 3. Web — Vercel

1. Sign up at <https://vercel.com> and import the same repo.
2. Set **Root Directory** to `group-decision-os`. Vercel reads `vercel.json`
   (build command `npx expo export -p web`, output `dist`, SPA rewrites — all preset).
3. Add an Environment Variable:
   **`EXPO_PUBLIC_API_URL`** = your Render URL from step 2 (e.g. `https://gdo-api.onrender.com`).
   This is baked into the web bundle at build time, so it must be set before/at deploy.
4. Deploy. Open the Vercel URL — the app is live and talking to your Render API.

> If you change `EXPO_PUBLIC_API_URL` later, you must **redeploy** on Vercel (it's a
> build-time value, not runtime).

---

## How the pieces connect

```
Browser ──▶ Vercel (static Expo web)
                │  fetch(EXPO_PUBLIC_API_URL)
                ▼
            Render (NestJS API) ──▶ Neon (Postgres)
```

## Notes & gotchas

- **CORS** is already permissive (`enableCors({ origin: true })` in `server/src/main.ts`),
  so the Vercel domain works out of the box. To lock it down, change that to your Vercel
  URL and redeploy the API.
- **Auth tokens** are signed with Render's generated `JWT_SECRET`; it's stable across
  restarts, so existing logins keep working.
- **Native apps (iOS/Android):** this guide covers the web build. Shipping to the app
  stores uses EAS Build (`npx eas build`) with `EXPO_PUBLIC_API_URL` pointing at the same
  Render API — a separate effort.
- **Redeploys:** push to `master` → Render (`autoDeploy: true`) and Vercel both rebuild.
