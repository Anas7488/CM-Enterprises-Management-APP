export interface User {
  id: number;
  name: string;
  email: string;
  role: "admin" | "sales_executive" | "delivery_executive" | "accountant";
  phone?: string;
  assigned_route_id?: number | null;
  assigned_route_number?: number | null;
  is_active?: boolean;
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

// ─── Refresh Token ─────────────────────────────────────────────────────────
export async function refreshAccessToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const refreshToken = localStorage.getItem(REFRESH_KEY);
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!res.ok) {
      logout();
      return null;
    }

    const data = await res.json();
    if (data && data.access_token) {
      localStorage.setItem(TOKEN_KEY, data.access_token);
      return data.access_token;
    }
    return null;
  } catch {
    return null;
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
// Automatically handles auth headers and attempts token refresh on 401
export async function authFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  let token = getToken();

  let res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  // If 401 Unauthorized, attempt token refresh once
  if (res.status === 401 && typeof window !== "undefined") {
    const newToken = await refreshAccessToken();
    if (newToken) {
      // Retry the original request with new token
      res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${newToken}`,
          ...(options.headers || {}),
        },
      });
    } else {
      // If refresh fails, redirect to login page if on browser
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
  }

  return res;
}
