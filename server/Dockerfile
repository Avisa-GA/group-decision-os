# Portable container build for the GDO API (alternative to the render.yaml
# native-Node path — usable on Fly.io, Railway, or Render's Docker runtime).
# Single-stage for simplicity; not size-optimized.
FROM node:22-alpine

WORKDIR /app

# Install deps (incl. prisma CLI, needed for `migrate deploy` at startup).
COPY package*.json ./
RUN npm ci

# Generate the Prisma client and compile.
COPY . .
RUN npx prisma generate && npm run build

ENV NODE_ENV=production
# The platform injects PORT; main.ts reads it (defaults to 3000 locally).
EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
