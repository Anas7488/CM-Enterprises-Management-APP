"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Plus,
  Search,
  Loader2,
  AlertCircle,
  Pencil,
  CheckCircle2,
  X,
  Hash,
  Percent,
  Package,
} from "lucide-react";
import { authFetch } from "@/lib/auth";

const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;

const GST_RATES = [0, 5, 12, 18, 28];

interface Category {
  id: number;
  code: string;
  name: string;
  group: string;
  hsn_code?: string;
  gst_rate?: number;
}

interface Product {
  id: number;
  categoryCode: string;
  categoryName: string;
  categoryId: number;
  type: string;
  shadeName: string;
  shadeCode: string;
  variantName: string;
  variantCode: string;
  displayName: string;
  size: string;
  unit: string;
  mrp: number;
  dealer_price?: number;
  stock: number;
  hsn_code?: string;
  gst_rate?: number;
  effective_hsn?: string;
  effective_gst_rate?: number;
}

export default function ProductsPage() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Edit Category Modal
  const [editCat, setEditCat] = useState<Category | null>(null);
  const [editHsn, setEditHsn] = useState("");
  const [editGst, setEditGst] = useState<number>(18);
  const [editName, setEditName] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [editSuccess, setEditSuccess] = useState("");

  // Manage categories modal
  const [showCatManager, setShowCatManager] = useState(false);

  // Add Product Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState("");
  const [addSuccess, setAddSuccess] = useState("");

  // Add Product Form State
  const [addCategoryId, setAddCategoryId] = useState<number | "">("");
  const [addProductType, setAddProductType] = useState<"shaded" | "variant">("shaded");
  const [addShadeName, setAddShadeName] = useState("");
  const [addShadeCode, setAddShadeCode] = useState("");
  const [addVariantName, setAddVariantName] = useState("");
  const [addVariantCode, setAddVariantCode] = useState("");
  const [addSize, setAddSize] = useState("");
  const [addUnit, setAddUnit] = useState("PCS");
  const [addMrp, setAddMrp] = useState("");
  const [addDealerPrice, setAddDealerPrice] = useState("");
  const [addPcsPerCarton, setAddPcsPerCarton] = useState("");
  const [addReorderLevel, setAddReorderLevel] = useState("10");
  const [addHsn, setAddHsn] = useState("");
  const [addGst, setAddGst] = useState<number>(18);
  const [addInitialStock, setAddInitialStock] = useState("0");

  async function loadData() {
    try {
      setLoading(true);
      const [catRes, prodRes] = await Promise.all([
        authFetch("/products/categories"),
        authFetch("/products"),
      ]);

      if (!catRes.ok || !prodRes.ok) {
        throw new Error("Failed to load products from backend.");
      }

      const catData = await catRes.json();
      const prodData = await prodRes.json();

      const mappedCats: Category[] = catData.map((c: any) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        group: c.group,
        hsn_code: c.hsn_code || "",
        gst_rate: Number(c.gst_rate ?? 18),
      }));

      const mappedProds: Product[] = prodData.map((p: any) => {
        const cat = p.category;
        return {
          id: p.id,
          categoryCode: cat?.code || "--",
          categoryName: cat?.name || "Unknown",
          categoryId: cat?.id || 0,
          type: p.product_type || "shaded",
          shadeName: p.shade_name || "",
          shadeCode: p.shade_code || "",
          variantName: p.variant_name || "",
          variantCode: p.variant_code || "",
          displayName: p.display_name || "",
          size: p.size || "",
          unit: p.unit || "PCS",
          mrp: Number(p.mrp) || 0,
          dealer_price: p.dealer_price != null ? Number(p.dealer_price) : undefined,
          stock: p.stock || 0,
          hsn_code: p.hsn_code || "",
          gst_rate: p.gst_rate != null ? Number(p.gst_rate) : undefined,
          effective_hsn: p.effective_hsn || "",
          effective_gst_rate: p.effective_gst_rate != null ? Number(p.effective_gst_rate) : 18,
        };
      });

      setCategories(mappedCats);
      setProducts(mappedProds);
    } catch (err: any) {
      setError(err.message || "Cannot connect to server.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return products.filter((p) => {
      const matchesCategory = activeCategory === "All" || p.categoryCode === activeCategory;
      if (!matchesCategory) return false;
      if (!q) return true;
      const haystack = [
        p.categoryCode,
        p.categoryName,
        p.shadeName,
        p.shadeCode,
        p.variantName,
        p.variantCode,
        p.displayName,
        p.size,
        p.effective_hsn,
      ]
        .join(" ")
        .toLowerCase();
      const words = q.split(/\s+/);
      return words.every((w) => haystack.includes(w));
    });
  }, [search, activeCategory, products]);

  // ── Open edit category modal ─────────────────────────────────────────────
  function openEditCat(cat: Category) {
    setEditCat(cat);
    setEditHsn(cat.hsn_code || "");
    setEditGst(Number(cat.gst_rate ?? 18));
    setEditName(cat.name);
    setEditError("");
    setEditSuccess("");
  }

  async function saveCategory() {
    if (!editCat) return;
    setEditSaving(true);
    setEditError("");
    setEditSuccess("");
    try {
      const res = await authFetch(`/products/categories/${editCat.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hsn_code: editHsn || null,
          gst_rate: editGst,
          name: editName || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to update");
      }
      setEditSuccess("✅ Updated successfully!");
      loadData();
      setTimeout(() => {
        setEditCat(null);
        setShowCatManager(false);
      }, 1200);
    } catch (e: any) {
      setEditError(e.message);
    } finally {
      setEditSaving(false);
    }
  }

  // ── Open Add Product Modal ────────────────────────────────────────────────
  function handleOpenAddProduct() {
    const defaultCat = categories[0];
    if (defaultCat) {
      setAddCategoryId(defaultCat.id);
      setAddProductType(defaultCat.group === "variant" ? "variant" : "shaded");
      setAddHsn(defaultCat.hsn_code || "");
      setAddGst(defaultCat.gst_rate ?? 18);
    } else {
      setAddCategoryId("");
      setAddProductType("shaded");
      setAddHsn("");
      setAddGst(18);
    }
    setAddShadeName("");
    setAddShadeCode("");
    setAddVariantName("");
    setAddVariantCode("");
    setAddSize("");
    setAddUnit("PCS");
    setAddMrp("");
    setAddDealerPrice("");
    setAddPcsPerCarton("");
    setAddReorderLevel("10");
    setAddInitialStock("0");
    setAddError("");
    setAddSuccess("");
    setShowAddModal(true);
  }

  function handleCategoryChange(catIdNum: number) {
    setAddCategoryId(catIdNum);
    const selected = categories.find((c) => c.id === catIdNum);
    if (selected) {
      setAddProductType(selected.group === "variant" ? "variant" : "shaded");
      setAddHsn(selected.hsn_code || "");
      setAddGst(selected.gst_rate ?? 18);
    }
  }

  // Add Product Preview Name
  const addDisplayNamePreview = useMemo(() => {
    const selected = categories.find((c) => c.id === addCategoryId);
    const catCode = selected ? selected.code : "XX";
    if (addProductType === "shaded") {
      const name = addShadeName.trim() || "Shade Name";
      const sizeStr = addSize.trim() || "Size";
      if (addShadeCode.trim()) {
        return `${catCode} ${name} ${sizeStr} - ${addShadeCode.trim()}`;
      }
      return `${catCode} ${name} ${sizeStr}`;
    } else {
      const name = addVariantName.trim() || "Variant Name";
      const codeStr = addVariantCode.trim() ? `(${addVariantCode.trim()}) ` : "";
      const sizeStr = addSize.trim() || "Size";
      return `${catCode} ${name} ${codeStr}${sizeStr}`;
    }
  }, [
    addCategoryId,
    addProductType,
    addShadeName,
    addShadeCode,
    addVariantName,
    addVariantCode,
    addSize,
    categories,
  ]);

  async function saveProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!addCategoryId) {
      setAddError("Please select a product category.");
      return;
    }
    if (addProductType === "shaded" && !addShadeName.trim()) {
      setAddError("Please enter a shade name.");
      return;
    }
    if (addProductType === "variant" && !addVariantName.trim()) {
      setAddError("Please enter a variant name.");
      return;
    }
    if (!addSize.trim()) {
      setAddError("Please specify a pack size (e.g. 200ml, 1L, 50mm).");
      return;
    }
    const mrpNum = parseFloat(addMrp);
    if (isNaN(mrpNum) || mrpNum <= 0) {
      setAddError("Please enter a valid MRP greater than 0.");
      return;
    }

    setAddSaving(true);
    setAddError("");
    setAddSuccess("");

    try {
      const selectedCat = categories.find((c) => c.id === addCategoryId);
      // If HSN or GST match category, pass null to inherit from category, or pass explicit override
      const payload: any = {
        category_id: Number(addCategoryId),
        product_type: addProductType,
        size: addSize.trim(),
        unit: addUnit.trim() || "PCS",
        mrp: mrpNum,
        reorder_level: parseInt(addReorderLevel) || 10,
        initial_stock: parseInt(addInitialStock) || 0,
      };

      if (addProductType === "shaded") {
        payload.shade_name = addShadeName.trim();
        payload.shade_code = addShadeCode.trim() || null;
      } else {
        payload.variant_name = addVariantName.trim();
        payload.variant_code = addVariantCode.trim() || null;
      }

      if (addDealerPrice) {
        const dp = parseFloat(addDealerPrice);
        if (!isNaN(dp)) payload.dealer_price = dp;
      }
      if (addPcsPerCarton) {
        const pcs = parseInt(addPcsPerCarton);
        if (!isNaN(pcs)) payload.pcs_per_carton = pcs;
      }

      // HSN / GST override logic
      if (addHsn && addHsn !== selectedCat?.hsn_code) {
        payload.hsn_code = addHsn;
      }
      if (addGst !== selectedCat?.gst_rate) {
        payload.gst_rate = addGst;
      }

      const res = await authFetch("/products/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to create product");
      }

      setAddSuccess("✅ Product created successfully!");
      loadData();
      setTimeout(() => {
        setShowAddModal(false);
      }, 1000);
    } catch (err: any) {
      setAddError(err.message || "Failed to create product");
    } finally {
      setAddSaving(false);
    }
  }

  // Count products per category
  const catProductCount = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of products) {
      counts[p.categoryCode] = (counts[p.categoryCode] || 0) + 1;
    }
    return counts;
  }, [products]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="w-8 h-8 text-[#1E3A8A] animate-spin" />
        <p className="text-sm text-muted-foreground font-medium">Loading product catalog...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 p-6 bg-red-500/5 rounded-2xl border border-red-500/10 max-w-lg mx-auto mt-12">
        <AlertCircle className="w-10 h-10 text-red-500" />
        <h3 className="text-base font-semibold text-foreground">Failed to Load Products</h3>
        <p className="text-sm text-muted-foreground text-center">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Products</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {products.length} total products across {categories.length} categories
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCatManager(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border bg-card hover:bg-muted text-sm font-medium text-foreground transition-colors"
          >
            <Hash size={14} />
            Manage HSN / GST
          </button>
          <button
            onClick={handleOpenAddProduct}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#1E3A8A] hover:bg-[#1e40af] text-white text-sm font-medium shadow-sm transition-all active:scale-[0.98]"
          >
            <Plus size={16} />
            Add Product
          </button>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
        <div className="relative mb-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder='Search e.g. "01 gold", "spray grey", "enamel copper"...'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveCategory("All")}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border ${
              activeCategory === "All"
                ? "bg-[#1E3A8A] text-white border-[#1E3A8A]"
                : "bg-background text-muted-foreground border-border hover:bg-muted"
            }`}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c.code}
              onClick={() => setActiveCategory(c.code)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border ${
                activeCategory === c.code
                  ? "bg-[#1E3A8A] text-white border-[#1E3A8A]"
                  : "bg-background text-muted-foreground border-border hover:bg-muted"
              }`}
            >
              {c.code} {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* ── Products Table ─────────────────────────────────────────────── */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Product</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Category</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">HSN</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">GST %</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Size</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">MRP</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Stock</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-border/50 last:border-0 hover:bg-muted/30 cursor-pointer"
                >
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-foreground">{p.displayName}</span>
                      {p.shadeCode && (
                        <span className="text-[10px] text-muted-foreground mt-0.5">Code: {p.shadeCode}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted text-[10px] font-medium text-foreground">
                      {p.categoryCode} {p.categoryName}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-mono ${p.effective_hsn ? "text-foreground" : "text-red-500"}`}>
                      {p.effective_hsn || "MISSING"}
                    </span>
                    {p.hsn_code && (
                      <span className="ml-1 text-[9px] text-amber-600 font-medium" title="Product-specific override">
                        (override)
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-semibold text-foreground">{p.effective_gst_rate}%</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{p.size}</td>
                  <td className="px-4 py-3 text-xs font-semibold text-foreground">
                    {p.mrp > 0 ? fmt(p.mrp) : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs font-semibold ${
                        p.stock < 10 ? "text-red-500" : p.stock < 30 ? "text-amber-600" : "text-emerald-600"
                      }`}
                    >
                      {p.stock} {p.unit}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-sm text-muted-foreground">
            No products found matching your search.
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          Add Product Modal
          ═══════════════════════════════════════════════════════════════════ */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-border bg-muted/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#1E3A8A]/10 flex items-center justify-center text-[#1E3A8A]">
                  <Package size={20} />
                </div>
                <div>
                  <h2 className="font-bold text-foreground text-base">Add New Product</h2>
                  <p className="text-xs text-muted-foreground">
                    Create a new SKU with auto-populated HSN, GST, and inventory tracking.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={saveProduct} className="flex-1 overflow-y-auto p-6 space-y-5">
              {addSuccess && (
                <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-sm text-emerald-700">
                  <CheckCircle2 size={16} /> {addSuccess}
                </div>
              )}
              {addError && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-600">
                  <AlertCircle size={16} /> {addError}
                </div>
              )}

              {/* Display Name Preview */}
              <div className="bg-muted/40 border border-border/80 rounded-xl p-3.5">
                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Catalog Display Name Preview
                </div>
                <div className="text-sm font-bold text-foreground font-mono">
                  {addDisplayNamePreview}
                </div>
              </div>

              {/* Category & Type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                    Product Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={addCategoryId}
                    onChange={(e) => handleCategoryChange(Number(e.target.value))}
                    className="w-full px-3 py-2.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/30"
                    required
                  >
                    <option value="" disabled>Select Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} - {c.name} ({c.group})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                    Product Group
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setAddProductType("shaded")}
                      className={`flex-1 py-2 rounded-lg border text-xs font-semibold transition-all ${
                        addProductType === "shaded"
                          ? "border-[#1E3A8A] bg-[#1E3A8A]/10 text-[#1E3A8A]"
                          : "border-border bg-background text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      🎨 Shaded (Paints/Emulsion)
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddProductType("variant")}
                      className={`flex-1 py-2 rounded-lg border text-xs font-semibold transition-all ${
                        addProductType === "variant"
                          ? "border-[#1E3A8A] bg-[#1E3A8A]/10 text-[#1E3A8A]"
                          : "border-border bg-background text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      🛠️ Variant (Brushes/Hardware)
                    </button>
                  </div>
                </div>
              </div>

              {/* Shaded Fields */}
              {addProductType === "shaded" ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-muted/20 p-4 rounded-xl border border-border/50">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                      Shade Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Art Metallic Gold, Signal Red, White"
                      value={addShadeName}
                      onChange={(e) => setAddShadeName(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/30"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                      Shade Code (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 2001"
                      value={addShadeCode}
                      onChange={(e) => setAddShadeCode(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/30"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-muted/20 p-4 rounded-xl border border-border/50">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                      Variant Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Flat Brush, Synthetic Roller, Masking Tape"
                      value={addVariantName}
                      onChange={(e) => setAddVariantName(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/30"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                      Variant Code (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. F1, 2IN, R10"
                      value={addVariantCode}
                      onChange={(e) => setAddVariantCode(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/30"
                    />
                  </div>
                </div>
              )}

              {/* Size, Unit, Carton */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                    Pack Size <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 200ml, 1L, 4L, 20L, 50mm"
                    value={addSize}
                    onChange={(e) => setAddSize(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/30"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                    Unit of Measurement
                  </label>
                  <select
                    value={addUnit}
                    onChange={(e) => setAddUnit(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/30"
                  >
                    <option value="PCS">PCS (Pieces)</option>
                    <option value="LTR">LTR (Litres)</option>
                    <option value="KG">KG (Kilograms)</option>
                    <option value="SET">SET (Sets)</option>
                    <option value="BOX">BOX (Boxes)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                    Pcs Per Carton (Optional)
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 12"
                    value={addPcsPerCarton}
                    onChange={(e) => setAddPcsPerCarton(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/30"
                  />
                </div>
              </div>

              {/* Pricing & Stock */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                    MRP (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={addMrp}
                    onChange={(e) => setAddMrp(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/30 font-semibold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                    Dealer Price (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Optional"
                    value={addDealerPrice}
                    onChange={(e) => setAddDealerPrice(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                    Initial Stock Qty
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={addInitialStock}
                    onChange={(e) => setAddInitialStock(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                    Reorder Level
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="10"
                    value={addReorderLevel}
                    onChange={(e) => setAddReorderLevel(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/30"
                  />
                </div>
              </div>

              {/* HSN & GST Fields */}
              <div className="border-t border-border pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5">
                      <Hash size={13} /> HSN Code (Auto-filled from Category)
                    </label>
                    <input
                      type="text"
                      maxLength={10}
                      placeholder="e.g. 32081010"
                      value={addHsn}
                      onChange={(e) => setAddHsn(e.target.value.replace(/[^0-9]/g, ""))}
                      className="w-full px-3 py-2.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/30 font-mono tracking-wider"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Inherits from category unless you need a product-specific override.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5">
                      <Percent size={13} /> GST Rate
                    </label>
                    <div className="flex gap-2">
                      {GST_RATES.map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setAddGst(r)}
                          className={`flex-1 py-2 rounded-lg border text-xs font-bold transition-all ${
                            addGst === r
                              ? "border-[#1E3A8A] bg-[#1E3A8A]/10 text-[#1E3A8A]"
                              : "border-border bg-background text-muted-foreground hover:bg-muted/50"
                          }`}
                        >
                          {r}%
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 text-sm font-medium rounded-lg border border-border hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addSaving}
                  className="px-6 py-2.5 bg-[#1E3A8A] hover:bg-[#1e40af] text-white text-sm font-bold rounded-lg transition-all disabled:opacity-50 flex items-center gap-2 shadow-sm"
                >
                  {addSaving ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Adding Product...
                    </>
                  ) : (
                    <>
                      <Plus size={16} /> Add Product to Catalog
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          Manage HSN / GST Modal — lists all categories with edit buttons
          ═══════════════════════════════════════════════════════════════════ */}
      {showCatManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-border flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#1E3A8A]/10 flex items-center justify-center">
                  <Hash size={18} className="text-[#1E3A8A]" />
                </div>
                <div>
                  <h2 className="font-bold text-foreground">Manage HSN Codes & GST Rates</h2>
                  <p className="text-xs text-muted-foreground">
                    Update HSN and GST for each product category. Changes apply to all products in that category.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCatManager(false)}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Category List */}
            <div className="flex-1 overflow-y-auto p-2">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card z-10">
                  <tr className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                    <th className="text-left px-3 py-2.5">Category</th>
                    <th className="text-left px-3 py-2.5">HSN Code</th>
                    <th className="text-left px-3 py-2.5">GST %</th>
                    <th className="text-center px-3 py-2.5">Products</th>
                    <th className="text-center px-3 py-2.5">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {categories.map((cat) => {
                    const isPlaceholder = !cat.hsn_code || cat.hsn_code === "32081010";
                    return (
                      <tr key={cat.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-[#1E3A8A]/10 text-[#1E3A8A] text-[11px] font-bold flex-shrink-0">
                              {cat.code}
                            </span>
                            <div>
                              <div className="text-xs font-semibold text-foreground">{cat.name}</div>
                              <div className="text-[10px] text-muted-foreground capitalize">{cat.group}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className={`font-mono text-xs px-2 py-0.5 rounded ${
                              isPlaceholder
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                            }`}
                          >
                            {cat.hsn_code || "—"}
                          </span>
                          {isPlaceholder && (
                            <span className="ml-1.5 text-[9px] text-amber-600 font-medium">⚠ placeholder</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-xs font-semibold text-foreground">
                          {cat.gst_rate}%
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className="text-xs text-muted-foreground">
                            {catProductCount[cat.code] || 0}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <button
                            onClick={() => openEditCat(cat)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-[#1E3A8A] hover:bg-[#1E3A8A]/10 rounded-lg transition-colors"
                          >
                            <Pencil size={12} /> Edit
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          Edit Single Category Modal
          ═══════════════════════════════════════════════════════════════════ */}
      {editCat && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-[#1E3A8A]/10 text-[#1E3A8A] text-sm font-bold">
                  {editCat.code}
                </span>
                <div>
                  <h3 className="font-bold text-foreground text-sm">Edit Category</h3>
                  <p className="text-xs text-muted-foreground">{editCat.name}</p>
                </div>
              </div>
              <button onClick={() => setEditCat(null)} className="p-2 hover:bg-muted rounded-lg transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {editSuccess && (
                <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-sm text-emerald-700">
                  <CheckCircle2 size={16} /> {editSuccess}
                </div>
              )}
              {editError && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-600">
                  <AlertCircle size={16} /> {editError}
                </div>
              )}

              {/* Category Name */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Category Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/30"
                />
              </div>

              {/* HSN Code */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5">
                  <Hash size={12} /> HSN Code
                </label>
                <input
                  type="text"
                  maxLength={10}
                  placeholder="e.g. 32081010"
                  value={editHsn}
                  onChange={(e) => setEditHsn(e.target.value.replace(/[^0-9]/g, ""))}
                  className="w-full px-3 py-2.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/30 font-mono tracking-wider"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  8-digit code from your GST/Tally HSN master. Check with your CA for correct codes.
                </p>
              </div>

              {/* GST Rate */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5">
                  <Percent size={12} /> GST Rate
                </label>
                <div className="flex gap-2">
                  {GST_RATES.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setEditGst(r)}
                      className={`flex-1 py-2 rounded-lg border text-sm font-bold transition-all ${
                        editGst === r
                          ? "border-[#1E3A8A] bg-[#1E3A8A]/10 text-[#1E3A8A]"
                          : "border-border bg-background text-muted-foreground hover:bg-muted/50"
                      }`}
                    >
                      {r}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Info */}
              <div className="bg-muted/30 p-3 rounded-lg text-[11px] text-muted-foreground space-y-1">
                <p>• Changes will apply to <strong className="text-foreground">{catProductCount[editCat.code] || 0} products</strong> in this category.</p>
                <p>• Products with per-product HSN overrides won't be affected.</p>
                <p>• Invoice will use the updated HSN code for GST calculations.</p>
              </div>

              {/* Save */}
              <button
                onClick={saveCategory}
                disabled={editSaving}
                className="w-full py-2.5 bg-[#1E3A8A] hover:bg-[#1e40af] text-white text-sm font-bold rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {editSaving ? (
                  <><Loader2 size={16} className="animate-spin" /> Saving...</>
                ) : (
                  <><CheckCircle2 size={16} /> Save Changes</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
