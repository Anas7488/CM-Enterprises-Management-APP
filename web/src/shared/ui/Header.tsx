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
  SlidersHorizontal,
  ShoppingCart,
  Users,
  Package,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useTheme } from "@/shared/ui/ThemeProvider";
import { getCurrentUser, logout, authFetch, User } from "@/lib/auth";
import { useDateRange } from "@/lib/date-range-context";
import { useRouter, usePathname } from "next/navigation";

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
  const pathname = usePathname();
  const { startDate, endDate, setStartDate, setEndDate, resetRange } = useDateRange();

  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  // Mobile states
  const [searchOpen, setSearchOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Global search states
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{
    orders: any[];
    customers: any[];
    products: any[];
  } | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const desktopSearchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentUser(getCurrentUser());
  }, []);

  // Live search effect with 250ms debounce
  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();
    if (q.length < 2) {
      setSearchResults(null);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    const timer = setTimeout(async () => {
      try {
        const [ordersRes, custRes, prodRes] = await Promise.all([
          authFetch("/orders/").catch(() => null),
          authFetch(`/customers/?search=${encodeURIComponent(q)}`).catch(() => null),
          authFetch("/products/").catch(() => null),
        ]);

        let matchedOrders: any[] = [];
        let matchedCustomers: any[] = [];
        let matchedProducts: any[] = [];

        if (ordersRes && ordersRes.ok) {
          const orders = await ordersRes.json();
          if (Array.isArray(orders)) {
            matchedOrders = orders
              .filter(
                (o: any) =>
                  (o.order_no && o.order_no.toLowerCase().includes(q)) ||
                  (o.customer_name && o.customer_name.toLowerCase().includes(q)) ||
                  (o.remarks && o.remarks.toLowerCase().includes(q))
              )
              .slice(0, 4);
          }
        }

        if (custRes && custRes.ok) {
          const custs = await custRes.json();
          if (Array.isArray(custs)) {
            matchedCustomers = custs.slice(0, 4);
          }
        }

        if (prodRes && prodRes.ok) {
          const prods = await prodRes.json();
          if (Array.isArray(prods)) {
            matchedProducts = prods
              .filter(
                (p: any) =>
                  (p.display_name && p.display_name.toLowerCase().includes(q)) ||
                  (p.shade_name && p.shade_name.toLowerCase().includes(q)) ||
                  (p.shade_code && p.shade_code.toLowerCase().includes(q)) ||
                  (p.category?.name && p.category.name.toLowerCase().includes(q))
              )
              .slice(0, 4);
          }
        }

        setSearchResults({
          orders: matchedOrders,
          customers: matchedCustomers,
          products: matchedProducts,
        });
      } catch (e) {
        console.error("Global search failed", e);
      } finally {
        setSearchLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close panels on route change
  useEffect(() => {
    setSearchOpen(false);
    setDateOpen(false);
    setNotifOpen(false);
    setProfileOpen(false);
    setSearchDropdownOpen(false);
    setSearchQuery("");
  }, [pathname]);

  // Auto-focus search input when opened
  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [searchOpen]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (notifRef.current && !notifRef.current.contains(target)) {
        setNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(target)) {
        setProfileOpen(false);
      }
      if (desktopSearchRef.current && !desktopSearchRef.current.contains(target)) {
        setSearchDropdownOpen(false);
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

      {/* ══════════════════════════════════════════════════════
          MOBILE HEADER  (hidden on md+)
      ══════════════════════════════════════════════════════ */}
      <div className="md:hidden">

        {/* ── Top bar ─────────────────────────────────────────── */}
        <div className="flex items-center h-14 px-2 gap-1">

          {/* Hamburger */}
          <button
            onClick={onMenuToggle}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted transition-all flex-shrink-0"
            aria-label="Menu"
          >
            <Menu size={20} />
          </button>

          {/* App name */}
          <span className="flex-1 text-[15px] font-bold text-foreground px-1 truncate">
            CM Enterprises
          </span>

          {/* Search icon */}
          <button
            onClick={() => { setSearchOpen((s) => !s); setDateOpen(false); setNotifOpen(false); setProfileOpen(false); }}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${searchOpen ? "bg-[#1E3A8A] text-white" : "text-muted-foreground hover:bg-muted"}`}
            aria-label="Search"
          >
            {searchOpen ? <X size={18} /> : <Search size={18} />}
          </button>

          {/* Date range icon */}
          <button
            onClick={() => { setDateOpen((d) => !d); setSearchOpen(false); setNotifOpen(false); setProfileOpen(false); }}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${dateOpen ? "bg-[#F97316] text-white" : "text-muted-foreground hover:bg-muted"}`}
            aria-label="Date range"
          >
            <CalendarRange size={17} />
          </button>

          {/* Bell */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => { setNotifOpen((n) => !n); setProfileOpen(false); setSearchOpen(false); setDateOpen(false); }}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted transition-all relative"
              aria-label="Notifications"
            >
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#F97316] rounded-full ring-2 ring-card" />
            </button>
            {notifOpen && (
              <div className="absolute right-0 top-11 w-[calc(100vw-1rem)] max-w-sm bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
                <NotifPanel notifications={notifications} />
              </div>
            )}
          </div>

          {/* Avatar / profile */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => { setProfileOpen((p) => !p); setNotifOpen(false); setSearchOpen(false); setDateOpen(false); }}
              className="w-9 h-9 rounded-full bg-[#1E3A8A] flex items-center justify-center text-white text-xs font-bold transition-all focus:outline-none"
              aria-label="Profile"
            >
              {initial}
            </button>
            {profileOpen && (
              <div className="absolute right-0 top-11 w-56 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
                <ProfilePanel
                  name={currentUser?.name}
                  email={currentUser?.email}
                  roleBadge={roleBadge}
                  dark={dark}
                  toggleDark={toggleDark}
                  onLogout={handleLogout}
                />
              </div>
            )}
          </div>
        </div>

        {/* ── Expandable Search overlay ────────────────────────── */}
        {searchOpen && (
          <div className="px-3 pb-3 border-t border-border/60 bg-card animate-in slide-in-from-top-1 duration-150">
            <div className="relative mt-2.5">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                ref={searchInputRef}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSearchDropdownOpen(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setSearchDropdownOpen(false);
                }}
                placeholder="Search orders, customers, products..."
                className="bg-muted rounded-xl pl-9 pr-10 py-2.5 text-sm w-full outline-none focus:ring-2 focus:ring-[#1E3A8A]/30 placeholder:text-muted-foreground"
              />
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSearchOpen(false);
                  setSearchDropdownOpen(false);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted transition-all"
              >
                <X size={13} />
              </button>
            </div>
            {/* Mobile Search Results Dropdown */}
            {searchDropdownOpen && searchQuery.trim().length >= 2 && (
              <div className="mt-2 bg-card border border-border rounded-xl shadow-xl overflow-hidden max-h-80 overflow-y-auto">
                <SearchResultsPanel
                  query={searchQuery}
                  loading={searchLoading}
                  results={searchResults}
                  onSelect={(url) => {
                    setSearchDropdownOpen(false);
                    setSearchOpen(false);
                    router.push(url);
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* ── Expandable Date range ────────────────────────────── */}
        {dateOpen && (
          <div className="px-3 pb-3 border-t border-border/60 bg-card animate-in slide-in-from-top-1 duration-150">
            <div className="flex items-center gap-2 mt-2.5 flex-wrap">
              <CalendarRange size={14} className="text-[#F97316] flex-shrink-0" />
              <span className="text-xs text-muted-foreground font-medium">From</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="flex-1 min-w-[130px] bg-muted border border-border/60 text-xs text-foreground outline-none rounded-lg px-2.5 py-2 cursor-pointer"
              />
              <span className="text-xs text-muted-foreground font-medium">To</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="flex-1 min-w-[130px] bg-muted border border-border/60 text-xs text-foreground outline-none rounded-lg px-2.5 py-2 cursor-pointer"
              />
              <button
                onClick={() => { resetRange(); }}
                className="flex items-center gap-1 text-xs text-[#F97316] font-medium px-2 py-1.5 rounded-lg hover:bg-[#F97316]/10 transition-all"
              >
                <RotateCcw size={12} />
                Reset
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════
          DESKTOP HEADER  (hidden on mobile)
      ══════════════════════════════════════════════════════ */}
      <div className="hidden md:flex items-center gap-2 px-5 py-3">
        {/* Search box */}
        <div className="relative flex-1 max-w-sm" ref={desktopSearchRef}>
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSearchDropdownOpen(true);
            }}
            onFocus={() => {
              if (searchQuery.trim().length >= 2) setSearchDropdownOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") setSearchDropdownOpen(false);
            }}
            placeholder="Search orders, customers, products..."
            className="bg-muted rounded-lg pl-9 pr-7 py-2 text-xs w-full outline-none focus:ring-1 focus:ring-[#1E3A8A] transition-all placeholder:text-muted-foreground"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery("");
                setSearchDropdownOpen(false);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X size={12} />
            </button>
          )}

          {/* Desktop Search Dropdown */}
          {searchDropdownOpen && searchQuery.trim().length >= 2 && (
            <div className="absolute left-0 right-0 top-10 bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
              <SearchResultsPanel
                query={searchQuery}
                loading={searchLoading}
                results={searchResults}
                onSelect={(url) => {
                  setSearchDropdownOpen(false);
                  router.push(url);
                }}
              />
            </div>
          )}
        </div>

        {/* Date text */}
        <div className="text-xs text-muted-foreground hidden lg:block ml-2">
          {new Date().toLocaleDateString("en-IN", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </div>

        <div className="flex-1" />

        {/* Date range */}
        <div className="flex items-center gap-1.5 bg-muted/60 border border-border/50 rounded-lg px-2 py-1">
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
            <div className="absolute right-0 top-11 w-80 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
              <NotifPanel notifications={notifications} />
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
            <ChevronDown size={12} className="text-muted-foreground" />
          </button>
          {profileOpen && (
            <div className="absolute right-0 top-11 w-56 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
              <ProfilePanel
                name={currentUser?.name}
                email={currentUser?.email}
                roleBadge={roleBadge}
                dark={dark}
                toggleDark={toggleDark}
                onLogout={handleLogout}
              />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

// ─── Shared sub-components ──────────────────────────────────────────────────

function NotifPanel({ notifications }: { notifications: { text: string; time: string; color: string }[] }) {
  return (
    <>
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
                n.color === "blue" ? "bg-blue-500" : n.color === "red" ? "bg-red-500" : "bg-green-500"
              }`}
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-foreground leading-snug">{n.text}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{n.time}</p>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function ProfilePanel({
  name,
  email,
  roleBadge,
  dark,
  toggleDark,
  onLogout,
}: {
  name?: string;
  email?: string;
  roleBadge: string;
  dark: boolean;
  toggleDark: () => void;
  onLogout: () => void;
}) {
  return (
    <>
      <div className="px-4 py-3 border-b border-border">
        <p className="text-xs font-bold text-foreground truncate">{name || "User"}</p>
        <p className="text-[10px] text-muted-foreground truncate">{email || ""}</p>
        <span className="inline-block text-[9px] font-bold bg-[#F97316]/10 text-[#F97316] px-1.5 py-0.5 rounded-full mt-1.5 uppercase">
          {roleBadge}
        </span>
      </div>
      <div className="p-1">
        {/* Theme toggle (inside profile on mobile) */}
        <button
          onClick={toggleDark}
          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-muted rounded-lg text-left font-medium transition-all cursor-pointer"
        >
          {dark ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>
              Light Mode
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
              Dark Mode
            </>
          )}
        </button>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-500 hover:bg-red-500/5 rounded-lg text-left font-medium transition-all cursor-pointer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Log Out
        </button>
      </div>
    </>
  );
}

function SearchResultsPanel({
  query,
  loading,
  results,
  onSelect,
}: {
  query: string;
  loading: boolean;
  results: { orders: any[]; customers: any[]; products: any[] } | null;
  onSelect: (url: string) => void;
}) {
  const hasOrders = results?.orders && results.orders.length > 0;
  const hasCustomers = results?.customers && results.customers.length > 0;
  const hasProducts = results?.products && results.products.length > 0;
  const hasAny = hasOrders || hasCustomers || hasProducts;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6 gap-2 text-xs text-muted-foreground">
        <Loader2 size={16} className="animate-spin text-[#1E3A8A]" />
        <span>Searching orders, customers & products...</span>
      </div>
    );
  }

  if (!hasAny) {
    return (
      <div className="p-6 text-center text-xs text-muted-foreground">
        No results found for &ldquo;<span className="font-semibold text-foreground">{query}</span>&rdquo;
      </div>
    );
  }

  return (
    <div className="divide-y divide-border/60 max-h-96 overflow-y-auto">
      {/* Orders Section */}
      {hasOrders && (
        <div className="p-2">
          <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <ShoppingCart size={12} className="text-[#1E3A8A]" />
            Orders ({results!.orders.length})
          </div>
          {results!.orders.map((o) => (
            <button
              key={o.id}
              onClick={() => onSelect(`/orders`)}
              className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-muted transition-colors flex items-center justify-between group cursor-pointer"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-foreground group-hover:text-[#1E3A8A]">
                    {o.order_no}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground capitalize">
                    {o.status}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground truncate">{o.customer_name}</p>
              </div>
              <span className="text-xs font-medium text-foreground ml-2">
                ₹{Number(o.total_amount || 0).toLocaleString("en-IN")}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Customers Section */}
      {hasCustomers && (
        <div className="p-2">
          <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Users size={12} className="text-purple-600" />
            Customers ({results!.customers.length})
          </div>
          {results!.customers.map((c) => (
            <button
              key={c.id}
              onClick={() => onSelect(`/customers`)}
              className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-muted transition-colors flex items-center justify-between group cursor-pointer"
            >
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-foreground group-hover:text-purple-600 truncate">
                  {c.shop_name}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {c.area?.name || c.contact_person || c.phone || "Customer"}
                </p>
              </div>
              <ArrowRight size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-2 flex-shrink-0" />
            </button>
          ))}
        </div>
      )}

      {/* Products Section */}
      {hasProducts && (
        <div className="p-2">
          <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Package size={12} className="text-amber-600" />
            Products ({results!.products.length})
          </div>
          {results!.products.map((p) => (
            <button
              key={p.id}
              onClick={() => onSelect(`/products`)}
              className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-muted transition-colors flex items-center justify-between group cursor-pointer"
            >
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-foreground group-hover:text-amber-600 truncate">
                  {p.display_name}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {p.category?.name ? `${p.category.name} · ` : ""}{p.size || p.unit || ""}
                </p>
              </div>
              {p.mrp && (
                <span className="text-xs font-medium text-foreground ml-2">
                  ₹{Number(p.mrp).toLocaleString("en-IN")}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
