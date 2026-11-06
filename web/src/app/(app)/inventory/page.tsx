"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Package, AlertTriangle, IndianRupee, ArrowDownToLine, Search, Filter, Loader2, AlertCircle, X, Plus, Minus } from "lucide-react";
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
  productId?: number;
}

export default function InventoryPage() {
  const router = useRouter();
  const { startDate, endDate } = useDateRange();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ── Stock Adjust Modal ──────────────────────────────────────────────────
  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<{ id: string; name: string; stock: number } | null>(null);
  const [adjQty, setAdjQty] = useState<number | "">("");
  const [adjMode, setAdjMode] = useState<"add" | "remove">("add");
  const [adjReason, setAdjReason] = useState("");
  const [adjSubmitting, setAdjSubmitting] = useState(false);
  const [adjError, setAdjError] = useState("");

  useEffect(() => {
    async function loadInventory() {
      try {
        const res = await authFetch("/inventory/");
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
            status: status,
            productId: item.product_id,
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

  // Auto-open stock modal when navigated with ?action=new
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("action") === "new") {
        openStockModal(null);
        window.history.replaceState(null, "", window.location.pathname);
      }
    }
  }, []);

  function openStockModal(item: InventoryItem | null) {
    setSelectedProduct(
      item ? { id: item.id, name: item.name, stock: item.stock } : null
    );
    setAdjQty("");
    setAdjMode("add");
    setAdjReason("");
    setAdjError("");
    setStockModalOpen(true);
  }

  async function handleStockSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAdjError("");

    if (!selectedProduct) {
      setAdjError("Please select a product to adjust.");
      return;
    }
    if (adjQty === "" || Number(adjQty) <= 0) {
      setAdjError("Please enter a valid quantity greater than 0.");
      return;
    }

    const finalQty = adjMode === "add" ? Number(adjQty) : -Number(adjQty);
    setAdjSubmitting(true);
    try {
      const res = await authFetch(`/inventory/${selectedProduct.id}/adjust`, {
        method: "PATCH",
        body: JSON.stringify({ adjustment_qty: finalQty, reason: adjReason || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to update stock.");
      setStockModalOpen(false);
      // Refresh inventory list
      setLoading(true);
      setError("");
      const refreshRes = await authFetch("/inventory/");
      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        const mapped: InventoryItem[] = refreshData.map((item: any) => {
          const physical = item.physical_qty || 0;
          const reserved = item.reserved_qty || 0;
          const available = item.available_qty || 0;
          const reorder = item.product?.reorder_level || 0;
          let status: "good" | "low" | "critical" = "good";
          if (available <= reorder) status = available <= 5 ? "critical" : "low";
          return {
            id: String(item.id),
            sku: item.product?.shade_code || item.product?.variant_code || String(item.product?.id || ""),
            name: item.product?.display_name || "Unknown Product",
            category: item.product?.category?.name || "Uncategorized",
            stock: physical, reserved, available, reorder,
            price: Number(item.product?.mrp) || 0,
            date: item.updated_at ? item.updated_at.split("T")[0] : new Date().toISOString().split("T")[0],
            status,
            productId: item.product_id,
          };
        });
        setInventory(mapped);
      }
    } catch (err: any) {
      setAdjError(err.message || "Failed to update stock.");
    } finally {
      setAdjSubmitting(false);
      setLoading(false);
    }
  }

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
        <button
          onClick={() => openStockModal(null)}
          className="flex items-center gap-2 bg-[#1E3A8A] hover:bg-[#1e40af] text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm transition-all"
        >
          <ArrowDownToLine size={16} />
          Update Stock
        </button>
      </div>

      {/* ── KPI Cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
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
                <th className="px-6 py-3 text-center">Action</th>
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
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => openStockModal(item)}
                        className="px-2.5 py-1 text-xs font-medium rounded-lg bg-[#1E3A8A]/10 text-[#1E3A8A] hover:bg-[#1E3A8A]/20 transition-colors whitespace-nowrap"
                      >
                        Update
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground text-sm">
                    No inventory items found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Update Stock Modal ──────────────────────────────────────── */}
      {stockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-card w-full max-w-md rounded-2xl shadow-2xl border border-border">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-base font-bold text-foreground">Update Stock</h2>
              <button
                onClick={() => setStockModalOpen(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleStockSubmit} className="px-6 py-5 space-y-4">
              {adjError && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 text-xs">
                  <AlertCircle size={14} />
                  {adjError}
                </div>
              )}

              {/* Product selector (shown when no product pre-selected) */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Product <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedProduct?.id || ""}
                  onChange={(e) => {
                    const item = inventory.find((i) => i.id === e.target.value);
                    setSelectedProduct(item ? { id: item.id, name: item.name, stock: item.stock } : null);
                  }}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20"
                >
                  <option value="">Select a product...</option>
                  {inventory.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} (Stock: {item.stock})
                    </option>
                  ))}
                </select>
              </div>

              {/* Add / Remove toggle */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">Adjustment Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjMode("add")}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      adjMode === "add"
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-background text-muted-foreground border-border hover:bg-muted"
                    }`}
                  >
                    <Plus size={14} /> Add Stock
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjMode("remove")}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      adjMode === "remove"
                        ? "bg-red-600 text-white border-red-600"
                        : "bg-background text-muted-foreground border-border hover:bg-muted"
                    }`}
                  >
                    <Minus size={14} /> Remove Stock
                  </button>
                </div>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Quantity <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  value={adjQty}
                  onChange={(e) => setAdjQty(e.target.value ? Number(e.target.value) : "")}
                  placeholder="Enter quantity"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20"
                />
                {selectedProduct && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Current stock: {selectedProduct.stock} →{" "}
                    <span className={adjMode === "add" ? "text-emerald-600 font-medium" : "text-red-500 font-medium"}>
                      {adjMode === "add"
                        ? selectedProduct.stock + (Number(adjQty) || 0)
                        : Math.max(0, selectedProduct.stock - (Number(adjQty) || 0))}
                    </span>
                  </p>
                )}
              </div>

              {/* Reason */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">Reason (optional)</label>
                <input
                  type="text"
                  value={adjReason}
                  onChange={(e) => setAdjReason(e.target.value)}
                  placeholder="e.g. Stock Received, Damaged, Correction..."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20"
                />
              </div>
            </form>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
              <button
                type="button"
                onClick={() => setStockModalOpen(false)}
                disabled={adjSubmitting}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-border text-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleStockSubmit}
                disabled={adjSubmitting}
                className={`flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg text-white transition-colors disabled:opacity-60 ${
                  adjMode === "add" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {adjSubmitting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : adjMode === "add" ? (
                  <Plus size={14} />
                ) : (
                  <Minus size={14} />
                )}
                {adjSubmitting ? "Saving..." : adjMode === "add" ? "Add Stock" : "Remove Stock"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
