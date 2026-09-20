"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Printer, Trash2, Loader2, AlertCircle, FileText } from "lucide-react";
import {
  COMPANY,
  formatCurrency,
  formatDateFormal,
  numberToWords,
} from "@/modules/invoices/data";
import { authFetch } from "@/lib/auth";

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
                <h2 className="text-sm font-extrabold text-gray-900 tracking-wide">
                  {COMPANY.name}
                </h2>
                {COMPANY.address.map((line, i) => (
                  <p key={i} className="text-[10px] text-gray-600 leading-tight">
                    {line}
                  </p>
                ))}
                <p className="text-[10px] text-gray-600 mt-0.5">GSTIN/UIN: {COMPANY.gstin}</p>
                <p className="text-[10px] text-gray-600">
                  State Name: {COMPANY.stateName}, Code: {COMPANY.stateCode}
                </p>
                <p className="text-[10px] text-gray-600">Contact: {COMPANY.contact}</p>
              </div>
            </div>
          </div>

          {/* Invoice Meta Grid */}
          <div className="text-[10px]">
            <div className="grid grid-cols-2">
              <div className="p-2 border-b border-r border-gray-200">
                <span className="text-gray-500 block">Invoice No.</span>
                <p className="font-bold text-gray-900 text-xs">{invoice.invoice_no}</p>
              </div>
              <div className="p-2 border-b border-gray-200">
                <span className="text-gray-500 block">Dated</span>
                <p className="font-bold text-gray-900 text-xs">
                  {formatDateFormal(invoice.date)}
                </p>
              </div>
              <div className="p-2 border-b border-r border-gray-200">
                <span className="text-gray-500 block">Due Date</span>
                <p className="font-semibold text-gray-900">
                  {formatDateFormal(invoice.due_date)}
                </p>
              </div>
              <div className="p-2 border-b border-gray-200">
                <span className="text-gray-500 block">Order Ref.</span>
                <p className="font-semibold text-[#1E3A8A]">
                  {invoice.order_no || "—"}
                </p>
              </div>
              <div className="p-2 border-b border-r border-gray-200">
                <span className="text-gray-500 block">Payment Status</span>
                <p className="font-bold text-emerald-700 uppercase">{invoice.status}</p>
              </div>
              <div className="p-2 border-b border-gray-200">
                <span className="text-gray-500 block">Place of Supply</span>
                <p className="font-medium text-gray-800">Karnataka (29)</p>
              </div>
            </div>
            {invoice.remarks && (
              <div className="p-2">
                <span className="text-gray-500 block">Remarks / Delivery Note:</span>
                <p className="text-gray-800 font-medium">{invoice.remarks}</p>
              </div>
            )}
          </div>
        </div>

        {/* Buyer Info */}
        <div className="p-4 border-b border-gray-300">
          <p className="text-[10px] text-gray-500 mb-0.5">Billed To (Buyer):</p>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-extrabold text-gray-900">
                {invoice.customer_area_code ? `Area ${invoice.customer_area_code} • ` : ""}
                {invoice.customer_name}
              </p>
              {invoice.customer_area && (
                <p className="text-[10px] text-[#1E3A8A] font-semibold">
                  {invoice.customer_area}
                </p>
              )}
              {invoice.customer_address && (
                <p className="text-[10px] text-gray-700 leading-relaxed max-w-md">
                  {invoice.customer_address}
                </p>
              )}
            </div>
            <div className="text-right text-[10px] space-y-0.5">
              {invoice.customer_contact && (
                <p className="text-gray-600">Contact: {invoice.customer_contact}</p>
              )}
              {invoice.customer_phone && (
                <p className="text-gray-600">Phone: {invoice.customer_phone}</p>
              )}
              <p className="text-gray-600">
                GSTIN: {invoice.customer_gstin || "URP / Unregistered"}
              </p>
            </div>
          </div>
        </div>

        {/* ── Line Items Table ─────────────────────────────────────── */}
        <div>
          <table className="w-full text-left text-[11px] border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-300 text-[10px] font-bold text-gray-700 uppercase">
                <th className="px-2 py-2 text-center border-r border-gray-200 w-8">#</th>
                <th className="px-3 py-2 border-r border-gray-200">Description of Goods</th>
                <th className="px-2 py-2 text-center border-r border-gray-200 w-16">HSN/SAC</th>
                <th className="px-2 py-2 text-center border-r border-gray-200 w-16">Qty</th>
                <th className="px-2 py-2 text-right border-r border-gray-200 w-20">Rate (₹)</th>
                <th className="px-2 py-2 text-center border-r border-gray-200 w-10">Unit</th>
                <th className="px-2 py-2 text-center border-r border-gray-200 w-14">Disc %</th>
                <th className="px-2 py-2 text-center border-r border-gray-200 w-14">GST %</th>
                <th className="px-3 py-2 text-right w-24">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, idx) => (
                <tr key={idx} className="border-b border-gray-100">
                  <td className="px-2 py-2 text-center border-r border-gray-200 text-gray-500">
                    {idx + 1}
                  </td>
                  <td className="px-3 py-2 border-r border-gray-200 font-semibold text-gray-900">
                    {item.product_name}
                  </td>
                  <td className="px-2 py-2 text-center border-r border-gray-200 text-gray-600">
                    {item.hsn_code || "3208"}
                  </td>
                  <td className="px-2 py-2 text-center border-r border-gray-200 text-gray-700 font-medium">
                    {item.quantity}
                  </td>
                  <td className="px-2 py-2 text-right border-r border-gray-200 text-gray-700">
                    {Number(item.rate).toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                  <td className="px-2 py-2 text-center border-r border-gray-200 text-gray-500">
                    {item.unit}
                  </td>
                  <td className="px-2 py-2 text-center border-r border-gray-200 text-gray-600">
                    {Number(item.discount_pct) > 0 ? `${item.discount_pct}%` : "—"}
                  </td>
                  <td className="px-2 py-2 text-center border-r border-gray-200 text-gray-600">
                    {Number(item.gst_rate) > 0 ? `${item.gst_rate}%` : "0% (W.O)"}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold text-gray-900">
                    {Number(item.total).toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                </tr>
              ))}

              {/* Subtotal */}
              <tr className="border-t border-gray-200">
                <td colSpan={3} className="px-3 py-1 border-r border-gray-200 font-bold text-right text-gray-700">
                  Subtotal (Pre-tax)
                </td>
                <td className="px-2 py-1 text-center border-r border-gray-200 font-bold">
                  {totalQty}
                </td>
                <td colSpan={4} className="border-r border-gray-200"></td>
                <td className="px-3 py-1 text-right font-bold text-gray-900">
                  {subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </td>
              </tr>

              {/* Extra Invoice Discount */}
              {extraDiscount > 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-0.5 border-r border-gray-200 text-right font-bold text-emerald-700 italic">
                    Less: Extra Discount
                  </td>
                  <td className="px-3 py-0.5 text-right text-emerald-700 font-semibold">
                    - {extraDiscount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              )}

              {/* CGST */}
              {cgstAmount > 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-0.5 border-r border-gray-200 text-right font-bold text-gray-700 italic">
                    CGST
                  </td>
                  <td className="px-3 py-0.5 text-right text-gray-800">
                    {cgstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              )}

              {/* SGST */}
              {sgstAmount > 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-0.5 border-r border-gray-200 text-right font-bold text-gray-700 italic">
                    SGST
                  </td>
                  <td className="px-3 py-0.5 text-right text-gray-800">
                    {sgstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              )}
            </tbody>

            {/* Total Row */}
            <tfoot>
              <tr className="border-t-2 border-gray-800 bg-gray-50">
                <td colSpan={3} className="px-3 py-2 border-r border-gray-200 text-right font-bold text-gray-900">
                  Grand Total
                </td>
                <td className="px-2 py-2 text-center border-r border-gray-200 font-bold text-gray-900">
                  {totalQty} {mainUnit}
                </td>
                <td colSpan={4} className="border-r border-gray-200"></td>
                <td className="px-3 py-2 text-right font-extrabold text-gray-900 text-sm">
                  {formatCurrency(totalAmount)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Amount in Words */}
        <div className="px-4 py-2 border-t border-b border-gray-300 bg-gray-50/50">
          <p className="text-[10px] text-gray-500">Amount Chargeable (in words)</p>
          <p className="text-xs font-bold text-gray-900">
            {numberToWords(totalAmount)}
          </p>
        </div>

        {/* ── Footer: Declaration + Bank + Signature ───────────────── */}
        <div className="border-t border-gray-300">
          <div className="grid grid-cols-2">
            {/* Left: Declaration + Terms */}
            <div className="p-4 border-r border-gray-300 text-[9px] text-gray-600 leading-relaxed">
              <p className="font-bold text-gray-700 text-[10px] mb-1 underline">Declaration</p>
              <p>
                We declare that this invoice shows the actual price of the goods described
                and that all particulars are true and correct.
              </p>

              <p className="font-bold text-gray-700 text-[10px] mt-2 mb-0.5">
                TERMS &amp; CONDITIONS:
              </p>
              <p>1. Goods once sold won&apos;t be taken back.</p>
              <p>2. Credit Limit 28 Days Only.</p>
              <p>3. Subjected to Karnataka Jurisdiction only.</p>
            </div>

            {/* Right: Bank + Signature */}
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
      </div>
    </div>
  );
}
