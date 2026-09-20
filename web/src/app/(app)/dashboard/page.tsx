"use client";

import { useMemo } from "react";
import {
  Banknote,
  ShoppingCart,
  Clock,
  Archive,
  Users,
} from "lucide-react";
import { useDateRange } from "@/lib/date-range-context";
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

// ─── Helper: format currency ───────────────────────────────────────────────
const fmt = (n: number) =>
  n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : `₹${n.toLocaleString("en-IN")}`;

// ─── Helper: default dates (last 60 days) ──────────────────────────────────
const today = new Date();
const sixtyDaysAgo = new Date();
sixtyDaysAgo.setDate(today.getDate() - 60);

const toISO = (d: Date) => d.toISOString().split("T")[0];

// ─── Mock data with dates ──────────────────────────────────────────────────
// TODO: replace with real API calls — see comment above each section
const monthlySales = [
  { month: "Jan", date: "2026-01-15", sales: 420000, collections: 380000 },
  { month: "Feb", date: "2026-02-15", sales: 380000, collections: 360000 },
  { month: "Mar", date: "2026-03-15", sales: 510000, collections: 480000 },
  { month: "Apr", date: "2026-04-15", sales: 460000, collections: 440000 },
  { month: "May", date: "2026-05-15", sales: 590000, collections: 550000 },
  { month: "Jun", date: "2026-06-15", sales: 630000, collections: 600000 },
];

const inventoryItems = [
  { name: "Artist Gold Premium Emulsion 20L", date: "2026-06-20", stock: 142, reserved: 38, available: 104, reorder: 50, status: "good" },
  { name: "Artist Gold Exterior Paint 10L", date: "2026-06-18", stock: 28, reserved: 22, available: 6, reorder: 30, status: "low" },
  { name: "Primer Red Oxide 20L", date: "2026-05-25", stock: 14, reserved: 12, available: 2, reorder: 20, status: "critical" },
  { name: "Distemper Powder 50kg", date: "2026-05-10", stock: 31, reserved: 28, available: 3, reorder: 40, status: "critical" },
];

const pendingOrders = [
  { customer: "Raj Hardware, Pune", product: "Emulsion 20L", date: "2026-06-22", ordered: 50, available: 20, pending: 30 },
  { customer: "Krishna Paints, Nashik", product: "Exterior 10L", date: "2026-06-10", ordered: 30, available: 6, pending: 24 },
  { customer: "Patel Stores, Solapur", product: "Primer 20L", date: "2026-05-28", ordered: 20, available: 2, pending: 18 },
];

const topCustomers = [
  { name: "Raj Hardware, Pune", date: "2026-06-20", sales: 418000, growth: 12 },
  { name: "Metro Hardware", date: "2026-06-15", sales: 376000, growth: 8 },
  { name: "Krishna Paints, Nashik", date: "2026-05-20", sales: 342000, growth: -3 },
];

const topProducts = [
  { name: "Artist Gold Premium Emulsion 20L", date: "2026-06-20", units: 1240, revenue: 868000 },
  { name: "Artist Gold Exterior Paint 10L", date: "2026-06-10", units: 890, revenue: 534000 },
  { name: "Synthetic Enamel White 4L", date: "2026-05-15", units: 1560, revenue: 468000 },
];

const productMovement = {
  fast: ["Premium Emulsion 20L", "Exterior Paint 10L", "Enamel White 4L"],
  slow: ["Texture Finish 20L", "Rust Guard 4L", "Clear Varnish 1L"],
};

// ─── Generic date filter ───────────────────────────────────────────────────
function filterByRange<T extends { date: string }>(
  data: T[],
  start: string,
  end: string
): T[] {
  if (!start && !end) return data;
  const s = start ? new Date(start) : new Date("1970-01-01");
  const e = end ? new Date(end) : new Date("2099-12-31");
  return data.filter((item) => {
    const d = new Date(item.date);
    return d >= s && d <= e;
  });
}

