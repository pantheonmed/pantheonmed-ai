/**
 * Auth helpers — token storage, retrieval, and logout.
 *
 * Token lives in both:
 *  • localStorage  – for client-side axios requests
 *  • document.cookie – so Next.js middleware can read it server-side
 */

const TOKEN_KEY = "access_token";
const REFRESH_KEY = "pm_refresh";

// ── Write ─────────────────────────────────────────────────────────────────────

export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
  // 24-hour session cookie readable by middleware (not httpOnly so JS can clear it)
  const maxAge = 60 * 60 * 24;
  document.cookie = `${TOKEN_KEY}=${token}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

export function setRefreshToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(REFRESH_KEY, token);
}

// ── Read ──────────────────────────────────────────────────────────────────────

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function isLoggedIn(): boolean {
  return Boolean(getToken());
}

// ── Destroy ───────────────────────────────────────────────────────────────────

export function logout(redirectTo = "/login"): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  // Expire the cookie immediately
  document.cookie = `${TOKEN_KEY}=; path=/; max-age=0; SameSite=Lax`;
  window.location.href = redirectTo;
}

// ── Guest session ─────────────────────────────────────────────────────────────

const GUEST_SESSION_KEY = "guest_session_id";
/** sessionStorage key for buffering guest chat messages before merge */
const GUEST_CHAT_BUFFER  = "pm_guest_chat";

/** Returns the persistent guest session ID, creating it on first call. */
export function getGuestSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(GUEST_SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(GUEST_SESSION_KEY, id);
  }
  return id;
}

/** True when the visitor has no valid access token (i.e. is a guest). */
export function isGuest(): boolean {
  return !isLoggedIn();
}

/** Persist the current guest chat buffer to sessionStorage for later merge. */
export function saveGuestChatBuffer(
  messages: Array<{ role: string; content: string }>
): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(GUEST_CHAT_BUFFER, JSON.stringify(messages));
}

/** Read and clear the guest chat buffer (call after successful login). */
export function popGuestChatBuffer(): Array<{ role: string; content: string }> {
  if (typeof window === "undefined") return [];
  const raw = sessionStorage.getItem(GUEST_CHAT_BUFFER);
  sessionStorage.removeItem(GUEST_CHAT_BUFFER);
  try {
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Clear the guest session entirely (call after successful merge). */
export function clearGuestSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(GUEST_SESSION_KEY);
  sessionStorage.removeItem(GUEST_CHAT_BUFFER);
}
