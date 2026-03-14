# ══════════════════════════════════════════════════════════════════════════════
# PantheonMed AI — Frontend Dockerfile (Next.js + Railway)
#
# Build context: repo root  (Railway default)
# Dockerfile path: pantheonmed-ai-frontend/Dockerfile
#
# Because the build context is the repo root, all COPY source paths are
# prefixed with pantheonmed-ai-frontend/.
#
# Multi-stage build:
#   deps    → install node_modules
#   builder → next build (standalone output)
#   runner  → minimal production image (~120 MB)
#
# Railway variables:
#   • NEXT_PUBLIC_API_URL — set as a Build Variable in Railway dashboard
#   • PORT               — injected automatically by Railway at runtime
# ══════════════════════════════════════════════════════════════════════════════

# ── Stage 1: Install dependencies ─────────────────────────────────────────────
FROM node:18-alpine AS deps
WORKDIR /app

# Source paths are relative to the repo root (Railway build context)
COPY pantheonmed-ai-frontend/package.json pantheonmed-ai-frontend/package-lock.json* ./

RUN npm ci

# ── Stage 2: Build ────────────────────────────────────────────────────────────
FROM node:18-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules

# Copy all frontend source files from the subdirectory into /app
COPY pantheonmed-ai-frontend/ .

# NEXT_PUBLIC_* vars are baked into the JS bundle at build time.
# Set NEXT_PUBLIC_API_URL in Railway dashboard → Variables → Build Variable.
ARG NEXT_PUBLIC_API_URL=http://localhost:8000
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# Activates output: "standalone" in next.config.mjs
ENV DOCKER_BUILD=1

ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ── Stage 3: Production runtime ───────────────────────────────────────────────
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

# Railway injects PORT at runtime; Next.js standalone server.js reads process.env.PORT.
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

EXPOSE 3000

CMD ["node", "server.js"]
