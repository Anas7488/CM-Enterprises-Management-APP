// ─── Types ─────────────────────────────────────────────────────────────────
export interface User {
  id: number;
  name: string;
  email: string;
  role: "admin" | "sales_executive" | "delivery_executive" | "accountant";
  phone?: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const TOKEN_KEY = "cme_access_token";
const REFRESH_KEY = "cme_refresh_token";
const USER_KEY = "cme_user";

// ─── Login ─────────────────────────────────────────────────────────────────
export async function login(
  email: string,
  password: string
): Promise<{ success: true; user: User } | { success: false; error: string }> {
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
    });

    const data = await res.json();

    if (!res.ok) {
      // FastAPI returns { detail: "..." } on errors
      return { success: false, error: data.detail || "Login failed" };
    }

    // Store tokens and user
    localStorage.setItem(TOKEN_KEY, data.access_token);
    localStorage.setItem(REFRESH_KEY, data.refresh_token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));

    return { success: true, user: data.user };
  } catch (err) {
    return { success: false, error: "Cannot connect to server. Is the backend running?" };
  }
}

// ─── Logout ────────────────────────────────────────────────────────────────
export function logout(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}

// ─── Session Helpers ───────────────────────────────────────────────────────
export function isAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem(TOKEN_KEY);
}

export function getCurrentUser(): User | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

// ─── Authenticated fetch wrapper ───────────────────────────────────────────
// Use this anywhere to call API endpoints that require auth
export async function authFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getToken();
  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
}
