"use client";

import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  Package,
  Archive,
  Wallet,
  FileText,
  UserCog,
  Settings,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: ShoppingCart, label: "Orders", href: "/orders" },
  { icon: Users, label: "Customers", href: "/customers" },
  { icon: Package, label: "Products", href: "/products" },
  { icon: Archive, label: "Inventory", href: "/inventory" },
  { icon: Wallet, label: "Collections", href: "/payments" },
  { icon: FileText, label: "Invoices", href: "/invoices" },
  { icon: UserCog, label: "User Management", href: "/users" },
  { icon: Settings, label: "Settings", href: "/settings" },
];

export function Sidebar() {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <aside
      className="flex flex-col flex-shrink-0 transition-all duration-300 overflow-y-auto"
      style={{
        width: sidebarOpen ? 220 : 64,
        background: "#0F172A",
        borderRight: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10">
        <div className="w-8 h-8 rounded-lg bg-[#F97316] flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-sm">CM</span>
        </div>
        {sidebarOpen && (
          <div className="overflow-hidden">
            <div className="text-white font-bold text-sm leading-tight whitespace-nowrap">
              CM Enterprises
            </div>
            <div className="text-white/50 text-[10px] whitespace-nowrap">
              Artist Gold Dealer
            </div>
          </div>
        )}
      </div>

      <nav className="flex-1 py-3 px-2 space-y-0.5">
        {navItems.map(({ icon: Icon, label, href }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={label}
              href={href}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all ${
                isActive
                  ? "bg-[#F97316] text-white"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon size={16} className="flex-shrink-0" />
              {sidebarOpen && (
                <span className="text-[12px] font-medium whitespace-nowrap">{label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="m-3 p-2 rounded-lg bg-white/10 text-white/60 hover:bg-white/20 hover:text-white transition-all flex items-center justify-center"
      >
        <ChevronRight
          size={14}
          className={`transition-transform ${sidebarOpen ? "rotate-180" : ""}`}
        />
      </button>
    </aside>
  );
}