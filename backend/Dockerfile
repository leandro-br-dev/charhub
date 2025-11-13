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

# Generate translations and build TypeScript output (production only)
# Always create dist/ and translations/ directories (even if empty in dev)
RUN if [ "$NODE_ENV" = "production" ]; then \
      npm run build:translations && npm run build; \
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
RUN npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set fetch-retries 5 && \
    echo "[DEBUG] NODE_ENV is set to: $NODE_ENV" && \
    if [ "$NODE_ENV" = "development" ]; then \
      echo "Installing all dependencies (dev mode)"; \
      npm ci; \
    else \
      echo "Installing production dependencies only"; \
      npm ci --omit dev; \
    fi && \
    npm cache clean --force

# Copy files from builder stage
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts

# Copy built artifacts from builder
# Production: dist/ has compiled code, translations/ has all languages
# Development: dist/ and translations/ are empty (will be generated at runtime)
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/translations ./translations

# Copy generated Prisma Client (needed at runtime)
# Copy to multiple locations:
# - src/generated: for development with ts-node
# - dist/generated: for compiled JS (from dist/services imports ../generated)
# - generated: fallback location
COPY --from=builder /app/src/generated ./src/generated
COPY --from=builder /app/src/generated ./dist/generated
COPY --from=builder /app/src/generated ./generated

# Note: In development, src/ will be mounted via Docker volume
# No need to create it here - Docker will mount it automatically

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