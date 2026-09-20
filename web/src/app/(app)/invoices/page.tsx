"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Search,
  Filter,
  Plus,
  Banknote,
  AlertTriangle,
  CheckCircle2,
  Eye,
  Printer,
  Trash2,
  Loader2,
  RefreshCw,
  MapPin,
} from "lucide-react";
import { KpiCard } from "@/shared/ui/KpiCard";
import { formatCurrencyShort, formatDate } from "@/modules/invoices/data";
import { authFetch } from "@/lib/auth";

// ─── Formatters ──────────────────────────────────────────────────────────────
const fmt = (n: number | string) =>
  `₹${Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

// ─── Status badge config ───────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  unpaid: {
    label: "Unpaid",
    className: "bg-red-500/10 text-red-600 border border-red-500/20",
  },
  partially_paid: {
    label: "Partial",
    className: "bg-amber-500/10 text-amber-600 border border-amber-500/20",
  },
  paid: {
    label: "Paid",
    className: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20",
  },
  void: {
    label: "Void",
    className: "bg-gray-500/10 text-gray-500 border border-gray-500/20",
  },
};

interface InvoiceListItem {
  id: number;
  invoice_no: string;
  order_id?: number | null;
  order_no?: string | null;
  customer_id: number;
  customer_name: string;
  customer_area?: string | null;
  customer_area_code?: string | null;
  date: string;
  due_date: string;
  subtotal: number | string;
  gst_amount: number | string;
  total_amount: number | string;
  paid_amount: number | string;
  status: string;
  item_count: number;
  remarks?: string | null;
  created_at: string;
}

export default function InvoicesPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [refreshing, setRefreshing] = useState(false);

  // Load Invoices
  const fetchInvoices = async () => {
    try {
      setError("");
      const res = await authFetch("/invoices/");
      if (!res.ok) {
        throw new Error("Failed to fetch invoices");
      }
      const data = await res.json();
      setInvoices(data || []);
    } catch (err: any) {
      setError(err.message || "Failed to load invoices");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchInvoices();
  };

  // Delete Invoice
  const handleDeleteInvoice = async (inv: InvoiceListItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (
      !window.confirm(
        `Are you sure you want to delete invoice ${inv.invoice_no}? This will restore inventory and reverse customer ledger balance.`
      )
    ) {
      return;
    }

    try {
      const res = await authFetch(`/invoices/${inv.id}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.detail || "Failed to delete invoice");
      }
      setInvoices((prev) => prev.filter((item) => item.id !== inv.id));
    } catch (err: any) {
      alert(err.message || "Could not delete invoice");
    }
  };

  // Filtered Invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm.trim() ||
        inv.customer_name?.toLowerCase().includes(q) ||
        inv.invoice_no?.toLowerCase().includes(q) ||
        (inv.order_no && inv.order_no.toLowerCase().includes(q)) ||
        (inv.customer_area && inv.customer_area.toLowerCase().includes(q));

      const matchesStatus =
        selectedStatus === "all" || inv.status.toLowerCase() === selectedStatus.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [invoices, searchTerm, selectedStatus]);

  // ─── KPIs ──────────────────────────────────────────────────────────────────
  const totalInvoiced = useMemo(
    () => invoices.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0),
    [invoices]
  );
  const totalPaid = useMemo(
    () =>
      invoices
        .filter((inv) => inv.status.toLowerCase() === "paid")
        .reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0),
    [invoices]
  );
  const totalUnpaid = useMemo(
    () =>
      invoices
        .filter((inv) => inv.status.toLowerCase() === "unpaid")
        .reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0),
    [invoices]
  );
  const overdueCount = useMemo(
    () =>
      invoices.filter(
        (inv) =>
          inv.status.toLowerCase() !== "paid" &&
          inv.status.toLowerCase() !== "void" &&
          new Date(inv.due_date) < new Date()
      ).length,
    [invoices]
  );

  return (
    <div className="space-y-6">
      {/* ── Page Header ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Invoices</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage GST Tax Invoices, track collections, and convert customer orders.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
            title="Refresh Invoices"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
          </button>
          <button
            onClick={() => router.push("/invoices/new")}
            className="flex items-center gap-2 bg-[#1E3A8A] hover:bg-[#1e40af] text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm transition-all"
          >
            <Plus size={16} />
            New Invoice
          </button>
        </div>
      </div>

      {/* ── KPI Cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={FileText}
          label="Total Invoiced"
          value={formatCurrencyShort(totalInvoiced)}
          sub={`${invoices.length} invoices generated`}
          trend="Active"
          trendUp={true}
          color="bg-[#1E3A8A]"
        />
        <KpiCard
          icon={CheckCircle2}
          label="Collected"
          value={formatCurrencyShort(totalPaid)}
          sub="Fully paid invoices"
          trend="Healthy"
          trendUp={true}
          color="bg-emerald-600"
        />
        <KpiCard
          icon={Banknote}
          label="Outstanding"
          value={formatCurrencyShort(totalUnpaid)}
          sub="Awaiting payment"
          trend={totalUnpaid > 0 ? "Pending" : "Clear"}
          trendUp={totalUnpaid === 0}
          color="bg-amber-500"
        />
        <KpiCard
          icon={AlertTriangle}
          label="Overdue"
          value={String(overdueCount)}
          sub="Past due date"
          trend={overdueCount > 0 ? "Action Needed" : "Clear"}
          trendUp={overdueCount === 0}
          color="bg-red-500"
        />
      </div>

      {/* ── Data Table Area ───────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="text"
              placeholder="Search by customer, invoice or order..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-background border border-border rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/40 transition-all placeholder:text-muted-foreground"
            />
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto bg-muted/40 p-1 rounded-lg border border-border/60">
            {["all", "unpaid", "partially_paid", "paid", "void"].map((st) => (
              <button
                key={st}
                onClick={() => setSelectedStatus(st)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md capitalize transition-all ${
                  selectedStatus === st
                    ? "bg-card text-foreground shadow-sm font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {st.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-8 h-8 text-[#1E3A8A] animate-spin" />
              <p className="text-sm text-muted-foreground">Loading invoices...</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-muted/50 border-b border-border text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                <tr>
                  <th className="px-6 py-3">Invoice No.</th>
                  <th className="px-6 py-3">Customer & Area</th>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Due Date</th>
                  <th className="px-6 py-3 text-right">GST</th>
                  <th className="px-6 py-3 text-right">Total Amount</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filteredInvoices.length > 0 ? (
                  filteredInvoices.map((inv) => {
                    const isOverdue =
                      inv.status.toLowerCase() !== "paid" &&
                      inv.status.toLowerCase() !== "void" &&
                      new Date(inv.due_date) < new Date();
                    const statusCfg =
                      STATUS_CONFIG[inv.status.toLowerCase()] || STATUS_CONFIG.unpaid;

                    return (
                      <tr
                        key={inv.id}
                        onClick={() => router.push(`/invoices/${inv.id}`)}
                        className="cursor-pointer hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-bold font-mono text-[#1E3A8A] text-xs">
                              {inv.invoice_no}
                            </span>
                            {inv.order_no && (
                              <span className="text-[10px] text-muted-foreground mt-0.5">
                                Order: {inv.order_no}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-semibold text-foreground text-xs">
                              {inv.customer_name}
                            </span>
                            {inv.customer_area && (
                              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                                <MapPin size={10} className="text-muted-foreground" />
                                Area {inv.customer_area_code || "--"} • {inv.customer_area}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs text-muted-foreground">
                            {formatDate(inv.date)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`text-xs ${
                              isOverdue ? "text-red-600 font-semibold" : "text-muted-foreground"
                            }`}
                          >
                            {formatDate(inv.due_date)}
                            {isOverdue && (
                              <span className="ml-1.5 text-[9px] uppercase tracking-wider bg-red-500/10 text-red-600 px-1.5 py-0.5 rounded-full font-bold">
                                Overdue
                              </span>
                            )}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-xs text-muted-foreground">
                            {fmt(inv.gst_amount)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="font-bold text-foreground text-xs">
                            {fmt(inv.total_amount)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusCfg.className}`}
                          >
                            {statusCfg.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div
                            className="inline-flex items-center gap-1.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => router.push(`/invoices/${inv.id}`)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#1E3A8A] hover:bg-[#1E3A8A]/10 rounded-md transition-colors"
                              title="View and Print Invoice"
                            >
                              <Eye size={13} />
                              <span>View</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleDeleteInvoice(inv, e)}
                              className="p-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-500/10 rounded-md transition-colors"
                              title="Delete Invoice"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-6 py-12 text-center text-muted-foreground text-sm"
                    >
                      {searchTerm
                        ? "No invoices match your search."
                        : "No invoices created yet. Click 'New Invoice' or convert an order."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
