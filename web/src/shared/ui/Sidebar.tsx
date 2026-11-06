"use client";

import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  Package,
  Archive,
  Wallet,
  FileText,
  Truck,
  UserCog,
  Settings,
  ChevronRight,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

export const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: ShoppingCart, label: "Orders", href: "/orders" },
  { icon: Users, label: "Customers", href: "/customers" },
  { icon: Package, label: "Products", href: "/products" },
  { icon: Archive, label: "Inventory", href: "/inventory" },
  { icon: Truck, label: "Purchases", href: "/purchases" },
  { icon: Wallet, label: "Collections", href: "/payments" },
  { icon: FileText, label: "Invoices", href: "/invoices" },
  { icon: UserCog, label: "Users", href: "/users" },
  { icon: Settings, label: "Settings", href: "/settings" },
];

// ─── Bottom nav items (most used, for mobile bottom bar) ────────────────────
const bottomNavItems = [
  { icon: LayoutDashboard, label: "Home", href: "/dashboard" },
  { icon: ShoppingCart, label: "Orders", href: "/orders" },
  { icon: Users, label: "Customers", href: "/customers" },
  { icon: Wallet, label: "Collections", href: "/payments" },
  { icon: FileText, label: "Invoices", href: "/invoices" },
];

interface SidebarProps {
  open: boolean;
  collapsed: boolean;
  onClose: () => void;
  onToggleCollapse: () => void;
}

export function Sidebar({ open, collapsed, onClose, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {/* ── Mobile overlay backdrop ──────────────────────────────────── */}
      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* ── Sidebar panel ───────────────────────────────────────────── */}
      <aside
        className={`
          fixed top-0 left-0 h-full z-50 flex flex-col flex-shrink-0
          transition-all duration-300 overflow-y-auto
          md:relative md:translate-x-0
          ${open ? "translate-x-0" : "-translate-x-full"}
        `}
        style={{
          width: collapsed ? 64 : 220,
          background: "#0F172A",
          borderRight: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        {/* Header / Brand */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10">
          <div className="w-8 h-8 rounded-lg bg-[#F97316] flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">CM</span>
          </div>
          {!collapsed && (
            <div className="overflow-hidden flex-1">
              <div className="text-white font-bold text-sm leading-tight whitespace-nowrap">
                CM Enterprises
              </div>
              <div className="text-white/50 text-[10px] whitespace-nowrap">
                Artist Gold Dealer
              </div>
            </div>
          )}
          {/* Close button — mobile only */}
          <button
            onClick={onClose}
            className="md:hidden ml-auto w-7 h-7 rounded-lg flex items-center justify-center text-white/60 hover:bg-white/10 transition-all"
          >
            <X size={15} />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-3 px-2 space-y-0.5">
          {navItems.map(({ icon: Icon, label, href }) => {
            const isActive = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={label}
                href={href}
                onClick={onClose}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                  isActive
                    ? "bg-[#F97316] text-white"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon size={16} className="flex-shrink-0" />
                {!collapsed && (
                  <span className="text-[12px] font-medium whitespace-nowrap">{label}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Collapse toggle — desktop only */}
        <button
          onClick={onToggleCollapse}
          className="hidden md:flex m-3 p-2 rounded-lg bg-white/10 text-white/60 hover:bg-white/20 hover:text-white transition-all items-center justify-center"
        >
          <ChevronRight
            size={14}
            className={`transition-transform ${collapsed ? "" : "rotate-180"}`}
          />
        </button>
      </aside>

      {/* ── Mobile bottom navigation bar ────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex bg-[#0F172A] border-t border-white/10 safe-area-pb">
        {bottomNavItems.map(({ icon: Icon, label, href }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-all ${
                isActive ? "text-[#F97316]" : "text-white/50"
              }`}
            >
              <Icon size={20} />
              <span className="text-[9px] font-medium">{label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}