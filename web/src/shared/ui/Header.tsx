"use client";

import {
  Search,
  Bell,
  Moon,
  Sun,
  LogOut,
  CalendarRange,
  RotateCcw,
  Menu,
  X,
  ChevronDown,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useTheme } from "@/shared/ui/ThemeProvider";
import { getCurrentUser, logout, User } from "@/lib/auth";
import { useDateRange } from "@/lib/date-range-context";
import { useRouter } from "next/navigation";

const notifications = [
  { text: "New order #ORD-2847 received from Raj Hardware", time: "2m ago", color: "blue" },
  { text: "Stock low: Primer Red Oxide 20L (2 units left)", time: "1h ago", color: "red" },
  { text: "Order #ORD-2844 approved and ready to pick", time: "4h ago", color: "green" },
];

interface HeaderProps {
  onMenuToggle: () => void;
}

export function Header({ onMenuToggle }: HeaderProps) {
  const { dark, toggleDark } = useTheme();
  const router = useRouter();
  const { startDate, endDate, setStartDate, setEndDate, resetRange } = useDateRange();
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentUser(getCurrentUser());
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  const initial = currentUser ? currentUser.name.charAt(0).toUpperCase() : "A";
  const roleBadge = currentUser?.role?.replace(/_/g, " ") || "Guest";

  return (
    <header className="bg-card border-b border-border flex-shrink-0">
      {/* ── Main header row ─────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-3 md:px-5 py-3">
        {/* Hamburger — mobile only */}
        <button
          onClick={onMenuToggle}
          className="md:hidden w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted transition-all flex-shrink-0"
          aria-label="Toggle menu"
        >
          <Menu size={20} />
        </button>

        {/* Logo text — mobile only (instead of sidebar brand) */}
        <span className="md:hidden text-sm font-bold text-foreground flex-1">CM Enterprises</span>

        {/* ── Desktop: Search box ──────────────────────────── */}
        <div className="relative hidden md:block flex-1 max-w-xs">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
          <input
            placeholder="Search orders, customers, products..."
            className="bg-muted rounded-lg pl-9 pr-4 py-2 text-xs w-full outline-none focus:ring-1 focus:ring-[#1E3A8A] transition-all placeholder:text-muted-foreground"
          />
        </div>

        {/* Date — desktop only */}
        <div className="text-xs text-muted-foreground hidden lg:block ml-2">
          {new Date().toLocaleDateString("en-IN", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </div>

        {/* Spacer */}
        <div className="flex-1 hidden md:block" />

        {/* ── Right side actions ────────────────────────────── */}
        <div className="flex items-center gap-1.5">
          {/* Mobile: search toggle */}
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="md:hidden w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted transition-all"
          >
            {searchOpen ? <X size={18} /> : <Search size={18} />}
          </button>

          {/* Date range picker — desktop only */}
          <div className="hidden md:flex items-center gap-1.5 bg-muted/60 border border-border/50 rounded-lg px-2 py-1">
            <CalendarRange size={13} className="text-[#F97316] flex-shrink-0" />
            <input
              id="header-date-start"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-[11px] text-foreground outline-none w-[105px] cursor-pointer"
            />
            <span className="text-[10px] text-muted-foreground">—</span>
            <input
              id="header-date-end"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-[11px] text-foreground outline-none w-[105px] cursor-pointer"
            />
            <button
              onClick={resetRange}
              title="Reset to last 60 days"
              className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-[#F97316] hover:bg-muted transition-all cursor-pointer"
            >
              <RotateCcw size={11} />
            </button>
          </div>

          {/* Theme toggle */}
          <button
            onClick={toggleDark}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted transition-all"
          >
            {dark ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => { setNotifOpen(!notifOpen); setProfileOpen(false); }}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted transition-all relative"
            >
              <Bell size={17} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#F97316] rounded-full ring-2 ring-card" />
            </button>
            {notifOpen && (
              <div className="absolute right-0 top-11 w-80 max-w-[calc(100vw-1rem)] bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                  <span className="font-semibold text-foreground text-sm">Notifications</span>
                  <span className="text-[10px] bg-[#F97316] text-white px-2 py-0.5 rounded-full font-medium">
                    {notifications.length} New
                  </span>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {notifications.map((n, i) => (
                    <div
                      key={i}
                      className="flex gap-3 px-4 py-3 hover:bg-muted transition-all cursor-pointer border-b border-border/50 last:border-0"
                    >
                      <div
                        className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                          n.color === "blue"
                            ? "bg-blue-500"
                            : n.color === "red"
                            ? "bg-red-500"
                            : "bg-green-500"
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-foreground leading-snug">{n.text}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{n.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Profile */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false); }}
              className="flex items-center gap-1.5 rounded-full hover:opacity-90 transition-all focus:outline-none"
            >
              <div className="w-8 h-8 rounded-full bg-[#1E3A8A] hover:bg-[#1e40af] flex items-center justify-center text-white text-xs font-semibold transition-all">
                {initial}
              </div>
              <ChevronDown size={12} className="text-muted-foreground hidden md:block" />
            </button>
            {profileOpen && (
              <div className="absolute right-0 top-11 w-56 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-border">
                  <p className="text-xs font-bold text-foreground truncate">{currentUser?.name || "User"}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{currentUser?.email || ""}</p>
                  <span className="inline-block text-[9px] font-bold bg-[#F97316]/10 text-[#F97316] px-1.5 py-0.5 rounded-full mt-1.5 uppercase">
                    {roleBadge}
                  </span>
                </div>
                <div className="p-1">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-500 hover:bg-red-500/5 rounded-lg text-left font-medium transition-all cursor-pointer"
                  >
                    <LogOut size={13} />
                    Log Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Mobile: expandable search bar ────────────────────────────── */}
      {searchOpen && (
        <div className="md:hidden px-3 pb-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              autoFocus
              placeholder="Search orders, customers, products..."
              className="bg-muted rounded-lg pl-9 pr-4 py-2.5 text-sm w-full outline-none focus:ring-2 focus:ring-[#1E3A8A]/30 transition-all placeholder:text-muted-foreground"
            />
          </div>
        </div>
      )}

      {/* ── Mobile: date range row ─────────────────────────────────── */}
      <div className="md:hidden flex items-center gap-2 px-3 pb-2.5 overflow-x-auto">
        <CalendarRange size={13} className="text-[#F97316] flex-shrink-0" />
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="bg-muted border border-border/50 text-[11px] text-foreground outline-none rounded-lg px-2 py-1.5 cursor-pointer flex-shrink-0"
        />
        <span className="text-[10px] text-muted-foreground flex-shrink-0">to</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="bg-muted border border-border/50 text-[11px] text-foreground outline-none rounded-lg px-2 py-1.5 cursor-pointer flex-shrink-0"
        />
        <button
          onClick={resetRange}
          className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-[#F97316] hover:bg-muted transition-all"
        >
          <RotateCcw size={12} />
        </button>
      </div>
    </header>
  );
}
