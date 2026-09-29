"use client";

import { useMemo, useState, useEffect } from "react";
import { Package, AlertTriangle, IndianRupee, ArrowDownToLine, Search, Filter, Loader2, AlertCircle } from "lucide-react";
import { useDateRange, filterByRange } from "@/lib/date-range-context";
import { KpiCard } from "@/shared/ui/KpiCard";
import { StatusBadge } from "@/shared/ui/StatusBadge";
import { authFetch } from "@/lib/auth";

// ─── Format Helpers ────────────────────────────────────────────────────────
const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;

interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  stock: number;
  reserved: number;
  available: number;
  reorder: number;
  price: number;
  date: string;
  status: "good" | "low" | "critical";
}

export default function InventoryPage() {
  const { startDate, endDate } = useDateRange();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadInventory() {
      try {
        const res = await authFetch("/inventory");
        if (!res.ok) {
          throw new Error("Failed to load inventory levels from backend.");
        }
        const data = await res.json();
        
        // Map backend schema to existing frontend structure
        const mapped: InventoryItem[] = data.map((item: any) => {
          const physical = item.physical_qty || 0;
          const reserved = item.reserved_qty || 0;
          const available = item.available_qty || 0;
          const reorder = item.product?.reorder_level || 0;
          
          // Determine status based on reorder thresholds
          let status: "good" | "low" | "critical" = "good";
          if (available <= reorder) {
            status = available <= 5 ? "critical" : "low";
          }
          
          return {
            id: String(item.id),
            sku: item.product?.shade_code || item.product?.variant_code || String(item.product?.id || ""),
            name: item.product?.display_name || "Unknown Product",
            category: item.product?.category?.name || "Uncategorized",
            stock: physical,
            reserved: reserved,
            available: available,
            reorder: reorder,
            price: Number(item.product?.mrp) || 0,
            date: item.updated_at ? item.updated_at.split("T")[0] : new Date().toISOString().split("T")[0],
            status: status
          };
        });
        
        setInventory(mapped);
      } catch (err: any) {
        setError(err.message || "Cannot connect to server. Is the backend running?");
      } finally {
        setLoading(false);
      }
    }
    loadInventory();
  }, []);

  // Unique categories for the dropdown
  const categories = useMemo(() => Array.from(new Set(inventory.map(i => i.category))), [inventory]);

  // 1. Filter by global date range
  const dateFiltered = useMemo(() => filterByRange(inventory, startDate, endDate), [inventory, startDate, endDate]);

  // 2. Filter by local search term and dropdown filters
  const filteredInventory = useMemo(() => {
    return dateFiltered.filter((item) => {
      const matchesSearch = 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = selectedCategory ? item.category === selectedCategory : true;
      const matchesStatus = selectedStatus ? item.status === selectedStatus : true;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [dateFiltered, searchTerm, selectedCategory, selectedStatus]);

  // ─── KPIs ────────────────────────────────────────────────────────────────
  const totalItems = filteredInventory.length;
  const lowStockItems = filteredInventory.filter((i) => i.status === "low" || i.status === "critical").length;
  const totalValue = filteredInventory.reduce((acc, item) => acc + (item.stock * item.price), 0);
  const totalReserved = filteredInventory.reduce((acc, item) => acc + item.reserved, 0);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="w-8 h-8 text-[#1E3A8A] animate-spin" />
        <p className="text-sm text-muted-foreground font-medium">Loading live inventory levels...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 p-6 bg-red-500/5 rounded-2xl border border-red-500/10 max-w-lg mx-auto mt-12">
        <AlertCircle className="w-10 h-10 text-red-500" />
        <h3 className="text-base font-semibold text-foreground">Failed to Load Inventory</h3>
        <p className="text-sm text-muted-foreground text-center">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Inventory Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage stock levels, reorder points, and warehouse status.</p>
        </div>
        <button className="flex items-center gap-2 bg-[#1E3A8A] hover:bg-[#1e40af] text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm transition-all">
          <ArrowDownToLine size={16} />
          Receive Stock
        </button>
      </div>

      {/* ── KPI Cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={Package}
          label="Total Products"
          value={String(totalItems)}
          sub="Items in selected range"
          trend="Active"
          trendUp={true}
          color="bg-[#1E3A8A]"
        />
        <KpiCard
          icon={IndianRupee}
          label="Inventory Value"
          value={fmt(totalValue)}
          sub="Total cost of stock"
          trend="Stable"
          trendUp={true}
          color="bg-emerald-600"
        />
        <KpiCard
          icon={AlertTriangle}
          label="Low Stock Alerts"
          value={String(lowStockItems)}
          sub="Requires reorder"
          trend="Action Needed"
          trendUp={false}
          color="bg-[#F97316]"
        />
        <KpiCard
          icon={Package}
          label="Reserved Units"
          value={String(totalReserved)}
          sub="Committed to orders"
          trend="High Demand"
          trendUp={true}
          color="bg-purple-600"
        />
      </div>

      {/* ── Data Table Area ───────────────────────────────────────── */}
      <div className="bg-card/60 backdrop-blur-xl border border-border rounded-xl shadow-sm overflow-visible flex flex-col">
        {/* Toolbar */}
        <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name, SKU, or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-background border border-border/60 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/40 transition-all placeholder:text-muted-foreground"
            />
          </div>
          <div className="relative">
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-foreground bg-background border border-border/60 rounded-lg hover:bg-muted transition-all"
            >
              <Filter size={14} />
              Filters
              {(selectedCategory || selectedStatus) && (
                <span className="w-2 h-2 rounded-full bg-[#F97316]" />
              )}
            </button>
            
            {showFilters && (
              <div className="absolute right-0 top-12 w-64 bg-card border border-border rounded-xl shadow-xl z-50 p-4 space-y-4">
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Category</label>
                  <select 
                    value={selectedCategory || ""} 
                    onChange={(e) => setSelectedCategory(e.target.value || null)}
                    className="w-full bg-muted border border-border/60 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1E3A8A]/40"
                  >
                    <option value="">All Categories</option>
                    {categories.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Status</label>
                  <select 
                    value={selectedStatus || ""} 
                    onChange={(e) => setSelectedStatus(e.target.value || null)}
                    className="w-full bg-muted border border-border/60 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1E3A8A]/40"
                  >
                    <option value="">All Statuses</option>
                    <option value="good">Good</option>
                    <option value="low">Low Stock</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div className="pt-2 flex justify-between items-center border-t border-border/50">
                  <span className="text-xs text-muted-foreground font-medium">{filteredInventory.length} results</span>
                  <button 
                    onClick={() => { setSelectedCategory(null); setSelectedStatus(null); }}
                    className="text-xs text-red-500 hover:text-red-600 font-medium transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-muted/50 border-b border-border text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              <tr>
                <th className="px-6 py-3">Product details</th>
                <th className="px-6 py-3">Category</th>
                <th className="px-6 py-3 text-right">Stock</th>
                <th className="px-6 py-3 text-right">Available</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Value</th>
                <th className="px-6 py-3 text-right">Last Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filteredInventory.length > 0 ? (
                filteredInventory.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-foreground">{item.name}</span>
                        <span className="text-[10px] text-muted-foreground mt-0.5">SKU: {item.sku}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted text-xs font-medium text-foreground">
                        {item.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex flex-col items-end">
                        <span className="font-semibold text-foreground">{item.stock}</span>
                        <span className="text-[10px] text-muted-foreground mt-0.5">R/O: {item.reorder}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex flex-col items-end">
                        <span className={`font-semibold ${item.available <= item.reorder ? 'text-red-500' : 'text-emerald-600'}`}>
                          {item.available}
                        </span>
                        <span className="text-[10px] text-muted-foreground mt-0.5">{item.reserved} reserved</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={item.status === "critical" ? "Pending" : item.status === "low" ? "Preparing" : "Delivered"} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-medium text-foreground">{fmt(item.stock * item.price)}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-xs text-muted-foreground">{new Date(item.date).toLocaleDateString()}</span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground text-sm">
                    No inventory items found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
