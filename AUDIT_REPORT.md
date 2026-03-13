# PantheonMed AI — Project Audit Report

**Date:** March 14, 2025  
**Scope:** Backend API, Frontend API calls, Runtime errors, Environment variables, AI Clinic & Medical Chat, Routes

---

## Executive Summary

The audit identified **4 bugs** (all fixed) and **2 recommendations**. Backend and frontend API endpoints are correctly aligned. AI Clinic (`/clinic`) and Medical Chat (`/chat`) connect to the backend as intended.

---

## 1. Backend API Endpoint Mismatches

**Result: ✅ No mismatches found**

All frontend API calls in `pantheonmed-ai-frontend/src/services/api.ts` correctly map to backend routes:

| Frontend Endpoint | Backend Route | Status |
|-------------------|---------------|--------|
| `POST /auth/login` | `auth_routes.py` | ✅ |
| `POST /auth/register` | `auth_routes.py` | ✅ |
| `GET /auth/me` | `auth_routes.py` | ✅ |
| `POST /chat` | `chat_routes.py` | ✅ |
| `GET /chat/history` | `chat_routes.py` | ✅ |
| `POST /chat/guest/merge` | `chat_routes.py` | ✅ |
| `POST /ai/chat` | `ai.py` | ✅ |
| `POST /symptom-assessment/symptom-intake` | `symptom_assessment.py` | ✅ |
| `POST /symptom-assessment/triage` | `symptom_assessment.py` | ✅ |
| `POST /symptom-assessment/red-flag-check` | `symptom_assessment.py` | ✅ |
| `GET /symptom-assessment/symptom-list` | `symptom_assessment.py` | ✅ |
| `GET /symptom-assessment/disease/{id}` | `symptom_assessment.py` | ✅ |
| `POST /lab/analyze` | `lab_routes.py` | ✅ |
| `POST /medicine/interactions` | `medicine_routes.py` | ✅ |
| `POST /medicine/info` | `medicine_routes.py` | ✅ |
| `POST /doctor/*` (all 6 endpoints) | `doctor_routes.py` | ✅ |

---

## 2. Frontend API Calls Verification

**Result: ✅ All verified**

- All API calls go through `api.ts` using axios with `baseURL: ${API_BASE}/api/v1`
- Bearer token and `X-Guest-Session-Id` are attached via interceptors
- No direct `fetch()` calls; no bypass of the API layer
- Request/response types are defined for all major endpoints

---

## 3. Runtime Errors (Fixed)

### Bug #1: Anatomy Page — `useSearchParams()` Suspense Boundary

**Severity:** High (build failure)

**Issue:** Next.js 14 requires `useSearchParams()` to be wrapped in a `<Suspense>` boundary. The `/anatomy` page used it directly, causing prerender failure:

```
⨯ useSearchParams() should be wrapped in a suspense boundary at page "/anatomy"
Error occurred prerendering page "/anatomy"
```

**Fix applied:** Extracted page content into `AnatomyPageContent` and wrapped it in `<Suspense>` in the default export.

**File:** `pantheonmed-ai-frontend/src/app/anatomy/page.tsx`

---

## 4. Environment Variables

### Bug #2: Wrong Variable Name in `.env.example`

**Severity:** Medium

**Issue:** `.env.example` documented `ACCESS_TOKEN_EXPIRE_MINUTES=1440`, but the backend `config.py` reads `JWT_ACCESS_EXPIRE_MINUTES`. Setting the former had no effect.

**Fix applied:** Updated `.env.example` to use `JWT_ACCESS_EXPIRE_MINUTES` and added a clarifying comment.

### Bug #3: Missing REDIS_URL Documentation

**Severity:** Low

**Issue:** When running Redis locally with a password, users must set `REDIS_URL=redis://:password@localhost:6379/0`. This was not documented.

**Fix applied:** Added a comment in `.env.example` under CACHE_TTL explaining when and how to set `REDIS_URL`.

---

## 5. AI Clinic & Medical Chat — Backend Connectivity

**Result: ✅ Both connect correctly**

### AI Clinic (`/clinic`)

- **Component:** `MedicalChatInterface`
- **API:** `aiAPI.analyze(content, sessionId)` → `POST /api/v1/ai/chat`
- **Modes:** Symptom (with clinical interview), Wellness, Educational, General
- **Flow:** Symptom mode runs an adaptive interview, then calls `aiAPI.analyze()` with structured context

### Medical Chat (`/chat`)

- **Component:** `ChatWindow`
- **API:** `chatAPI.send(content, sessionId, guestSessionId)` → `POST /api/v1/chat`
- **Backend:** Uses `medical_ai_chat` for responses; supports both authenticated and guest sessions

---

## 6. Routes Test Summary

| Route | Status | Notes |
|-------|--------|------|
| `/` | ✅ | Home |
| `/chat` | ✅ | Medical Chat (chatAPI) |
| `/clinic` | ✅ | AI Clinic (aiAPI) |
| `/anatomy` | ✅ | 3D Anatomy (aiAPI.askOrgan) — fixed |
| `/symptom-assessment` | ✅ | symptomAssessmentAPI.assess |
| `/symptom-checker` | ✅ | aiAPI.analyze |
| `/symptoms` | ✅ | chatAPI.send |
| `/reports` | ✅ | labAPI.analyzeText |
| `/report-explainer` | ✅ | aiAPI.analyze |
| `/risk-prediction` | ✅ | aiAPI.analyze |
| `/drug-interaction` | ✅ | medicineAPI.checkInteractions |
| `/medicine-info` | ✅ | medicineAPI.getInfo |
| `/doctor-mode` | ✅ | doctorAPI.*, chatAPI, aiAPI |
| `/login` | ✅ | authAPI.login, chatAPI.mergeGuestSession |

---

## 7. Additional Fixes Applied

### Bug #4: Login Demo Credentials Mismatch

**Severity:** Low (UX)

**Issue:** Login page showed "Password: admin123" but the seeded admin uses `ADMIN_PASSWORD=ChangeMe123!` from `.env.example`.

**Fix applied:** Updated login page to display `ChangeMe123!` as the demo password.

**File:** `pantheonmed-ai-frontend/src/app/login/page.tsx`

---

## 8. Recommendations (Not Bugs)

### 1. Dedicated Prediction Endpoints

The backend exposes `/api/v1/predictions/diabetes` and `/api/v1/predictions/cardiac`, but the Risk Prediction page uses `aiAPI.analyze()` with a custom prompt. Consider wiring the page to the dedicated endpoints for structured risk scores and consistency.

### 2. Content-Security-Policy for Custom API URL

`next.config.mjs` has `connect-src 'self' http://localhost:8000 https://api.pantheonmed.ai`. If `NEXT_PUBLIC_API_URL` points to another domain (e.g. staging), add that domain to `connect-src` to avoid CSP blocking API calls.

---

## 9. Build Verification

After fixes, the frontend build completes successfully:

```
✓ Compiled successfully
✓ Generating static pages (17/17)
✓ Finalizing page optimization
```

---

## Summary of Files Modified

1. `pantheonmed-ai-frontend/src/app/anatomy/page.tsx` — Suspense boundary for useSearchParams
2. `pantheonmed-ai-frontend/src/app/login/page.tsx` — Demo password corrected
3. `.env.example` — JWT variable name and REDIS_URL documentation
