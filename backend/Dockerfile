# backend/Dockerfile

# Build stage
FROM node:20-alpine AS builder

# Accept NODE_ENV as build argument (must be redeclared per stage)
ARG NODE_ENV=production

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
# Add retry logic for network resilience
# IMPORTANT: Do NOT use --omit dev here, we need tsx and other build tools
RUN npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set fetch-retries 5 && \
    echo "[DEBUG] Builder stage - installing ALL dependencies including devDependencies" && \
    npm ci --include=dev

# Copy source code
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
FROM node:20-alpine AS production

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

# Install security updates
RUN apk update && \
    apk upgrade --no-cache && \
    rm -rf /var/cache/apk/*

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install dependencies based on environment
# Configure npm for network resilience before installation
# NOTE: Installing ALL dependencies (including dev) in both environments
# because we need tsx for seed and translation scripts that run at startup
RUN npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set fetch-retries 5 && \
    echo "[DEBUG] NODE_ENV is set to: $NODE_ENV" && \
    echo "Installing all dependencies (including dev tools needed for seed/translations)"; \
    npm ci --include=dev && \
    npm cache clean --force

# Copy files from builder stage
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts

# Copy source code (needed for seed and translation scripts that run at startup)
COPY --from=builder /app/src ./src

# Copy built artifacts from builder
# Production: dist/ has compiled code, translations/ has all languages
# Development: dist/ and translations/ are empty (will be generated at runtime)
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/translations ./translations

# Copy generated Prisma Client (needed at runtime)
# Already copied as part of src/ above, but ensure it's in all expected locations:
# - src/generated: for seed/translation scripts with tsx
# - dist/generated: for compiled JS (from dist/services imports ../generated)
# - generated: fallback location
COPY --from=builder /app/src/generated ./src/generated
COPY --from=builder /app/src/generated ./dist/generated
COPY --from=builder /app/src/generated ./generated

# Fix Prisma binary permissions (critical for db:seed and migration scripts)
# The Prisma Query Engine needs execute permissions to run
# Must be done AFTER copying generated files
RUN find /app/src/generated -name "libquery_engine*.so*" -exec chmod +x {} \; 2>/dev/null || true && \
    find /app/dist/generated -name "libquery_engine*.so*" -exec chmod +x {} \; 2>/dev/null || true && \
    find /app/generated -name "libquery_engine*.so*" -exec chmod +x {} \; 2>/dev/null || true && \
    echo "[DEBUG] Prisma binary permissions fixed"

# Note: In development, src/ will be mounted via Docker volume which overrides the copied src/

# Create non-root user for security (used in production)
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs && \
    chown -R nodejs:nodejs /app && \
    chmod +x /app/scripts/start.sh

# Install su-exec for user switching in startup script
RUN apk add --no-cache su-exec

# Expose service port
EXPOSE 3000

# Start the server (script detects dev/prod mode and switches user if needed)
CMD ["./scripts/start.sh"]