# ── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:22-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src/ ./src/

RUN npm run build

# ── Stage 2: Runtime ─────────────────────────────────────────────────────────
# Official Playwright image ships Chromium + all required system libraries
FROM mcr.microsoft.com/playwright:v1.54.1-noble AS runner

WORKDIR /app

# Install only production dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Install Chromium browser binaries into the image
RUN npx playwright install chromium

# Copy compiled application
COPY --from=builder /app/dist ./dist

# Directory for persistent token cache (can be mounted as a Docker volume)
RUN mkdir -p /app/cache

# ── Environment defaults ──────────────────────────────────────────────────────
ENV NODE_ENV=production \
    AUTO_START=true \
    HTTP_PORT=3123 \
    LOG_LEVEL=info \
    HEADFUL=false \
    TOKEN_CACHE_PATH=/app/cache/token-cache.json

EXPOSE 3123

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://localhost:'+process.env.HTTP_PORT+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/http-mcp-server.js"]
