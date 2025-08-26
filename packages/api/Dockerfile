# Build stage
FROM node:18-alpine AS builder

# Install latest pnpm
RUN npm install -g pnpm@10.15.0

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/api/package.json ./packages/api/
COPY packages/shared/package.json ./packages/shared/

# Copy Prisma schema before install (needed for postinstall hook)
COPY packages/api/prisma ./packages/api/prisma

# Install dependencies with frozen lockfile recreation
RUN pnpm install --frozen-lockfile || pnpm install --force

# Copy rest of source code
COPY packages/api ./packages/api
COPY packages/shared ./packages/shared

# Generate Prisma client
WORKDIR /app/packages/api
RUN pnpm prisma generate

# Build the application
RUN pnpm build

# Production stage
FROM node:18-alpine

# Install wget for healthcheck
RUN apk add --no-cache wget

WORKDIR /app

# Copy built application from builder
COPY --from=builder /app/packages/api/dist ./dist
COPY --from=builder /app/packages/api/package.json ./
COPY --from=builder /app/packages/api/prisma ./prisma

# Install production dependencies with npm
RUN npm install --production --ignore-scripts

# Copy Prisma client from builder (after npm install to avoid conflicts)
RUN rm -rf ./node_modules/.prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/.pnpm/@prisma+client@5.22.0_prisma@5.22.0/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/.pnpm/@prisma+client@5.22.0_prisma@5.22.0/node_modules/@prisma/client ./node_modules/@prisma/client

# Set environment
ENV NODE_ENV=production

# Expose port
EXPOSE 4002

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --retries=3 \
  CMD wget --spider -q http://localhost:4002/health || exit 1

# Start the application
CMD ["node", "dist/index.js"]