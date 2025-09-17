# Build arguments
ARG NODE_VER=20-slim

# Base stage - common dependencies and pnpm setup
FROM node:${NODE_VER} AS base
WORKDIR /app
RUN corepack enable

# Copy workspace configuration
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./

# Dependencies fetch stage - optimize for Docker layer caching
FROM base AS deps-fetch
# Copy package.json files for all workspaces to leverage pnpm fetch
COPY packages/api/package.json ./packages/api/
COPY packages/shared/package.json ./packages/shared/
COPY packages/design-tokens/package.json ./packages/design-tokens/

# Copy Prisma schema for postinstall hook
COPY packages/api/prisma ./packages/api/prisma

# Use pnpm fetch for better caching (all dependencies for build stage)
RUN pnpm fetch

# Dependencies install stage
FROM deps-fetch AS deps
# Install dependencies with fetch cache (non-interactive)
ENV CI=true
RUN pnpm install --offline --frozen-lockfile

# Build stage - build all required packages with type checking
FROM deps AS builder

# Copy source files for shared dependencies
COPY packages/shared ./packages/shared
COPY packages/design-tokens ./packages/design-tokens

# Build shared dependencies first  
RUN pnpm --filter @entrip/shared build
RUN pnpm --filter @entrip/design-tokens build

# Copy API source
COPY packages/api ./packages/api

# Generate Prisma client and build API with strict type checking
WORKDIR /app/packages/api
RUN pnpm prisma generate

# Build API with type checking (generates JS files)
WORKDIR /app/packages/api
RUN pnpm run prisma:generate && pnpm tsc --build --force

# Production dependencies stage
FROM deps-fetch AS prod-deps
# Install only production dependencies (don't skip postinstall yet)
ENV CI=true
RUN pnpm install --prod --frozen-lockfile --offline

# Final production stage that properly handles Prisma Client
FROM node:${NODE_VER} AS production

# Install curl for healthcheck (more lightweight than wget)
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Enable pnpm
RUN corepack enable

# Copy workspace configuration
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./

# Copy package.json files for all workspaces
COPY packages/api/package.json ./packages/api/
COPY packages/shared/package.json ./packages/shared/
COPY packages/design-tokens/package.json ./packages/design-tokens/

# Copy Prisma schema for postinstall
COPY --from=builder /app/packages/api/prisma ./packages/api/prisma

# Install production dependencies
RUN pnpm install --prod --frozen-lockfile

# Copy the generated Prisma client from builder stage
# The client was generated in builder stage with the correct schema
COPY --from=builder /app/node_modules/.pnpm/@prisma+client@5.22.0_prisma@5.22.0 ./node_modules/.pnpm/@prisma+client@5.22.0_prisma@5.22.0

# Create the symlink that Prisma expects for the generated client
RUN cd /app/node_modules/.pnpm/@prisma+client@5.22.0_prisma@5.22.0/node_modules/@prisma/client && \
    ln -sf ../../.prisma .prisma

# Copy built distributions
COPY --from=builder /app/packages/api/dist ./packages/api/dist
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/design-tokens/dist ./packages/design-tokens/dist

# Create workspace symlinks for proper module resolution
WORKDIR /app/packages/api
RUN cd node_modules && \
    mkdir -p @entrip && \
    ln -sf /app/packages/shared @entrip/shared && \
    ln -sf /app/packages/design-tokens @entrip/design-tokens

# Set environment
ENV NODE_ENV=production
WORKDIR /app/packages/api

# Expose port
EXPOSE 4005

# Enhanced health check with proper API endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD curl --fail http://localhost:4005/health || exit 1

# Start the application with database migration
CMD ["node", "dist/index.js"]