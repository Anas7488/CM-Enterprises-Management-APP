"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  Filter,
  Loader2,
  AlertCircle,
  X,
  Trash2,
  ShoppingCart,
  CheckCircle2,
  Clock,
  Truck,
  IndianRupee,
  UserCheck,
  Package,
  ArrowRight,
  RefreshCw,
  MapPin,
  Phone,
  FileText,
} from "lucide-react";
import { StatusBadge } from "@/shared/ui/StatusBadge";
import { KpiCard } from "@/shared/ui/KpiCard";
import { authFetch } from "@/lib/auth";

// ─── Formatters ──────────────────────────────────────────────────────────────
const fmt = (n: number | string) =>
  `₹${Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const fmtDate = (d: string | null | undefined) => {
  if (!d) return "--";
  try {
    return new Date(d).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return d;
  }
};

// ─── Types ───────────────────────────────────────────────────────────────────
interface OrderListItem {
  id: number;
  order_no: string;
  customer_id: number;
  customer_name: string;
  customer_area?: string | null;
  customer_area_code?: string | null;
  status: string;
  total_amount: number | string;
  item_count: number;
  remarks?: string;
  delivery_date?: string;
  created_by: string;
  created_at: string;
}

interface OrderItemDetail {
  id: number;
  product_id: number;
  product_name: string;
  category_code: string;
  category_name: string;
  quantity: number | string;
  unit: string;
  rate: number | string;
  discount_pct: number | string;
  discount_amt: number | string;
  hsn_code: string;
  gst_rate: number | string;
  gst_amount: number | string;
  subtotal: number | string;
  total: number | string;
}

interface OrderDetail extends OrderListItem {
  subtotal: number | string;
  discount_amount: number | string;
  gst_amount: number | string;
  approved_by?: string | null;
  updated_at?: string | null;
  items: OrderItemDetail[];
}

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

interface NewOrderItem {
  product_id: number | "";
  quantity: number | "";
  discount_pct: number | "";
  bill_type: "GST" | "W.O"; // Optional per product
}

const ORDER_STATUS_FILTERS = [
  "All",
  "Pending",
  "Approved",
  "Preparing",
  "Dispatched",
  "Delivered",
  "Cancelled",
];

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  // Filters & Search for Main Table
  const [activeStatus, setActiveStatus] = useState("All");
  const [search, setSearch] = useState("");
  const [selectedAreaFilter, setSelectedAreaFilter] = useState<string>("All");

  // Reference Data (loaded upfront so customer/product search is immediate)
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [referenceLoading, setReferenceLoading] = useState(false);

  // Modal States
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [orderDetail, setOrderDetail] = useState<OrderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [actionError, setActionError] = useState("");

  // ─── New Order Form States ────────────────────────────────────────────────
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | "">("");
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [customerAreaFilter, setCustomerAreaFilter] = useState("All");
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);

  const [customRemarks, setCustomRemarks] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [orderDiscount, setOrderDiscount] = useState<number | "">(0);

  const [formItems, setFormItems] = useState<NewOrderItem[]>([
    { product_id: "", quantity: 1, discount_pct: 0, bill_type: "GST" },
  ]);
  const [activeProductSearchIdx, setActiveProductSearchIdx] = useState<number | null>(null);
  const [productSearchQueries, setProductSearchQueries] = useState<Record<number, string>>({});

  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState("");

  // ─── Fetch Reference Data (Customers & Products) ──────────────────────────
  async function loadReferenceData() {
    setReferenceLoading(true);
    try {
      const [custRes, prodRes] = await Promise.all([
        authFetch("/customers/"),
        authFetch("/products/"),
      ]);
      if (custRes.ok) {
        const custData = await custRes.json();
        setCustomers(Array.isArray(custData) ? custData : []);
      }
      if (prodRes.ok) {
        const prodData = await prodRes.json();
        setProducts(Array.isArray(prodData) ? prodData : []);
      }
    } catch (e) {
      console.error("Failed to load reference data", e);
    } finally {
      setReferenceLoading(false);
    }
  }

  // ─── Fetch Orders ──────────────────────────────────────────────────────────
  async function fetchOrders() {
    try {
      setRefreshing(true);
      const res = await authFetch("/orders/");
      if (!res.ok) throw new Error("Failed to fetch orders");
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
      setError("");
    } catch (err: any) {
      setError(err.message || "Failed to load orders");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    fetchOrders();
    loadReferenceData();
  }, []);

  const handleOpenNewOrderModal = () => {
    if (customers.length === 0 || products.length === 0) {
      loadReferenceData();
    }
    setSelectedCustomerId("");
    setCustomerSearchQuery("");
    setCustomerAreaFilter("All");
    setIsCustomerDropdownOpen(false);
    setCustomRemarks("");
    setDeliveryDate("");
    setOrderDiscount(0);
    setFormItems([{ product_id: "", quantity: 1, discount_pct: 0, bill_type: "GST" }]);
    setProductSearchQueries({});
    setActiveProductSearchIdx(null);
    setCreateError("");
    setIsNewOrderModalOpen(true);
  };

  // ─── Fetch Single Order Details ───────────────────────────────────────────
  async function handleOpenOrderDetail(id: number) {
    setSelectedOrderId(id);
    setDetailLoading(true);
    setActionError("");
    try {
      const res = await authFetch(`/orders/${id}`);
      if (!res.ok) throw new Error("Failed to load order details");
      const data = await res.json();
      setOrderDetail(data);
    } catch (err: any) {
      setActionError(err.message || "Failed to fetch order details");
    } finally {
      setDetailLoading(false);
    }
  }

  // ─── Update Order Status ───────────────────────────────────────────────────
  async function handleUpdateStatus(newStatus: string) {
    if (!selectedOrderId) return;
    setStatusUpdating(true);
    setActionError("");
    try {
      const res = await authFetch(`/orders/${selectedOrderId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Status update failed");
      }
      await handleOpenOrderDetail(selectedOrderId);
      await fetchOrders();
    } catch (err: any) {
      setActionError(err.message || "Failed to update order status");
    } finally {
      setStatusUpdating(false);
    }
  }

  // Selection & Delete States
  const [selectedOrderIds, setSelectedOrderIds] = useState<number[]>([]);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<{
    type: "single" | "bulk";
    id?: number;
    order_no?: string;
    count?: number;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const handleToggleSelectAll = () => {
    if (selectedOrderIds.length === filteredOrders.length && filteredOrders.length > 0) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(filteredOrders.map((o) => o.id));
    }
  };

  const handleToggleSelectOrder = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedOrderIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmTarget) return;
    setDeleting(true);
    setDeleteError("");

    try {
      if (deleteConfirmTarget.type === "single" && deleteConfirmTarget.id) {
        const res = await authFetch(`/orders/${deleteConfirmTarget.id}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.detail || "Failed to delete order");
        }
        if (selectedOrderId === deleteConfirmTarget.id) {
          setSelectedOrderId(null);
          setOrderDetail(null);
        }
        setSelectedOrderIds((prev) => prev.filter((id) => id !== deleteConfirmTarget.id));
      } else if (deleteConfirmTarget.type === "bulk" && selectedOrderIds.length > 0) {
        const res = await authFetch("/orders/bulk-delete", {
          method: "POST",
          body: JSON.stringify({ order_ids: selectedOrderIds }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.detail || "Failed to delete selected orders");
        }
        if (selectedOrderId && selectedOrderIds.includes(selectedOrderId)) {
          setSelectedOrderId(null);
          setOrderDetail(null);
        }
        setSelectedOrderIds([]);
      }

      setDeleteConfirmTarget(null);
      await fetchOrders();
    } catch (err: any) {
      setDeleteError(err.message || "Failed to delete order");
    } finally {
      setDeleting(false);
    }
  };

  // ─── Extract All Unique Areas for Filter Dropdowns ────────────────────────
  const uniqueAreas = useMemo(() => {
    const areaMap = new Map<string, { code: string; name: string }>();
    customers.forEach((c) => {
      if (c.area?.name) {
        const code = c.area.route?.route_number
          ? String(c.area.route.route_number).padStart(2, "0")
          : String(c.area.id).padStart(2, "0");
        areaMap.set(c.area.name, { code, name: c.area.name });
      }
    });
    return Array.from(areaMap.values()).sort((a, b) => a.code.localeCompare(b.code));
  }, [customers]);

  // ─── Filter Customers for Modal Selection ─────────────────────────────────
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const areaName = c.area?.name || "";
      const areaCode = c.area?.route?.route_number
        ? String(c.area.route.route_number).padStart(2, "0")
        : String(c.area?.id || "").padStart(2, "0");

      const matchesArea =
        customerAreaFilter === "All" ||
        areaName === customerAreaFilter ||
        areaCode === customerAreaFilter;

      const q = customerSearchQuery.toLowerCase().trim();
      if (!q) return matchesArea;

      const matchesQuery =
        c.shop_name.toLowerCase().includes(q) ||
        (c.contact_person && c.contact_person.toLowerCase().includes(q)) ||
        (c.phone && c.phone.includes(q)) ||
        areaName.toLowerCase().includes(q) ||
        areaCode.includes(q);

      return matchesArea && matchesQuery;
    });
  }, [customers, customerAreaFilter, customerSearchQuery]);

  const selectedCustomer = useMemo(() => {
    if (!selectedCustomerId) return null;
    return customers.find((c) => c.id === Number(selectedCustomerId)) || null;
  }, [customers, selectedCustomerId]);

  // ─── Form Items Operations ────────────────────────────────────────────────
  const addFormItem = () => {
    setFormItems([
      ...formItems,
      { product_id: "", quantity: 1, discount_pct: 0, bill_type: "GST" },
    ]);
  };

  const removeFormItem = (index: number) => {
    if (formItems.length === 1) return;
    setFormItems(formItems.filter((_, i) => i !== index));
    const newQueries = { ...productSearchQueries };
    delete newQueries[index];
    setProductSearchQueries(newQueries);
  };

  const selectProductForItem = (index: number, productId: number) => {
    const updated = [...formItems];
    updated[index] = { ...updated[index], product_id: productId };
    setFormItems(updated);
    setActiveProductSearchIdx(null);
  };

  const updateFormItemField = (
    index: number,
    field: "product_id" | "quantity" | "discount_pct" | "bill_type",
    val: any
  ) => {
    const updated = [...formItems];
    updated[index] = { ...updated[index], [field]: val };
    setFormItems(updated);
  };

  // ─── Helper to get Product Rate (Auto Rate) ───────────────────────────────
  const getProductRate = (prod: ProductOption | undefined): number => {
    if (!prod) return 0;
    return Number(prod.dealer_price || prod.mrp || 0);
  };

  // ─── Live Calculation of Estimate Amount ──────────────────────────────────
  const liveEstimate = useMemo(() => {
    let grossSubtotal = 0;
    let totalDiscountAmt = 0;
    let totalGstAmt = 0;
    let totalPcsOrUnits = 0;

    formItems.forEach((item) => {
      const prod = products.find((p) => p.id === Number(item.product_id));
      if (!prod) return;

      const qty = Number(item.quantity) || 0;
      const rate = getProductRate(prod);
      const discPct = Number(item.discount_pct) || 0;
      
      const gstRate = item.bill_type === "W.O" ? 0 : Number(prod.category?.gst_rate ?? 18);

      const lineGross = qty * rate;
      const lineDiscAmt = (lineGross * discPct) / 100;
      const lineSubtotal = lineGross - lineDiscAmt;
      const lineGst = (lineSubtotal * gstRate) / 100;

      grossSubtotal += lineSubtotal;
      totalDiscountAmt += lineDiscAmt;
      totalGstAmt += lineGst;
      totalPcsOrUnits += qty;
    });

    const orderDisc = Number(orderDiscount) || 0;
    const estimatedTotal = Math.max(0, grossSubtotal - orderDisc + totalGstAmt);

    return {
      grossSubtotal,
      totalDiscountAmt,
      totalGstAmt,
      orderDisc,
      estimatedTotal,
      totalPcsOrUnits,
    };
  }, [formItems, products, orderDiscount]);

  // ─── Submit Order ─────────────────────────────────────────────────────────
  const handleCreateOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");

    if (!selectedCustomerId) {
      setCreateError("Please select a Customer with Area from the search list");
      return;
    }

    // Validate products and try auto-resolving single matches if user only typed
    const finalItems = [];
    for (let i = 0; i < formItems.length; i++) {
      const item = formItems[i];
      let pId = item.product_id ? Number(item.product_id) : null;

      // If user typed a search query but didn't click dropdown, check matching
      if (!pId && productSearchQueries[i]) {
        const q = productSearchQueries[i].toLowerCase().trim();
        const matches = products.filter(
          (p) =>
            p.display_name.toLowerCase().includes(q) ||
            (p.category?.code && p.category.code.toLowerCase().includes(q)) ||
            (p.shade_code && p.shade_code.toLowerCase().includes(q))
        );
        if (matches.length > 0) {
          pId = matches[0].id;
        }
      }

      if (!pId) {
        setCreateError(`Please select a valid product for row #${i + 1}`);
        return;
      }

      const qty = Number(item.quantity);
      if (!qty || qty <= 0) {
        setCreateError(`Please enter a valid quantity for item #${i + 1}`);
        return;
      }

      const prod = products.find((p) => p.id === pId);
      const autoRate = getProductRate(prod);

      finalItems.push({
        product_id: pId,
        quantity: qty,
        rate: autoRate,
        discount_pct: Number(item.discount_pct) || 0,
        bill_type: item.bill_type || "GST",
      });
    }

    if (finalItems.length === 0) {
      setCreateError("Please add at least one product item to the order");
      return;
    }

    setCreateSubmitting(true);
    setCreateError("");

    const finalRemarks = customRemarks.trim() || null;

    const payload = {
      customer_id: Number(selectedCustomerId),
      delivery_date: deliveryDate || null,
      remarks: finalRemarks,
      discount_amount: Number(orderDiscount) || 0,
      items: finalItems,
    };

    try {
      const res = await authFetch("/orders/", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Failed to create order");
      }

      setIsNewOrderModalOpen(false);
      await fetchOrders();
      if (data && data.id) {
        handleOpenOrderDetail(data.id);
      }
    } catch (err: any) {
      setCreateError(err.message || "Failed to create order");
    } finally {
      setCreateSubmitting(false);
    }
  };

  // ─── Filter Main Table Orders ─────────────────────────────────────────────
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchesStatus =
        activeStatus === "All" ||
        o.status.toLowerCase() === activeStatus.toLowerCase();

      const matchesArea =
        selectedAreaFilter === "All" ||
        o.customer_area === selectedAreaFilter ||
        o.customer_area_code === selectedAreaFilter;

      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        o.customer_name.toLowerCase().includes(q) ||
        o.order_no.toLowerCase().includes(q) ||
        (o.customer_area && o.customer_area.toLowerCase().includes(q)) ||
        (o.customer_area_code && o.customer_area_code.includes(q)) ||
        (o.remarks && o.remarks.toLowerCase().includes(q));

      return matchesStatus && matchesArea && matchesSearch;
    });
  }, [orders, activeStatus, selectedAreaFilter, search]);

  // ─── KPIs ─────────────────────────────────────────────────────────────────
  const totalCount = orders.length;
  const totalRevenue = orders
    .filter((o) => o.status !== "cancelled")
    .reduce((acc, o) => acc + Number(o.total_amount || 0), 0);
  const pendingCount = orders.filter((o) => o.status === "pending").length;
  const inProgressCount = orders.filter(
    (o) => o.status === "approved" || o.status === "preparing" || o.status === "dispatched"
  ).length;

  return (
    <div className="space-y-6">
      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Orders Management
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Process orders with area identification, auto product pricing & live bill estimates.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              fetchOrders();
              loadReferenceData();
            }}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-card text-foreground hover:bg-muted text-xs font-medium transition-colors"
            title="Refresh list"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
          <button
            onClick={handleOpenNewOrderModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#1E3A8A] hover:bg-[#1e40af] text-white text-sm font-semibold shadow-sm transition-all"
          >
            <Plus size={16} />
            New Order
          </button>
        </div>
      </div>

      {/* ── KPI Cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={ShoppingCart}
          label="Total Orders"
          value={String(totalCount)}
          sub="Live order history"
          trend="Real-time"
          trendUp={true}
          color="bg-[#1E3A8A]"
        />
        <KpiCard
          icon={IndianRupee}
          label="Orders Revenue"
          value={fmt(totalRevenue)}
          sub="Active order value"
          trend="Live"
          trendUp={true}
          color="bg-emerald-600"
        />
        <KpiCard
          icon={Clock}
          label="Pending Approval"
          value={String(pendingCount)}
          sub="Requires review"
          trend={pendingCount > 0 ? "Action Required" : "Up to date"}
          trendUp={pendingCount === 0}
          color="bg-[#F97316]"
        />
        <KpiCard
          icon={Truck}
          label="In Fulfillment"
          value={String(inProgressCount)}
          sub="Approved & Dispatched"
          trend="In transit"
          trendUp={true}
          color="bg-indigo-600"
        />
      </div>

      {/* ── Filters & Search Toolbar ──────────────────────────────────────── */}
      <div className="bg-card rounded-xl border border-border p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="text"
              placeholder="Search by Customer, Order ID, Area Name or Code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 placeholder:text-muted-foreground"
            />
          </div>

          <div className="flex items-center gap-2">
            <MapPin size={16} className="text-muted-foreground" />
            <select
              value={selectedAreaFilter}
              onChange={(e) => setSelectedAreaFilter(e.target.value)}
              className="bg-background border border-border rounded-lg px-3 py-2 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20"
            >
              <option value="All">All Areas ({uniqueAreas.length})</option>
              {uniqueAreas.map((a) => (
                <option key={a.name} value={a.name}>
                  Area {a.code} - {a.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {ORDER_STATUS_FILTERS.map((status) => (
            <button
              key={status}
              onClick={() => setActiveStatus(status)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-colors ${
                activeStatus === status
                  ? "bg-[#1E3A8A] text-white border-[#1E3A8A]"
                  : "bg-background text-muted-foreground border-border hover:bg-muted"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* ── Bulk Selection Action Toolbar ─────────────────────────────────── */}
      {selectedOrderIds.length > 0 && (
        <div className="bg-[#1E3A8A]/10 border-2 border-[#1E3A8A]/30 rounded-xl p-3.5 flex items-center justify-between animate-in fade-in slide-in-from-top-2 shadow-sm">
          <div className="flex items-center gap-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1E3A8A] text-white text-xs font-bold">
              {selectedOrderIds.length}
            </span>
            <span className="text-xs font-bold text-foreground">
              {selectedOrderIds.length === 1 ? "1 Order Selected" : `${selectedOrderIds.length} Orders Selected`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedOrderIds([])}
              className="px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
            >
              Deselect All
            </button>
            <button
              onClick={() =>
                setDeleteConfirmTarget({
                  type: "bulk",
                  count: selectedOrderIds.length,
                })
              }
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all"
            >
              <Trash2 size={13} />
              Delete Selected ({selectedOrderIds.length})
            </button>
          </div>
        </div>
      )}

      {/* ── Orders Main Table ─────────────────────────────────────────────── */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="w-8 h-8 text-[#1E3A8A] animate-spin" />
            <p className="text-sm text-muted-foreground font-medium">
              Loading orders from database...
            </p>
          </div>
        ) : error ? (
          <div className="p-8 text-center space-y-2">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
            <p className="text-sm font-semibold text-foreground">{error}</p>
            <button
              onClick={fetchOrders}
              className="text-xs text-[#1E3A8A] hover:underline font-medium"
            >
              Click here to retry
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground">
                  <th className="w-10 px-3 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={
                        filteredOrders.length > 0 &&
                        selectedOrderIds.length === filteredOrders.length
                      }
                      onChange={handleToggleSelectAll}
                      className="rounded border-border text-[#1E3A8A] focus:ring-[#1E3A8A] cursor-pointer"
                      title="Select all orders"
                    />
                  </th>
                  <th className="text-left px-4 py-3">Order No</th>
                  <th className="text-left px-4 py-3">Customer</th>
                  <th className="text-left px-4 py-3">Area & Code</th>
                  <th className="text-left px-4 py-3">Items</th>
                  <th className="text-left px-4 py-3">Remarks</th>
                  <th className="text-left px-4 py-3">Estimate Amount</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Order Date</th>
                  <th className="text-right px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filteredOrders.length > 0 ? (
                  filteredOrders.map((o) => {
                    const isSelected = selectedOrderIds.includes(o.id);
                    return (
                      <tr
                        key={o.id}
                        onClick={() => handleOpenOrderDetail(o.id)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? "bg-[#1E3A8A]/5 hover:bg-[#1E3A8A]/10" : "hover:bg-muted/30"
                        }`}
                      >
                        <td
                          className="w-10 px-3 py-3.5 text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => handleToggleSelectOrder(o.id, e as any)}
                            className="rounded border-border text-[#1E3A8A] focus:ring-[#1E3A8A] cursor-pointer"
                          />
                        </td>
                        <td className="px-4 py-3.5 text-xs font-mono font-semibold text-[#1E3A8A]">
                          {o.order_no}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="text-xs font-semibold text-foreground">
                            {o.customer_name}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          {o.customer_area ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-[11px] font-medium text-foreground">
                              <MapPin size={10} className="text-muted-foreground" />
                              Area {o.customer_area_code || "--"} • {o.customer_area}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">--</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-muted-foreground">
                          {o.item_count} {o.item_count === 1 ? "item" : "items"}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-xs text-muted-foreground truncate max-w-[200px] block">
                            {o.remarks || "--"}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-xs font-bold text-foreground">
                          {fmt(o.total_amount)}
                        </td>
                        <td className="px-4 py-3.5">
                          <StatusBadge status={o.status} />
                        </td>
                        <td className="px-4 py-3.5 text-xs text-muted-foreground">
                          {fmtDate(o.created_at)}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <div className="inline-flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => router.push(`/invoices/new?order_id=${o.id}`)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-md transition-colors"
                              title="Generate Invoice for this Order"
                            >
                              <FileText size={12} />
                              <span>Invoice</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenOrderDetail(o.id)}
                              className="inline-flex items-center px-2 py-1 text-xs font-medium text-[#1E3A8A] hover:bg-[#1E3A8A]/10 rounded-md transition-colors"
                            >
                              View
                              <ArrowRight size={12} className="ml-0.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setDeleteConfirmTarget({
                                  type: "single",
                                  id: o.id,
                                  order_no: o.order_no,
                                })
                              }
                              className="p-1 text-muted-foreground hover:text-red-600 hover:bg-red-500/10 rounded-md transition-colors"
                              title="Delete Order"
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
                      colSpan={10}
                      className="text-center py-12 text-sm text-muted-foreground"
                    >
                      {orders.length === 0
                        ? "No orders created yet. Click '+ New Order' to place an order!"
                        : "No orders found matching your search or filters."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal: Create New Order (Executive Flow) ───────────────────────── */}
      {isNewOrderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-4xl max-h-[94vh] flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/20">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-[#1E3A8A]/10 text-[#1E3A8A]">
                  <ShoppingCart size={18} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">
                    Create New Order
                  </h2>
                  <p className="text-[11px] text-muted-foreground">
                    Search customer by Area & Name • Search products • Automatic rates & live bill estimates
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsNewOrderModalOpen(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <form
              onSubmit={handleCreateOrderSubmit}
              className="flex-1 overflow-y-auto p-6 space-y-6"
            >
              {createError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-xs font-medium text-red-600">
                  <AlertCircle size={16} />
                  <span>{createError}</span>
                </div>
              )}

              {/* ── Section 1: Customer & Area Search/Select ────────────────── */}
              <div className="bg-muted/20 border border-border rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    <MapPin size={14} className="text-[#1E3A8A]" />
                    <span>1. Customer & Area ({customers.length} available)</span>
                  </div>
                  {referenceLoading && (
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Loader2 size={12} className="animate-spin" /> Loading data...
                    </span>
                  )}
                </div>

                {selectedCustomer ? (
                  /* Customer Selected Card */
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-background border-2 border-[#1E3A8A]/30 rounded-xl gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-foreground">
                          {selectedCustomer.shop_name}
                        </span>
                        {selectedCustomer.area && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#1E3A8A]/10 text-[#1E3A8A] text-xs font-bold">
                            <MapPin size={12} />
                            Area {selectedCustomer.area.route?.route_number ? String(selectedCustomer.area.route.route_number).padStart(2, "0") : String(selectedCustomer.area.id).padStart(2, "0")} • {selectedCustomer.area.name}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        {selectedCustomer.contact_person && (
                          <span className="flex items-center gap-1">
                            <UserCheck size={12} /> {selectedCustomer.contact_person}
                          </span>
                        )}
                        {selectedCustomer.phone && (
                          <span className="flex items-center gap-1">
                            <Phone size={12} /> {selectedCustomer.phone}
                          </span>
                        )}
                        {selectedCustomer.outstanding_balance !== undefined && (
                          <span className="font-semibold text-foreground">
                            Balance: {fmt(selectedCustomer.outstanding_balance)}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCustomerId("");
                        setCustomerSearchQuery("");
                        setIsCustomerDropdownOpen(true);
                      }}
                      className="px-3 py-1.5 text-xs font-semibold text-[#1E3A8A] hover:bg-[#1E3A8A]/10 rounded-lg transition-colors shrink-0"
                    >
                      Change Customer
                    </button>
                  </div>
                ) : (
                  /* Customer Search & Filter Combobox */
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="sm:col-span-1">
                        <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                          Filter by Area
                        </label>
                        <select
                          value={customerAreaFilter}
                          onChange={(e) => setCustomerAreaFilter(e.target.value)}
                          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20"
                        >
                          <option value="All">All Areas ({uniqueAreas.length})</option>
                          {uniqueAreas.map((a) => (
                            <option key={a.name} value={a.name}>
                              Area {a.code} - {a.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                          Search Customer (Shop Name / Person / Phone / Area)
                        </label>
                        <div className="relative">
                          <Search
                            size={14}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                          />
                          <input
                            type="text"
                            placeholder="Type shop name, phone or area..."
                            value={customerSearchQuery}
                            onChange={(e) => {
                              setCustomerSearchQuery(e.target.value);
                              setIsCustomerDropdownOpen(true);
                            }}
                            onFocus={() => setIsCustomerDropdownOpen(true)}
                            className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Customer Results List */}
                    {isCustomerDropdownOpen && (
                      <div className="max-h-52 overflow-y-auto border border-border rounded-xl bg-background divide-y divide-border shadow-md">
                        {filteredCustomers.length > 0 ? (
                          filteredCustomers.slice(0, 50).map((c) => {
                            const areaCode = c.area?.route?.route_number
                              ? String(c.area.route.route_number).padStart(2, "0")
                              : String(c.area?.id || "").padStart(2, "0");
                            return (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => {
                                  setSelectedCustomerId(c.id);
                                  setIsCustomerDropdownOpen(false);
                                  setCreateError("");
                                }}
                                className="w-full text-left p-3 hover:bg-muted/50 transition-colors flex items-center justify-between gap-3"
                              >
                                <div>
                                  <div className="text-xs font-bold text-foreground">
                                    {c.shop_name}
                                  </div>
                                  <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                                    {c.contact_person && <span>{c.contact_person}</span>}
                                    {c.phone && <span>• {c.phone}</span>}
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  {c.area ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-muted text-[10px] font-bold text-foreground border border-border">
                                      <MapPin size={10} className="text-[#1E3A8A]" />
                                      Area {areaCode} • {c.area.name}
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-muted-foreground">No Area</span>
                                  )}
                                </div>
                              </button>
                            );
                          })
                        ) : (
                          <div className="p-4 text-center text-xs text-muted-foreground">
                            {customers.length === 0
                              ? "Loading customers from database..."
                              : `No customers found matching "${customerSearchQuery}"`}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ── Section 2: Products (Search & Select) with Optional W.O/GST per line ── */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    <Package size={14} className="text-[#1E3A8A]" />
                    <span>2. Order Products ({formItems.length})</span>
                  </div>
                  <button
                    type="button"
                    onClick={addFormItem}
                    className="flex items-center gap-1 text-xs font-bold text-[#1E3A8A] hover:underline"
                  >
                    <Plus size={14} />
                    Add Another Product
                  </button>
                </div>

                <div className="border border-border rounded-xl overflow-visible">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
                        <th className="text-left px-3 py-2.5 w-8">#</th>
                        <th className="text-left px-3 py-2.5 min-w-[260px]">
                          Product (Search & Select)
                        </th>
                        <th className="text-center px-3 py-2.5 w-24">Tax / W.O</th>
                        <th className="text-right px-3 py-2.5 w-24">Auto Rate</th>
                        <th className="text-right px-3 py-2.5 w-20">Qty</th>
                        <th className="text-right px-3 py-2.5 w-20">Disc %</th>
                        <th className="text-right px-3 py-2.5 w-28">Est. Line Total</th>
                        <th className="text-center px-2 py-2.5 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {formItems.map((item, idx) => {
                        const selectedProd = products.find(
                          (p) => p.id === Number(item.product_id)
                        );
                        const autoRate = getProductRate(selectedProd);
                        const qty = Number(item.quantity) || 0;
                        const disc = Number(item.discount_pct) || 0;
                        const isWO = item.bill_type === "W.O";
                        const gstRate = isWO ? 0 : Number(selectedProd?.category?.gst_rate ?? 18);

                        const gross = qty * autoRate;
                        const discAmt = (gross * disc) / 100;
                        const sub = gross - discAmt;
                        const gstAmt = (sub * gstRate) / 100;
                        const lineTotal = sub + gstAmt;

                        const currentQuery =
                          productSearchQueries[idx] !== undefined
                            ? productSearchQueries[idx]
                            : selectedProd?.display_name || "";

                        // Filtered products for this row
                        const matchingProducts = products.filter((p) => {
                          const q = (productSearchQueries[idx] || "").toLowerCase().trim();
                          if (!q) return true;
                          return (
                            p.display_name.toLowerCase().includes(q) ||
                            (p.category?.name && p.category.name.toLowerCase().includes(q)) ||
                            (p.category?.code && p.category.code.includes(q)) ||
                            (p.shade_code && p.shade_code.toLowerCase().includes(q)) ||
                            (p.variant_code && p.variant_code.toLowerCase().includes(q))
                          );
                        });

                        return (
                          <tr key={idx} className="hover:bg-muted/10 align-top">
                            <td className="px-3 py-3 text-muted-foreground">{idx + 1}</td>

                            {/* Product Search Combobox / Selected Card */}
                            <td className="px-3 py-2 relative">
                              {selectedProd ? (
                                <div className="flex items-center justify-between p-1.5 px-2 bg-blue-500/5 border border-[#1E3A8A]/30 rounded-md">
                                  <div className="truncate pr-2">
                                    <div className="font-bold text-foreground text-xs truncate">
                                      {selectedProd.display_name}
                                    </div>
                                    <div className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                                      <span className="px-1 rounded bg-muted">
                                        Cat {selectedProd.category?.code || "--"}
                                      </span>
                                      <span>{selectedProd.unit}</span>
                                      {selectedProd.shade_code && <span>• Shade: {selectedProd.shade_code}</span>}
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      updateFormItemField(idx, "product_id", "");
                                      setProductSearchQueries({
                                        ...productSearchQueries,
                                        [idx]: "",
                                      });
                                      setActiveProductSearchIdx(idx);
                                    }}
                                    className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground shrink-0"
                                    title="Change product"
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                              ) : (
                                <div className="relative">
                                  <Search
                                    size={13}
                                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                                  />
                                  <input
                                    type="text"
                                    placeholder="Search by code, shade, or name..."
                                    value={currentQuery}
                                    onFocus={() => setActiveProductSearchIdx(idx)}
                                    onChange={(e) => {
                                      setProductSearchQueries({
                                        ...productSearchQueries,
                                        [idx]: e.target.value,
                                      });
                                      setActiveProductSearchIdx(idx);
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" && matchingProducts.length > 0) {
                                        e.preventDefault();
                                        selectProductForItem(idx, matchingProducts[0].id);
                                        setProductSearchQueries({
                                          ...productSearchQueries,
                                          [idx]: matchingProducts[0].display_name,
                                        });
                                      }
                                    }}
                                    className="w-full bg-background border border-border rounded-md pl-7 pr-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-[#1E3A8A]"
                                  />
                                </div>
                              )}

                              {/* Dropdown Menu */}
                              {activeProductSearchIdx === idx && !selectedProd && (
                                <div className="absolute left-3 right-3 top-12 z-50 max-h-48 overflow-y-auto bg-card border border-border rounded-xl shadow-xl divide-y divide-border">
                                  {matchingProducts.length > 0 ? (
                                    matchingProducts.slice(0, 30).map((p) => (
                                      <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => {
                                          selectProductForItem(idx, p.id);
                                          setProductSearchQueries({
                                            ...productSearchQueries,
                                            [idx]: p.display_name,
                                          });
                                        }}
                                        className="w-full text-left p-2.5 hover:bg-muted text-xs flex items-center justify-between gap-2"
                                      >
                                        <div>
                                          <div className="font-semibold text-foreground">
                                            {p.display_name}
                                          </div>
                                          <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                                            <span className="px-1 rounded bg-muted">
                                              Cat {p.category?.code || "--"}
                                            </span>
                                            <span>Unit: {p.unit}</span>
                                            <span>• GST: {p.category?.gst_rate ?? 18}%</span>
                                          </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                          <div className="font-bold text-foreground">
                                            ₹{getProductRate(p)}
                                          </div>
                                          <span className="text-[10px] text-emerald-600 font-medium">
                                            Stock: {p.stock ?? 0}
                                          </span>
                                        </div>
                                      </button>
                                    ))
                                  ) : (
                                    <div className="p-3 text-center text-xs text-muted-foreground">
                                      {products.length === 0
                                        ? "Loading products..."
                                        : "No products matching search"}
                                    </div>
                                  )}
                                </div>
                              )}
                            </td>

                            {/* Optional Product Memo Type (GST vs W.O) */}
                            <td className="px-3 py-2.5 text-center">
                              <button
                                type="button"
                                onClick={() =>
                                  updateFormItemField(
                                    idx,
                                    "bill_type",
                                    isWO ? "GST" : "W.O"
                                  )
                                }
                                className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors ${
                                  isWO
                                    ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                                    : "bg-blue-500/10 text-blue-600 border-blue-500/30"
                                }`}
                                title="Click to toggle between GST tax and W.O (Without Bill)"
                              >
                                {isWO ? "W.O (0%)" : `GST (${selectedProd?.category?.gst_rate ?? 18}%)`}
                              </button>
                            </td>

                            {/* Auto Rate */}
                            <td className="px-3 py-3 text-right">
                              {selectedProd ? (
                                <div className="text-xs font-semibold text-foreground">
                                  {fmt(autoRate)}
                                  <span className="text-[9px] text-muted-foreground block">
                                    per {selectedProd.unit}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">--</span>
                              )}
                            </td>

                            {/* Quantity */}
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                min="0.001"
                                step="any"
                                value={item.quantity}
                                onChange={(e) =>
                                  updateFormItemField(idx, "quantity", e.target.value)
                                }
                                placeholder="Qty"
                                className="w-full bg-background border border-border rounded-md px-2 py-1.5 text-right text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-[#1E3A8A]"
                                required
                              />
                            </td>

                            {/* Discount % */}
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="any"
                                value={item.discount_pct}
                                onChange={(e) =>
                                  updateFormItemField(idx, "discount_pct", e.target.value)
                                }
                                placeholder="%"
                                className="w-full bg-background border border-border rounded-md px-2 py-1.5 text-right text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-[#1E3A8A]"
                              />
                            </td>

                            {/* Est Line Total */}
                            <td className="px-3 py-3 text-right font-bold text-foreground">
                              {selectedProd ? fmt(lineTotal) : "--"}
                            </td>

                            {/* Remove Row */}
                            <td className="px-2 py-3 text-center">
                              {formItems.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeFormItem(idx)}
                                  className="text-muted-foreground hover:text-red-500 p-1"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ── Section 3: Optional Remarks, Delivery Date & Order Discount ─ */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">
                    Expected Delivery Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">
                    Order Remarks / Instructions (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Deliver morning route, urgent, handle with care"
                    value={customRemarks}
                    onChange={(e) => setCustomRemarks(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 placeholder:text-muted-foreground"
                  />
                </div>
              </div>

              {/* ── Section 4: Live Estimated Bill Calculation ──────────────── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start pt-2">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground block">
                    Order-Level Extra Discount (₹) (Optional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={orderDiscount}
                    onChange={(e) =>
                      setOrderDiscount(e.target.value ? Number(e.target.value) : 0)
                    }
                    placeholder="0.00"
                    className="w-full md:w-64 bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Applied against subtotal before final estimate.
                  </p>
                </div>

                {/* Estimate Summary Box */}
                <div className="bg-muted/30 border-2 border-border/80 rounded-xl p-4 space-y-2 text-xs shadow-sm">
                  <div className="flex items-center justify-between pb-2 border-b border-border">
                    <span className="font-bold text-foreground uppercase tracking-wider text-[11px]">
                      Estimated Bill Summary
                    </span>
                    <span className="px-2 py-0.5 rounded bg-muted text-[10px] font-semibold text-muted-foreground">
                      {liveEstimate.totalPcsOrUnits} Units Total
                    </span>
                  </div>

                  <div className="flex justify-between text-muted-foreground pt-1">
                    <span>Products Subtotal:</span>
                    <span className="font-medium text-foreground">
                      {fmt(liveEstimate.grossSubtotal)}
                    </span>
                  </div>

                  {liveEstimate.orderDisc > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>Order Discount:</span>
                      <span className="font-medium">
                        - {fmt(liveEstimate.orderDisc)}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between text-muted-foreground">
                    <span>Estimated GST (Taxes):</span>
                    <span className="font-medium text-foreground">
                      {fmt(liveEstimate.totalGstAmt)}
                    </span>
                  </div>

                  <div className="border-t border-border pt-2.5 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-foreground block">
                        Estimated Total Amount
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        Live calculated estimate
                      </span>
                    </div>
                    <span className="text-lg font-black text-[#1E3A8A]">
                      {fmt(liveEstimate.estimatedTotal)}
                    </span>
                  </div>
                </div>
              </div>

              {/* ── Error Banner above Footer ─────────────────────────────── */}
              {createError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2 text-xs font-semibold text-red-600 animate-in fade-in">
                  <AlertCircle size={16} className="shrink-0 text-red-600" />
                  <span>{createError}</span>
                </div>
              )}

              {/* ── Modal Footer Buttons ───────────────────────────────────── */}
              <div className="border-t border-border pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsNewOrderModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createSubmitting}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#1E3A8A] hover:bg-[#1e40af] text-white text-xs font-bold shadow-md transition-all disabled:opacity-50"
                >
                  {createSubmitting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Creating Order...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={14} />
                      Confirm & Create Order ({fmt(liveEstimate.estimatedTotal)})
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Order Details & Status Workflow ───────────────────────── */}
      {selectedOrderId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/20">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold font-mono text-[#1E3A8A]">
                  {orderDetail?.order_no || `Order #${selectedOrderId}`}
                </h2>
                {orderDetail && <StatusBadge status={orderDetail.status} />}
              </div>
              <div className="flex items-center gap-2">
                {orderDetail && (
                  <>
                    <button
                      type="button"
                      onClick={() => router.push(`/invoices/new?order_id=${orderDetail.id}`)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white shadow-sm transition-all"
                      title="Convert this order to an Invoice"
                    >
                      <FileText size={13} />
                      <span>Generate Invoice</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setDeleteConfirmTarget({
                          type: "single",
                          id: orderDetail.id,
                          order_no: orderDetail.order_no,
                        })
                      }
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-500/10 border border-red-200 transition-colors"
                      title="Delete this order"
                    >
                      <Trash2 size={13} />
                      <span>Delete</span>
                    </button>
                  </>
                )}
                <button
                  onClick={() => {
                    setSelectedOrderId(null);
                    setOrderDetail(null);
                  }}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {detailLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Loader2 className="w-8 h-8 text-[#1E3A8A] animate-spin" />
                  <p className="text-sm text-muted-foreground">
                    Loading order details...
                  </p>
                </div>
              ) : actionError ? (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-xs font-medium text-red-600">
                  <AlertCircle size={16} />
                  <span>{actionError}</span>
                </div>
              ) : orderDetail ? (
                <>
                  {/* Summary Grid with Customer & Area Identification */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-muted/20 border border-border rounded-xl text-xs">
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
                        Customer & Area
                      </span>
                      <span className="font-bold text-foreground mt-0.5 block">
                        {orderDetail.customer_name}
                      </span>
                      {orderDetail.customer_area && (
                        <span className="text-[10px] text-[#1E3A8A] font-medium block">
                          Area {orderDetail.customer_area_code || "--"} • {orderDetail.customer_area}
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
                        Order Date
                      </span>
                      <span className="font-medium text-foreground mt-0.5 block">
                        {fmtDate(orderDetail.created_at)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
                        Delivery Date
                      </span>
                      <span className="font-medium text-foreground mt-0.5 block">
                        {fmtDate(orderDetail.delivery_date)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
                        Created By
                      </span>
                      <span className="font-medium text-foreground mt-0.5 block">
                        {orderDetail.created_by}
                      </span>
                    </div>
                  </div>

                  {orderDetail.remarks && (
                    <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-900/30 rounded-xl text-xs text-blue-900 dark:text-blue-200">
                      <span className="font-bold">Remarks: </span>
                      {orderDetail.remarks}
                    </div>
                  )}

                  {/* Items List */}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                      Line Items ({orderDetail.items.length})
                    </h3>
                    <div className="border border-border rounded-xl overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
                            <th className="text-left px-3 py-2.5">#</th>
                            <th className="text-left px-3 py-2.5">Product</th>
                            <th className="text-left px-3 py-2.5">Category</th>
                            <th className="text-right px-3 py-2.5">Qty</th>
                            <th className="text-right px-3 py-2.5">Rate</th>
                            <th className="text-right px-3 py-2.5">Disc %</th>
                            <th className="text-right px-3 py-2.5">GST</th>
                            <th className="text-right px-3 py-2.5">Line Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                          {orderDetail.items.map((item, i) => (
                            <tr key={item.id} className="hover:bg-muted/20">
                              <td className="px-3 py-2 text-muted-foreground">
                                {i + 1}
                              </td>
                              <td className="px-3 py-2 font-medium text-foreground">
                                {item.product_name}
                              </td>
                              <td className="px-3 py-2 text-muted-foreground">
                                {item.category_name} ({item.category_code})
                              </td>
                              <td className="px-3 py-2 text-right font-semibold text-foreground">
                                {item.quantity} {item.unit}
                              </td>
                              <td className="px-3 py-2 text-right text-muted-foreground">
                                {fmt(item.rate)}
                              </td>
                              <td className="px-3 py-2 text-right text-muted-foreground">
                                {Number(item.discount_pct)}%
                              </td>
                              <td className="px-3 py-2 text-right text-muted-foreground">
                                <span className="text-[10px] block">
                                  {Number(item.gst_rate)}%
                                </span>
                                {fmt(item.gst_amount)}
                              </td>
                              <td className="px-3 py-2 text-right font-bold text-foreground">
                                {fmt(item.total)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Financial Breakdown */}
                  <div className="flex justify-end">
                    <div className="w-full sm:w-72 bg-muted/30 border border-border rounded-xl p-4 space-y-2 text-xs">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Items Subtotal:</span>
                        <span className="font-medium text-foreground">
                          {fmt(orderDetail.subtotal)}
                        </span>
                      </div>
                      {Number(orderDetail.discount_amount) > 0 && (
                        <div className="flex justify-between text-emerald-600">
                          <span>Discount Amount:</span>
                          <span className="font-medium">
                            - {fmt(orderDetail.discount_amount)}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between text-muted-foreground">
                        <span>GST Total:</span>
                        <span className="font-medium text-foreground">
                          {fmt(orderDetail.gst_amount)}
                        </span>
                      </div>
                      <div className="border-t border-border pt-2 flex justify-between text-sm font-bold text-foreground">
                        <span>Grand Total:</span>
                        <span className="text-[#1E3A8A]">
                          {fmt(orderDetail.total_amount)}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              ) : null}
            </div>

            {/* Status Workflow Actions Footer */}
            {orderDetail && (
              <div className="px-6 py-4 border-t border-border bg-muted/20 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-muted-foreground">
                  Current Status:{" "}
                  <span className="font-semibold text-foreground capitalize">
                    {orderDetail.status}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => router.push(`/invoices/new?order_id=${orderDetail.id}`)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all"
                  >
                    <FileText size={14} />
                    Generate Invoice
                  </button>

                  {orderDetail.status === "pending" && (
                    <>
                      <button
                        onClick={() => handleUpdateStatus("cancelled")}
                        disabled={statusUpdating}
                        className="px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold transition-colors disabled:opacity-50"
                      >
                        Cancel Order
                      </button>
                      <button
                        onClick={() => handleUpdateStatus("approved")}
                        disabled={statusUpdating}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50"
                      >
                        {statusUpdating ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <CheckCircle2 size={14} />
                        )}
                        Approve & Reserve Stock
                      </button>
                    </>
                  )}

                  {orderDetail.status === "approved" && (
                    <>
                      <button
                        onClick={() => handleUpdateStatus("cancelled")}
                        disabled={statusUpdating}
                        className="px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold transition-colors disabled:opacity-50"
                      >
                        Cancel Order
                      </button>
                      <button
                        onClick={() => handleUpdateStatus("preparing")}
                        disabled={statusUpdating}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50"
                      >
                        {statusUpdating ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Package size={14} />
                        )}
                        Start Preparing
                      </button>
                    </>
                  )}

                  {orderDetail.status === "preparing" && (
                    <>
                      <button
                        onClick={() => handleUpdateStatus("cancelled")}
                        disabled={statusUpdating}
                        className="px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold transition-colors disabled:opacity-50"
                      >
                        Cancel Order
                      </button>
                      <button
                        onClick={() => handleUpdateStatus("dispatched")}
                        disabled={statusUpdating}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50"
                      >
                        {statusUpdating ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Truck size={14} />
                        )}
                        Dispatch & Deduct Stock
                      </button>
                    </>
                  )}

                  {orderDetail.status === "dispatched" && (
                    <button
                      onClick={() => handleUpdateStatus("delivered")}
                      disabled={statusUpdating}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50"
                    >
                      {statusUpdating ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <CheckCircle2 size={14} />
                      )}
                      Mark as Delivered
                    </button>
                  )}

                  {(orderDetail.status === "delivered" ||
                    orderDetail.status === "cancelled") && (
                    <span className="text-xs text-muted-foreground italic">
                      Order is in final state ({orderDetail.status}).
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Modal: Delete Order Confirmation Dialog ─────────────────────── */}
      {deleteConfirmTarget !== null && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-full bg-red-500/10 text-red-600">
                  <Trash2 size={22} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    {deleteConfirmTarget.type === "bulk"
                      ? `Delete ${deleteConfirmTarget.count} Orders?`
                      : `Delete Order ${deleteConfirmTarget.order_no}?`}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    This action cannot be undone. Any reserved inventory will be automatically released.
                  </p>
                </div>
              </div>

              {deleteError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2 text-xs font-semibold text-red-600">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{deleteError}</span>
                </div>
              )}

              <div className="border-t border-border pt-4 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => {
                    setDeleteConfirmTarget(null);
                    setDeleteError("");
                  }}
                  className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={handleConfirmDelete}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50"
                >
                  {deleting ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 size={13} />
                      Confirm Delete
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}