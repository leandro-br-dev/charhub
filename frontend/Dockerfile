# frontend/Dockerfile

# Base stage prepares dependencies and sources for both dev and prod flows
FROM node:20-alpine AS base
WORKDIR /app

# Copy dependency manifests first to leverage Docker layer caching
COPY package*.json ./

# Install all dependencies (dev + prod) so both environments share the cache
# Use BuildKit cache mount to speed up npm installs (saves 3-6 min on rebuilds)
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# Copy application source
COPY . .

# --- Development stage ----------------------------------------------------
FROM base AS development
ENV NODE_ENV=development

# Expose the port used by the Vite dev server (proxied by nginx service)
EXPOSE 80

# Run Vite in dev mode bound to 0.0.0.0 so other containers can reach it
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "80"]

# --- Build stage ----------------------------------------------------------
FROM base AS build
ENV NODE_ENV=production

# Generate the production bundle once for the nginx image
RUN npm run build

# --- Production runtime ---------------------------------------------------
FROM nginx:alpine AS production

# Copy custom nginx configuration and compiled assets
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
