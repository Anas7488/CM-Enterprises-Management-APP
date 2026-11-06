"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Phone, MapPin, Loader2, AlertCircle, X } from "lucide-react";
import { authFetch } from "@/lib/auth";

const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;

interface Area {
  id: number;
  name: string;
  route?: { id: number; route_number: number; type: string };
}

interface Customer {
  id: number;
  areaCode: string;
  shopName: string;
  city: string;
  contactPerson: string;
  phone: string;
  gstin: string;
  creditLimit: number;
  outstanding: number;
}

const EMPTY_FORM = {
  shop_name: "",
  area_id: "" as number | "",
  contact_person: "",
  phone: "",
  gstin: "",
  address: "",
  credit_limit: "" as number | "",
  opening_balance: "" as number | "",
};

export default function CustomersPage() {
  const router = useRouter();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  async function loadCustomers() {
    try {
      const res = await authFetch("/customers/");
      if (!res.ok) throw new Error("Failed to load customer list from backend.");
      const data = await res.json();
      const mapped: Customer[] = data.map((c: any) => ({
        id: c.id,
        areaCode: c.area?.route?.route_number
          ? String(c.area.route.route_number).padStart(2, "0")
          : "--",
        shopName: c.shop_name,
        city: c.area?.name || "Unknown Area",
        contactPerson: c.contact_person || "N/A",
        phone: c.phone || "N/A",
        gstin: c.gstin || "N/A",
        creditLimit: Number(c.credit_limit) || 0,
        outstanding: Number(c.outstanding_balance) || 0,
      }));
      setCustomers(mapped);
    } catch (err: any) {
      setError(err.message || "Cannot connect to server. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }

  async function loadAreas() {
    try {
      const res = await authFetch("/areas/");
      if (res.ok) {
        const data = await res.json();
        setAreas(Array.isArray(data) ? data : []);
      }
    } catch {}
  }

  useEffect(() => {
    loadCustomers();
    loadAreas();
  }, []);

  // Auto-open modal when navigated with ?action=new
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("action") === "new") {
        openModal();
        window.history.replaceState(null, "", window.location.pathname);
      }
    }
  }, []);

  function openModal() {
    setForm({ ...EMPTY_FORM });
    setFormError("");
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setFormError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    if (!form.shop_name.trim()) {
      setFormError("Shop name is required.");
      return;
    }
    if (!form.area_id) {
      setFormError("Please select an area.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await authFetch("/customers/", {
        method: "POST",
        body: JSON.stringify({
          shop_name: form.shop_name.trim(),
          area_id: Number(form.area_id),
          contact_person: form.contact_person.trim() || null,
          phone: form.phone.trim() || null,
          gstin: form.gstin.trim() || null,
          address: form.address.trim() || null,
          credit_limit: form.credit_limit !== "" ? Number(form.credit_limit) : 0,
          opening_balance: form.opening_balance !== "" ? Number(form.opening_balance) : 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to create customer.");
      closeModal();
      await loadCustomers();
    } catch (err: any) {
      setFormError(err.message || "Failed to create customer.");
    } finally {
      setSubmitting(false);
    }
  }

  const filtered = customers.filter((c) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const keywords = q.split(/\s+/).filter(Boolean);
    return keywords.every(
      (kw) =>
        c.shopName.toLowerCase().includes(kw) ||
        c.city.toLowerCase().includes(kw) ||
        c.areaCode.toLowerCase().includes(kw) ||
        c.contactPerson.toLowerCase().includes(kw)
    );
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="w-8 h-8 text-[#1E3A8A] animate-spin" />
        <p className="text-sm text-muted-foreground font-medium">Loading customer directory...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 p-6 bg-red-500/5 rounded-2xl border border-red-500/10 max-w-lg mx-auto mt-12">
        <AlertCircle className="w-10 h-10 text-red-500" />
        <h3 className="text-base font-semibold text-foreground">Failed to Load Customers</h3>
        <p className="text-sm text-muted-foreground text-center">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Customers</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{customers.length} total customers</p>
        </div>
        <button
          onClick={openModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#1E3A8A] hover:bg-[#1e40af] text-white text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          Add Customer
        </button>
      </div>

      {/* ── Search ─────────────────────────────────────────────────── */}
      <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by shop name, city, area code, or contact person..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20"
          />
        </div>
      </div>

      {/* ── Customer Grid ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        {filtered.map((c) => (
          <div
            key={c.id}
            className="bg-card rounded-xl border border-border p-3 md:p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex items-start gap-1.5 mb-2">
              <span className="text-[9px] md:text-[10px] font-mono font-bold px-1 py-0.5 rounded bg-[#1E3A8A]/10 text-[#1E3A8A] flex-shrink-0 mt-0.5">
                {c.areaCode}
              </span>
              <h3 className="text-xs md:text-sm font-semibold text-foreground leading-tight line-clamp-2">
                {c.shopName}
              </h3>
            </div>
            <div className="flex items-center gap-1 text-[10px] md:text-xs text-muted-foreground mb-1 truncate">
              <MapPin size={10} className="flex-shrink-0" />
              <span className="truncate">{c.city}</span>
            </div>
            <div className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
              <Phone size={12} />
              {c.contactPerson} · {c.phone}
            </div>
            <div className="md:hidden text-[10px] text-muted-foreground mb-2 truncate">
              <Phone size={9} className="inline mr-1" />
              {c.phone}
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-border/50">
              <div>
                <p className="text-[9px] md:text-[10px] text-muted-foreground">Outstanding</p>
                <p className={`text-xs md:text-sm font-bold ${c.outstanding > 0 ? "text-red-500" : "text-emerald-600"}`}>
                  {fmt(c.outstanding)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[9px] md:text-[10px] text-muted-foreground">Credit Limit</p>
                <p className="text-xs md:text-sm font-medium text-foreground">{fmt(c.creditLimit)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-sm text-muted-foreground bg-card rounded-xl border border-border">
          No customers found matching your search.
        </div>
      )}

      {/* ── Add Customer Modal ──────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-card w-full max-w-lg rounded-2xl shadow-2xl border border-border flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
              <h2 className="text-base font-bold text-foreground">Add New Customer</h2>
              <button
                onClick={closeModal}
                className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
              {formError && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 text-xs">
                  <AlertCircle size={14} />
                  {formError}
                </div>
              )}

              {/* Shop Name */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Shop Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.shop_name}
                  onChange={(e) => setForm((f) => ({ ...f, shop_name: e.target.value }))}
                  placeholder="e.g. Raj Hardware & Paints"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20"
                />
              </div>

              {/* Area */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Area <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.area_id}
                  onChange={(e) => setForm((f) => ({ ...f, area_id: e.target.value ? Number(e.target.value) : "" }))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20"
                >
                  <option value="">Select Area</option>
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.route ? `Route ${String(a.route.route_number).padStart(2, "0")} — ` : ""}
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Contact Person & Phone */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Contact Person</label>
                  <input
                    type="text"
                    value={form.contact_person}
                    onChange={(e) => setForm((f) => ({ ...f, contact_person: e.target.value }))}
                    placeholder="Owner / Manager name"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Phone</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="10-digit mobile"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20"
                  />
                </div>
              </div>

              {/* GSTIN */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">GSTIN</label>
                <input
                  type="text"
                  value={form.gstin}
                  onChange={(e) => setForm((f) => ({ ...f, gstin: e.target.value.toUpperCase() }))}
                  placeholder="27XXXXX0000X1ZX"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 uppercase"
                />
              </div>

              {/* Address */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">Address</label>
                <textarea
                  rows={2}
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  placeholder="Shop address (optional)"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 resize-none"
                />
              </div>

              {/* Credit Limit & Opening Balance */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Credit Limit (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={form.credit_limit}
                    onChange={(e) => setForm((f) => ({ ...f, credit_limit: e.target.value ? Number(e.target.value) : "" }))}
                    placeholder="0"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Opening Balance (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={form.opening_balance}
                    onChange={(e) => setForm((f) => ({ ...f, opening_balance: e.target.value ? Number(e.target.value) : "" }))}
                    placeholder="0"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20"
                  />
                </div>
              </div>
            </form>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border flex-shrink-0">
              <button
                type="button"
                onClick={closeModal}
                disabled={submitting}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-border text-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg bg-[#1E3A8A] hover:bg-[#1e40af] text-white transition-colors disabled:opacity-60"
              >
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                {submitting ? "Creating..." : "Add Customer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
