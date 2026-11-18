FROM node:22-bookworm-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates openssl python3 python3-psycopg2 && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@10.13.1 --activate
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY apps/web/package.json apps/web/package.json
COPY apps/api-legacy/package.json apps/api-legacy/package.json
COPY apps/fx-free/package.json apps/fx-free/package.json
COPY packages/api/package.json packages/api/package.json
COPY packages/api/prisma/schema.prisma packages/api/prisma/schema.prisma
COPY packages/design-tokens/package.json packages/design-tokens/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/ui/package.json packages/ui/package.json
RUN pnpm install --frozen-lockfile
# This Dockerfile has a dedicated build-context allowlist.
COPY . .
RUN node packages/api/prisma/prepare-sqlite.cjs && DATABASE_URL=file:/tmp/entrip-build.sqlite node node_modules/prisma/build/index.js generate --schema packages/api/prisma/sqlite/schema.prisma
ENV NEXT_PUBLIC_ENTRIP_LAN=true
RUN pnpm run build:tokens && pnpm run build:ts && pnpm --filter @entrip/ui run bundle && pnpm --filter @entrip/web run bundle && node scripts/verify-build-artifacts.mjs
RUN mkdir -p apps/web/.next/cache && chown -R node:node apps/web/.next/cache
LABEL io.entrip.storage=sqlite-v1
USER node
ENV NODE_ENV=production
