"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/auth";
import { Mail, Lock, Eye, EyeOff, LogIn, AlertCircle, Sun, Moon } from "lucide-react";
import { useTheme } from "@/shared/ui/ThemeProvider";

export default function LoginPage() {
  const router = useRouter();
  const { dark, toggleDark } = useTheme();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await login(email, password);

    if (result.success) {
      setSuccess(true);
      setTimeout(() => {
        router.push("/dashboard");
      }, 800);
    } else {
      setError(result.error);
      setLoading(false);
    }
  };

  const handleQuickLogin = (quickEmail: string) => {
    setEmail(quickEmail);
    setPassword("cme@1234");
    setError("");
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 bg-gradient-to-tr from-slate-100 via-zinc-50 to-blue-50 dark:from-[#090D1A] dark:via-[#0F172A] dark:to-[#1E293B] overflow-hidden transition-colors duration-300">
      {/* Background ambient glowing spheres */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-blue-400/20 dark:bg-[#1E3A8A]/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-[#F97316]/10 rounded-full blur-3xl" />

      {/* Floating Theme Toggle */}
      <div className="absolute top-6 right-6 z-10">
        <button
          onClick={toggleDark}
          className="w-10 h-10 rounded-xl bg-card/60 backdrop-blur-md border border-border/60 flex items-center justify-center text-foreground hover:bg-muted/80 transition-all shadow-md"
        >
          {dark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>

      {/* Login Card */}
      <div className={`w-full max-w-md bg-card/60 dark:bg-card/45 backdrop-blur-xl border border-border/80 p-8 rounded-2xl shadow-2xl transition-all duration-500 transform ${success ? "scale-95 opacity-0" : "scale-100 opacity-100"
        }`}>
        {/* Branding header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-[#F97316] flex items-center justify-center shadow-lg shadow-[#F97316]/20 mb-3 animate-bounce">
            <span className="text-white font-extrabold text-lg">CM</span>
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground text-center">
            Welcome to CM Enterprises
          </h2>
          <p className="text-xs text-muted-foreground mt-1 text-center font-medium">
            Inventory & Distribution Management Console
          </p>
        </div>

        {/* Error Alert Box */}
        {error && (
          <div className="mb-6 flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 text-red-500 text-xs px-4 py-3 rounded-lg animate-shake">
            <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
            <p className="font-medium">{error}</p>
          </div>
        )}

        {/* Success Alert Box */}
        {success && (
          <div className="mb-6 flex items-center gap-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs px-4 py-3 rounded-lg">
            <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
            <p className="font-medium">Authentication successful! Redirecting...</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 ml-0.5">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                <Mail size={16} />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@indopaints.com"
                className="w-full bg-background/50 border border-border hover:border-muted-foreground/30 focus:border-[#1E3A8A] rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/10 text-foreground transition-all"
                disabled={loading || success}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 ml-0.5">
              Password
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                <Lock size={16} />
              </span>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-background/50 border border-border hover:border-muted-foreground/30 focus:border-[#1E3A8A] rounded-xl pl-10 pr-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/10 text-foreground transition-all"
                disabled={loading || success}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                disabled={loading || success}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full mt-2 flex items-center justify-center gap-2 bg-[#1E3A8A] hover:bg-[#1e40af] active:scale-[0.98] text-white py-3 px-4 rounded-xl text-sm font-semibold shadow-lg shadow-[#1E3A8A]/10 transition-all cursor-pointer disabled:opacity-75 disabled:pointer-events-none"
            disabled={loading || success}
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <LogIn size={16} />
                Sign In
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-border/60">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3 text-center">
            Quick Login
          </p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Anas (Admin)", email: "admin@cmenterprises.com" },
              { label: "Bakhar (Admin)", email: "bakhar@cmenterprises.com" },
              { label: "Shambhu (Sales)", email: "shambhu@cmenterprises.com" },
              { label: "Khayum (Delivery)", email: "khayum@cmenterprises.com" },
            ].map((role) => (
              <button
                key={role.label}
                type="button"
                onClick={() => handleQuickLogin(role.email)}
                className="px-2.5 py-1.5 rounded-lg border border-border/70 bg-background/40 hover:bg-[#F97316]/5 hover:border-[#F97316]/30 text-[10px] font-semibold text-foreground hover:text-[#F97316] transition-all cursor-pointer"
                disabled={loading || success}
              >
                {role.label}
              </button>
            ))}
          </div>
          <p className="text-[9px] text-muted-foreground text-center mt-2">Default password: <span className="font-mono font-bold">cme@1234</span></p>
        </div>
      </div>
    </div>
  );
}
