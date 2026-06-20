"use client";

import {
  Banknote,
  ShoppingCart,
  Clock,
  Archive,
  Users,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { KpiCard } from "@/shared/ui/KpiCard";
import { SectionHeader } from "@/shared/ui/SectionHeader";
import { StatusBadge } from "@/shared/ui/StatusBadge";

// TODO: replace with real API calls — see comment above each section
const monthlySales = [
  { month: "Jan", sales: 420000, collections: 380000 },
  { month: "Feb", sales: 380000, collections: 360000 },
  { month: "Mar", sales: 510000, collections: 480000 },
  { month: "Apr", sales: 460000, collections: 440000 },
  { month: "May", sales: 590000, collections: 550000 },
  { month: "Jun", sales: 630000, collections: 600000 },
];

const inventoryItems = [
  { name: "Artist Gold Premium Emulsion 20L", stock: 142, reserved: 38, available: 104, reorder: 50, status: "good" },
  { name: "Artist Gold Exterior Paint 10L", stock: 28, reserved: 22, available: 6, reorder: 30, status: "low" },
  { name: "Primer Red Oxide 20L", stock: 14, reserved: 12, available: 2, reorder: 20, status: "critical" },
  { name: "Distemper Powder 50kg", stock: 31, reserved: 28, available: 3, reorder: 40, status: "critical" },
];

const pendingOrders = [
  { customer: "Raj Hardware, Pune", product: "Emulsion 20L", ordered: 50, available: 20, pending: 30 },
  { customer: "Krishna Paints, Nashik", product: "Exterior 10L", ordered: 30, available: 6, pending: 24 },
  { customer: "Patel Stores, Solapur", product: "Primer 20L", ordered: 20, available: 2, pending: 18 },
];

const topCustomers = [
  { name: "Raj Hardware, Pune", sales: 418000, growth: 12 },
  { name: "Metro Hardware", sales: 376000, growth: 8 },
  { name: "Krishna Paints, Nashik", sales: 342000, growth: -3 },
];

const topProducts = [
  { name: "Artist Gold Premium Emulsion 20L", units: 1240, revenue: 868000 },
  { name: "Artist Gold Exterior Paint 10L", units: 890, revenue: 534000 },
  { name: "Synthetic Enamel White 4L", units: 1560, revenue: 468000 },
];

const productMovement = {
  fast: ["Premium Emulsion 20L", "Exterior Paint 10L", "Enamel White 4L"],
  slow: ["Texture Finish 20L", "Rust Guard 4L", "Clear Varnish 1L"],
};

const fmt = (n: number) =>
  n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : `₹${n.toLocaleString("en-IN")}`;

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* KPI Cards — GET /dashboard/summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={Banknote}
          label="Today's Sales"
          value="₹51,240"
          sub="14 invoices raised"
          trend="8.2%"
          trendUp={true}
          color="bg-[#1E3A8A]"
        />
        <KpiCard
          icon={ShoppingCart}
          label="New Orders"
          value="23"
          sub="Since midnight"
          trend="12%"
          trendUp={true}
          color="bg-[#F97316]"
        />
        <KpiCard
          icon={Clock}
          label="Pending Orders"
          value="47"
          sub="Awaiting processing"
          trend="3.4%"
          trendUp={false}
          color="bg-amber-500"
        />
        <KpiCard
          icon={Archive}
          label="Low Stock Products"
          value="8"
          sub="Below reorder level"
          trend="33%"
          trendUp={false}
          color="bg-purple-500"
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
        <SectionHeader title="Quick Actions" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: "New Order", icon: ShoppingCart, color: "bg-[#1E3A8A] hover:bg-[#1e40af]", href: "/orders" },
            { label: "Add Customer", icon: Users, color: "bg-purple-600 hover:bg-purple-700", href: "/customers" },
            { label: "Update Stock", icon: Archive, color: "bg-amber-600 hover:bg-amber-700", href: "/inventory" },
          ].map((a) => (
            <button
              key={a.label}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg text-white text-sm font-medium ${a.color}`}
            >
              <a.icon size={16} />
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sales Analytics — GET /reports/sales-monthly (Phase 2 reports, or simple query for now) */}
      <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
        <SectionHeader title="Sales Analytics" />
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={monthlySales}>
            <defs>
              <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1E3A8A" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#1E3A8A" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F97316" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#F97316" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={(v) => fmt(v)} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip formatter={(value) => (typeof value === "number" ? fmt(value) : "")} />
            <Area type="monotone" dataKey="sales" name="Sales" stroke="#1E3A8A" strokeWidth={2} fill="url(#salesGrad)" dot={false} />
            <Area type="monotone" dataKey="collections" name="Collections" stroke="#F97316" strokeWidth={2} fill="url(#colGrad)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inventory Status — GET /inventory?low_stock=true */}
        <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
          <SectionHeader title="Inventory Status" action="Manage Stock" />
          <div className="space-y-2">
            {inventoryItems.map((item) => (
              <div key={item.name} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-foreground truncate">{item.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    Available: {item.available} / Reorder: {item.reorder}
                  </p>
                </div>
                <StatusBadge status={item.status === "critical" ? "Pending" : item.status === "low" ? "Preparing" : "Delivered"} />
              </div>
            ))}
          </div>
        </div>

        {/* Pending Orders — GET /orders?status=pending */}
        <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
          <SectionHeader title="Pending Orders" action="View All" />
          <div className="space-y-2">
            {pendingOrders.map((o, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-foreground truncate">{o.customer}</p>
                  <p className="text-[10px] text-muted-foreground">{o.product}</p>
                </div>
                <span className="text-xs font-semibold text-red-500">{o.pending} pending</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Customers — GET /customers?sort=sales_desc&limit=5 */}
        <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
          <SectionHeader title="Top Customers" action="View All" />
          <div className="space-y-2">
            {topCustomers.map((c) => (
              <div key={c.name} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                <p className="text-xs font-medium text-foreground truncate">{c.name}</p>
                <div className="text-right">
                  <p className="text-xs font-semibold text-foreground">{fmt(c.sales)}</p>
                  <p className={`text-[10px] ${c.growth >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                    {c.growth >= 0 ? "+" : ""}{c.growth}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Selling Products + Product Movement — GET /products?sort=units_desc, GET /stock-movements/summary */}
        <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
          <SectionHeader title="Top Selling Products" action="View All" />
          <div className="space-y-2 mb-4">
            {topProducts.map((p) => (
              <div key={p.name} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                <p className="text-xs font-medium text-foreground truncate flex-1">{p.name}</p>
                <p className="text-xs font-semibold text-foreground">{fmt(p.revenue)}</p>
              </div>
            ))}
          </div>

          <SectionHeader title="Product Movement" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] text-emerald-600 font-semibold uppercase tracking-wide mb-1.5">Fast Moving</p>
              {productMovement.fast.map((p) => (
                <div key={p} className="flex items-center gap-1.5 py-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="text-[10px] text-foreground">{p}</span>
                </div>
              ))}
            </div>
            <div>
              <p className="text-[10px] text-red-500 font-semibold uppercase tracking-wide mb-1.5">Slow Moving</p>
              {productMovement.slow.map((p) => (
                <div key={p} className="flex items-center gap-1.5 py-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                  <span className="text-[10px] text-foreground">{p}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
