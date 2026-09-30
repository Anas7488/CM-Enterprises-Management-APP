"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Printer,
  Trash2,
  Loader2,
  AlertCircle,
  RotateCcw,
  X,
  CheckCircle2,
} from "lucide-react";
import {
  COMPANY,
  formatCurrency,
  formatDateFormal,
  numberToWords,
} from "@/modules/invoices/data";
import { authFetch } from "@/lib/auth";

const fmt = (n: number | string) =>
  `₹${Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

// ─── Print styles injected on mount ────────────────────────────────────────
const PRINT_CSS = `
@media print {
  body > *:not(#__next), 
  aside, header, nav, 
  [data-no-print] { display: none !important; }

  main { padding: 0 !important; overflow: visible !important; }
  
  .invoice-container {
    box-shadow: none !important;
    border-radius: 0 !important;
    max-width: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
  }

  @page {
    size: A4;
    margin: 10mm;
  }
}
`;

interface InvoiceItem {
  id: number;
  product_id: number;
  product_name: string;
  category_code: string;
  category_name: string;
  unit: string;
  quantity: number | string;
  rate: number | string;
  discount_pct: number | string;
  discount_amt: number | string;
  hsn_code: string;
  gst_rate: number | string;
  gst_amount: number | string;
  subtotal: number | string;
  total: number | string;
}

interface InvoiceDetail {
  id: number;
  invoice_no: string;
  order_id?: number | null;
  order_no?: string | null;
  customer_id: number;
  customer_name: string;
  customer_area?: string | null;
  customer_area_code?: string | null;
  customer_contact?: string | null;
  customer_phone?: string | null;
  customer_address?: string | null;
  customer_gstin?: string | null;
  date: string;
  due_date: string;
  subtotal: number | string;
  discount_amount: number | string;
  gst_amount: number | string;
  round_off?: number | string | null;
  total_amount: number | string;
  paid_amount: number | string;
  status: string;
  remarks?: string | null;
  item_count: number;
  created_at: string;
  items: InvoiceItem[];
}

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Issue Credit Note modal state
  const [showCnModal, setShowCnModal] = useState(false);
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

  useEffect(() => {
    async function loadInvoice() {
      if (!params.id) return;
      try {
        setLoading(true);
        const res = await authFetch(`/invoices/${params.id}`);
        if (!res.ok) {
          throw new Error(`Invoice #${params.id} not found`);
        }
        const data = await res.json();
        setInvoice(data);
      } catch (err: any) {
        setError(err.message || "Failed to load invoice");
      } finally {
        setLoading(false);
      }
    }
    loadInvoice();
  }, [params.id]);

  const handlePrint = () => {
    const style = document.createElement("style");
    style.textContent = PRINT_CSS;
    document.head.appendChild(style);
    window.print();
    setTimeout(() => document.head.removeChild(style), 1000);
  };

  const handleDelete = async () => {
    if (!invoice) return;
    if (
      !window.confirm(
        `Are you sure you want to delete invoice ${invoice.invoice_no}? This will restore stock and adjust the customer balance.`
      )
    ) {
      return;
    }

    try {
      setDeleting(true);
      const res = await authFetch(`/invoices/${invoice.id}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.detail || "Failed to delete invoice");
      }
      router.push("/invoices");
    } catch (err: any) {
      alert(err.message || "Failed to delete invoice");
      setDeleting(false);
    }
  };

  const handleOpenCreditNoteModal = () => {
    if (!invoice) return;
    setCnError("");
    setCnRemarks("");
    setCnReason("Sales Return / Damaged Goods");
    const items = (invoice.items || []).map((it) => ({
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
    setShowCnModal(true);
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
    if (!invoice) return;
    const selectedItems = cnItems.filter((it) => it.selected && it.return_qty > 0);
    if (selectedItems.length === 0) {
      setCnError("Please select at least one item to return.");
      return;
    }

    try {
      setCnSubmitting(true);
      setCnError("");

      const payload = {
        invoice_id: invoice.id,
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
      router.push(`/credit-notes/${newCn.id}`);
    } catch (err: any) {
      setCnError(err.message || "Failed to create credit note");
    } finally {
      setCnSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 text-[#1E3A8A] animate-spin" />
        <p className="text-sm text-muted-foreground">Loading invoice details...</p>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-sm text-red-600">
          <AlertCircle size={18} />
          <span>{error || "Invoice not found."}</span>
        </div>
        <button
          onClick={() => router.push("/invoices")}
          className="flex items-center gap-2 text-sm font-medium text-[#1E3A8A] hover:underline"
        >
          <ArrowLeft size={14} /> Back to Invoices
        </button>
      </div>
    );
  }

  const subtotal = Number(invoice.subtotal || 0);
  const gstTotal = Number(invoice.gst_amount || 0);
  const totalAmount = Number(invoice.total_amount || 0);
  const extraDiscount = Number(invoice.discount_amount || 0);
  const roundOff = Number(invoice.round_off || 0);
  const cgstAmount = gstTotal / 2;
  const sgstAmount = gstTotal / 2;

  const totalQty = invoice.items.reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0
  );
  const mainUnit = invoice.items[0]?.unit || "PCS";

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-16">
      {/* ── Toolbar ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-between" data-no-print>
        <button
          onClick={() => router.push("/invoices")}
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Invoices
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenCreditNoteModal}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-500/10 border border-red-200 rounded-lg transition-all"
            title="Issue a Credit Note / Sales Return against this invoice"
          >
            <RotateCcw size={14} />
            Issue Credit Note
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-500/10 border border-red-200 rounded-lg transition-all disabled:opacity-50"
            title="Delete invoice and revert stock/balances"
          >
            <Trash2 size={14} />
            {deleting ? "Deleting..." : "Delete"}
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-[#1E3A8A] hover:bg-[#1e40af] text-white rounded-lg shadow-sm transition-all"
          >
            <Printer size={14} />
            Print GST Invoice
          </button>
        </div>
      </div>

      {/* ── Invoice Document ──────────────────────────────────────── */}
      <div className="invoice-container bg-white text-gray-900 rounded-xl shadow-lg border border-gray-300 overflow-hidden">
        {/* Title */}
        <div className="text-center py-2.5 border-b-2 border-gray-800 bg-gray-50 flex items-center justify-between px-6">
          <div className="text-xs font-mono font-bold text-gray-500">
            {invoice.status.toUpperCase()}
          </div>
          <h1 className="text-lg font-bold text-gray-900 tracking-wide uppercase">
            Tax Invoice
          </h1>
          <div className="text-xs font-mono font-bold text-[#1E3A8A]">
            {invoice.invoice_no}
          </div>
        </div>

        {/* Header: Seller + Invoice Meta */}
        <div className="grid grid-cols-2 border-b border-gray-300">
          {/* Seller Info */}
          <div className="p-4 border-r border-gray-300">
            <div className="flex items-start gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-[#1E3A8A] flex items-center justify-center flex-shrink-0 shadow-sm text-white font-black text-sm">
                CM
              </div>
              <div>
                <h2 className="font-extrabold text-gray-900 text-sm tracking-tight leading-tight">
                  {COMPANY.name}
                </h2>
                <div className="text-[11px] text-gray-500 font-medium">
                  Authorised Dealer &amp; Stockist
                </div>
              </div>
            </div>

            <div className="text-[11px] text-gray-600 leading-relaxed">
              {COMPANY.address.map((line, i) => (
                <p key={i}>{line}</p>
              ))}
              <div className="mt-1 font-semibold text-gray-700">
                GSTIN: <span className="font-mono text-gray-900">{COMPANY.gstin}</span>
              </div>
              <div>State: {COMPANY.stateName}, Code: {COMPANY.stateCode}</div>
              <div>Phone: {COMPANY.contact}</div>
            </div>
          </div>

          {/* Invoice Meta */}
          <div className="p-4 flex flex-col justify-between text-[11px] bg-gray-50/50">
            <div className="space-y-2">
              <div className="flex justify-between border-b border-gray-200 pb-1.5">
                <span className="text-gray-500">Invoice No:</span>
                <span className="font-mono font-bold text-gray-900 text-xs">
                  {invoice.invoice_no}
                </span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-1.5">
                <span className="text-gray-500">Dated:</span>
                <span className="font-bold text-gray-900">
                  {formatDateFormal(invoice.date)}
                </span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-1.5">
                <span className="text-gray-500">Due Date:</span>
                <span className="font-bold text-gray-900">
                  {formatDateFormal(invoice.due_date)}
                </span>
              </div>
              {invoice.order_no && (
                <div className="flex justify-between border-b border-gray-200 pb-1.5">
                  <span className="text-gray-500">Order Reference:</span>
                  <span className="font-mono font-bold text-gray-900">
                    {invoice.order_no}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Buyer Details */}
        <div className="p-4 border-b border-gray-300 bg-white">
          <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1">
            Buyer (Bill to &amp; Ship to)
          </div>
          <div className="text-sm font-bold text-gray-900">
            {invoice.customer_name}
          </div>
          {invoice.customer_address && (
            <div className="text-[11px] text-gray-600 whitespace-pre-line mt-0.5">
              {invoice.customer_address}
            </div>
          )}
          {invoice.customer_area && (
            <div className="text-[11px] text-gray-600 mt-0.5">
              Area: {invoice.customer_area} ({invoice.customer_area_code || "--"})
            </div>
          )}
          <div className="text-[11px] text-gray-700 font-medium mt-1">
            GSTIN:{" "}
            <span className="font-mono font-bold text-gray-900">
              {invoice.customer_gstin || "URP (Unregistered)"}
            </span>
          </div>
          {invoice.customer_phone && (
            <div className="text-[11px] text-gray-600">
              Contact: {invoice.customer_phone}
            </div>
          )}
        </div>

        {/* Items Table */}
        <div className="border-b border-gray-300">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-300 bg-gray-100 text-gray-700 font-semibold text-[11px]">
                <th className="py-2 px-3 text-center border-r border-gray-300 w-10">Sl No</th>
                <th className="py-2 px-3 border-r border-gray-300">Description of Goods</th>
                <th className="py-2 px-3 text-center border-r border-gray-300 w-20">HSN/SAC</th>
                <th className="py-2 px-3 text-right border-r border-gray-300 w-24">Quantity</th>
                <th className="py-2 px-3 text-right border-r border-gray-300 w-24">Rate (₹)</th>
                <th className="py-2 px-3 text-right border-r border-gray-300 w-16">Disc %</th>
                <th className="py-2 px-3 text-right border-r border-gray-300 w-16">GST %</th>
                <th className="py-2 px-3 text-right w-28">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {invoice.items.map((item, idx) => (
                <tr key={item.id} className="text-[11px]">
                  <td className="py-2 px-3 text-center border-r border-gray-300 text-gray-500">
                    {idx + 1}
                  </td>
                  <td className="py-2 px-3 border-r border-gray-300 font-medium text-gray-900">
                    {item.product_name}
                  </td>
                  <td className="py-2 px-3 text-center border-r border-gray-300 font-mono text-gray-600">
                    {item.hsn_code}
                  </td>
                  <td className="py-2 px-3 text-right border-r border-gray-300 font-bold text-gray-900">
                    {Number(item.quantity).toLocaleString("en-IN")} {item.unit}
                  </td>
                  <td className="py-2 px-3 text-right border-r border-gray-300 font-mono text-gray-700">
                    {Number(item.rate).toFixed(2)}
                  </td>
                  <td className="py-2 px-3 text-right border-r border-gray-300 font-mono text-gray-700">
                    {Number(item.discount_pct) > 0 ? `${item.discount_pct}%` : "—"}
                  </td>
                  <td className="py-2 px-3 text-right border-r border-gray-300 font-bold text-gray-700">
                    {item.gst_rate}%
                  </td>
                  <td className="py-2 px-3 text-right font-bold font-mono text-gray-900">
                    {Number(item.total).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-300 bg-gray-50 font-bold text-xs">
                <td colSpan={3} className="py-2 px-3 border-r border-gray-300 text-right uppercase text-gray-600">
                  Total
                </td>
                <td className="py-2 px-3 border-r border-gray-300 text-right text-gray-900">
                  {totalQty.toLocaleString("en-IN")} {mainUnit}
                </td>
                <td colSpan={3} className="py-2 px-3 border-r border-gray-300"></td>
                <td className="py-2 px-3 text-right font-mono text-gray-900">
                  {formatCurrency(totalAmount)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Calculation & Amount in Words */}
        <div className="grid grid-cols-2 border-b border-gray-300">
          <div className="p-4 border-r border-gray-300 flex flex-col justify-between">
            <div>
              <div className="text-[10px] uppercase font-bold text-gray-400 mb-1">
                Amount Chargeable (in words)
              </div>
              <div className="text-xs font-bold text-gray-900 italic">
                {numberToWords(totalAmount)}
              </div>
            </div>
            {invoice.remarks && (
              <div className="mt-4 text-[11px] text-gray-600">
                <span className="font-bold">Remarks:</span> {invoice.remarks}
              </div>
            )}
          </div>

          <div className="p-4 text-xs space-y-1.5 bg-gray-50/50">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal (Tax-Exclusive):</span>
              <span className="font-mono font-medium text-gray-900">
                {formatCurrency(subtotal)}
              </span>
            </div>
            {extraDiscount > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Extra Discount:</span>
                <span className="font-mono font-medium">
                  -{formatCurrency(extraDiscount)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-gray-600">
              <span>Central GST (CGST):</span>
              <span className="font-mono text-gray-900">{formatCurrency(cgstAmount)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>State GST (SGST):</span>
              <span className="font-mono text-gray-900">{formatCurrency(sgstAmount)}</span>
            </div>
            {roundOff !== 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Round Off:</span>
                <span className="font-mono text-gray-900">
                  {roundOff > 0 ? `+${roundOff.toFixed(2)}` : roundOff.toFixed(2)}
                </span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-gray-300 text-sm font-bold text-gray-900">
              <span>Total Invoice Amount:</span>
              <span className="font-mono text-base text-[#1E3A8A]">
                {formatCurrency(totalAmount)}
              </span>
            </div>
          </div>
        </div>

        {/* Declaration & Bank Details */}
        <div className="grid grid-cols-2 text-[11px]">
          <div className="p-4 border-r border-gray-300 space-y-1 text-gray-500">
            <p className="font-bold text-gray-700 text-[10px] uppercase">Declaration</p>
            <p>
              We declare that this invoice shows the actual price of the goods described
              and that all particulars are true and correct.
            </p>
            <p className="font-bold text-gray-700 text-[10px] mt-2 mb-0.5">
              TERMS &amp; CONDITIONS:
            </p>
            <p>1. Goods once sold won&apos;t be taken back without an authorized Credit Note.</p>
            <p>2. Credit Limit 28 Days Only.</p>
            <p>3. Subjected to Karnataka Jurisdiction only.</p>
          </div>

          <div className="p-4 flex flex-col justify-between">
            <div className="text-[10px] text-gray-600">
              <p className="font-bold text-gray-700 mb-1">Company&apos;s Bank Details</p>
              <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
                <span>Bank Name</span>
                <span>: <span className="font-bold text-gray-900">{COMPANY.bank.name}</span></span>
                <span>A/c No.</span>
                <span>: <span className="font-bold text-gray-900">{COMPANY.bank.accountNo}</span></span>
                <span>Branch &amp; IFS Code</span>
                <span>: <span className="font-bold text-gray-900">{COMPANY.bank.branchIfsc}</span></span>
              </div>
            </div>

            <div className="text-right mt-6">
              <p className="text-[10px] font-bold text-gray-700">for {COMPANY.name}</p>
              <div className="h-8"></div>
              <p className="text-[9px] text-gray-500 border-t border-gray-300 pt-1 inline-block">
                Authorised Signatory
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          Issue Credit Note Modal (Inline for this Invoice)
          ═══════════════════════════════════════════════════════════════════ */}
      {showCnModal && invoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" data-no-print>
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-foreground">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-border bg-muted/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-600">
                  <RotateCcw size={20} />
                </div>
                <div>
                  <h2 className="font-bold text-foreground text-base">
                    Issue Credit Note for {invoice.invoice_no}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Customer: <strong className="text-foreground">{invoice.customer_name}</strong>
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
                  <AlertCircle size={16} /> {cnError}
                </div>
              )}

              {/* Reason */}
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

              {/* Items Selection Table */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Select Items &amp; Return Quantities
                </span>
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

                {/* Summary */}
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

              {/* Remarks */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                  Internal Remarks / Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 1 can returned damaged by customer"
                  value={cnRemarks}
                  onChange={(e) => setCnRemarks(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/30"
                />
              </div>

              {/* Footer Buttons */}
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
                  disabled={cnSubmitting || cnCalculatedTotal.total <= 0}
                  className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-lg transition-all disabled:opacity-50 flex items-center gap-2 shadow-sm"
                >
                  {cnSubmitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Generating Credit Note...
                    </>
                  ) : (
                    <>
                      <RotateCcw size={16} /> Confirm &amp; Issue Credit Note
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
