# backend/Dockerfile

# Build stage
FROM node:20-alpine AS builder

# Accept NODE_ENV as build argument (must be redeclared per stage)
ARG NODE_ENV=production

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

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
RUN if [ "$NODE_ENV" = "development" ]; then \
      echo "Installing all dependencies (dev mode)"; \
      npm ci; \
    else \
      echo "Installing production dependencies only"; \
      npm ci --omit=dev; \
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