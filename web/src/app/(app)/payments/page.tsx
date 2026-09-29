"use client";

import {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
  Suspense,
} from "react";
import {
  Wallet,
  Search,
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ChevronsUpDown,
  Receipt,
  TrendingDown,
  X,
  ChevronDown,
  FileText,
} from "lucide-react";
import { authFetch } from "@/lib/auth";

// ── Formatters ────────────────────────────────────────────────────────────────
const fmt = (n: number | string) =>
  `₹${Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

// ── Payment methods ───────────────────────────────────────────────────────────
const PAYMENT_METHODS = [
  { value: "Cash", label: "Cash", icon: "💵" },
  { value: "Cash in Hand", label: "Cash in Hand", icon: "🤝" },
  { value: "Cash Direct", label: "Cash Direct", icon: "💰" },
  { value: "UPI", label: "UPI / QR", icon: "📱" },
  { value: "NEFT", label: "NEFT", icon: "🏦" },
  { value: "RTGS", label: "RTGS", icon: "⚡" },
  { value: "Bank Transfer", label: "Bank Transfer", icon: "🔁" },
  { value: "Bank Deposit", label: "Bank Deposit", icon: "🏛️" },
  { value: "Cheque", label: "Cheque", icon: "📋" },
  { value: "Bad Debts", label: "Bad Debts", icon: "⚠️" },
];

const METHOD_NEEDS_REF = ["Cheque", "NEFT", "RTGS", "Bank Transfer", "Bank Deposit", "UPI"];

// ── Method badge color ────────────────────────────────────────────────────────
function methodColor(method: string) {
  const map: Record<string, string> = {
    Cash: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    "Cash in Hand": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    "Cash Direct": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    UPI: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    NEFT: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    RTGS: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    "Bank Transfer": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    "Bank Deposit": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    Cheque: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    "Bad Debts": "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };
  return map[method] || "bg-muted text-muted-foreground";
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface Customer {
  id: number;
  shop_name: string;
  contact_person?: string;
  phone?: string;
  outstanding_balance?: number;
  area?: { id: number; name: string; route?: { route_number: number } };
}

interface Invoice {
  id: number;
  invoice_no: string;
  total_amount: number;
  paid_amount: number;
}

interface Payment {
  id: number;
  receipt_no: string;
  amount: number;
  date: string;
  payment_method: string;
  status: string;
  reference_no?: string;
  notes?: string;
  created_at: string;
  customer?: { id: number; shop_name: string };
  invoice?: { id: number; invoice_no: string; total_amount: number; paid_amount: number };
}

interface Summary {
  total_collected: number;
  pending_amount: number;
  failed_amount: number;
  total_count: number;
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiTile({
  label,
  value,
  sub,
  color,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  color: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 flex items-start gap-4 shadow-sm">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <p className="text-2xl font-bold text-foreground mt-0.5 truncate">{value}</p>
        {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
function CollectionsContent() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [search, setSearch] = useState("");
  const [filterMethod, setFilterMethod] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");

  // Form state
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [isCustomerOpen, setIsCustomerOpen] = useState(false);
  const [customerAnchor, setCustomerAnchor] = useState<{ top: number; left: number; width: number } | null>(null);
  const customerInputRef = useRef<HTMLInputElement>(null);
  const customerDropdownRef = useRef<HTMLDivElement>(null);

  const [amount, setAmount] = useState<number | "">("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [referenceNo, setReferenceNo] = useState("");
  const [notes, setNotes] = useState("");

  // Invoice search within modal
  const [customerInvoices, setCustomerInvoices] = useState<Invoice[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | "">("");
  const [loadingInvoices, setLoadingInvoices] = useState(false);

  // Delete confirm
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // ── Load data ──────────────────────────────────────────────────────────────
  async function load() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (filterMethod) params.set("method", filterMethod);
      if (filterDateFrom) params.set("start_date", filterDateFrom);
      if (filterDateTo) params.set("end_date", filterDateTo);

      const [pmtRes, sumRes, custRes] = await Promise.all([
        authFetch(`/payments/?${params}`),
        authFetch("/payments/summary"),
        authFetch("/customers/"),
      ]);

      if (!pmtRes.ok || !sumRes.ok) throw new Error("Failed to load payments");

      const pmtData = await pmtRes.json();
      const sumData = await sumRes.json();
      const custData = await custRes.json();

      setPayments(Array.isArray(pmtData) ? pmtData : []);
      setSummary(sumData);
      setCustomers(Array.isArray(custData) ? custData : custData.items || []);
    } catch (e: any) {
      setError(e.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [search, filterMethod, filterDateFrom, filterDateTo]);

  // ── Customer dropdown (click outside) ─────────────────────────────────────
  useEffect(() => {
    if (!isCustomerOpen) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (customerDropdownRef.current?.contains(t)) return;
      if (customerInputRef.current?.contains(t)) return;
      setIsCustomerOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isCustomerOpen]);

  const openCustomerDropdown = useCallback(() => {
    setIsCustomerOpen(true);
    if (customerInputRef.current) {
      const r = customerInputRef.current.getBoundingClientRect();
      setCustomerAnchor({ top: r.bottom + 4, left: r.left, width: r.width });
    }
  }, []);

  // ── Load invoices when customer selected ──────────────────────────────────
  useEffect(() => {
    if (!selectedCustomer) { setCustomerInvoices([]); setSelectedInvoiceId(""); return; }
    setLoadingInvoices(true);
    authFetch(`/invoices/?customer_id=${selectedCustomer.id}`)
      .then(r => r.json())
      .then(data => {
        const inv = (Array.isArray(data) ? data : data.items || [])
          .filter((i: any) => i.status !== "paid" && i.status !== "void");
        setCustomerInvoices(inv);
      })
      .catch(() => setCustomerInvoices([]))
      .finally(() => setLoadingInvoices(false));
  }, [selectedCustomer]);

  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers.slice(0, 50);
    const q = customerSearch.toLowerCase();
    return customers.filter(c =>
      c.shop_name.toLowerCase().includes(q) ||
      c.phone?.includes(q) ||
      c.area?.name.toLowerCase().includes(q)
    ).slice(0, 50);
  }, [customers, customerSearch]);

  // ── Submit payment ─────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCustomer) { setSubmitError("Please select a customer."); return; }
    if (!amount || Number(amount) <= 0) { setSubmitError("Enter a valid amount."); return; }

    setSubmitting(true);
    setSubmitError("");
    setSubmitSuccess("");
    try {
      const body: any = {
        customer_id: selectedCustomer.id,
        amount: Number(amount),
        date: paymentDate,
        payment_method: paymentMethod,
        notes: notes || null,
        reference_no: referenceNo || null,
      };
      if (selectedInvoiceId) body.invoice_id = Number(selectedInvoiceId);

      const res = await authFetch("/payments/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to record payment");
      }
      const created = await res.json();
      setSubmitSuccess(`✅ Receipt ${created.receipt_no} recorded successfully!`);
      resetForm();
      load();
      setTimeout(() => { setShowModal(false); setSubmitSuccess(""); }, 2000);
    } catch (e: any) {
      setSubmitError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setSelectedCustomer(null);
    setCustomerSearch("");
    setAmount("");
    setPaymentMethod("Cash");
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setReferenceNo("");
    setNotes("");
    setSelectedInvoiceId("");
    setCustomerInvoices([]);
    setSubmitError("");
  }

  // ── Delete payment ─────────────────────────────────────────────────────────
  async function handleDelete(id: number) {
    setDeletingId(id);
    try {
      const res = await authFetch(`/payments/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      load();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setDeletingId(null);
    }
  }

  const needsRef = METHOD_NEEDS_REF.includes(paymentMethod);

  return (
    <div className="space-y-6">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Collections</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Record received payments, track outstanding balances, and manage accounts receivable.
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowModal(true); }}
          className="flex items-center gap-2 bg-[#1E3A8A] hover:bg-[#1e40af] text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-sm transition-all"
        >
          <Plus size={16} />
          Record Payment
        </button>
      </div>

      {/* ── KPI Cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiTile
          label="Total Collected"
          value={fmt(summary?.total_collected || 0)}
          sub={`${summary?.total_count || 0} transactions`}
          color="bg-emerald-500/10 text-emerald-600"
          icon={<Wallet size={20} />}
        />
        <KpiTile
          label="Pending"
          value={fmt(summary?.pending_amount || 0)}
          color="bg-amber-500/10 text-amber-600"
          icon={<ChevronsUpDown size={20} />}
        />
        <KpiTile
          label="Failed / Bad Debts"
          value={fmt(summary?.failed_amount || 0)}
          color="bg-red-500/10 text-red-600"
          icon={<TrendingDown size={20} />}
        />
        <KpiTile
          label="Total Records"
          value={String(payments.length)}
          sub="in current filter"
          color="bg-[#1E3A8A]/10 text-[#1E3A8A]"
          icon={<Receipt size={20} />}
        />
      </div>

      {/* ── Filters ───────────────────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-xl p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search receipt no. or customer..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/30"
          />
        </div>
        <select
          value={filterMethod}
          onChange={e => setFilterMethod(e.target.value)}
          className="px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/30"
        >
          <option value="">All Methods</option>
          {PAYMENT_METHODS.map(m => (
            <option key={m.value} value={m.value}>{m.icon} {m.label}</option>
          ))}
        </select>
        <input
          type="date"
          value={filterDateFrom}
          onChange={e => setFilterDateFrom(e.target.value)}
          className="px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/30"
          title="From date"
        />
        <span className="text-muted-foreground text-xs">to</span>
        <input
          type="date"
          value={filterDateTo}
          onChange={e => setFilterDateTo(e.target.value)}
          className="px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/30"
          title="To date"
        />
        {(search || filterMethod || filterDateFrom || filterDateTo) && (
          <button
            onClick={() => { setSearch(""); setFilterMethod(""); setFilterDateFrom(""); setFilterDateTo(""); }}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-2"
          >
            <X size={13} /> Clear
          </button>
        )}
      </div>

      {/* ── Payments Table ────────────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-7 h-7 animate-spin text-[#1E3A8A]" />
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 p-6 text-red-600 text-sm">
            <AlertCircle size={16} /> {error}
          </div>
        ) : payments.length === 0 ? (
          <div className="py-20 text-center">
            <Wallet size={40} className="mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground text-sm font-medium">No payments recorded yet.</p>
            <p className="text-muted-foreground text-xs mt-1">Click "Record Payment" to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                <tr>
                  <th className="px-4 py-3 text-left">Receipt No.</th>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Customer</th>
                  <th className="px-4 py-3 text-left">Invoice</th>
                  <th className="px-4 py-3 text-left">Method</th>
                  <th className="px-4 py-3 text-left">Ref No.</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {payments.map(p => (
                  <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-bold text-[#1E3A8A]">
                      {p.receipt_no}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {fmtDate(p.date)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-xs text-foreground">{p.customer?.shop_name || "—"}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
                      {p.invoice?.invoice_no || <span className="text-muted-foreground/50">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${methodColor(p.payment_method)}`}>
                        {p.payment_method}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
                      {p.reference_no || "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-foreground">
                      {fmt(p.amount)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => {
                          if (confirm(`Delete receipt ${p.receipt_no}? This will reverse the payment from the customer's balance.`))
                            handleDelete(p.id);
                        }}
                        disabled={deletingId === p.id}
                        className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all disabled:opacity-40"
                        title="Delete & reverse payment"
                      >
                        {deletingId === p.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Record Payment Modal ──────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-border flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#1E3A8A]/10 flex items-center justify-center">
                  <Wallet size={18} className="text-[#1E3A8A]" />
                </div>
                <div>
                  <h2 className="font-bold text-foreground">Record Payment</h2>
                  <p className="text-xs text-muted-foreground">Add a collection received from customer</p>
                </div>
              </div>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="p-2 hover:bg-muted rounded-lg transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
              {submitSuccess && (
                <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-sm text-emerald-700">
                  <CheckCircle2 size={16} /> {submitSuccess}
                </div>
              )}
              {submitError && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-600">
                  <AlertCircle size={16} /> {submitError}
                </div>
              )}

              {/* Customer */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                  Customer <span className="text-red-500">*</span>
                </label>
                {selectedCustomer ? (
                  <div className="flex items-center justify-between p-3 bg-muted/40 border border-border rounded-lg">
                    <div>
                      <div className="font-bold text-sm text-foreground">{selectedCustomer.shop_name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                        {selectedCustomer.phone && <span>{selectedCustomer.phone}</span>}
                        {selectedCustomer.outstanding_balance != null && (
                          <span className="text-amber-600 font-semibold">
                            Outstanding: {fmt(selectedCustomer.outstanding_balance)}
                          </span>
                        )}
                      </div>
                    </div>
                    <button type="button" onClick={() => { setSelectedCustomer(null); setCustomerSearch(""); }}
                      className="p-1 text-muted-foreground hover:text-red-500 rounded transition-colors">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      ref={customerInputRef}
                      type="text"
                      placeholder="Search customer by name, phone, area..."
                      value={customerSearch}
                      onChange={e => { setCustomerSearch(e.target.value); openCustomerDropdown(); }}
                      onFocus={openCustomerDropdown}
                      className="w-full pl-9 pr-3 py-2.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/30"
                    />
                  </div>
                )}
              </div>

              {/* Link to Invoice (optional) */}
              {selectedCustomer && (
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5">
                    <FileText size={12} /> Link to Invoice
                    <span className="text-[10px] font-normal text-muted-foreground">(optional)</span>
                  </label>
                  {loadingInvoices ? (
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5 py-2">
                      <Loader2 size={12} className="animate-spin" /> Loading invoices...
                    </div>
                  ) : customerInvoices.length === 0 ? (
                    <div className="text-xs text-muted-foreground py-1">No unpaid invoices found — payment will be applied to balance directly.</div>
                  ) : (
                    <select
                      value={selectedInvoiceId}
                      onChange={e => setSelectedInvoiceId(e.target.value ? Number(e.target.value) : "")}
                      className="w-full px-3 py-2.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/30"
                    >
                      <option value="">— No specific invoice —</option>
                      {customerInvoices.map(inv => {
                        const remaining = Number(inv.total_amount) - Number(inv.paid_amount);
                        return (
                          <option key={inv.id} value={inv.id}>
                            {inv.invoice_no} — Due: {fmt(remaining)}
                          </option>
                        );
                      })}
                    </select>
                  )}
                </div>
              )}

              {/* Amount */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                  Amount (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={e => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full px-3 py-2.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/30 font-mono text-right"
                  required
                />
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                  Payment Method <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {PAYMENT_METHODS.map(m => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => { setPaymentMethod(m.value); setReferenceNo(""); }}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold transition-all ${
                        paymentMethod === m.value
                          ? "border-[#1E3A8A] bg-[#1E3A8A]/10 text-[#1E3A8A]"
                          : "border-border bg-background text-muted-foreground hover:bg-muted/50"
                      }`}
                    >
                      <span>{m.icon}</span> {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reference No (conditional) */}
              {needsRef && (
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                    {paymentMethod === "Cheque" ? "Cheque No." : "UTR / Transaction Ref No."}
                  </label>
                  <input
                    type="text"
                    placeholder={paymentMethod === "Cheque" ? "e.g. 012345" : "e.g. HDFC123456789"}
                    value={referenceNo}
                    onChange={e => setReferenceNo(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/30"
                  />
                </div>
              )}

              {/* Date */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Payment Date</label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={e => setPaymentDate(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/30"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Notes (optional)</label>
                <textarea
                  rows={2}
                  placeholder="Any additional info..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/30 resize-none"
                />
              </div>

              {/* Summary box */}
              {selectedCustomer && amount && (
                <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg text-xs space-y-1">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Customer:</span>
                    <span className="font-semibold text-foreground">{selectedCustomer.shop_name}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Payment:</span>
                    <span className="font-bold text-emerald-700 text-sm">{fmt(amount)}</span>
                  </div>
                  {selectedCustomer.outstanding_balance != null && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Balance after:</span>
                      <span className="font-semibold text-foreground">
                        {fmt(Number(selectedCustomer.outstanding_balance) - Number(amount))}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting || !selectedCustomer || !amount}
                className="w-full py-2.5 bg-[#1E3A8A] hover:bg-[#1e40af] text-white text-sm font-bold rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? <><Loader2 size={16} className="animate-spin" /> Recording...</> : <><CheckCircle2 size={16} /> Record Payment</>}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Customer Search Fixed Dropdown ────────────────────────────────── */}
      {isCustomerOpen && customerAnchor && (
        <div
          ref={customerDropdownRef}
          className="fixed z-[200] bg-card border border-border rounded-xl shadow-2xl max-h-60 overflow-y-auto divide-y divide-border/40"
          style={{ top: customerAnchor.top, left: customerAnchor.left, width: customerAnchor.width }}
        >
          {filteredCustomers.length > 0 ? filteredCustomers.map(c => (
            <div
              key={c.id}
              onMouseDown={e => {
                e.preventDefault();
                setSelectedCustomer(c);
                setCustomerSearch(c.shop_name);
                setIsCustomerOpen(false);
              }}
              className="p-3 hover:bg-muted/60 cursor-pointer transition-colors"
            >
              <div className="font-semibold text-sm text-foreground">{c.shop_name}</div>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                {c.area && <span className="text-[#1E3A8A] font-medium">{c.area.name}</span>}
                {c.phone && <span>• {c.phone}</span>}
                {c.outstanding_balance != null && (
                  <span className="text-amber-600 font-semibold ml-auto">₹{Number(c.outstanding_balance).toLocaleString("en-IN")}</span>
                )}
              </div>
            </div>
          )) : (
            <div className="p-3 text-center text-xs text-muted-foreground">No customers found</div>
          )}
        </div>
      )}
    </div>
  );
}

export default function CollectionsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[#1E3A8A]" />
      </div>
    }>
      <CollectionsContent />
    </Suspense>
  );
}
