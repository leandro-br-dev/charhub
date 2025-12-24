# backend/Dockerfile

# Build stage
FROM node:20-slim AS builder

# Accept NODE_ENV as build argument (must be redeclared per stage)
ARG NODE_ENV=production

# Install OpenSSL and wget (for healthcheck)
RUN apt-get update && apt-get install -y --no-install-recommends openssl wget && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
# Add retry logic for network resilience
# IMPORTANT: Do NOT use --omit dev here, we need tsx and other build tools
# Use BuildKit cache mount to speed up npm installs (saves 4-8 min on rebuilds)
RUN --mount=type=cache,target=/root/.npm \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set fetch-retries 5 && \
    echo "[DEBUG] Builder stage - installing ALL dependencies including devDependencies" && \
    npm ci --include=dev

# Copy Prisma schema first (needed for generation)
COPY prisma ./prisma

# Generate Prisma Client with correct binaryTargets
# This is now safe because:
# 1. schema.prisma has binaryTargets = ["native", "debian-openssl-3.0.x"]
# 2. Build image is Debian Slim (node:20-slim), so "native" = debian
# 3. Explicit "debian-openssl-3.0.x" ensures compatibility with target runtime
RUN echo "[DEBUG] Generating Prisma Client..." && \
    npx prisma generate

# Copy rest of source code AFTER generation
COPY . .

# Build TypeScript output (production only)
# Always create dist/ and translations/ directories (even if empty in dev)
# Note: Translations are pre-generated and mounted as volume in production
# to avoid needing API keys during build time
RUN if [ "$NODE_ENV" = "production" ]; then \
      echo "Building TypeScript (translations will be mounted as volume)..."; \
      npm run build; \
    else \
      echo "Skipping build in development mode"; \
      mkdir -p dist translations; \
    fi

# Production stage
FROM node:20-slim AS production

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

# Install runtime dependencies for Prisma, security, and healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends openssl wget && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency manifests first
COPY package*.json ./

# Copy all files from builder BEFORE npm install
# This ensures prisma schema and source are available during npm install/prisma operations
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/src ./src

# Install dependencies based on environment
# Configure npm for network resilience before installation
# NOTE: Installing ALL dependencies (including dev) in both environments
# because we need tsx for seed and translation scripts that run at startup
# Use BuildKit cache mount to speed up npm installs (saves 4-8 min on rebuilds)
RUN --mount=type=cache,target=/root/.npm \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set fetch-retries 5 && \
    echo "[DEBUG] NODE_ENV is set to: $NODE_ENV" && \
    echo "Installing all dependencies (including dev tools needed for seed/translations)"; \
    npm ci --include=dev && \
    npm cache clean --force

# Copy built artifacts from builder
# Production: dist/ has compiled code, translations/ has all languages
# Development: dist/ and translations/ are empty (will be generated at runtime)
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/translations ./translations

# Copy generated Prisma Client from builder
# Already copied as part of src/ above, but ensure it's in all expected locations:
# - src/generated: for seed/translation scripts with tsx
# - dist/generated: for compiled JS (from dist/services imports ../generated)
# - generated: fallback location
COPY --from=builder /app/src/generated ./src/generated
COPY --from=builder /app/src/generated ./dist/generated
COPY --from=builder /app/src/generated ./generated

# Note: In development, src/ will be mounted via Docker volume which overrides the copied src/

# Create non-root user for security (used in production)
RUN groupadd -g 1001 nodejs && \
    useradd -u 1001 -g nodejs -s /sbin/nologin nodejs && \
    chown -R nodejs:nodejs /app && \
    chmod +x /app/scripts/start.sh

# Expose service port
EXPOSE 3000

# Start the server (script detects dev/prod mode and switches user if needed)
CMD ["./scripts/start.sh"]
