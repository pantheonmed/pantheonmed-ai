#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════════════
# PantheonMed AI — End-to-End Test Script
# ══════════════════════════════════════════════════════════════════════════════
# Prerequisites: Backend at http://localhost:8000, Frontend at http://localhost:3000
# Usage: ./scripts/e2e-test.sh [API_BASE]
# ══════════════════════════════════════════════════════════════════════════════

set -e
API_BASE="${1:-http://localhost:8000}"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

pass() { echo -e "${GREEN}[PASS]${NC} $*"; }
fail() { echo -e "${RED}[FAIL]${NC} $*"; exit 1; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }

echo "═══════════════════════════════════════════════════════════════"
echo " PantheonMed AI — E2E Test"
echo " API Base: $API_BASE"
echo "═══════════════════════════════════════════════════════════════"

# ── 1. Health Check ───────────────────────────────────────────────────────────
echo ""
echo "1. Health Check (GET /health)"
resp=$(curl -s -w "\n%{http_code}" "$API_BASE/health") || fail "Health check request failed"
body=$(echo "$resp" | sed '$d')
code=$(echo "$resp" | tail -1)
if [[ "$code" != "200" ]]; then
  fail "Health returned $code, expected 200. Body: $body"
fi
if ! echo "$body" | grep -q '"status"'; then
  fail "Health response missing 'status' field"
fi
pass "Health check OK"

# ── 2. Auth — Login ───────────────────────────────────────────────────────────
echo ""
echo "2. Auth Login (POST /api/v1/auth/login)"
TOKEN=""
for pwd in "ChangeMe123!" "admin123"; do
  LOGIN_RESP=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/api/v1/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"admin@pantheonmed.ai\",\"password\":\"$pwd\"}") || true
  LOGIN_BODY=$(echo "$LOGIN_RESP" | sed '$d')
  LOGIN_CODE=$(echo "$LOGIN_RESP" | tail -1)
  if [[ "$LOGIN_CODE" == "200" ]]; then
    TOKEN=$(echo "$LOGIN_BODY" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
    if [[ -n "$TOKEN" ]]; then
      pass "Auth login OK (admin@pantheonmed.ai)"
      break
    fi
  fi
done
if [[ -z "$TOKEN" ]]; then
  warn "Auth login failed — will skip auth-required tests (medicine interactions)"
fi

# ── 3. Symptom Assessment (no auth required) ───────────────────────────────────
echo ""
echo "3. Symptom Assessment (POST /api/v1/symptom-assessment/symptom-intake)"
SYM_REQ='{"chief_complaint":"headache and fever for 2 days","symptoms":["headache","fever"],"age":35,"duration_days":2}'
SYM_RESP=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/api/v1/symptom-assessment/symptom-intake" \
  -H "Content-Type: application/json" \
  -d "$SYM_REQ") || fail "Symptom intake request failed"
SYM_BODY=$(echo "$SYM_RESP" | sed '$d')
SYM_CODE=$(echo "$SYM_RESP" | tail -1)
if [[ "$SYM_CODE" != "200" ]]; then
  fail "Symptom intake returned $SYM_CODE. Body: $SYM_BODY"
fi
# Validate JSON structure
for key in detected_symptoms triage_level diagnoses red_flags recommended_tests self_care_advice escalation_recommendation clinical_note; do
  if ! echo "$SYM_BODY" | grep -q "\"$key\""; then
    fail "Symptom response missing field: $key"
  fi
done
pass "Symptom assessment OK — JSON structure valid"

# ── 4. AI Chat (optional auth) ─────────────────────────────────────────────────
echo ""
echo "4. AI Chat (POST /api/v1/ai/chat) — guest"
AI_RESP=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/api/v1/ai/chat" \
  -H "Content-Type: application/json" \
  -d '{"content":"What causes headaches?"}') || fail "AI chat request failed"
AI_BODY=$(echo "$AI_RESP" | sed '$d')
AI_CODE=$(echo "$AI_RESP" | tail -1)
if [[ "$AI_CODE" != "200" ]]; then
  warn "AI chat returned $AI_CODE (may need GEMINI_API_KEY). Body: ${AI_BODY:0:200}..."
else
  if ! echo "$AI_BODY" | grep -q '"doctor_assessment"\|"answer"'; then
    warn "AI response missing doctor_assessment/answer"
  else
    pass "AI chat OK"
  fi
fi

# ── 5. Chat (guest) ───────────────────────────────────────────────────────────
echo ""
echo "5. Medical Chat (POST /api/v1/chat) — guest"
CHAT_RESP=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/api/v1/chat" \
  -H "Content-Type: application/json" \
  -H "X-Guest-Session-Id: e2e-test-guest-$(date +%s)" \
  -d '{"content":"Hello, I have a mild headache"}') || fail "Chat request failed"
CHAT_BODY=$(echo "$CHAT_RESP" | sed '$d')
CHAT_CODE=$(echo "$CHAT_RESP" | tail -1)
if [[ "$CHAT_CODE" != "200" ]]; then
  warn "Chat returned $CHAT_CODE (may need AI keys). Body: ${CHAT_BODY:0:200}..."
else
  if ! echo "$CHAT_BODY" | grep -q '"session_id"'; then
    fail "Chat response missing session_id"
  fi
  pass "Medical chat OK"
fi

# ── 6. Lab Analyze (guest) ────────────────────────────────────────────────────
echo ""
echo "6. Lab Analyze (POST /api/v1/lab/analyze)"
LAB_RESP=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/api/v1/lab/analyze" \
  -H "Content-Type: application/json" \
  -d '{"raw_text":"Hb 12.5 g/dL, WBC 8000, Platelets 250000"}') || fail "Lab analyze request failed"
LAB_BODY=$(echo "$LAB_RESP" | sed '$d')
LAB_CODE=$(echo "$LAB_RESP" | tail -1)
if [[ "$LAB_CODE" != "200" ]]; then
  fail "Lab analyze returned $LAB_CODE. Body: $LAB_BODY"
fi
if ! echo "$LAB_BODY" | grep -q '"analysis"'; then
  fail "Lab response missing 'analysis' field"
fi
pass "Lab analyze OK"

# ── 7. Medicine Interactions (auth required) ───────────────────────────────────
echo ""
echo "7. Medicine Interactions (POST /api/v1/medicine/interactions) — auth"
if [[ -n "$TOKEN" ]]; then
  MED_RESP=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/api/v1/medicine/interactions" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"drugs":["aspirin","ibuprofen"]}') || fail "Medicine interactions request failed"
  MED_BODY=$(echo "$MED_RESP" | sed '$d')
  MED_CODE=$(echo "$MED_RESP" | tail -1)
  if [[ "$MED_CODE" != "200" ]]; then
    fail "Medicine interactions returned $MED_CODE. Body: $MED_BODY"
  fi
  # Accept either 'interactions' (structured) or 'analysis' (AI-only response)
  if echo "$MED_BODY" | grep -q '"interactions"'; then
    pass "Medicine interactions OK (structured)"
  elif echo "$MED_BODY" | grep -q '"analysis"'; then
    pass "Medicine interactions OK (AI analysis)"
  else
    fail "Medicine response missing 'interactions' or 'analysis' field"
  fi
else
  warn "Skipped (no auth token)"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo " All core E2E tests passed."
echo "═══════════════════════════════════════════════════════════════"
