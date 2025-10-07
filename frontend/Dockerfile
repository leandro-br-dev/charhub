# frontend/Dockerfile
FROM node:20-alpine AS build
WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install all dependencies
RUN npm ci

# Copy application source
COPY . .

# Build static assets
RUN npm run build

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]