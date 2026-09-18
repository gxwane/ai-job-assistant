# ==============================================================================
# AI Job Assistant - Frontend Dockerfile
# Multi-stage build: Node.js build stage -> Nginx lightweight serve stage
# ==============================================================================

# Stage 1: Build Vue 3 Single Page Application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package.json ./

# Install dependencies (skipping optional test runners in production build)
RUN npm install --legacy-peer-deps

# Copy frontend source code
COPY . .

# Build production bundle into dist/
RUN npm run build

# Stage 2: Serve static bundle via Nginx Alpine
FROM nginx:alpine AS runner

# Remove default nginx welcome page
RUN rm -rf /usr/share/nginx/html/*

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy customized nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
