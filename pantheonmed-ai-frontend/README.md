# PantheonMed AI — Frontend

> Next.js 14 App Router · TailwindCSS · Axios · TypeScript

---

## Pages

| Route        | Feature                        |
|---|---|
| `/`          | Dashboard with all tool cards  |
| `/chat`      | ChatGPT-style AI medical chat  |
| `/symptoms`  | Symptom checker with chip selection |
| `/reports`   | Lab report paste & AI explainer |
| `/anatomy`   | Interactive SVG body map       |

## Quick Start

```bash
# 1. Install
npm install

# 2. Configure API token
cp .env.local.example .env.local
# OR open src/services/api.ts and paste token in TOKEN variable

# 3. Run
npm run dev
# → http://localhost:3000
```

## Get Your API Token

```bash
# Register a user on the backend:
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"Test1234","full_name":"You","role":"patient"}'

# Login to get token:
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"Test1234"}'
# Copy access_token → paste in .env.local as NEXT_PUBLIC_API_TOKEN
```

## Project Structure

```
src/
├── app/
│   ├── layout.tsx         ← Root layout + Sidebar
│   ├── page.tsx           ← Dashboard
│   ├── chat/page.tsx      ← AI Chat
│   ├── symptoms/page.tsx  ← Symptom Checker
│   ├── reports/page.tsx   ← Lab Report Explainer
│   └── anatomy/page.tsx   ← Anatomy Explorer
├── components/
│   ├── Sidebar.tsx        ← Navigation (desktop + mobile)
│   ├── ChatWindow.tsx     ← Reusable chat component
│   ├── MessageBubble.tsx  ← Chat message + typing indicator
│   └── BodyMap.tsx        ← SVG interactive anatomy
├── services/
│   └── api.ts             ← Axios API layer (TOKEN here)
└── lib/
    └── utils.ts
```

## Design System

- **Display font:** Playfair Display (serif — medical authority)
- **Body font:** DM Sans (clean legibility)
- **Mono font:** DM Mono (lab values, code)
- **Primary:** Teal (#1d9caa) — clinical, trustworthy
- **Radius:** Rounded-xl/2xl throughout
- **Animations:** fade-up, slide-in, typing-dots

## Build for Production

```bash
npm run build
npm start
```
