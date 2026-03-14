# Vercel Deployment

## Project Settings (Dashboard)

When importing this monorepo, configure:

| Setting | Value |
|---------|-------|
| **Root Directory** | `pantheonmed-ai-frontend` |
| **Framework Preset** | Next.js (auto-detected) |
| **Build Command** | `npm run build` |
| **Output Directory** | (leave default — Next.js) |
| **Install Command** | `npm install` |

## Environment Variables

Set in Vercel → Project → Settings → Environment Variables:

- `NEXT_PUBLIC_API_URL` — your backend API URL (e.g. `https://api.yourdomain.com`)

## Notes

- No Docker required — Vercel uses its own build system
- `vercel.json` in this folder configures the build
- Root Directory must be `pantheonmed-ai-frontend` so only the frontend is built
