# backend/Dockerfile

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma Client and build TypeScript output
RUN npm run build

# Production stage
FROM node:20-alpine

# Install security updates
RUN apk update && \
    apk upgrade --no-cache && \
    rm -rf /var/cache/apk/*

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev && \
    npm cache clean --force

# Copy built application and schema from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/generated ./dist/generated
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs && \
    chown -R nodejs:nodejs /app && \
    chmod +x /app/scripts/start.sh

# Switch to non-root user
USER nodejs

# Expose service port
EXPOSE 3000

# Start the server (runs migrations first)
CMD ["./scripts/start.sh"]