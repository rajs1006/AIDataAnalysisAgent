# Build stage
FROM node:20-alpine3.19 AS builder

# Set working directory
WORKDIR /app

# Install dependencies with dev dependencies included for build
COPY package*.json ./
RUN npm ci

# Copy source files
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM caddy:2.8.4-alpine

# Add non-root user for security
RUN adduser -D -u 1000 caddy

# Copy Caddy configuration
COPY Caddyfile /etc/caddy/Caddyfile

# Copy built assets from builder stage
COPY --from=builder --chown=caddy:caddy /app/dist/ /usr/share/caddy/

# Use non-root user
USER caddy

# Expose port
EXPOSE 5173

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
    CMD wget --no-verbose --tries=1 --spider http://localhost:5173/ || exit 1