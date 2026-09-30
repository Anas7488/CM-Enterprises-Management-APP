"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Search,
  Plus,
  Banknote,
  AlertTriangle,
  CheckCircle2,
  Eye,
  Trash2,
  Loader2,
  RefreshCw,
  MapPin,
  RotateCcw,
  Receipt,
  X,
  Package,
} from "lucide-react";
import { KpiCard } from "@/shared/ui/KpiCard";
import { formatCurrencyShort, formatDate } from "@/modules/invoices/data";
import { authFetch } from "@/lib/auth";

const fmt = (n: number | string) =>
  `₹${Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

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
  issued: {
    label: "Issued",
    className: "bg-red-500/10 text-red-600 border border-red-500/20",
  },
  cancelled: {
    label: "Cancelled",
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

interface CreditNoteListItem {
  id: number;
  credit_note_no: string;
  invoice_id: number;
  invoice_no: string;
  customer_id: number;
  customer_name: string;
  customer_area?: string | null;
  customer_area_code?: string | null;
  date: string;
  reason: string;
  subtotal: number | string;
  gst_amount: number | string;
  total_amount: number | string;
  status: string;
  item_count: number;
  created_at: string;
}

export default function InvoicesPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"sales" | "credit_notes">("sales");

  // Invoices state
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(true);
  const [invoiceStatus, setInvoiceStatus] = useState<string>("all");

  // Credit Notes state
  const [creditNotes, setCreditNotes] = useState<CreditNoteListItem[]>([]);
  const [creditNotesLoading, setCreditNotesLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  // Create Credit Note Modal
  const [showCnModal, setShowCnModal] = useState(false);
  const [selectedInvoiceForCn, setSelectedInvoiceForCn] = useState<any | null>(null);
  const [cnLoadingInvoice, setCnLoadingInvoice] = useState(false);
  const [cnReason, setCnReason] = useState("Sales Return / Damaged Goods");
  const [cnRemarks, setCnRemarks] = useState("");
  const [cnItems, setCnItems] = useState<
    Array<{
      product_id: number;
      product_name: string;
      invoiced_qty: number;
      return_qty: number;
      rate: number;
      gst_rate: number;
      hsn_code: string;
      restock_inventory: boolean;
      selected: boolean;
    }>
  >([]);
  const [cnSubmitting, setCnSubmitting] = useState(false);
  const [cnError, setCnError] = useState("");

  // Fetch Invoices
  const fetchInvoices = async () => {
    try {
      setInvoicesLoading(true);
      const res = await authFetch("/invoices/");
      if (res.ok) {
        const data = await res.json();
        setInvoices(data || []);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load invoices");
    } finally {
      setInvoicesLoading(false);
    }
  };

  // Fetch Credit Notes
  const fetchCreditNotes = async () => {
    try {
      setCreditNotesLoading(true);
      const res = await authFetch("/credit-notes/");
      if (res.ok) {
        const data = await res.json();
        setCreditNotes(data || []);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load credit notes");
    } finally {
      setCreditNotesLoading(false);
    }
  };

  const loadAll = async () => {
    setError("");
    await Promise.all([fetchInvoices(), fetchCreditNotes()]);
    setRefreshing(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadAll();
  };

  // Open Issue Credit Note Modal
  const handleOpenCreditNoteModal = async (invoiceId?: number) => {
    setShowCnModal(true);
    setCnError("");
    setCnRemarks("");
    setCnReason("Sales Return / Damaged Goods");

    if (invoiceId) {
      await loadInvoiceItemsForCn(invoiceId);
    } else {
      setSelectedInvoiceForCn(null);
      setCnItems([]);
    }
  };

  const loadInvoiceItemsForCn = async (invoiceId: number) => {
    try {
      setCnLoadingInvoice(true);
      setCnError("");
      const res = await authFetch(`/invoices/${invoiceId}`);
      if (!res.ok) throw new Error("Failed to load invoice items");
      const invData = await res.json();
      setSelectedInvoiceForCn(invData);

      const items = (invData.items || []).map((it: any) => ({
        product_id: it.product_id,
        product_name: it.product_name,
        invoiced_qty: Number(it.quantity),
        return_qty: Number(it.quantity),
        rate: Number(it.rate),
        gst_rate: Number(it.gst_rate),
        hsn_code: it.hsn_code || "",
        restock_inventory: true,
        selected: true,
      }));
      setCnItems(items);
    } catch (err: any) {
      setCnError(err.message || "Could not load invoice details");
    } finally {
      setCnLoadingInvoice(false);
    }
  };

  const handleToggleItem = (idx: number) => {
    setCnItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, selected: !item.selected } : item))
    );
  };

  const handleQtyChange = (idx: number, qty: number) => {
    setCnItems((prev) =>
      prev.map((item, i) =>
        i === idx ? { ...item, return_qty: Math.min(item.invoiced_qty, Math.max(0.01, qty)) } : item
      )
    );
  };

  const handleRestockToggle = (idx: number) => {
    setCnItems((prev) =>
      prev.map((item, i) =>
        i === idx ? { ...item, restock_inventory: !item.restock_inventory } : item
      )
    );
  };

  // Live Credit Note Totals Calculation
  const cnCalculatedTotal = useMemo(() => {
    let sub = 0;
    let gst = 0;
    for (const item of cnItems) {
      if (item.selected && item.return_qty > 0) {
        const itemSub = item.rate * item.return_qty;
        const itemGst = itemSub * (item.gst_rate / 100);
        sub += itemSub;
        gst += itemGst;
      }
    }
    const raw = sub + gst;
    const rounded = Math.round(raw);
    const roundOff = rounded - raw;
    return {
      subtotal: sub,
      gstAmount: gst,
      roundOff,
      total: rounded,
    };
  }, [cnItems]);

  const handleSubmitCreditNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceForCn) {
      setCnError("Please select an invoice first.");
      return;
    }
    const selectedItems = cnItems.filter((it) => it.selected && it.return_qty > 0);
    if (selectedItems.length === 0) {
      setCnError("Please select at least one item to return.");
      return;
    }

    try {
      setCnSubmitting(true);
      setCnError("");

      const payload = {
        invoice_id: selectedInvoiceForCn.id,
        reason: cnReason,
        remarks: cnRemarks.trim() || null,
        items: selectedItems.map((it) => ({
          product_id: it.product_id,
          quantity: it.return_qty,
          rate: it.rate,
          gst_rate: it.gst_rate,
          hsn_code: it.hsn_code || null,
          restock_inventory: it.restock_inventory,
        })),
      };

      const res = await authFetch("/credit-notes/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Failed to create credit note");
      }

      const newCn = await res.json();
      setShowCnModal(false);
      loadAll();
      setActiveTab("credit_notes");
      router.push(`/credit-notes/${newCn.id}`);
    } catch (err: any) {
      setCnError(err.message || "Failed to create credit note");
    } finally {
      setCnSubmitting(false);
    }
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

  // Delete Credit Note
  const handleDeleteCreditNote = async (cn: CreditNoteListItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (
      !window.confirm(
        `Are you sure you want to delete Credit Note ${cn.credit_note_no}? This will restore customer ledger balance and reverse inventory adjustments.`
      )
    ) {
      return;
    }
    try {
      const res = await authFetch(`/credit-notes/${cn.id}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.detail || "Failed to delete credit note");
      }
      setCreditNotes((prev) => prev.filter((item) => item.id !== cn.id));
    } catch (err: any) {
      alert(err.message || "Could not delete credit note");
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
        invoiceStatus === "all" || inv.status.toLowerCase() === invoiceStatus.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [invoices, searchTerm, invoiceStatus]);

  // Filtered Credit Notes
  const filteredCreditNotes = useMemo(() => {
    return creditNotes.filter((cn) => {
      const q = searchTerm.toLowerCase();
      return (
        !searchTerm.trim() ||
        cn.credit_note_no.toLowerCase().includes(q) ||
        cn.invoice_no.toLowerCase().includes(q) ||
        cn.customer_name.toLowerCase().includes(q) ||
        cn.reason.toLowerCase().includes(q) ||
        (cn.customer_area && cn.customer_area.toLowerCase().includes(q))
      );
    });
  }, [creditNotes, searchTerm]);

  // KPIs
  const totalInvoiced = useMemo(
    () => invoices.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0),
    [invoices]
  );
  const totalCollected = useMemo(
    () =>
      invoices
        .filter((inv) => inv.status.toLowerCase() === "paid")
        .reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0),
    [invoices]
  );
  const totalOutstanding = useMemo(
    () =>
      invoices
        .filter((inv) => inv.status.toLowerCase() === "unpaid")
        .reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0),
    [invoices]
  );
  const totalCredited = useMemo(
    () => creditNotes.reduce((sum, cn) => sum + Number(cn.total_amount || 0), 0),
    [creditNotes]
  );

  return (
    <div className="space-y-6">
      {/* ── Page Header ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Billing & Invoices</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage GST Tax Invoices, Issue Credit Notes / Sales Returns, and track customer balances.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
          </button>
          <button
            onClick={() => handleOpenCreditNoteModal()}
            className="flex items-center gap-2 border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-600 text-sm font-semibold px-4 py-2 rounded-lg transition-all"
          >
            <RotateCcw size={15} />
            Issue Credit Note
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

      {/* ── Main Document Tabs ────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-border pb-1">
        <button
          onClick={() => {
            setActiveTab("sales");
            setSearchTerm("");
          }}
          className={`flex items-center gap-2 px-5 py-2.5 text-sm font-bold border-b-2 transition-all ${
            activeTab === "sales"
              ? "border-[#1E3A8A] text-[#1E3A8A]"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileText size={16} />
          Sales Invoices
          <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-muted text-foreground">
            {invoices.length}
          </span>
        </button>

        <button
          onClick={() => {
            setActiveTab("credit_notes");
            setSearchTerm("");
          }}
          className={`flex items-center gap-2 px-5 py-2.5 text-sm font-bold border-b-2 transition-all ${
            activeTab === "credit_notes"
              ? "border-red-600 text-red-600"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <RotateCcw size={16} />
          Credit Notes (Sales Returns)
          <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-600">
            {creditNotes.length}
          </span>
        </button>
      </div>

      {/* ── KPI Cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={FileText}
          label="Total Invoiced"
          value={formatCurrencyShort(totalInvoiced)}
          sub={`${invoices.length} Tax Invoices`}
          trend="Active"
          trendUp={true}
          color="bg-[#1E3A8A]"
        />
        <KpiCard
          icon={CheckCircle2}
          label="Collected"
          value={formatCurrencyShort(totalCollected)}
          sub="Fully paid invoices"
          trend="Healthy"
          trendUp={true}
          color="bg-emerald-600"
        />
        <KpiCard
          icon={Banknote}
          label="Outstanding Balance"
          value={formatCurrencyShort(totalOutstanding)}
          sub="Pending collections"
          trend={totalOutstanding > 0 ? "Pending" : "Clear"}
          trendUp={totalOutstanding === 0}
          color="bg-amber-500"
        />
        <KpiCard
          icon={RotateCcw}
          label="Total Credit Notes"
          value={formatCurrencyShort(totalCredited)}
          sub={`${creditNotes.length} Sales returns`}
          trend="Adjusted"
          trendUp={false}
          color="bg-red-600"
        />
      </div>

      {/* ── Tab Content: Sales Invoices ──────────────────────────── */}
      {activeTab === "sales" && (
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
                  onClick={() => setInvoiceStatus(st)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md capitalize transition-all ${
                    invoiceStatus === st
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
            {invoicesLoading ? (
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
                                onClick={() => handleOpenCreditNoteModal(inv.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-500/10 rounded-md transition-colors"
                                title="Issue Credit Note / Sales Return"
                              >
                                <RotateCcw size={12} />
                                <span>Return</span>
                              </button>
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
      )}

      {/* ── Tab Content: Credit Notes (Sales Returns) ────────────── */}
      {activeTab === "credit_notes" && (
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
                placeholder="Search by Credit Note #, Invoice #, or Customer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-background border border-border rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/40 transition-all placeholder:text-muted-foreground"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {creditNotesLoading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
                <p className="text-sm text-muted-foreground">Loading credit notes...</p>
              </div>
            ) : (
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-muted/50 border-b border-border text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  <tr>
                    <th className="px-6 py-3">Credit Note No.</th>
                    <th className="px-6 py-3">Original Invoice</th>
                    <th className="px-6 py-3">Customer & Area</th>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Reason</th>
                    <th className="px-6 py-3 text-right">GST Reversed</th>
                    <th className="px-6 py-3 text-right">Total Credit Amount</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filteredCreditNotes.length > 0 ? (
                    filteredCreditNotes.map((cn) => (
                      <tr
                        key={cn.id}
                        onClick={() => router.push(`/credit-notes/${cn.id}`)}
                        className="cursor-pointer hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <span className="font-bold font-mono text-red-600 text-xs">
                            {cn.credit_note_no}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-mono text-xs text-[#1E3A8A] font-semibold">
                            {cn.invoice_no}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-semibold text-foreground text-xs">
                              {cn.customer_name}
                            </span>
                            {cn.customer_area && (
                              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                                <MapPin size={10} className="text-muted-foreground" />
                                {cn.customer_area} ({cn.customer_area_code || "--"})
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs text-muted-foreground">
                            {formatDate(cn.date)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs text-foreground bg-muted/40 px-2 py-1 rounded-md">
                            {cn.reason}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-xs text-muted-foreground">
                            {fmt(cn.gst_amount)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="font-bold text-red-600 text-xs">
                            -{fmt(cn.total_amount)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div
                            className="inline-flex items-center gap-1.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => router.push(`/credit-notes/${cn.id}`)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-500/10 rounded-md transition-colors"
                              title="View and Print Credit Note"
                            >
                              <Eye size={13} />
                              <span>View</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleDeleteCreditNote(cn, e)}
                              className="p-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-500/10 rounded-md transition-colors"
                              title="Delete Credit Note"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-6 py-12 text-center text-muted-foreground text-sm"
                      >
                        {searchTerm
                          ? "No credit notes match your search."
                          : "No credit notes issued yet. Click 'Issue Credit Note' to record a sales return."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          Issue Credit Note / Sales Return Modal
          ═══════════════════════════════════════════════════════════════════ */}
      {showCnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-border bg-muted/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-600">
                  <RotateCcw size={20} />
                </div>
                <div>
                  <h2 className="font-bold text-foreground text-base">Issue Credit Note (Sales Return)</h2>
                  <p className="text-xs text-muted-foreground">
                    Record returned goods, reverse GST, restore inventory, and adjust customer balance.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCnModal(false)}
                className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitCreditNote} className="flex-1 overflow-y-auto p-6 space-y-5">
              {cnError && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-600">
                  <AlertTriangle size={16} /> {cnError}
                </div>
              )}

              {/* Invoice Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                    Select Tax Invoice <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedInvoiceForCn?.id || ""}
                    onChange={(e) => {
                      const id = Number(e.target.value);
                      if (id) loadInvoiceItemsForCn(id);
                    }}
                    className="w-full px-3 py-2.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/30 font-medium"
                    required
                  >
                    <option value="" disabled>-- Select Tax Invoice --</option>
                    {invoices.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoice_no} — {inv.customer_name} ({fmt(inv.total_amount)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                    Reason for Return / Credit Note <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={cnReason}
                    onChange={(e) => setCnReason(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/30 font-medium"
                    required
                  >
                    <option value="Sales Return / Damaged Goods">Damaged / Defective Goods</option>
                    <option value="Wrong Item Delivered">Wrong Item Delivered</option>
                    <option value="Customer Excess Stock Return">Customer Excess Stock Return</option>
                    <option value="Price / Rate Difference">Price / Rate Difference</option>
                    <option value="Order Cancelled Post Delivery">Order Cancelled Post Delivery</option>
                    <option value="Other">Other Adjustment</option>
                  </select>
                </div>
              </div>

              {/* Loading Invoice Items */}
              {cnLoadingInvoice && (
                <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground text-sm">
                  <Loader2 className="w-5 h-5 animate-spin text-red-600" />
                  Loading items from invoice...
                </div>
              )}

              {/* Items Selection Table */}
              {selectedInvoiceForCn && !cnLoadingInvoice && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                      Select Returned Items from {selectedInvoiceForCn.invoice_no}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Customer: <strong className="text-foreground">{selectedInvoiceForCn.customer_name}</strong>
                    </span>
                  </div>

                  <div className="border border-border rounded-xl overflow-hidden bg-card">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-muted/50 border-b border-border font-semibold text-muted-foreground uppercase text-[10px]">
                        <tr>
                          <th className="py-2.5 px-3 w-10 text-center">Select</th>
                          <th className="py-2.5 px-3">Item Name</th>
                          <th className="py-2.5 px-3 text-center">Invoiced Qty</th>
                          <th className="py-2.5 px-3 text-right">Return Qty</th>
                          <th className="py-2.5 px-3 text-right">Rate (₹)</th>
                          <th className="py-2.5 px-3 text-center">Restock?</th>
                          <th className="py-2.5 px-3 text-right">Credit Amt</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        {cnItems.map((item, idx) => {
                          const itemTotal = item.rate * item.return_qty * (1 + item.gst_rate / 100);
                          return (
                            <tr
                              key={item.product_id}
                              className={item.selected ? "bg-red-500/[0.03]" : "opacity-60"}
                            >
                              <td className="py-2.5 px-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={item.selected}
                                  onChange={() => handleToggleItem(idx)}
                                  className="rounded border-border text-red-600 focus:ring-red-500 cursor-pointer"
                                />
                              </td>
                              <td className="py-2.5 px-3 font-medium text-foreground">
                                {item.product_name}
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono text-muted-foreground">
                                {item.invoiced_qty}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <input
                                  type="number"
                                  min="0.01"
                                  max={item.invoiced_qty}
                                  step="0.01"
                                  value={item.return_qty}
                                  disabled={!item.selected}
                                  onChange={(e) => handleQtyChange(idx, parseFloat(e.target.value) || 0)}
                                  className="w-20 px-2 py-1 text-right text-xs bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-red-500 font-bold"
                                />
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono">
                                {item.rate.toFixed(2)}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <label className="inline-flex items-center gap-1 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={item.restock_inventory}
                                    disabled={!item.selected}
                                    onChange={() => handleRestockToggle(idx)}
                                    className="rounded border-border text-emerald-600 focus:ring-emerald-500"
                                  />
                                  <span className="text-[10px] text-muted-foreground">Yes</span>
                                </label>
                              </td>
                              <td className="py-2.5 px-3 text-right font-bold font-mono text-red-600">
                                {item.selected ? fmt(itemTotal) : "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Summary Box */}
                  <div className="bg-muted/30 border border-border rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div>
                        Tax Subtotal: <strong className="text-foreground">{fmt(cnCalculatedTotal.subtotal)}</strong>
                      </div>
                      <div>
                        GST Reversal: <strong className="text-foreground">{fmt(cnCalculatedTotal.gstAmount)}</strong>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs uppercase font-bold text-muted-foreground">
                        Total Credit Amount
                      </div>
                      <div className="text-xl font-bold font-mono text-red-600">
                        {fmt(cnCalculatedTotal.total)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Remarks */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                  Internal Remarks / Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Returned 2 cans due to transit damage, approved by manager"
                  value={cnRemarks}
                  onChange={(e) => setCnRemarks(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/30"
                />
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowCnModal(false)}
                  className="px-4 py-2.5 text-sm font-medium rounded-lg border border-border hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={cnSubmitting || !selectedInvoiceForCn || cnCalculatedTotal.total <= 0}
                  className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-lg transition-all disabled:opacity-50 flex items-center gap-2 shadow-sm"
                >
                  {cnSubmitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Generating Credit Note...
                    </>
                  ) : (
                    <>
                      <RotateCcw size={16} /> Confirm & Issue Credit Note
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
