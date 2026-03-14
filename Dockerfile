# PantheonMed AI — Frontend Dockerfile (Railway, repo-root build context)
#
# Build context = repo root, so all COPY paths are prefixed with
# pantheonmed-ai-frontend/.
#
# Three-stage build:
#   1. deps    — install all npm dependencies
#   2. builder — compile Next.js standalone bundle
#   3. runner  — minimal runtime image (no node_modules needed for standalone)

# ── Stage 1: Install dependencies ────────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

COPY pantheonmed-ai-frontend/package.json \
     pantheonmed-ai-frontend/package-lock.json* ./

RUN npm ci

# ── Stage 2: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Bring in node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy full frontend source
COPY pantheonmed-ai-frontend/ .

# NEXT_PUBLIC_* vars are baked into the JS bundle at build time
ARG NEXT_PUBLIC_API_URL=https://api.pantheonmed.ai
ARG NEXT_PUBLIC_API_TOKEN=

ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_API_TOKEN=${NEXT_PUBLIC_API_TOKEN}
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build

# ── Stage 3: Runtime ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Next.js standalone bundles everything — only these three items are needed:
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static     ./.next/static
COPY --from=builder /app/public           ./public

# Railway injects PORT at runtime; Next.js standalone respects it automatically
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