// ─── Component ─────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { startDate, endDate } = useDateRange();

  // Filtered datasets
  const fSales = useMemo(() => filterByRange(monthlySales, startDate, endDate), [startDate, endDate]);
  const fInventory = useMemo(() => filterByRange(inventoryItems, startDate, endDate), [startDate, endDate]);
  const fOrders = useMemo(() => filterByRange(pendingOrders, startDate, endDate), [startDate, endDate]);
  const fCustomers = useMemo(() => filterByRange(topCustomers, startDate, endDate), [startDate, endDate]);
  const fProducts = useMemo(() => filterByRange(topProducts, startDate, endDate), [startDate, endDate]);

  // Computed KPIs from filtered data
  const totalSales = fSales.reduce((a, b) => a + b.sales, 0);
  const totalCollections = fSales.reduce((a, b) => a + b.collections, 0);
  const pendingCount = fOrders.reduce((a, b) => a + b.pending, 0);
  const lowStockCount = fInventory.filter((i) => i.status === "low" || i.status === "critical").length;

  return (
    <div className="space-y-6">
      {/* ── KPI Cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={Banknote}
          label="Total Sales"
          value={fmt(totalSales)}
          sub={`${fSales.length} months in range`}
          trend="8.2%"
          trendUp={true}
          color="bg-[#1E3A8A]"
        />
        <KpiCard
          icon={Banknote}
          label="Collections"
          value={fmt(totalCollections)}
          sub="Payments received"
          trend="6.5%"
          trendUp={true}
          color="bg-[#F97316]"
        />
        <KpiCard
          icon={Clock}
          label="Pending Orders"
          value={String(pendingCount)}
          sub={`${fOrders.length} orders in range`}
          trend="3.4%"
          trendUp={false}
          color="bg-amber-500"
        />
        <KpiCard
          icon={Archive}
          label="Low Stock Products"
          value={String(lowStockCount)}
          sub="Below reorder level"
          trend="33%"
          trendUp={false}
          color="bg-purple-500"
        />
      </div>

      {/* ── Quick Actions ─────────────────────────────────────────── */}
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

      {/* ── Sales Analytics Chart ─────────────────────────────────── */}
      <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
        <SectionHeader title="Sales Analytics" />
        {fSales.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={fSales}>
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
        ) : (
          <div className="flex items-center justify-center h-[260px] text-sm text-muted-foreground">
            No sales data in the selected range
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Inventory Status ────────────────────────────────────── */}
        <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
          <SectionHeader title="Inventory Status" action="Manage Stock" />
          <div className="space-y-2">
            {fInventory.length > 0 ? (
              fInventory.map((item) => (
                <div key={item.name} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-foreground truncate">{item.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      Available: {item.available} / Reorder: {item.reorder}
                    </p>
                  </div>
                  <StatusBadge status={item.status === "critical" ? "Pending" : item.status === "low" ? "Preparing" : "Delivered"} />
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground py-4 text-center">No inventory data in range</p>
            )}
          </div>
        </div>

        {/* ── Pending Orders ──────────────────────────────────────── */}
        <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
          <SectionHeader title="Pending Orders" action="View All" />
          <div className="space-y-2">
            {fOrders.length > 0 ? (
              fOrders.map((o, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-foreground truncate">{o.customer}</p>
                    <p className="text-[10px] text-muted-foreground">{o.product}</p>
                  </div>
                  <span className="text-xs font-semibold text-red-500">{o.pending} pending</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground py-4 text-center">No pending orders in range</p>
            )}
          </div>
        </div>

        {/* ── Top Customers ───────────────────────────────────────── */}
        <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
          <SectionHeader title="Top Customers" action="View All" />
          <div className="space-y-2">
            {fCustomers.length > 0 ? (
              fCustomers.map((c) => (
                <div key={c.name} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <p className="text-xs font-medium text-foreground truncate">{c.name}</p>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-foreground">{fmt(c.sales)}</p>
                    <p className={`text-[10px] ${c.growth >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                      {c.growth >= 0 ? "+" : ""}{c.growth}%
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground py-4 text-center">No customer data in range</p>
            )}
          </div>
        </div>

        {/* ── Top Selling Products + Product Movement ─────────────── */}
        <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
          <SectionHeader title="Top Selling Products" action="View All" />
          <div className="space-y-2 mb-4">
            {fProducts.length > 0 ? (
              fProducts.map((p) => (
                <div key={p.name} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <p className="text-xs font-medium text-foreground truncate flex-1">{p.name}</p>
                  <p className="text-xs font-semibold text-foreground">{fmt(p.revenue)}</p>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground py-4 text-center">No product data in range</p>
            )}
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
