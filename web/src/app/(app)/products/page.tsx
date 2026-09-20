"use client";

import { useState, useMemo, useEffect } from "react";
import { Plus, Search, Loader2, AlertCircle } from "lucide-react";
import { authFetch } from "@/lib/auth";

const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;

interface Category {
  id: number;
  code: string;
  name: string;
  group: string;
}

interface Product {
  id: number;
  categoryCode: string;
  categoryName: string;
  type: string;
  shadeName: string;
  shadeCode: string;
  variantName: string;
  variantCode: string;
  displayName: string;
  size: string;
  unit: string;
  mrp: number;
  stock: number;
}

function productDisplayName(p: Product) {
  return `${p.categoryCode} ${p.displayName}`;
}

export default function ProductsPage() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const [catRes, prodRes] = await Promise.all([
          authFetch("/products/categories"),
          authFetch("/products"),
        ]);

        if (!catRes.ok || !prodRes.ok) {
          throw new Error("Failed to load products from backend.");
        }

        const catData = await catRes.json();
        const prodData = await prodRes.json();

        // Map categories
        const mappedCats: Category[] = catData.map((c: any) => ({
          id: c.id,
          code: c.code,
          name: c.name,
          group: c.group,
        }));

        // Build category lookup
        const catLookup: Record<number, Category> = {};
        for (const c of mappedCats) {
          catLookup[c.id] = c;
        }

        // Map products
        const mappedProds: Product[] = prodData.map((p: any) => {
          const cat = p.category;
          return {
            id: p.id,
            categoryCode: cat?.code || "--",
            categoryName: cat?.name || "Unknown",
            type: p.product_type || "shaded",
            shadeName: p.shade_name || "",
            shadeCode: p.shade_code || "",
            variantName: p.variant_name || "",
            variantCode: p.variant_code || "",
            displayName: p.display_name || "",
            size: p.size || "",
            unit: p.unit || "PCS",
            mrp: Number(p.mrp) || 0,
            stock: p.stock || 0,
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
      ]
        .join(" ")
        .toLowerCase();

      const words = q.split(/\s+/);
      return words.every((w) => haystack.includes(w));
    });
  }, [search, activeCategory, products]);

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
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#1E3A8A] hover:bg-[#1e40af] text-white text-sm font-medium">
          <Plus size={16} />
          Add Product
        </button>
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

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Product</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Category</th>
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
                      <span className="text-xs font-medium text-foreground">{productDisplayName(p)}</span>
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
    </div>
  );
}
