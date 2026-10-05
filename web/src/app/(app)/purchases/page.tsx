"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Truck,
  Building2,
  Search,
  Plus,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Eye,
  Trash2,
  Loader2,
  RefreshCw,
  Phone,
  Mail,
  MapPin,
  X,
  Package,
  FileText,
} from "lucide-react";
import { KpiCard } from "@/shared/ui/KpiCard";
import { formatCurrencyShort, formatDate } from "@/modules/invoices/data";
import { authFetch } from "@/lib/auth";

const fmt = (n: number | string) =>
  `₹${Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

interface VendorItem {
  id: number;
  name: string;
  contact_person?: string | null;
  phone?: string | null;
  email?: string | null;
  gstin?: string | null;
  address?: string | null;
  state_name: string;
  state_code: string;
  opening_balance: number | string;
  outstanding_payable: number | string;
  is_active: boolean;
  created_at: string;
}

interface DebitNoteListItem {
  id: number;
  debit_note_no: string;
  vendor_id: number;
  vendor_name: string;
  vendor_phone?: string | null;
  purchase_bill_no?: string | null;
  purchase_bill_date?: string | null;
  date: string;
  reason: string;
  subtotal: number | string;
  gst_amount: number | string;
  total_amount: number | string;
  status: string;
  item_count: number;
  created_at: string;
}

interface CatalogProduct {
  id: number;
  display_name: string;
  mrp: number;
  dealer_price?: number;
  effective_hsn?: string;
  effective_gst_rate?: number;
  stock: number;
  unit: string;
}

interface DebitNoteDraftLine {
  id: string;
  product_id?: number | null;
  custom_name: string;
  quantity: number;
  rate: number;
  gst_rate: number;
  hsn_code: string;
  deduct_inventory: boolean;
}

export default function PurchasesPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"debit_notes" | "vendors">("debit_notes");

  // State
  const [debitNotes, setDebitNotes] = useState<DebitNoteListItem[]>([]);
  const [vendors, setVendors] = useState<VendorItem[]>([]);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState("");

  // ── Create Vendor Modal State ───────────────────────────────────────────
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [vendorName, setVendorName] = useState("");
  const [vendorContact, setVendorContact] = useState("");
  const [vendorPhone, setVendorPhone] = useState("");
  const [vendorEmail, setVendorEmail] = useState("");
  const [vendorGstin, setVendorGstin] = useState("");
  const [vendorAddress, setVendorAddress] = useState("");
  const [vendorOpening, setVendorOpening] = useState("0");
  const [vendorSaving, setVendorSaving] = useState(false);
  const [vendorError, setVendorError] = useState("");

  // ── Manual Issue Debit Note Modal State ──────────────────────────────────
  const [showDnModal, setShowDnModal] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState<number | "">("");
  const [refBillNo, setRefBillNo] = useState("");
  const [refBillDate, setRefBillDate] = useState("");
  const [dnDate, setDnDate] = useState(new Date().toISOString().split("T")[0]);
  const [dnReason, setDnReason] = useState("Purchase Return / Damaged Stock");
  const [dnRemarks, setDnRemarks] = useState("");
  const [dnLines, setDnLines] = useState<DebitNoteDraftLine[]>([]);
  const [dnSaving, setDnSaving] = useState(false);
  const [dnError, setDnError] = useState("");

  // Load All Data
  const loadData = async () => {
    try {
      setError("");
      setLoading(true);
      const [dnRes, vRes, pRes] = await Promise.all([
        authFetch("/debit-notes/"),
        authFetch("/vendors/"),
        authFetch("/products/"),
      ]);

      if (dnRes.ok) {
        const data = await dnRes.json();
        setDebitNotes(data || []);
      }
      if (vRes.ok) {
        const data = await vRes.json();
        setVendors(data || []);
      }
      if (pRes.ok) {
        const data = await pRes.json();
        setProducts(
          (data || []).map((p: any) => ({
            id: p.id,
            display_name: p.display_name,
            mrp: Number(p.mrp) || 0,
            dealer_price: p.dealer_price != null ? Number(p.dealer_price) : undefined,
            effective_hsn: p.effective_hsn || "",
            effective_gst_rate: Number(p.effective_gst_rate ?? 18),
            stock: Number(p.stock || 0),
            unit: p.unit || "PCS",
          }))
        );
      }
    } catch (err: any) {
      setError(err.message || "Failed to load purchases data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // ── Open Issue Debit Note Modal ──────────────────────────────────────────
  const handleOpenDebitNoteModal = (vendorId?: number) => {
    setDnError("");
    setRefBillNo("");
    setRefBillDate("");
    setDnRemarks("");
    setDnDate(new Date().toISOString().split("T")[0]);
    setDnReason("Purchase Return / Damaged Stock");
    setSelectedVendorId(vendorId || (vendors[0]?.id ?? ""));

    // Initialize with 1 empty line
    const firstProduct = products[0];
    setDnLines([
      {
        id: "line-" + Date.now(),
        product_id: firstProduct?.id || null,
        custom_name: firstProduct?.display_name || "",
        quantity: 1,
        rate: firstProduct?.dealer_price || firstProduct?.mrp || 100,
        gst_rate: firstProduct?.effective_gst_rate || 18,
        hsn_code: firstProduct?.effective_hsn || "32089090",
        deduct_inventory: true,
      },
    ]);
    setShowDnModal(true);
  };

  const handleAddLine = () => {
    const firstProduct = products[0];
    setDnLines((prev) => [
      ...prev,
      {
        id: "line-" + Date.now() + Math.random(),
        product_id: firstProduct?.id || null,
        custom_name: firstProduct?.display_name || "",
        quantity: 1,
        rate: firstProduct?.dealer_price || firstProduct?.mrp || 100,
        gst_rate: firstProduct?.effective_gst_rate || 18,
        hsn_code: firstProduct?.effective_hsn || "32089090",
        deduct_inventory: true,
      },
    ]);
  };

  const handleRemoveLine = (id: string) => {
    if (dnLines.length <= 1) return;
    setDnLines((prev) => prev.filter((l) => l.id !== id));
  };

  const handleProductSelect = (lineId: string, prodId: number) => {
    const prod = products.find((p) => p.id === prodId);
    if (!prod) return;
    setDnLines((prev) =>
      prev.map((l) =>
        l.id === lineId
          ? {
              ...l,
              product_id: prod.id,
              custom_name: prod.display_name,
              rate: prod.dealer_price || prod.mrp || 100,
              gst_rate: prod.effective_gst_rate || 18,
              hsn_code: prod.effective_hsn || "32089090",
            }
          : l
      )
    );
  };

  const handleLineUpdate = (lineId: string, field: keyof DebitNoteDraftLine, value: any) => {
    setDnLines((prev) =>
      prev.map((l) => (l.id === lineId ? { ...l, [field]: value } : l))
    );
  };

  // Live Debit Note Calculations
  const dnCalculatedTotal = useMemo(() => {
    let sub = 0;
    let gst = 0;
    for (const l of dnLines) {
      if (l.quantity > 0 && l.rate > 0) {
        const lineSub = l.quantity * l.rate;
        const lineGst = lineSub * (l.gst_rate / 100);
        sub += lineSub;
        gst += lineGst;
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
  }, [dnLines]);

  // Submit Debit Note
  const handleSubmitDebitNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVendorId) {
      setDnError("Please select a vendor.");
      return;
    }
    if (dnLines.length === 0) {
      setDnError("Please add at least one item to return.");
      return;
    }
    for (const l of dnLines) {
      if (l.quantity <= 0) {
        setDnError("Item return quantity must be greater than 0.");
        return;
      }
      if (l.rate <= 0) {
        setDnError("Item rate must be greater than 0.");
        return;
      }
    }

    try {
      setDnSaving(true);
      setDnError("");

      const payload = {
        vendor_id: Number(selectedVendorId),
        purchase_bill_no: refBillNo.trim() || null,
        purchase_bill_date: refBillDate || null,
        date: dnDate,
        reason: dnReason,
        remarks: dnRemarks.trim() || null,
        items: dnLines.map((l) => ({
          product_id: l.product_id,
          custom_item_name: !l.product_id ? l.custom_name : null,
          quantity: l.quantity,
          rate: l.rate,
          gst_rate: l.gst_rate,
          hsn_code: l.hsn_code || null,
          deduct_inventory: l.deduct_inventory,
        })),
      };

      const res = await authFetch("/debit-notes/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Failed to create debit note");
      }

      const newDn = await res.json();
      setShowDnModal(false);
      loadData();
      router.push(`/debit-notes/${newDn.id}`);
    } catch (err: any) {
      setDnError(err.message || "Failed to create debit note");
    } finally {
      setDnSaving(false);
    }
  };

  // Submit Add Vendor
  const handleSaveVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorName.trim()) {
      setVendorError("Vendor name is required.");
      return;
    }

    try {
      setVendorSaving(true);
      setVendorError("");

      const payload = {
        name: vendorName.trim(),
        contact_person: vendorContact.trim() || null,
        phone: vendorPhone.trim() || null,
        email: vendorEmail.trim() || null,
        gstin: vendorGstin.trim().toUpperCase() || null,
        address: vendorAddress.trim() || null,
        opening_balance: parseFloat(vendorOpening) || 0,
      };

      const res = await authFetch("/vendors/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Failed to create vendor");
      }

      const created = await res.json();
      setShowVendorModal(false);
      setVendorName("");
      setVendorContact("");
      setVendorPhone("");
      setVendorEmail("");
      setVendorGstin("");
      setVendorAddress("");
      setVendorOpening("0");
      loadData();
      if (showDnModal) {
        setSelectedVendorId(created.id);
      }
    } catch (err: any) {
      setVendorError(err.message || "Failed to create vendor");
    } finally {
      setVendorSaving(false);
    }
  };

  // Delete Debit Note
  const handleDeleteDebitNote = async (dn: DebitNoteListItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (
      !window.confirm(
        `Are you sure you want to delete Debit Note ${dn.debit_note_no}? This will restore the vendor payable balance and inventory.`
      )
    ) {
      return;
    }
    try {
      const res = await authFetch(`/debit-notes/${dn.id}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.detail || "Failed to delete debit note");
      }
      setDebitNotes((prev) => prev.filter((item) => item.id !== dn.id));
    } catch (err: any) {
      alert(err.message || "Could not delete debit note");
    }
  };

  // Filtered Debit Notes
  const filteredDebitNotes = useMemo(() => {
    return debitNotes.filter((dn) => {
      const q = searchTerm.toLowerCase();
      return (
        !searchTerm.trim() ||
        dn.debit_note_no.toLowerCase().includes(q) ||
        dn.vendor_name.toLowerCase().includes(q) ||
        (dn.purchase_bill_no && dn.purchase_bill_no.toLowerCase().includes(q)) ||
        dn.reason.toLowerCase().includes(q)
      );
    });
  }, [debitNotes, searchTerm]);

  // Filtered Vendors
  const filteredVendors = useMemo(() => {
    return vendors.filter((v) => {
      const q = searchTerm.toLowerCase();
      return (
        !searchTerm.trim() ||
        v.name.toLowerCase().includes(q) ||
        (v.contact_person && v.contact_person.toLowerCase().includes(q)) ||
        (v.phone && v.phone.includes(q)) ||
        (v.gstin && v.gstin.toLowerCase().includes(q))
      );
    });
  }, [vendors, searchTerm]);

  // KPIs
  const totalDebited = useMemo(
    () => debitNotes.reduce((sum, dn) => sum + Number(dn.total_amount || 0), 0),
    [debitNotes]
  );
  const totalPayable = useMemo(
    () => vendors.reduce((sum, v) => sum + Number(v.outstanding_payable || 0), 0),
    [vendors]
  );

  return (
    <div className="space-y-6">
      {/* ── Page Header ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Purchases &amp; Debit Notes
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage Suppliers/Vendors, issue Manual &amp; Direct Debit Notes, and track stock returns.
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
            onClick={() => setShowVendorModal(true)}
            className="flex items-center gap-2 border border-border bg-card hover:bg-muted text-foreground text-sm font-semibold px-4 py-2 rounded-lg transition-all"
          >
            <Building2 size={16} />
            Add Vendor
          </button>
          <button
            onClick={() => handleOpenDebitNoteModal()}
            className="flex items-center gap-2 bg-[#1E3A8A] hover:bg-[#1e40af] text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm transition-all"
          >
            <Plus size={16} />
            Issue Debit Note
          </button>
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-border pb-1">
        <button
          onClick={() => {
            setActiveTab("debit_notes");
            setSearchTerm("");
          }}
          className={`flex items-center gap-2 px-5 py-2.5 text-sm font-bold border-b-2 transition-all ${
            activeTab === "debit_notes"
              ? "border-[#1E3A8A] text-[#1E3A8A]"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <RotateCcw size={16} />
          Debit Notes (Purchase Returns)
          <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-[#1E3A8A]/10 text-[#1E3A8A]">
            {debitNotes.length}
          </span>
        </button>

        <button
          onClick={() => {
            setActiveTab("vendors");
            setSearchTerm("");
          }}
          className={`flex items-center gap-2 px-5 py-2.5 text-sm font-bold border-b-2 transition-all ${
            activeTab === "vendors"
              ? "border-[#1E3A8A] text-[#1E3A8A]"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Building2 size={16} />
          Vendors / Suppliers
          <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-muted text-foreground">
            {vendors.length}
          </span>
        </button>
      </div>

      {/* ── KPI Cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          icon={RotateCcw}
          label="Total Debit Notes"
          value={formatCurrencyShort(totalDebited)}
          sub={`${debitNotes.length} returns issued to vendors`}
          trend="Returns"
          trendUp={true}
          color="bg-[#1E3A8A]"
        />
        <KpiCard
          icon={Building2}
          label="Active Vendors"
          value={String(vendors.length)}
          sub="Registered suppliers"
          trend="Suppliers"
          trendUp={true}
          color="bg-emerald-600"
        />
        <KpiCard
          icon={Truck}
          label="Outstanding Payable"
          value={formatCurrencyShort(totalPayable)}
          sub="Total balance owed to vendors"
          trend={totalPayable > 0 ? "Pending" : "Clear"}
          trendUp={totalPayable === 0}
          color="bg-amber-500"
        />
      </div>

      {/* ── Tab 1: Debit Notes ───────────────────────────────────── */}
      {activeTab === "debit_notes" && (
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
                placeholder="Search by DN #, vendor, or bill ref..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-background border border-border rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/40 transition-all placeholder:text-muted-foreground"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="w-8 h-8 text-[#1E3A8A] animate-spin" />
                <p className="text-sm text-muted-foreground">Loading debit notes...</p>
              </div>
            ) : (
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-muted/50 border-b border-border text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  <tr>
                    <th className="px-6 py-3">Debit Note No.</th>
                    <th className="px-6 py-3">Vendor / Supplier</th>
                    <th className="px-6 py-3">Ref Bill No.</th>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Reason</th>
                    <th className="px-6 py-3 text-right">GST Reversed</th>
                    <th className="px-6 py-3 text-right">Total Debit Amount</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filteredDebitNotes.length > 0 ? (
                    filteredDebitNotes.map((dn) => (
                      <tr
                        key={dn.id}
                        onClick={() => router.push(`/debit-notes/${dn.id}`)}
                        className="cursor-pointer hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <span className="font-bold font-mono text-[#1E3A8A] text-xs">
                            {dn.debit_note_no}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-semibold text-foreground text-xs">
                            {dn.vendor_name}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-mono text-muted-foreground">
                            {dn.purchase_bill_no || "Manual"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs text-muted-foreground">
                            {formatDate(dn.date)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs text-foreground bg-muted/40 px-2 py-1 rounded-md">
                            {dn.reason}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-xs text-muted-foreground">
                            {fmt(dn.gst_amount)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="font-bold text-[#1E3A8A] text-xs">
                            {fmt(dn.total_amount)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div
                            className="inline-flex items-center gap-1.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => router.push(`/debit-notes/${dn.id}`)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#1E3A8A] hover:bg-[#1E3A8A]/10 rounded-md transition-colors"
                              title="View and Print Debit Note"
                            >
                              <Eye size={13} />
                              <span>View</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleDeleteDebitNote(dn, e)}
                              className="p-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-500/10 rounded-md transition-colors"
                              title="Delete Debit Note"
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
                          ? "No debit notes match your search."
                          : "No debit notes recorded yet. Click 'Issue Debit Note' to record a purchase return."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── Tab 2: Vendors / Suppliers ───────────────────────────── */}
      {activeTab === "vendors" && (
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
                placeholder="Search vendors by name, GSTIN, phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-background border border-border rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/40 transition-all placeholder:text-muted-foreground"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="w-8 h-8 text-[#1E3A8A] animate-spin" />
                <p className="text-sm text-muted-foreground">Loading vendors...</p>
              </div>
            ) : (
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-muted/50 border-b border-border text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  <tr>
                    <th className="px-6 py-3">Vendor / Company Name</th>
                    <th className="px-6 py-3">Contact Person</th>
                    <th className="px-6 py-3">Phone &amp; Email</th>
                    <th className="px-6 py-3">GSTIN</th>
                    <th className="px-6 py-3">Location</th>
                    <th className="px-6 py-3 text-right">Outstanding Payable</th>
                    <th className="px-6 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filteredVendors.length > 0 ? (
                    filteredVendors.map((v) => (
                      <tr key={v.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4">
                          <span className="font-bold text-foreground text-xs block">
                            {v.name}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs text-muted-foreground">
                            {v.contact_person || "—"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col text-xs text-muted-foreground">
                            {v.phone && <span>{v.phone}</span>}
                            {v.email && <span className="text-[11px] text-muted-foreground/80">{v.email}</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-mono text-xs text-foreground">
                            {v.gstin || "—"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs text-muted-foreground">
                            {v.state_name} ({v.state_code})
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="font-bold text-foreground text-xs">
                            {fmt(v.outstanding_payable)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleOpenDebitNoteModal(v.id)}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-[#1E3A8A]/10 text-[#1E3A8A] hover:bg-[#1E3A8A]/20 text-xs font-semibold rounded-md transition-colors"
                          >
                            <RotateCcw size={12} /> Return Items
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-6 py-12 text-center text-muted-foreground text-sm"
                      >
                        {searchTerm
                          ? "No vendors match your search."
                          : "No vendors registered yet. Click 'Add Vendor' to add suppliers like Indo Paints."}
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
          Manual / Direct Issue Debit Note Modal
          ═══════════════════════════════════════════════════════════════════ */}
      {showDnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[94vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-border bg-muted/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#1E3A8A]/10 flex items-center justify-center text-[#1E3A8A]">
                  <RotateCcw size={20} />
                </div>
                <div>
                  <h2 className="font-bold text-foreground text-base">Issue Debit Note (Purchase Return)</h2>
                  <p className="text-xs text-muted-foreground">
                    Direct / manual entry: return damaged goods, reverse GST, adjust vendor payable &amp; deduct warehouse stock.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDnModal(false)}
                className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitDebitNote} className="flex-1 overflow-y-auto p-6 space-y-5">
              {dnError && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-600">
                  <AlertTriangle size={16} /> {dnError}
                </div>
              )}

              {/* Vendor & Reference Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">
                      Vendor / Supplier <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowVendorModal(true)}
                      className="text-[11px] text-[#1E3A8A] hover:underline font-bold"
                    >
                      + New Vendor
                    </button>
                  </div>
                  <select
                    value={selectedVendorId}
                    onChange={(e) => setSelectedVendorId(Number(e.target.value))}
                    className="w-full px-3 py-2.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/30 font-medium"
                    required
                  >
                    <option value="" disabled>-- Select Vendor --</option>
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} {v.gstin ? `(${v.gstin})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                    Vendor Ref Bill No. (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. IP-1044 / Leave blank"
                    value={refBillNo}
                    onChange={(e) => setRefBillNo(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/30 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                    Debit Note Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={dnDate}
                    onChange={(e) => setDnDate(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/30"
                    required
                  />
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                  Reason for Debit Note / Return <span className="text-red-500">*</span>
                </label>
                <select
                  value={dnReason}
                  onChange={(e) => setDnReason(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/30 font-medium"
                  required
                >
                  <option value="Purchase Return / Damaged Stock">Damaged in Transit / Factory Defect</option>
                  <option value="Wrong Product Received">Wrong Product / Shade Delivered by Factory</option>
                  <option value="Quality Rejection">Quality Rejection / Leakage</option>
                  <option value="Customer Excess Stock Return">Excess Stock Sent Back to Factory</option>
                  <option value="Rate / Price Difference">Rate Difference / Scheme Credit</option>
                  <option value="Other">Other Adjustment</option>
                </select>
              </div>

              {/* Items Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Returned Items
                  </span>
                  <button
                    type="button"
                    onClick={handleAddLine}
                    className="inline-flex items-center gap-1 text-xs text-[#1E3A8A] font-bold hover:underline"
                  >
                    <Plus size={14} /> Add Another Item
                  </button>
                </div>

                <div className="border border-border rounded-xl overflow-hidden bg-card">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/50 border-b border-border font-semibold text-muted-foreground uppercase text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3">Item / Catalog Product</th>
                        <th className="py-2.5 px-3 w-28">HSN</th>
                        <th className="py-2.5 px-3 text-right w-24">Return Qty</th>
                        <th className="py-2.5 px-3 text-right w-28">Purchase Rate (₹)</th>
                        <th className="py-2.5 px-3 text-right w-20">GST %</th>
                        <th className="py-2.5 px-3 text-center w-28">Deduct Stock?</th>
                        <th className="py-2.5 px-3 text-right w-28">Total (₹)</th>
                        <th className="py-2.5 px-2 w-10 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {dnLines.map((l) => {
                        const lineSub = l.quantity * l.rate;
                        const lineTotal = lineSub * (1 + l.gst_rate / 100);

                        return (
                          <tr key={l.id}>
                            <td className="py-2.5 px-3">
                              <select
                                value={l.product_id || ""}
                                onChange={(e) => handleProductSelect(l.id, Number(e.target.value))}
                                className="w-full px-2 py-1 text-xs bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-[#1E3A8A] font-medium"
                              >
                                {products.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.display_name} (Stock: {p.stock} {p.unit})
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="py-2.5 px-3">
                              <input
                                type="text"
                                value={l.hsn_code}
                                onChange={(e) => handleLineUpdate(l.id, "hsn_code", e.target.value)}
                                className="w-full px-2 py-1 text-xs font-mono bg-background border border-border rounded"
                                placeholder="32089090"
                              />
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <input
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={l.quantity}
                                onChange={(e) =>
                                  handleLineUpdate(l.id, "quantity", parseFloat(e.target.value) || 0)
                                }
                                className="w-20 px-2 py-1 text-right text-xs bg-background border border-border rounded font-bold"
                              />
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <input
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={l.rate}
                                onChange={(e) =>
                                  handleLineUpdate(l.id, "rate", parseFloat(e.target.value) || 0)
                                }
                                className="w-24 px-2 py-1 text-right text-xs bg-background border border-border rounded font-mono"
                              />
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <select
                                value={l.gst_rate}
                                onChange={(e) =>
                                  handleLineUpdate(l.id, "gst_rate", parseFloat(e.target.value) || 0)
                                }
                                className="px-2 py-1 text-xs bg-background border border-border rounded font-bold"
                              >
                                {[0, 5, 12, 18, 28].map((r) => (
                                  <option key={r} value={r}>
                                    {r}%
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <label className="inline-flex items-center gap-1 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={l.deduct_inventory}
                                  onChange={(e) =>
                                    handleLineUpdate(l.id, "deduct_inventory", e.target.checked)
                                  }
                                  className="rounded border-border text-[#1E3A8A] focus:ring-[#1E3A8A]"
                                />
                                <span className="text-[10px] text-muted-foreground">Yes</span>
                              </label>
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold font-mono text-[#1E3A8A]">
                              {fmt(lineTotal)}
                            </td>
                            <td className="py-2.5 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveLine(l.id)}
                                disabled={dnLines.length <= 1}
                                className="text-muted-foreground hover:text-red-500 disabled:opacity-30 p-1"
                              >
                                <X size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Calculation Box */}
                <div className="bg-muted/30 border border-border rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>
                      Tax Subtotal: <strong className="text-foreground">{fmt(dnCalculatedTotal.subtotal)}</strong>
                    </div>
                    <div>
                      GST Reversal: <strong className="text-foreground">{fmt(dnCalculatedTotal.gstAmount)}</strong>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs uppercase font-bold text-muted-foreground">
                      Total Debit Amount
                    </div>
                    <div className="text-xl font-bold font-mono text-[#1E3A8A]">
                      {fmt(dnCalculatedTotal.total)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                  Internal Notes / Remarks (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 10 damaged cans sent back via transport lorry #KA-04-1234"
                  value={dnRemarks}
                  onChange={(e) => setDnRemarks(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/30"
                />
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowDnModal(false)}
                  className="px-4 py-2.5 text-sm font-medium rounded-lg border border-border hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={dnSaving || dnCalculatedTotal.total <= 0 || !selectedVendorId}
                  className="px-6 py-2.5 bg-[#1E3A8A] hover:bg-[#1e40af] text-white text-sm font-bold rounded-lg transition-all disabled:opacity-50 flex items-center gap-2 shadow-sm"
                >
                  {dnSaving ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Generating Debit Note...
                    </>
                  ) : (
                    <>
                      <RotateCcw size={16} /> Confirm &amp; Issue Debit Note
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          Add Vendor Modal
          ═══════════════════════════════════════════════════════════════════ */}
      {showVendorModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-5 border-b border-border bg-muted/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                  <Building2 size={20} />
                </div>
                <div>
                  <h2 className="font-bold text-foreground text-base">Add New Vendor / Supplier</h2>
                  <p className="text-xs text-muted-foreground">
                    Register paint manufacturers, packaging vendors, or raw material suppliers.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowVendorModal(false)}
                className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveVendor} className="flex-1 overflow-y-auto p-6 space-y-4">
              {vendorError && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-600">
                  <AlertTriangle size={16} /> {vendorError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                  Vendor / Company Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Indo Paints Manufacturing Co."
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/30 font-semibold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Factory Dispatch Manager"
                    value={vendorContact}
                    onChange={(e) => setVendorContact(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 9845012345"
                    value={vendorPhone}
                    onChange={(e) => setVendorPhone(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                    GSTIN
                  </label>
                  <input
                    type="text"
                    maxLength={15}
                    placeholder="e.g. 29AAACI1234F1Z9"
                    value={vendorGstin}
                    onChange={(e) => setVendorGstin(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/30 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                    Email (Optional)
                  </label>
                  <input
                    type="email"
                    placeholder="dispatch@vendor.com"
                    value={vendorEmail}
                    onChange={(e) => setVendorEmail(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                  Address / Factory Location
                </label>
                <textarea
                  rows={2}
                  placeholder="Plot No., Industrial Area, City, State"
                  value={vendorAddress}
                  onChange={(e) => setVendorAddress(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/30"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                  Opening Balance Payable (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={vendorOpening}
                  onChange={(e) => setVendorOpening(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/30"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowVendorModal(false)}
                  className="px-4 py-2 text-sm font-medium rounded-lg border border-border hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={vendorSaving}
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-lg transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {vendorSaving ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Saving Vendor...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} /> Save Vendor
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
