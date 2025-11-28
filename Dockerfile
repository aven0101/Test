# Multi-stage build for production optimization
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for building)
RUN npm ci

# Copy source code
COPY . .

# Run build steps if needed (linting, tests, etc.)
# RUN npm run lint --if-present && \
#     npm run test:ci --if-present

# Production stage
FROM node:18-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app directory
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S psfss -u 1001

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Copy application code from builder stage
COPY --from=builder --chown=psfss:nodejs /app/src ./src
COPY --from=builder --chown=psfss:nodejs /app/server.js ./

# Create necessary directories
RUN mkdir -p /app/logs /app/uploads && \
    chown -R psfss:nodejs /app

# Switch to non-root user
USER psfss

# Expose port
EXPOSE 3000

# Add labels for metadata
LABEL maintainer="PSFSS Team" \
      version="1.0.0" \
      description="PSFSS Backend API" \
      org.opencontainers.image.source="https://github.com/Aerialink-psfss/psfss-backend"

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); \
    const options = { hostname: 'localhost', port: 3000, path: '/health', timeout: 2000 }; \
    const req = http.request(options, (res) => { \
      process.exit(res.statusCode === 200 ? 0 : 1); \
    }); \
    req.on('error', () => process.exit(1)); \
    req.end();"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "server.js"]