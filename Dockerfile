FROM node:22-alpine AS base

# ── Dependencies ──────────────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# ── Build ─────────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build

# ── Runtime ───────────────────────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 shipyard && \
    adduser --system --uid 1001 shipyard

# Copy built app
COPY --from=builder /app/public ./public
COPY --from=builder --chown=shipyard:shipyard /app/.next/standalone ./
COPY --from=builder --chown=shipyard:shipyard /app/.next/static ./.next/static

# Create data directory for local JSON storage
RUN mkdir -p data && chown shipyard:shipyard data

USER shipyard

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
