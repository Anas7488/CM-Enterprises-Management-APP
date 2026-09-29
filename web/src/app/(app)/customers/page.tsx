"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Phone, MapPin, Loader2, AlertCircle } from "lucide-react";
import { authFetch } from "@/lib/auth";

const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;

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

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadCustomers() {
      try {
        const res = await authFetch("/customers");
        if (!res.ok) {
          throw new Error("Failed to load customer list from backend.");
        }
        const data = await res.json();
        
        // Map backend schema to existing frontend structure
        const mapped: Customer[] = data.map((c: any) => ({
          id: c.id,
          areaCode: c.area?.route?.route_number ? String(c.area.route.route_number).padStart(2, "0") : "--",
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
    loadCustomers();
  }, []);

  const filtered = customers.filter((c) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    
    // Split search query into space-separated keywords
    const keywords = q.split(/\s+/).filter(Boolean);
    
    // Every keyword in the query must match at least one field in the customer profile
    return keywords.every((keyword) => 
      c.shopName.toLowerCase().includes(keyword) ||
      c.city.toLowerCase().includes(keyword) ||
      c.areaCode.toLowerCase().includes(keyword) ||
      c.contactPerson.toLowerCase().includes(keyword)
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Customers</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {customers.length} total customers
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#1E3A8A] hover:bg-[#1e40af] text-white text-sm font-medium">
          <Plus size={16} />
          Add Customer
        </button>
      </div>

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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((c) => (
          <div
            key={c.id}
            className="bg-card rounded-xl border border-border p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#1E3A8A]/10 text-[#1E3A8A]">
                  {c.areaCode}
                </span>
                <h3 className="text-sm font-semibold text-foreground leading-tight">
                  {c.shopName}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
              <MapPin size={12} />
              {c.city}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
              <Phone size={12} />
              {c.contactPerson} · {c.phone}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-border/50">
              <div>
                <p className="text-[10px] text-muted-foreground">Outstanding</p>
                <p
                  className={`text-sm font-bold ${
                    c.outstanding > 0 ? "text-red-500" : "text-emerald-600"
                  }`}
                >
                  {fmt(c.outstanding)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground">Credit Limit</p>
                <p className="text-sm font-medium text-foreground">{fmt(c.creditLimit)}</p>
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
    </div>
  );
}
