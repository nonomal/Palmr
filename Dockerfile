FROM node:20-alpine AS base

# Install system dependencies (removed netcat-openbsd since we no longer need to wait for PostgreSQL)
RUN apk add --no-cache \
  gcompat \
  supervisor \
  curl

# Enable pnpm
RUN corepack enable pnpm

# Set working directory
WORKDIR /app

# === SERVER BUILD STAGE ===
FROM base AS server-deps
WORKDIR /app/server

# Copy server package files
COPY apps/server/package*.json ./
COPY apps/server/pnpm-lock.yaml ./

# Install server dependencies
RUN pnpm install --frozen-lockfile

FROM base AS server-builder
WORKDIR /app/server

# Copy server dependencies
COPY --from=server-deps /app/server/node_modules ./node_modules

# Copy server source code
COPY apps/server/ ./

# Generate Prisma client
RUN npx prisma generate

# Build server
RUN pnpm build

# === WEB BUILD STAGE ===
FROM base AS web-deps
WORKDIR /app/web

# Copy web package files
COPY apps/web/package.json apps/web/pnpm-lock.yaml ./

# Install web dependencies
RUN pnpm install --frozen-lockfile

FROM base AS web-builder
WORKDIR /app/web

# Copy web dependencies
COPY --from=web-deps /app/web/node_modules ./node_modules

# Copy web source code
COPY apps/web/ ./

# Set environment variables for build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build web application
RUN pnpm run build

# === PRODUCTION STAGE ===
FROM base AS runner

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV API_BASE_URL=http://127.0.0.1:3333

# Create application user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 palmr

# Create application directories and set permissions
# Include storage directories for filesystem mode and SQLite database directory
RUN mkdir -p /app/server /app/web /home/palmr/.npm /home/palmr/.cache \
  /app/server/uploads /app/server/temp-chunks /app/server/uploads/logo \
  /app/server/prisma
RUN chown -R palmr:nodejs /app /home/palmr

# === Copy Server Files ===
WORKDIR /app/server

# Copy server production files
COPY --from=server-builder --chown=palmr:nodejs /app/server/dist ./dist
COPY --from=server-builder --chown=palmr:nodejs /app/server/node_modules ./node_modules
COPY --from=server-builder --chown=palmr:nodejs /app/server/prisma ./prisma
COPY --from=server-builder --chown=palmr:nodejs /app/server/package.json ./

# Copy password reset script and make it executable
COPY --from=server-builder --chown=palmr:nodejs /app/server/reset-password.sh ./
COPY --from=server-builder --chown=palmr:nodejs /app/server/src/scripts/ ./src/scripts/
COPY --from=server-builder --chown=palmr:nodejs /app/server/PASSWORD_RESET_GUIDE.md ./
RUN chmod +x ./reset-password.sh

# Ensure storage directories have correct permissions
RUN chown -R palmr:nodejs /app/server/uploads /app/server/temp-chunks /app/server/prisma

# === Copy Web Files ===
WORKDIR /app/web

# Copy web production files
COPY --from=web-builder --chown=palmr:nodejs /app/web/public ./public
COPY --from=web-builder --chown=palmr:nodejs /app/web/.next/standalone ./
COPY --from=web-builder --chown=palmr:nodejs /app/web/.next/static ./.next/static

# === Setup Supervisor ===
WORKDIR /app

# Create supervisor configuration
RUN mkdir -p /etc/supervisor/conf.d /var/log/supervisor

# Copy server start script
COPY infra/server-start.sh /app/server-start.sh
RUN chmod +x /app/server-start.sh
RUN chown palmr:nodejs /app/server-start.sh

# Copy supervisor configuration (simplified without PostgreSQL dependency)
COPY <<EOF /etc/supervisor/conf.d/supervisord.conf
[supervisord]
nodaemon=true
user=root
logfile=/var/log/supervisor/supervisord.log
pidfile=/var/run/supervisord.pid

[program:server]
command=/app/server-start.sh
directory=/app/server
user=palmr
autostart=true
autorestart=true
stderr_logfile=/var/log/supervisor/server.err.log
stdout_logfile=/var/log/supervisor/server.out.log
environment=PORT=3333,HOME="/home/palmr",ENABLE_S3="false",ENCRYPTION_KEY="default-key-change-in-production"
priority=100

[program:web]
command=/bin/sh -c 'echo "Waiting for API to be ready..."; while ! curl -f http://127.0.0.1:3333/health >/dev/null 2>&1; do echo "API not ready, waiting..."; sleep 2; done; echo "API is ready! Starting frontend..."; exec node server.js'
directory=/app/web
user=palmr
autostart=true
autorestart=true
stderr_logfile=/var/log/supervisor/web.err.log
stdout_logfile=/var/log/supervisor/web.out.log
environment=PORT=5487,HOSTNAME="0.0.0.0",HOME="/home/palmr",API_BASE_URL="http://127.0.0.1:3333"
priority=200
startsecs=10
EOF

# Create main startup script
COPY <<EOF /app/start.sh
#!/bin/sh

echo "Starting Palmr Application..."
echo "Storage Mode: \${ENABLE_S3:-false}"
echo "Database: SQLite"

# Ensure storage directories exist with correct permissions
mkdir -p /app/server/uploads /app/server/temp-chunks /app/server/uploads/logo /app/server/prisma
chown -R palmr:nodejs /app/server/uploads /app/server/temp-chunks /app/server/prisma

# Start supervisor
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
EOF

RUN chmod +x /app/start.sh

# Create volume mount points for persistent storage (filesystem mode and SQLite database)
VOLUME ["/app/server/uploads", "/app/server/temp-chunks", "/app/server/prisma"]

# Expose ports
EXPOSE 3333 5487

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:5487 || exit 1

# Start application
CMD ["/app/start.sh"] 