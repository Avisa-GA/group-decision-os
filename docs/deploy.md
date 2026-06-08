# Deploying Group Decision OS (free, GitHub-driven)

Free stack, deployed by **GitHub Actions**:

| Piece | Host | Trigger |
|---|---|---|
| Postgres | **Neon** | created once (manual) |
| API (NestJS) | **Render** free web service | `deploy-api.yml` → Render deploy hook |
| Web (Expo export) | **GitHub Pages** | `deploy-web.yml` → Pages |

Workflows live in `.github/workflows/`:
- `ci.yml` — builds + tests both sides on every push/PR.
- `deploy-api.yml` — on `server/**` changes: build + test, then fire the Render deploy hook.
- `deploy-web.yml` — on `group-decision-os/**` changes: build the web export (sub-path + API URL) and publish to Pages.

> One-time setup order matters: **DB → API → configure secrets → Web** (the web build needs the API URL).

---

## 1. Database — Neon (once)

1. Create a project at <https://neon.tech>.
2. Copy the **connection string** (`postgresql://…neon.tech/neondb?sslmode=require`). It becomes `DATABASE_URL` on Render.

## 2. API service — Render (create once)

1. At <https://render.com>, connect the GitHub repo.
2. **New + → Blueprint** → select the repo. Render reads `server/render.yaml` (free Node service `gdo-api`, `rootDir: server`).
3. Set env var **`DATABASE_URL`** = the Neon string. (`JWT_SECRET` auto-generates.)
4. Apply. First deploy builds, runs `prisma migrate deploy`, and starts. Copy the URL, e.g. `https://gdo-api.onrender.com`.
5. **Settings → Deploy Hook** → copy the hook URL (used by GitHub Actions).

> `autoDeploy` is **off** in `render.yaml` — GitHub Actions is the single deploy trigger (no double builds).

## 3. GitHub configuration (once)

In the repo: **Settings → Secrets and variables → Actions**:
- **Variable** `EXPO_PUBLIC_API_URL` = your Render URL (e.g. `https://gdo-api.onrender.com`).
  *(A variable, not a secret — it's baked into the public web bundle anyway.)*
- **Secret** `RENDER_DEPLOY_HOOK_URL` = the deploy hook from step 2.5.

Then **Settings → Pages → Build and deployment → Source = GitHub Actions**.

## 4. Deploy

Push to `master` (or run the workflows manually via **Actions → … → Run workflow**):
- `deploy-api.yml` builds/tests and triggers Render.
- `deploy-web.yml` publishes the web app to Pages.

Your app: **`https://<owner>.github.io/group-decision-os/`**
(for this repo, `https://avisa-ga.github.io/group-decision-os/`).

---

## How it fits together

```
        push to master
        ┌──────────────┬───────────────┐
        ▼              ▼               ▼
     ci.yml      deploy-api.yml   deploy-web.yml
   (test both)   curl deploy hook  build + Pages deploy
                       │                 │
                       ▼                 ▼
                 Render (API) ──▶ Neon   GitHub Pages (web)
                                          │ fetch(EXPO_PUBLIC_API_URL)
                                          └────────▶ Render API
```

## Notes & gotchas

- **Sub-path hosting:** Pages serves project sites at `/group-decision-os/`. `app.config.js`
  sets `experiments.baseUrl` from `EXPO_BASE_URL` (the workflow passes `/group-decision-os`),
  so assets and `expo-router` links resolve correctly. Local dev and root-hosted deploys leave it empty.
- **SPA deep links:** the web workflow copies `index.html` → `404.html` so refreshing a
  route like `/decisions/abc` works, and adds `.nojekyll` so the `_expo/` assets aren't stripped.
- **API URL is build-time:** changing `EXPO_PUBLIC_API_URL` requires re-running `deploy-web.yml`.
- **Render free cold start:** ~50s wake after ~15 min idle. The included `server/Dockerfile`
  lets you move the API to Fly.io if that matters.
- **CORS** already reflects any origin (`server/src/main.ts`), so the Pages domain works as-is.
- **Native apps:** out of scope here; use EAS Build with the same `EXPO_PUBLIC_API_URL`.
