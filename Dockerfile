FROM node:20-alpine AS base

# Enable corepack (pnpm)
ENV PNPM_HOME=/pnpm
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && apk add --no-cache dumb-init

WORKDIR /app

# Install dependencies (with lockfile) in a separate layer
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Runtime image (includes dev deps so we can run TS with tsx)
FROM base AS runner

# Create non-root user
RUN addgroup -g 1001 -S nodejs \ 
  && adduser -S nodejs -u 1001
USER nodejs
WORKDIR /app

# Copy node_modules from deps and the application source
COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs package.json ./
COPY --chown=nodejs:nodejs tsconfig.json ./
COPY --chown=nodejs:nodejs drizzle.config.ts ./
COPY --chown=nodejs:nodejs healthcheck.ts ./
COPY --chown=nodejs:nodejs src ./src

EXPOSE 3000
ENTRYPOINT ["dumb-init", "--"]

# Healthcheck runs the TS file via tsx (present in devDependencies)
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=5 \
  CMD node --version >/dev/null 2>&1 && ./node_modules/.bin/tsx healthcheck.ts || exit 1

# Default command runs the server via tsx (adjust if you add a build step)
CMD ["./node_modules/.bin/tsx", "src/index.ts"]