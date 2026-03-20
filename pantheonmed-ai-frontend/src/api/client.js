/**
 * Central API client — all calls use import.meta.env.VITE_API_URL (Vite) or process.env (Next.js)
 */
function resolveApiUrl() {
  const vite = typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL;
  return (vite || process.env.VITE_API_URL || process.env.NEXT_PUBLIC_API_URL || "https://pantheonmed-ai-production.up.railway.app").replace(/\/$/, "");
}

const API_URL = resolveApiUrl();
if (typeof window !== "undefined") {
  console.log("[API] API URL:", API_URL);
}

export { API_URL };

/**
 * Analyze symptoms — POST /analyze
 */
export async function analyzeSymptoms(data) {
  if (typeof window !== "undefined") {
    console.log("[API] API URL:", API_URL);
  }
  try {
    const res = await fetch(`${API_URL}/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      throw new Error(`API Error: ${res.status}`);
    }

    const result = await res.json();
    if (typeof window !== "undefined") {
      console.log("[API] API RESPONSE:", result);
    }
    return result;
  } catch (error) {
    console.error("[API] Analyze API error:", error);
    throw error;
  }
}
