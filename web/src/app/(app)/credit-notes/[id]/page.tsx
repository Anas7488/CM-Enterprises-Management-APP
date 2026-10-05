"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Printer, Trash2, Loader2, AlertCircle, RotateCcw, FileText } from "lucide-react";
import {
  COMPANY,
  formatCurrency,
  formatDateFormal,
  numberToWords,
} from "@/modules/invoices/data";
import { authFetch } from "@/lib/auth";

const PRINT_CSS = `
@media print {
  body > *:not(#__next), 
  aside, header, nav, 
  [data-no-print] { display: none !important; }

  main { padding: 0 !important; overflow: visible !important; }
  
  .credit-note-container {
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

interface CreditNoteItem {
  id: number;
  product_id: number;
  product_name: string;
  quantity: number | string;
  rate: number | string;
  hsn_code?: string | null;
  gst_rate: number | string;
  gst_amount: number | string;
  subtotal: number | string;
  total: number | string;
  restock_inventory: boolean;
}

interface CreditNoteDetail {
  id: number;
  credit_note_no: string;
  invoice_id: number;
  invoice_no: string;
  invoice_date?: string | null;
  customer_id: number;
  customer_name: string;
  customer_phone?: string | null;
  customer_address?: string | null;
  customer_gstin?: string | null;
  customer_area?: string | null;
  customer_area_code?: string | null;
  date: string;
  reason: string;
  subtotal: number | string;
  gst_amount: number | string;
  round_off?: number | string | null;
  total_amount: number | string;
  status: string;
  remarks?: string | null;
  item_count: number;
  created_at: string;
  items: CreditNoteItem[];
}

export default function CreditNoteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [creditNote, setCreditNote] = useState<CreditNoteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function loadCreditNote() {
      if (!params.id) return;
      try {
        setLoading(true);
        const res = await authFetch(`/credit-notes/${params.id}`);
        if (!res.ok) {
          throw new Error(`Credit Note #${params.id} not found`);
        }
        const data = await res.json();
        setCreditNote(data);
      } catch (err: any) {
        setError(err.message || "Failed to load credit note");
      } finally {
        setLoading(false);
      }
    }
    loadCreditNote();
  }, [params.id]);

  const handlePrint = () => {
    const style = document.createElement("style");
    style.textContent = PRINT_CSS;
    document.head.appendChild(style);
    window.print();
    setTimeout(() => document.head.removeChild(style), 1000);
  };

  const handleDelete = async () => {
    if (!creditNote) return;
    if (
      !window.confirm(
        `Are you sure you want to delete Credit Note ${creditNote.credit_note_no}? This will reverse the customer ledger credit and inventory adjustments.`
      )
    ) {
      return;
    }

    try {
      setDeleting(true);
      const res = await authFetch(`/credit-notes/${creditNote.id}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.detail || "Failed to delete credit note");
      }
      router.push("/invoices");
    } catch (err: any) {
      alert(err.message || "Failed to delete credit note");
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 text-[#1E3A8A] animate-spin" />
        <p className="text-sm text-muted-foreground">Loading credit note details...</p>
      </div>
    );
  }

  if (error || !creditNote) {
    return (
      <div className="max-w-md mx-auto mt-16 p-6 bg-red-500/10 border border-red-500/20 rounded-xl text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
        <h3 className="text-base font-semibold text-foreground">Error Loading Credit Note</h3>
        <p className="text-sm text-muted-foreground">{error || "Credit note not found"}</p>
        <button
          onClick={() => router.push("/invoices")}
          className="px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg"
        >
          Back to Invoices
        </button>
      </div>
    );
  }

  const subtotalNum = Number(creditNote.subtotal || 0);
  const gstNum = Number(creditNote.gst_amount || 0);
  const cgstNum = gstNum / 2;
  const sgstNum = gstNum / 2;
  const totalNum = Number(creditNote.total_amount || 0);
  const roundOffNum = Number(creditNote.round_off || 0);

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* ── Top Action Bar (No Print) ─────────────────────────────────── */}
      <div data-no-print className="flex items-center justify-between gap-4">
        <button
          onClick={() => router.push("/invoices")}
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Invoices & Credit Notes
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push(`/invoices/${creditNote.invoice_id}`)}
            className="inline-flex items-center gap-2 px-3 py-2 border border-border bg-card hover:bg-muted text-sm font-semibold rounded-lg transition-colors text-foreground"
          >
            <FileText size={15} />
            View Original Invoice
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#1E3A8A] hover:bg-[#1e40af] text-white text-sm font-semibold rounded-lg shadow-sm transition-all"
          >
            <Printer size={16} />
            Print Credit Note
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="p-2 border border-red-500/20 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
            title="Delete Credit Note"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* ── Printable Credit Note Document ──────────────────────────────── */}
      <div className="credit-note-container bg-card border border-border rounded-xl shadow-lg p-8 sm:p-12 text-foreground font-sans print:border-none print:shadow-none print:p-0">
        {/* Document Header */}
        <div className="flex justify-between items-start border-b border-border pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-6 bg-red-600 rounded-sm"></span>
              <h1 className="text-xl font-black tracking-wider text-red-600 uppercase">
                GST CREDIT NOTE / SALES RETURN
              </h1>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Issued in accordance with Section 34 of the CGST Act, 2017
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase font-bold text-muted-foreground">Credit Note No.</div>
            <div className="text-lg font-mono font-bold text-red-600">{creditNote.credit_note_no}</div>
            <div className="text-xs text-muted-foreground mt-1">
              Date: <strong className="text-foreground">{formatDateFormal(creditNote.date)}</strong>
            </div>
          </div>
        </div>

        {/* Original Invoice Reference & Reason Banner */}
        <div className="my-6 p-4 bg-muted/30 border border-border/80 rounded-xl grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <span className="text-muted-foreground block font-semibold">Original Tax Invoice:</span>
            <span className="font-mono font-bold text-[#1E3A8A] text-sm">
              {creditNote.invoice_no}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground block font-semibold">Original Invoice Date:</span>
            <span className="font-medium text-foreground">
              {creditNote.invoice_date ? formatDateFormal(creditNote.invoice_date) : "—"}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground block font-semibold">Reason for Credit Note:</span>
            <span className="font-semibold text-red-600 bg-red-500/10 px-2 py-0.5 rounded inline-block">
              {creditNote.reason}
            </span>
          </div>
        </div>

        {/* Company & Customer Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 my-6 text-xs leading-relaxed">
          {/* Seller Details */}
          <div className="border-l-2 border-[#1E3A8A] pl-4">
            <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1">
              Issued By (Supplier)
            </div>
            <div className="text-sm font-bold text-foreground">{COMPANY.name}</div>
            {COMPANY.address.map((line, i) => (
              <div key={i} className="text-muted-foreground">
                {line}
              </div>
            ))}
            <div className="mt-2 font-semibold">
              GSTIN: <span className="font-mono">{COMPANY.gstin}</span>
            </div>
            <div className="text-muted-foreground">
              State: {COMPANY.stateName} (Code {COMPANY.stateCode})
            </div>
            <div className="text-muted-foreground">Phone: {COMPANY.contact}</div>
          </div>

          {/* Buyer Details */}
          <div className="border-l-2 border-border pl-4">
            <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1">
              Credit To (Recipient / Buyer)
            </div>
            <div className="text-sm font-bold text-foreground">{creditNote.customer_name}</div>
            {creditNote.customer_address && (
              <div className="text-muted-foreground whitespace-pre-line">
                {creditNote.customer_address}
              </div>
            )}
            {creditNote.customer_area && (
              <div className="text-muted-foreground">
                Area: {creditNote.customer_area} ({creditNote.customer_area_code || "--"})
              </div>
            )}
            <div className="mt-2 font-semibold">
              GSTIN: <span className="font-mono">{creditNote.customer_gstin || "URP (Unregistered)"}</span>
            </div>
            {creditNote.customer_phone && (
              <div className="text-muted-foreground">Phone: {creditNote.customer_phone}</div>
            )}
          </div>
        </div>

        {/* Item Table */}
        <div className="my-6 overflow-hidden rounded-lg border border-border">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/60 border-b border-border font-semibold uppercase tracking-wider text-muted-foreground text-[11px]">
              <tr>
                <th className="py-2.5 px-3 w-10 text-center">#</th>
                <th className="py-2.5 px-3">Item Description</th>
                <th className="py-2.5 px-3 text-center">HSN/SAC</th>
                <th className="py-2.5 px-3 text-right">Return Qty</th>
                <th className="py-2.5 px-3 text-right">Rate (₹)</th>
                <th className="py-2.5 px-3 text-right">GST %</th>
                <th className="py-2.5 px-3 text-right">Tax (₹)</th>
                <th className="py-2.5 px-3 text-right">Total Credit (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {creditNote.items.map((item, idx) => (
                <tr key={item.id} className="hover:bg-muted/10">
                  <td className="py-2.5 px-3 text-center text-muted-foreground">{idx + 1}</td>
                  <td className="py-2.5 px-3 font-medium text-foreground">
                    <div>{item.product_name}</div>
                    {item.restock_inventory && (
                      <span className="text-[10px] text-emerald-600 font-semibold inline-flex items-center gap-1 mt-0.5">
                        <RotateCcw size={10} /> Restocked to warehouse
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono text-muted-foreground">
                    {item.hsn_code || "—"}
                  </td>
                  <td className="py-2.5 px-3 text-right font-semibold">
                    {Number(item.quantity).toLocaleString("en-IN")}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono">
                    {Number(item.rate).toFixed(2)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-semibold">{item.gst_rate}%</td>
                  <td className="py-2.5 px-3 text-right font-mono text-muted-foreground">
                    {Number(item.gst_amount).toFixed(2)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold font-mono text-foreground">
                    {Number(item.total).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Calculation Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 my-6 pt-4 border-t border-border text-xs">
          {/* Amount in words */}
          <div className="space-y-4">
            <div>
              <span className="font-bold text-muted-foreground block mb-1">
                Credit Amount in Words:
              </span>
              <p className="font-semibold italic text-foreground bg-muted/20 p-2.5 rounded-lg border border-border/60">
                {numberToWords(totalNum)}
              </p>
            </div>
            {creditNote.remarks && (
              <div>
                <span className="font-bold text-muted-foreground block mb-1">Remarks:</span>
                <p className="text-muted-foreground">{creditNote.remarks}</p>
              </div>
            )}
            <div className="text-[11px] text-muted-foreground leading-relaxed">
              <strong>Accounting Note:</strong> The credit amount has been adjusted against the buyer's outstanding balance. This credit note is valid for GST input tax reversal.
            </div>
          </div>

          {/* Numbers Summary */}
          <div className="space-y-2 max-w-xs ml-auto w-full">
            <div className="flex justify-between py-1 text-muted-foreground">
              <span>Subtotal (Tax Exclusive):</span>
              <span className="font-mono font-medium text-foreground">
                {formatCurrency(subtotalNum)}
              </span>
            </div>
            <div className="flex justify-between py-1 text-muted-foreground">
              <span>CGST:</span>
              <span className="font-mono">{formatCurrency(cgstNum)}</span>
            </div>
            <div className="flex justify-between py-1 text-muted-foreground">
              <span>SGST:</span>
              <span className="font-mono">{formatCurrency(sgstNum)}</span>
            </div>
            {roundOffNum !== 0 && (
              <div className="flex justify-between py-1 text-muted-foreground">
                <span>Round Off:</span>
                <span className="font-mono">{roundOffNum > 0 ? `+${roundOffNum}` : roundOffNum}</span>
              </div>
            )}
            <div className="flex justify-between py-2 border-t-2 border-border text-sm font-bold text-red-600">
              <span>Total Credit Amount:</span>
              <span className="font-mono text-base">{formatCurrency(totalNum)}</span>
            </div>
          </div>
        </div>

        {/* Signatures */}
        <div className="mt-12 pt-8 border-t border-border grid grid-cols-2 gap-8 text-xs text-center">
          <div>
            <div className="h-12"></div>
            <div className="border-t border-border/80 pt-2 text-muted-foreground">
              Customer / Receiver Signature
            </div>
          </div>
          <div>
            <div className="h-12 flex items-end justify-center font-bold text-xs text-[#1E3A8A]">
              For {COMPANY.name}
            </div>
            <div className="border-t border-border/80 pt-2 text-muted-foreground font-semibold">
              Authorized Signatory
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
