"use client";

import { Search, Plus, Bell, Moon, Sun, LogOut, CalendarRange, RotateCcw } from "lucide-react";
import { useState, useEffect } from "react";
import { useTheme } from "@/shared/ui/ThemeProvider";
import { getCurrentUser, logout, User } from "@/lib/auth";
import { useDateRange } from "@/lib/date-range-context";
import { useRouter } from "next/navigation";

const notifications = [
  { text: "New order #ORD-2847 received from Raj Hardware", time: "2m ago", color: "blue" },
  { text: "Stock low: Primer Red Oxide 20L (2 units left)", time: "1h ago", color: "red" },
  { text: "Order #ORD-2844 approved and ready to pick", time: "4h ago", color: "green" },
];

export function Header() {
  const { dark, toggleDark } = useTheme();
  const router = useRouter();
  const { startDate, endDate, setStartDate, setEndDate, resetRange } = useDateRange();
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    setCurrentUser(getCurrentUser());
  }, []);

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  const initial = currentUser ? currentUser.name.charAt(0).toUpperCase() : "A";

  return (
    <header className="flex items-center justify-between px-5 py-3 bg-card border-b border-border flex-shrink-0">
      <div className="flex items-center gap-3 flex-1">
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            placeholder="Search orders, customers, products..."
            className="bg-muted rounded-lg pl-9 pr-4 py-2 text-xs w-72 outline-none focus:ring-1 focus:ring-[#1E3A8A] transition-all placeholder:text-muted-foreground"
          />
        </div>
        <div className="text-xs text-muted-foreground hidden lg:block">
          {new Date().toLocaleDateString("en-IN", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* ── Date Range Picker ────────────────────────────────────── */}
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

        <button className="flex items-center gap-2 bg-[#1E3A8A] hover:bg-[#1e40af] text-white text-xs font-semibold px-3 py-2 rounded-lg transition-all">
          <Plus size={14} /> Quick Add
        </button>

        <button
          onClick={toggleDark}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted transition-all"
        >
          {dark ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        <div className="relative">
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted transition-all relative"
          >
            <Bell size={15} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#F97316] rounded-full ring-2 ring-card" />
          </button>
          {notifOpen && (
            <div className="absolute right-0 top-10 w-80 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
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

        <div className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="w-8 h-8 rounded-full bg-[#1E3A8A] hover:bg-[#1e40af] flex items-center justify-center text-white text-xs font-semibold ml-1 cursor-pointer transition-all focus:outline-none"
          >
            {initial}
          </button>
          {profileOpen && (
            <div className="absolute right-0 top-10 w-56 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <p className="text-xs font-bold text-foreground truncate">{currentUser?.name || "User"}</p>
                <p className="text-[10px] text-muted-foreground truncate">{currentUser?.email || ""}</p>
                <span className="inline-block text-[9px] font-bold bg-[#F97316]/10 text-[#F97316] px-1.5 py-0.5 rounded-full mt-1.5 uppercase">
                  {currentUser?.role?.replace("_", " ") || "Guest"}
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
    </header>
  );
}
