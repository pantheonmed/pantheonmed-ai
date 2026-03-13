"use client";
import { useState, useEffect, FormEvent, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authAPI, chatAPI } from "@/services/api";
import {
  setToken, setRefreshToken, isLoggedIn,
  getGuestSessionId, popGuestChatBuffer, clearGuestSession,
} from "@/lib/auth";
import { Activity, Eye, EyeOff, Loader2, AlertCircle, ShieldCheck, UserX } from "lucide-react";

// Inner form reads the ?next= param — wrapped in Suspense below
function LoginForm() {
  const router        = useRouter();
  const searchParams  = useSearchParams();
  const next          = searchParams.get("next") ?? "/";

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPwd,  setShowPwd]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  // If already authenticated, skip to dashboard
  useEffect(() => {
    if (isLoggedIn()) router.replace(next);
  }, [router, next]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await authAPI.login(email.trim().toLowerCase(), password);
      setToken(data.access_token);
      if (data.refresh_token) setRefreshToken(data.refresh_token);

      // Attempt to merge any guest chat messages into the new session
      const guestMessages = popGuestChatBuffer();
      if (guestMessages.length > 0) {
        try {
          await chatAPI.mergeGuestSession(guestMessages, getGuestSessionId());
          clearGuestSession();
        } catch {
          // merge failure is non-critical — swallow silently
        }
      }

      router.replace(next);
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(detail ?? "Invalid email or password. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function continueAsGuest() {
    // Ensure a guest session ID exists
    getGuestSessionId();
    router.replace(next === "/" || next === "/login" ? "/chat" : next);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1E3A8A] via-[#1e40af] to-[#2563EB] flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">

          {/* Header band */}
          <div className="bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] px-8 py-8 text-white">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center shadow-lg">
                <Activity size={22} className="text-white" />
              </div>
              <div>
                <div className="font-bold text-lg leading-tight">PantheonMed AI</div>
                <div className="text-blue-200 text-xs font-medium tracking-wider uppercase mt-0.5">
                  Clinical Decision Support
                </div>
              </div>
            </div>
            <h1 className="text-2xl font-bold">Welcome back</h1>
            <p className="text-blue-200 text-sm mt-1">Sign in to access the AI medical platform</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-8 py-8 space-y-5">

            {/* Demo credentials hint */}
            <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3">
              <ShieldCheck size={16} className="text-blue-500 mt-0.5 shrink-0" />
              <div className="text-xs text-blue-700 leading-relaxed">
                <span className="font-semibold">Demo credentials</span><br />
                Email: <span className="font-mono">admin@pantheonmed.ai</span><br />
                Password: <span className="font-mono">ChangeMe123!</span>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm animate-fade-in">
                <AlertCircle size={15} className="mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            {/* Email */}
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-gray-700">
                Email address
              </label>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm text-gray-900 placeholder-gray-400 transition-all bg-gray-50 focus:bg-white"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-gray-700">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPwd ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-3 pr-11 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm text-gray-900 placeholder-gray-400 transition-all bg-gray-50 focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-all duration-150 shadow-md hover:shadow-lg text-sm mt-2"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Signing in…
                </>
              ) : (
                "Sign in to PantheonMed"
              )}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 my-1">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400 font-medium">or</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* Guest mode */}
            <button
              type="button"
              onClick={continueAsGuest}
              className="w-full flex items-center justify-center gap-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-600 hover:text-gray-800 font-semibold py-3.5 rounded-xl transition-all duration-150 text-sm"
            >
              <UserX size={16} />
              Continue as Guest
            </button>
            <p className="text-[11px] text-gray-400 text-center leading-relaxed">
              Guest chats are not saved. Sign in to persist history &amp; access health records.
            </p>
          </form>

          {/* Footer */}
          <div className="px-8 pb-6 text-center">
            <p className="text-[11px] text-gray-400 leading-relaxed">
              ⚠️ This platform provides AI-assisted medical guidance for informational purposes only.
              Not a substitute for professional clinical judgment.
            </p>
          </div>
        </div>

        {/* Bottom badge */}
        <p className="text-center text-white/50 text-xs mt-6">
          PantheonMed AI · Secure · HIPAA-aware
        </p>
      </div>
    </div>
  );
}

// Default export wraps in Suspense (required for useSearchParams in Next.js 14)
export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
