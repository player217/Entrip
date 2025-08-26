# Build arguments
ARG NODE_VER=20-alpine

# Base stage - common dependencies
FROM node:${NODE_VER} AS base
WORKDIR /app
RUN corepack enable

# Copy workspace configuration
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./

# Copy package.json files for all workspaces
COPY packages/design-tokens/package.json ./packages/design-tokens/
COPY packages/shared/package.json ./packages/shared/
COPY packages/ui/package.json ./packages/ui/
COPY apps/api/package.json ./apps/api/

# Dependencies stage
FROM base AS deps
# Copy prisma schema file for generation
COPY apps/api/prisma ./apps/api/prisma
# Install all dependencies (including dev dependencies for build)
RUN pnpm install --frozen-lockfile

# Build stage - build all required packages
FROM deps AS build

# Copy source files for dependencies
COPY packages/design-tokens ./packages/design-tokens
COPY packages/shared ./packages/shared

# Build dependencies in correct order
RUN pnpm --filter @entrip/design-tokens run build
RUN pnpm --filter @entrip/shared run build

# Copy API source
COPY apps/api ./apps/api

# Generate Prisma client and build API
WORKDIR /app/apps/api
RUN npx prisma generate
RUN pnpm run build

# Production dependencies stage
FROM base AS prod-deps
# Install only production dependencies
RUN pnpm install --prod --frozen-lockfile

# Production stage - minimal runtime
FROM node:${NODE_VER} AS production
WORKDIR /app

# Copy node_modules and built files
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/packages ./packages
COPY --from=prod-deps /app/apps/api/node_modules ./apps/api/node_modules

# Copy built distributions
COPY --from=build /app/packages/design-tokens/dist ./packages/design-tokens/dist
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/node_modules/.prisma ./apps/api/node_modules/.prisma

# Copy package files
COPY --from=build /app/package.json ./
COPY --from=build /app/pnpm-workspace.yaml ./
COPY --from=build /app/apps/api/package.json ./apps/api/
COPY --from=build /app/packages/shared/package.json ./packages/shared/
COPY --from=build /app/packages/design-tokens/package.json ./packages/design-tokens/

# Create symlinks for workspace dependencies
RUN cd /app/apps/api/node_modules && \
    mkdir -p @entrip && \
    ln -sf /app/packages/shared @entrip/shared && \
    ln -sf /app/packages/design-tokens @entrip/design-tokens

# Copy Prisma schema for migrations
COPY --from=build /app/apps/api/prisma ./prisma

# Set environment
ENV NODE_ENV=production
WORKDIR /app/apps/api

EXPOSE 4000

# Run migrations and start server
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]

# Development stage - with hot reload
FROM deps AS dev
WORKDIR /app

# Install dev tools globally
RUN npm install -g nodemon ts-node

# Copy all source files (will be overridden by volume mount)
COPY . .

WORKDIR /app/apps/api

# Set development environment
ENV NODE_ENV=development
ENV PNPM_STORE=/pnpm-store

EXPOSE 4000
CMD ["pnpm", "dev"]
