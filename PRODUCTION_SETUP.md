# PantheonMed AI — Production Deployment Guide

> **Medical Disclaimer:** PantheonMed AI provides informational guidance only.
> It is not a substitute for professional medical advice, diagnosis, or treatment.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Server Setup](#2-server-setup)
3. [Clone & Configure](#3-clone--configure)
4. [TLS Certificates (Let's Encrypt)](#4-tls-certificates-lets-encrypt)
5. [Build & Launch](#5-build--launch)
6. [Database Migrations](#6-database-migrations)
7. [Verify Deployment](#7-verify-deployment)
8. [Ongoing Operations](#8-ongoing-operations)
9. [Troubleshooting](#9-troubleshooting)
10. [Architecture Overview](#10-architecture-overview)

---

## 1. Prerequisites

### Minimum Server Specs

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| CPU       | 2 vCPU  | 4 vCPU      |
| RAM       | 4 GB    | 8 GB        |
| Disk      | 40 GB SSD | 80 GB SSD |
| OS        | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |

### Required Software

```bash
# Docker Engine (≥ 24.0)
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# Docker Compose plugin (≥ 2.20)
# Usually included with Docker Engine — verify:
docker compose version

# Git
sudo apt-get install -y git
```

### Required Accounts / API Keys

- **AI Provider key** (at least one):
  - Google Gemini: https://aistudio.google.com/app/apikey *(free tier available)*
  - OpenAI: https://platform.openai.com/api-keys
  - Anthropic: https://console.anthropic.com/settings/keys

- **Domain name** pointing to your server's IP (A record)

---

## 2. Server Setup

### Open firewall ports

```bash
# Ubuntu UFW
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP  (redirect to HTTPS)
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### Recommended: create a dedicated user

```bash
sudo adduser pantheon
sudo usermod -aG docker pantheon
sudo su - pantheon
```

---

## 3. Clone & Configure

### 3.1 Clone the repository

```bash
git clone https://github.com/your-org/pantheonmed-ai.git
cd pantheonmed-ai
```

### 3.2 Create your `.env` file

```bash
cp .env.example .env
nano .env          # or: vim .env
```

**Required fields to change** (search for `CHANGE_ME`):

```bash
# Generate a secure JWT secret:
python3 -c "import secrets; print(secrets.token_hex(64))"
```

Minimum production `.env`:

```env
ENV=production
DEBUG=false

JWT_SECRET=<64-char random hex from command above>

POSTGRES_PASSWORD=<strong random password>
REDIS_PASSWORD=<strong random password>

AI_PROVIDER=gemini
GEMINI_API_KEY=<your key>

ALLOWED_ORIGINS_PROD=https://your-domain.com
NEXT_PUBLIC_API_URL=https://your-domain.com/api

ADMIN_EMAIL=admin@your-domain.com
ADMIN_PASSWORD=<strong password — change after first login>

DOMAIN=your-domain.com
CERTBOT_EMAIL=admin@your-domain.com
```

---

## 4. TLS Certificates (Let's Encrypt)

Certbot runs inside Docker and auto-renews every 12 hours. Initial certificate issuance needs port 80 to be reachable.

### 4.1 Start Nginx on port 80 only (temporary)

```bash
# Start just Nginx so Certbot can complete the ACME challenge
docker compose -f docker-compose.yml -f docker-compose.prod.yml \
  up -d nginx certbot
```

### 4.2 Obtain the certificate

```bash
# Replace with your actual domain and email
docker exec pantheonmed_certbot \
  certbot certonly \
    --webroot \
    --webroot-path /var/www/certbot \
    --email admin@your-domain.com \
    --agree-tos \
    --no-eff-email \
    -d your-domain.com \
    -d www.your-domain.com
```

### 4.3 Download recommended TLS params (one time)

```bash
docker exec pantheonmed_nginx \
  sh -c "curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf \
         > /etc/letsencrypt/options-ssl-nginx.conf"

docker exec pantheonmed_nginx \
  sh -c "openssl dhparam -out /etc/letsencrypt/ssl-dhparams.pem 2048"
```

> **Note:** Certificates auto-renew via the `certbot` container (runs `certbot renew` every 12 hours).
> To force a reload of Nginx after renewal: `docker exec pantheonmed_nginx nginx -s reload`

---

## 5. Build & Launch

### 5.1 Build images

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml build
```

This builds:
- **Backend**: multi-stage Python 3.11 image with Tesseract OCR
- **Frontend**: Next.js standalone build (optimized, ~80 MB)

Expected build time: 3–6 minutes on first run (cached on subsequent builds).

### 5.2 Start all services

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

Startup order (enforced by `depends_on` health checks):
1. `db` (PostgreSQL) — waits for `pg_isready`
2. `redis` — waits for `PING`
3. `backend` (FastAPI + Gunicorn) — waits for `/health` → 200
4. `frontend` (Next.js) — waits for root → 200
5. `nginx` — starts last, routes traffic

### 5.3 Verify all containers are running

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
```

All services should show `Up` (not `Restarting` or `Exit`).

---

## 6. Database Migrations

On first launch, the app auto-creates all tables via SQLAlchemy. For subsequent schema changes, use Alembic:

```bash
# Generate a migration after changing a model:
docker exec pantheonmed_backend \
  alembic revision --autogenerate -m "describe your change"

# Apply pending migrations:
docker exec pantheonmed_backend \
  alembic upgrade head

# Roll back one step if needed:
docker exec pantheonmed_backend \
  alembic downgrade -1
```

**Important:** Always test migrations on a staging environment before applying to production. Back up the database first:

```bash
docker exec pantheonmed_db \
  pg_dump -U pantheon pantheonmed > backup_$(date +%Y%m%d_%H%M%S).sql
```

---

## 7. Verify Deployment

### 7.1 Health check

```bash
curl https://your-domain.com/health | python3 -m json.tool
```

Expected response:
```json
{
  "status": "healthy",
  "service": "PantheonMed AI",
  "env": "production",
  "services": {
    "medical_rag":             { "status": "ok", "diseases": 45, ... },
    "drug_interaction_engine": { "status": "ok", "interactions_loaded": 44 },
    "lab_reference_db":        { "status": "ok", "tests_loaded": 85 },
    "redis":                   { "status": "ok" }
  }
}
```

### 7.2 TLS grade

Visit https://www.ssllabs.com/ssltest/ and enter your domain. You should receive an **A** or **A+** grade.

### 7.3 Security headers

```bash
curl -I https://your-domain.com | grep -E "Strict|X-Content|X-Frame|X-XSS|Referrer"
```

### 7.4 Smoke test the API

```bash
# Register + login (change password after!)
curl -s -X POST https://your-domain.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234!","full_name":"Test User"}' \
  | python3 -m json.tool
```

---

## 8. Ongoing Operations

### View logs

```bash
# All services
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f

# Backend only (last 100 lines)
docker logs pantheonmed_backend --tail=100 -f

# Parse JSON logs with jq
docker logs pantheonmed_backend 2>&1 | jq 'select(.level=="ERROR")'
docker logs pantheonmed_backend 2>&1 | jq 'select(.event=="audit" and .status>=400)'
```

### Update the application

```bash
git pull origin main

# Rebuild only changed services
docker compose -f docker-compose.yml -f docker-compose.prod.yml \
  up -d --build backend frontend

# Zero-downtime rolling update (when using Docker Swarm or Kubernetes)
# For single-server: the above causes ~5s downtime during backend restart
```

### Scale workers

Edit the `--workers` flag in `docker-compose.prod.yml` backend command.
Rule of thumb: `(2 × CPU_COUNT) + 1`. For a 4-core server: `--workers 9`.

```yaml
command: >
  gunicorn app.main:app
  --worker-class uvicorn.workers.UvicornWorker
  --workers 9   # ← adjust here
  ...
```

### Database backup (automate with cron)

```bash
# Add to crontab (crontab -e):
0 2 * * * docker exec pantheonmed_db \
  pg_dump -U pantheon pantheonmed \
  | gzip > /backups/pantheonmed_$(date +\%Y\%m\%d).sql.gz \
  && find /backups -name "*.sql.gz" -mtime +30 -delete
```

### Certificate renewal (automatic)

The `certbot` container renews certificates automatically. Force a check:

```bash
docker exec pantheonmed_certbot certbot renew --dry-run
```

Reload Nginx after renewal:

```bash
docker exec pantheonmed_nginx nginx -s reload
```

### Stop / restart

```bash
# Graceful stop (preserves data volumes)
docker compose -f docker-compose.yml -f docker-compose.prod.yml down

# Full reset including database (⚠️ destroys all data)
docker compose -f docker-compose.yml -f docker-compose.prod.yml down -v
```

---

## 9. Troubleshooting

### Backend won't start

```bash
docker logs pantheonmed_backend --tail=50
```

Common causes:
- `DATABASE_URL` wrong → check `POSTGRES_PASSWORD` in `.env`
- `JWT_SECRET` not set → must be a non-empty string
- Port 8000 already in use → `lsof -i :8000` and kill conflicting process

### "502 Bad Gateway" from Nginx

```bash
docker logs pantheonmed_nginx --tail=20
# Nginx can't reach backend — check backend is running:
docker exec pantheonmed_nginx wget -qO- http://backend:8000/health
```

### AI responses failing

```bash
# Check AI provider key is set
docker exec pantheonmed_backend env | grep -E "GEMINI|OPENAI|ANTHROPIC"
# Test the health endpoint for provider info
curl https://your-domain.com/health | jq '.ai_provider'
```

### Redis connection errors

```bash
docker logs pantheonmed_redis --tail=20
# Test manually
docker exec pantheonmed_redis redis-cli -a "$REDIS_PASSWORD" ping
# Expected: PONG
```

### Out of memory

Tune the `deploy.resources.limits` in `docker-compose.prod.yml`. Backend needs the most memory (RAG knowledge base + AI client). Minimum 1 GB, recommended 2 GB.

### Reset admin password

```bash
docker exec -it pantheonmed_backend python3 -c "
import asyncio
from app.db.database import AsyncSessionLocal
from app.models.user import User
from app.services.auth_service import hash_password
from sqlalchemy import select, update

async def reset():
    async with AsyncSessionLocal() as db:
        await db.execute(
            update(User)
            .where(User.email == 'admin@your-domain.com')
            .values(password_hash=hash_password('NewPassword123!'))
        )
        await db.commit()
        print('Password reset OK')

asyncio.run(reset())
"
```

---

## 10. Architecture Overview

```
                        Internet
                           │
                    ┌──────▼──────┐
                    │    Nginx    │  :80 (→HTTPS), :443
                    │  (TLS/SSL)  │
                    └──┬──────┬───┘
                       │      │
              /api/*   │      │  / (everything else)
                       │      │
              ┌────────▼──┐ ┌─▼──────────┐
              │  FastAPI  │ │  Next.js   │
              │ (Gunicorn)│ │ (Frontend) │
              │  :8000    │ │  :3000     │
              └─────┬─────┘ └────────────┘
                    │
          ┌─────────┼─────────┐
          │         │         │
    ┌─────▼──┐ ┌────▼───┐ ┌───▼────────────┐
    │Postgres│ │ Redis  │ │ In-Memory:     │
    │  :5432 │ │ :6379  │ │ Medical RAG    │
    │        │ │ Cache  │ │ Drug Engine    │
    └────────┘ │ Rate   │ │ Lab Ref DB     │
               │ Limit  │ └────────────────┘
               └────────┘

All services run on the internal Docker network `pantheonmed_net`.
Only Nginx exposes ports 80/443 to the internet.
Database and Redis ports are NOT exposed externally in production.
```

### Service Responsibilities

| Service   | Role                                     | Memory Budget |
|-----------|------------------------------------------|---------------|
| nginx     | TLS termination, routing, rate limiting  | 128 MB        |
| backend   | FastAPI app + medical AI services        | 2 GB          |
| frontend  | Next.js SSR / static serving             | 512 MB        |
| db        | Persistent data store                    | 1 GB          |
| redis     | Rate limiting, response cache            | 640 MB        |
| certbot   | TLS certificate auto-renewal             | 64 MB         |

**Total: ~4.4 GB** — fits comfortably on a 8 GB server with room for the OS.

---

*Last updated: March 2026 | PantheonMed AI v1.0*
