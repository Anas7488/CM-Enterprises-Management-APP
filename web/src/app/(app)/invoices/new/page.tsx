"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Search,
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  MapPin,
  Phone,
  FileText,
  Calendar,
  DollarSign,
  Package,
  Info,
  ChevronDown,
  X,
} from "lucide-react";
import { authFetch } from "@/lib/auth";

// ─── Formatters ──────────────────────────────────────────────────────────────
const fmt = (n: number | string) =>
  `₹${Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

// ─── Types ───────────────────────────────────────────────────────────────────
interface AreaInfo {
  id: number;
  name: string;
  route?: {
    id: number;
    route_number: number;
    type: string;
  };
}

interface CustomerOption {
  id: number;
  shop_name: string;
  contact_person?: string;
  phone?: string;
  address?: string;
  gstin?: string;
  credit_limit?: number;
  outstanding_balance?: number;
  area?: AreaInfo;
}

interface ProductOption {
  id: number;
  display_name: string;
  product_type: string;
  shade_name?: string;
  shade_code?: string;
  variant_name?: string;
  variant_code?: string;
  size: string;
  unit: string;
  mrp: number | string;
  dealer_price?: number | string;
  stock?: number;
  category?: {
    id: number;
    code: string;
    name: string;
    gst_rate?: number;
    hsn_code?: string;
  };
}

interface InvoiceLineItem {
  id: string; // temporary UUID for React list
  product_id: number | "";
  product?: ProductOption | null;
  quantity: number | "";
  rate: number | "";
  discount_pct: number | "";
  bill_type: "GST" | "W.O";
  gst_rate: number | "";
}

function NewInvoiceForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderIdParam = searchParams.get("order_id");

  // Reference Data
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loadingRefs, setLoadingRefs] = useState(true);

  // Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | "">("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);

  const [invoiceDate, setInvoiceDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split("T")[0];
  });

  const [linkedOrderId, setLinkedOrderId] = useState<number | null>(null);
  const [linkedOrderNo, setLinkedOrderNo] = useState<string | null>(null);
  const [extraDiscount, setExtraDiscount] = useState<number | "">("");
  const [remarks, setRemarks] = useState("");

  const [items, setItems] = useState<InvoiceLineItem[]>([
    {
      id: "row-1",
      product_id: "",
      product: null,
      quantity: 1,
      rate: "",
      discount_pct: 0,
      bill_type: "GST",
      gst_rate: 18,
    },
  ]);

  // Product Combobox Active Row
  const [activeProductSearchRow, setActiveProductSearchRow] = useState<string | null>(null);
  const [productSearchTerm, setProductSearchTerm] = useState("");

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [orderLoading, setOrderLoading] = useState(false);

  // ─── 1. Load Reference Data ────────────────────────────────────────────────
  useEffect(() => {
    async function loadRefs() {
      try {
        setLoadingRefs(true);
        const [custRes, prodRes] = await Promise.all([
          authFetch("/customers/"),
          authFetch("/products/"),
        ]);
        const custData = await custRes.json();
        const prodData = await prodRes.json();

        const custList = Array.isArray(custData) ? custData : custData.items || [];
        const prodList = Array.isArray(prodData) ? prodData : prodData.items || [];

        setCustomers(custList);
        setProducts(prodList);
      } catch (err: any) {
        console.error("Failed to load reference data:", err);
      } finally {
        setLoadingRefs(false);
      }
    }
    loadRefs();
  }, []);

  // ─── 2. Handle Linked Order Conversion (if order_id present) ───────────────
  useEffect(() => {
    if (!orderIdParam || products.length === 0) return;

    async function loadOrder() {
      try {
        setOrderLoading(true);
        const res = await authFetch(`/orders/${orderIdParam}`);
        if (!res.ok) throw new Error("Could not load order details");
        const order = await res.json();

        setLinkedOrderId(order.id);
        setLinkedOrderNo(order.order_no);
        setSelectedCustomerId(order.customer_id);
        if (order.remarks) setRemarks(`Order ${order.order_no}: ${order.remarks}`);
        if (order.discount_amount) setExtraDiscount(Number(order.discount_amount));

        if (Array.isArray(order.items) && order.items.length > 0) {
          const newItems: InvoiceLineItem[] = order.items.map(
            (oItem: any, idx: number) => {
              const matchedProd = products.find((p) => p.id === oItem.product_id);
              const rateVal =
                Number(oItem.rate) ||
                (matchedProd
                  ? Number(matchedProd.dealer_price || matchedProd.mrp || 0)
                  : 0);
              const gstVal =
                Number(oItem.gst_rate) ||
                (matchedProd?.category?.gst_rate !== undefined
                  ? Number(matchedProd.category.gst_rate)
                  : 18);

              return {
                id: `order-item-${idx}-${Date.now()}`,
                product_id: oItem.product_id,
                product: matchedProd || null,
                quantity: Number(oItem.quantity) || 1,
                rate: rateVal,
                discount_pct: Number(oItem.discount_pct) || 0,
                bill_type: gstVal === 0 ? "W.O" : "GST",
                gst_rate: gstVal === 0 ? 0 : gstVal,
              };
            }
          );
          setItems(newItems);
        }
      } catch (err: any) {
        setErrorMessage(err.message || "Failed to load order for conversion");
      } finally {
        setOrderLoading(false);
      }
    }

    loadOrder();
  }, [orderIdParam, products]);

  // Selected Customer Details
  const selectedCustomer = useMemo(() => {
    return customers.find((c) => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers.slice(0, 50);
    const q = customerSearch.toLowerCase();
    return customers.filter(
      (c) =>
        c.shop_name?.toLowerCase().includes(q) ||
        c.contact_person?.toLowerCase().includes(q) ||
        c.phone?.includes(q) ||
        c.area?.name?.toLowerCase().includes(q)
    );
  }, [customers, customerSearch]);

  // ─── Line Item Operations ──────────────────────────────────────────────────
  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `row-${Date.now()}`,
        product_id: "",
        product: null,
        quantity: 1,
        rate: "",
        discount_pct: 0,
        bill_type: "GST",
        gst_rate: 18,
      },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length === 1) {
      // Keep at least 1 empty row
      setItems([
        {
          id: `row-${Date.now()}`,
          product_id: "",
          product: null,
          quantity: 1,
          rate: "",
          discount_pct: 0,
          bill_type: "GST",
          gst_rate: 18,
        },
      ]);
      return;
    }
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSelectProduct = (rowId: string, prod: ProductOption) => {
    const defaultRate = Number(prod.dealer_price || prod.mrp || 0);
    const defaultGst =
      prod.category?.gst_rate !== undefined ? Number(prod.category.gst_rate) : 18;

    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== rowId) return item;
        return {
          ...item,
          product_id: prod.id,
          product: prod,
          rate: defaultRate,
          bill_type: item.bill_type || "GST",
          gst_rate: item.bill_type === "W.O" ? 0 : defaultGst,
        };
      })
    );
    setActiveProductSearchRow(null);
    setProductSearchTerm("");
  };

  const handleItemChange = (
    id: string,
    field: keyof InvoiceLineItem,
    value: any
  ) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;

        const updated = { ...item, [field]: value };

        // Handle Bill Type toggle
        if (field === "bill_type") {
          if (value === "W.O") {
            updated.gst_rate = 0;
          } else {
            updated.gst_rate =
              item.product?.category?.gst_rate !== undefined
                ? Number(item.product.category.gst_rate)
                : 18;
          }
        }

        return updated;
      })
    );
  };

  // ─── Financial Calculations ────────────────────────────────────────────────
  const calculation = useMemo(() => {
    let grossTotal = 0;
    let totalDiscount = 0;
    let subtotal = 0;
    let totalGst = 0;

    const computedItems = items.map((item) => {
      const qty = Number(item.quantity) || 0;
      const rate = Number(item.rate) || 0;
      const discPct = Number(item.discount_pct) || 0;
      const gstRate = item.bill_type === "W.O" ? 0 : Number(item.gst_rate) || 0;

      const itemGross = qty * rate;
      const itemDisc = (itemGross * discPct) / 100;
      const itemSub = itemGross - itemDisc;
      const itemGst = (itemSub * gstRate) / 100;
      const itemTotal = itemSub + itemGst;

      grossTotal += itemGross;
      totalDiscount += itemDisc;
      subtotal += itemSub;
      totalGst += itemGst;

      return {
        ...item,
        gross: itemGross,
        discount_amt: itemDisc,
        subtotal: itemSub,
        gst_amount: itemGst,
        total: itemTotal,
      };
    });

    const extraDisc = Number(extraDiscount) || 0;
    const finalSubtotal = Math.max(0, subtotal - extraDisc);
    const grandTotal = finalSubtotal + totalGst;

    return {
      computedItems,
      grossTotal,
      totalDiscount,
      extraDiscount: extraDisc,
      subtotal,
      finalSubtotal,
      totalGst,
      cgst: totalGst / 2,
      sgst: totalGst / 2,
      grandTotal,
    };
  }, [items, extraDiscount]);

  // ─── Form Submission ───────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!selectedCustomerId) {
      setErrorMessage("Please search and select a customer.");
      return;
    }

    const validItems = items.filter(
      (item) => item.product_id !== "" && Number(item.quantity) > 0
    );

    if (validItems.length === 0) {
      setErrorMessage("Please add at least one product with quantity > 0.");
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        customer_id: Number(selectedCustomerId),
        order_id: linkedOrderId || null,
        date: invoiceDate,
        due_date: dueDate,
        discount_amount: Number(extraDiscount) || 0,
        remarks: remarks.trim() || null,
        items: validItems.map((item) => ({
          product_id: Number(item.product_id),
          quantity: Number(item.quantity),
          rate: item.rate !== "" ? Number(item.rate) : null,
          discount_pct: Number(item.discount_pct) || 0,
          bill_type: item.bill_type,
          gst_rate: item.bill_type === "W.O" ? 0 : Number(item.gst_rate) || 18,
        })),
      };

      const res = await authFetch("/invoices/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Failed to create invoice");
      }

      const createdInvoice = await res.json();
      // Redirect to invoice printable detail or list
      router.push(`/invoices/${createdInvoice.id}`);
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      {/* ── Page Header ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-2 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground tracking-tight">
                {linkedOrderId ? "Convert Order to Invoice" : "Create New Invoice"}
              </h1>
              {linkedOrderNo && (
                <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-[#1E3A8A]/10 text-[#1E3A8A] border border-[#1E3A8A]/20">
                  Ref: {linkedOrderNo}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {linkedOrderId
                ? "Review and adjust order items, rates, and taxes before issuing invoice."
                : "Create standalone GST or W.O invoice with automatic inventory deduction."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.push("/invoices")}
            className="px-4 py-2 text-sm font-semibold border border-border rounded-lg text-muted-foreground hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="invoice-form"
            disabled={submitting || orderLoading}
            className="flex items-center gap-2 bg-[#1E3A8A] hover:bg-[#1e40af] text-white text-sm font-bold px-5 py-2 rounded-lg shadow-sm transition-all disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <CheckCircle2 size={16} />
            )}
            Issue & Generate Invoice
          </button>
        </div>
      </div>

      {orderLoading && (
        <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center gap-3 text-sm text-blue-700 dark:text-blue-300">
          <Loader2 size={18} className="animate-spin" />
          <span>Loading linked order items and pricing...</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-sm font-medium text-red-600">
          <AlertCircle size={18} />
          <span>{errorMessage}</span>
        </div>
      )}

      <form id="invoice-form" onSubmit={handleSubmit} className="space-y-6">
        {/* ── Section 1: Customer & Invoice Metadata ───────────────── */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <FileText size={16} className="text-[#1E3A8A]" />
            Customer & Billing Details
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Customer Combobox */}
            <div className="md:col-span-1 relative">
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                Customer *
              </label>

              {selectedCustomer ? (
                <div className="p-3 bg-muted/40 border border-border rounded-lg flex items-start justify-between">
                  <div>
                    <div className="font-bold text-sm text-foreground">
                      {selectedCustomer.shop_name}
                    </div>
                    {selectedCustomer.area && (
                      <div className="inline-flex items-center gap-1 text-xs text-[#1E3A8A] font-medium mt-0.5">
                        <MapPin size={11} />
                        Area {selectedCustomer.area.route?.route_number ? `${selectedCustomer.area.route.route_number}`.padStart(2, '0') : `${selectedCustomer.area.id}`.padStart(2, '0')} • {selectedCustomer.area.name}
                      </div>
                    )}
                    {selectedCustomer.phone && (
                      <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                        <Phone size={10} />
                        {selectedCustomer.phone}
                      </div>
                    )}
                    {selectedCustomer.outstanding_balance !== undefined && (
                      <div className="text-[11px] text-amber-600 font-semibold mt-1">
                        Outstanding: {fmt(selectedCustomer.outstanding_balance)}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCustomerId("");
                      setCustomerSearch("");
                    }}
                    className="p-1 text-muted-foreground hover:text-red-500 rounded transition-colors"
                    title="Change Customer"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <div className="relative">
                    <Search
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    />
                    <input
                      type="text"
                      placeholder={loadingRefs ? "Loading customers..." : "Search customer or area..."}
                      value={customerSearch}
                      onChange={(e) => {
                        setCustomerSearch(e.target.value);
                        setIsCustomerDropdownOpen(true);
                      }}
                      onFocus={() => setIsCustomerDropdownOpen(true)}
                      className="w-full bg-background border border-border rounded-lg pl-9 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/40"
                    />
                    <ChevronDown
                      size={14}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                    />
                  </div>

                  {isCustomerDropdownOpen && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto divide-y divide-border/40">
                      {filteredCustomers.length > 0 ? (
                        filteredCustomers.map((c) => (
                          <div
                            key={c.id}
                            onClick={() => {
                              setSelectedCustomerId(c.id);
                              setIsCustomerDropdownOpen(false);
                            }}
                            className="p-2.5 hover:bg-muted/60 cursor-pointer transition-colors"
                          >
                            <div className="font-semibold text-xs text-foreground">
                              {c.shop_name}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                              {c.area && (
                                <span className="text-[#1E3A8A] font-medium">
                                  Area {c.area.route?.route_number ? `${c.area.route.route_number}`.padStart(2, '0') : `${c.area.id}`.padStart(2, '0')} • {c.area.name}
                                </span>
                              )}
                              {c.phone && <span>• {c.phone}</span>}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-3 text-center text-xs text-muted-foreground">
                          No matching customer found
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Invoice Date */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                Invoice Date
              </label>
              <div className="relative">
                <Calendar
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/40"
                  required
                />
              </div>
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                Payment Due Date
              </label>
              <div className="relative">
                <Calendar
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/40"
                  required
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Section 2: Line Items ─────────────────────────────────── */}
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-visible">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Package size={16} className="text-[#1E3A8A]" />
                Invoice Products & Pricing
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Add items, customize rates, apply discounts, and toggle GST / W.O (0% GST).
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddItem}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#1E3A8A]/10 text-[#1E3A8A] hover:bg-[#1E3A8A]/20 transition-colors"
            >
              <Plus size={14} />
              Add Product
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-muted/50 border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                <tr>
                  <th className="px-4 py-3 w-8">#</th>
                  <th className="px-4 py-3 min-w-[240px]">Product / Item</th>
                  <th className="px-3 py-3 w-24">Qty</th>
                  <th className="px-3 py-3 w-28">Rate (₹)</th>
                  <th className="px-3 py-3 w-24">Disc %</th>
                  <th className="px-3 py-3 w-28">Bill Type</th>
                  <th className="px-3 py-3 w-24 text-right">GST %</th>
                  <th className="px-4 py-3 text-right">Total (₹)</th>
                  <th className="px-3 py-3 w-10 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {calculation.computedItems.map((item, index) => {
                  const prod = item.product;
                  const isSearchingThisRow = activeProductSearchRow === item.id;

                  const filteredProductOptions = products.filter((p) => {
                    if (!productSearchTerm.trim()) return true;
                    const q = productSearchTerm.toLowerCase();
                    return (
                      p.display_name?.toLowerCase().includes(q) ||
                      p.shade_name?.toLowerCase().includes(q) ||
                      p.shade_code?.toLowerCase().includes(q) ||
                      p.variant_name?.toLowerCase().includes(q)
                    );
                  }).slice(0, 30);

                  return (
                    <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground font-mono">
                        {index + 1}
                      </td>

                      {/* Product Selector */}
                      <td className="px-4 py-3 relative">
                        {prod ? (
                          <div className="flex items-center justify-between gap-2 max-w-[320px]">
                            <div className="truncate">
                              <div className="font-bold text-foreground text-xs truncate">
                                {prod.display_name}
                              </div>
                              <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                                <span className="bg-muted px-1.5 py-0.2 rounded font-mono">
                                  {prod.category?.code || "CAT"}
                                </span>
                                <span>Unit: {prod.unit}</span>
                                {prod.stock !== undefined && (
                                  <span
                                    className={
                                      prod.stock > 0
                                        ? "text-emerald-600 font-semibold"
                                        : "text-amber-600 font-semibold"
                                    }
                                  >
                                    • Stock: {prod.stock}
                                  </span>
                                )}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                handleItemChange(item.id, "product_id", "");
                                handleItemChange(item.id, "product", null);
                                setActiveProductSearchRow(item.id);
                                setProductSearchTerm("");
                              }}
                              className="text-xs text-[#1E3A8A] hover:underline shrink-0"
                            >
                              Change
                            </button>
                          </div>
                        ) : (
                          <div className="relative">
                            <input
                              type="text"
                              placeholder="Search paint, shade, size..."
                              value={isSearchingThisRow ? productSearchTerm : ""}
                              onChange={(e) => {
                                setProductSearchTerm(e.target.value);
                                setActiveProductSearchRow(item.id);
                              }}
                              onFocus={() => setActiveProductSearchRow(item.id)}
                              className="w-full bg-background border border-border rounded px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#1E3A8A]"
                            />

                            {isSearchingThisRow && (
                              <div className="absolute left-0 top-full mt-1 w-80 bg-card border border-border rounded-lg shadow-2xl z-50 max-h-52 overflow-y-auto divide-y divide-border/40">
                                {filteredProductOptions.length > 0 ? (
                                  filteredProductOptions.map((p) => (
                                    <div
                                      key={p.id}
                                      onClick={() => handleSelectProduct(item.id, p)}
                                      className="p-2 hover:bg-muted/70 cursor-pointer text-xs transition-colors"
                                    >
                                      <div className="font-semibold text-foreground">
                                        {p.display_name}
                                      </div>
                                      <div className="text-[10px] text-muted-foreground flex justify-between mt-0.5">
                                        <span>
                                          Rate: ₹{p.dealer_price || p.mrp || 0} • {p.unit}
                                        </span>
                                        <span className="font-medium text-emerald-600">
                                          Stock: {p.stock ?? "--"}
                                        </span>
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <div className="p-2.5 text-center text-[11px] text-muted-foreground">
                                    No products found
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Quantity */}
                      <td className="px-3 py-3">
                        <input
                          type="number"
                          min="0.01"
                          step="any"
                          value={item.quantity}
                          onChange={(e) =>
                            handleItemChange(
                              item.id,
                              "quantity",
                              e.target.value === "" ? "" : Number(e.target.value)
                            )
                          }
                          className="w-full bg-background border border-border rounded px-2 py-1 text-xs text-right font-medium focus:outline-none focus:ring-1 focus:ring-[#1E3A8A]"
                          required
                        />
                      </td>

                      {/* Rate */}
                      <td className="px-3 py-3">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.rate}
                          onChange={(e) =>
                            handleItemChange(
                              item.id,
                              "rate",
                              e.target.value === "" ? "" : Number(e.target.value)
                            )
                          }
                          placeholder="0.00"
                          className="w-full bg-background border border-border rounded px-2 py-1 text-xs text-right font-medium focus:outline-none focus:ring-1 focus:ring-[#1E3A8A]"
                        />
                      </td>

                      {/* Discount % */}
                      <td className="px-3 py-3">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={item.discount_pct}
                          onChange={(e) =>
                            handleItemChange(
                              item.id,
                              "discount_pct",
                              e.target.value === "" ? 0 : Number(e.target.value)
                            )
                          }
                          className="w-full bg-background border border-border rounded px-2 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-[#1E3A8A]"
                        />
                      </td>

                      {/* Bill Type (GST vs W.O) */}
                      <td className="px-3 py-3">
                        <select
                          value={item.bill_type}
                          onChange={(e) =>
                            handleItemChange(
                              item.id,
                              "bill_type",
                              e.target.value as "GST" | "W.O"
                            )
                          }
                          className="w-full bg-background border border-border rounded px-2 py-1 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#1E3A8A]"
                        >
                          <option value="GST">GST Bill</option>
                          <option value="W.O">W.O (0% GST)</option>
                        </select>
                      </td>

                      {/* GST Rate */}
                      <td className="px-3 py-3 text-right">
                        {item.bill_type === "W.O" ? (
                          <span className="text-muted-foreground font-mono">0%</span>
                        ) : (
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.5"
                            value={item.gst_rate}
                            onChange={(e) =>
                              handleItemChange(
                                item.id,
                                "gst_rate",
                                e.target.value === "" ? 0 : Number(e.target.value)
                              )
                            }
                            className="w-16 bg-background border border-border rounded px-2 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-[#1E3A8A]"
                          />
                        )}
                      </td>

                      {/* Total */}
                      <td className="px-4 py-3 text-right font-bold text-foreground">
                        {fmt(item.total)}
                      </td>

                      {/* Remove */}
                      <td className="px-3 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="p-1 text-muted-foreground hover:text-red-600 hover:bg-red-500/10 rounded transition-colors"
                          title="Remove item"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Section 3: Notes & Financial Calculation Summary ────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Notes / Remarks */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-foreground">Invoice Notes & Delivery Remarks</h3>
            <textarea
              rows={4}
              placeholder="e.g. Delivery terms, payment instructions, transporter details..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full bg-background border border-border rounded-lg p-3 text-xs focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/40 placeholder:text-muted-foreground"
            />

            <div className="p-3 bg-muted/40 border border-border rounded-lg text-xs text-muted-foreground space-y-1">
              <div className="font-semibold text-foreground flex items-center gap-1.5">
                <Info size={13} className="text-[#1E3A8A]" />
                Automated Ledger & Inventory Sync
              </div>
              <p>
                • Generating this invoice will automatically add {fmt(calculation.grandTotal)} to the customer's outstanding balance.
              </p>
              <p>
                • Physical inventory will be deducted from warehouse stock upon confirmation.
              </p>
            </div>
          </div>

          {/* Breakdown Summary */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-3 text-xs">
            <h3 className="text-sm font-bold text-foreground pb-2 border-b border-border">
              Summary & Grand Total
            </h3>

            <div className="flex justify-between text-muted-foreground">
              <span>Gross Product Total:</span>
              <span className="font-medium text-foreground">
                {fmt(calculation.grossTotal)}
              </span>
            </div>

            {calculation.totalDiscount > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Line Discounts Total:</span>
                <span className="font-medium">- {fmt(calculation.totalDiscount)}</span>
              </div>
            )}

            <div className="flex items-center justify-between text-muted-foreground pt-1">
              <span>Invoice Extra Discount (₹):</span>
              <input
                type="number"
                min="0"
                step="1"
                placeholder="0.00"
                value={extraDiscount}
                onChange={(e) =>
                  setExtraDiscount(e.target.value === "" ? "" : Number(e.target.value))
                }
                className="w-28 bg-background border border-border rounded px-2 py-1 text-right text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#1E3A8A]"
              />
            </div>

            <div className="flex justify-between text-muted-foreground pt-1">
              <span>Pre-Tax Subtotal:</span>
              <span className="font-medium text-foreground">
                {fmt(calculation.finalSubtotal)}
              </span>
            </div>

            <div className="flex justify-between text-muted-foreground">
              <span>CGST Total:</span>
              <span className="font-medium text-foreground">
                {fmt(calculation.cgst)}
              </span>
            </div>

            <div className="flex justify-between text-muted-foreground">
              <span>SGST Total:</span>
              <span className="font-medium text-foreground">
                {fmt(calculation.sgst)}
              </span>
            </div>

            <div className="border-t border-border pt-3 flex justify-between items-baseline text-base font-bold text-foreground">
              <span>Grand Total:</span>
              <span className="text-xl text-[#1E3A8A]">
                {fmt(calculation.grandTotal)}
              </span>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

export default function NewInvoicePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-[#1E3A8A]" />
        </div>
      }
    >
      <NewInvoiceForm />
    </Suspense>
  );
}
