"use client";

import { useMemo, useState } from "react";
import { Wallet, Search, Filter, Plus, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { useDateRange, filterByRange } from "@/lib/date-range-context";
import { KpiCard } from "@/shared/ui/KpiCard";

// ─── Format Helpers ────────────────────────────────────────────────────────
const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;

// ─── Mock Payments Data ────────────────────────────────────────────────────
const MOCK_PAYMENTS = [
  { id: "1", receiptNo: "RCP-1045", customer: "Raj Hardware, Pune", amount: 45000, date: "2026-06-22", method: "Bank Transfer", status: "completed", invoiceRef: "INV-2023" },
  { id: "2", receiptNo: "RCP-1046", customer: "Krishna Paints, Nashik", amount: 12500, date: "2026-06-20", method: "Cash", status: "completed", invoiceRef: "INV-2018" },
  { id: "3", receiptNo: "RCP-1047", customer: "Metro Hardware", amount: 32000, date: "2026-06-18", method: "Cheque", status: "pending", invoiceRef: "INV-2025" },
  { id: "4", receiptNo: "RCP-1048", customer: "Patel Stores, Solapur", amount: 18000, date: "2026-05-15", method: "Bank Transfer", status: "completed", invoiceRef: "INV-1990" },
  { id: "5", receiptNo: "RCP-1049", customer: "Shree Colors", amount: 55000, date: "2026-05-10", method: "Cheque", status: "overdue", invoiceRef: "INV-1982" },
  { id: "6", receiptNo: "RCP-1050", customer: "Raj Hardware, Pune", amount: 25000, date: "2026-06-05", method: "Cash", status: "completed", invoiceRef: "INV-2005" },
];

export default function CollectionsPage() {
  const { startDate, endDate } = useDateRange();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // 1. Filter by global date range
  const dateFiltered = useMemo(() => filterByRange(MOCK_PAYMENTS, startDate, endDate), [startDate, endDate]);

  // 2. Filter by local search term and dropdown filters
  const filteredPayments = useMemo(() => {
    return dateFiltered.filter((item) => {
      const matchesSearch = 
        item.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.receiptNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.invoiceRef.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = selectedStatus ? item.status === selectedStatus : true;
      const matchesMethod = selectedMethod ? item.method === selectedMethod : true;

      return matchesSearch && matchesStatus && matchesMethod;
    });
  }, [dateFiltered, searchTerm, selectedStatus, selectedMethod]);

  // ─── KPIs ────────────────────────────────────────────────────────────────
  const totalCollected = filteredPayments.filter(p => p.status === "completed").reduce((sum, p) => sum + p.amount, 0);
  const pendingAmount = filteredPayments.filter(p => p.status === "pending").reduce((sum, p) => sum + p.amount, 0);
  const overdueAmount = filteredPayments.filter(p => p.status === "overdue").reduce((sum, p) => sum + p.amount, 0);
  const totalTransactions = filteredPayments.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Collections</h1>
          <p className="text-sm text-muted-foreground mt-1">Track received payments, pending dues, and accounts receivable.</p>
        </div>
        <button className="flex items-center gap-2 bg-[#1E3A8A] hover:bg-[#1e40af] text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm transition-all">
          <Plus size={16} />
          Record Payment
        </button>
      </div>

      {/* ── KPI Cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={Wallet}
          label="Total Collected"
          value={fmt(totalCollected)}
          sub="Successfully received"
          trend="Healthy"
          trendUp={true}
          color="bg-emerald-600"
        />
        <KpiCard
          icon={FileText}
          label="Total Transactions"
          value={String(totalTransactions)}
          sub="In selected range"
          trend="Active"
          trendUp={true}
          color="bg-[#1E3A8A]"
        />
        <KpiCard
          icon={CheckCircle2}
          label="Pending Clearance"
          value={fmt(pendingAmount)}
          sub="Cheques/Transfers pending"
          trend="Processing"
          trendUp={true}
          color="bg-amber-500"
        />
        <KpiCard
          icon={AlertCircle}
          label="Overdue Collections"
          value={fmt(overdueAmount)}
          sub="Immediate action required"
          trend="High Risk"
          trendUp={false}
          color="bg-red-500"
        />
      </div>

      {/* ── Data Table Area ───────────────────────────────────────── */}
      <div className="bg-card/60 backdrop-blur-xl border border-border rounded-xl shadow-sm overflow-visible flex flex-col">
        {/* Toolbar */}
        <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by customer, receipt, or invoice..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-background border border-border/60 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/40 transition-all placeholder:text-muted-foreground"
            />
          </div>
          
          <div className="relative">
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-foreground bg-background border border-border/60 rounded-lg hover:bg-muted transition-all"
            >
              <Filter size={14} />
              Filters
              {(selectedStatus || selectedMethod) && (
                <span className="w-2 h-2 rounded-full bg-[#F97316]" />
              )}
            </button>
            
            {showFilters && (
              <div className="absolute right-0 top-12 w-64 bg-card border border-border rounded-xl shadow-xl z-50 p-4 space-y-4">
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Status</label>
                  <select 
                    value={selectedStatus || ""} 
                    onChange={(e) => setSelectedStatus(e.target.value || null)}
                    className="w-full bg-muted border border-border/60 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1E3A8A]/40"
                  >
                    <option value="">All Statuses</option>
                    <option value="completed">Completed</option>
                    <option value="pending">Pending</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Payment Method</label>
                  <select 
                    value={selectedMethod || ""} 
                    onChange={(e) => setSelectedMethod(e.target.value || null)}
                    className="w-full bg-muted border border-border/60 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1E3A8A]/40"
                  >
                    <option value="">All Methods</option>
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
                <div className="pt-2 flex justify-between items-center border-t border-border/50">
                  <span className="text-xs text-muted-foreground font-medium">{filteredPayments.length} results</span>
                  <button 
                    onClick={() => { setSelectedStatus(null); setSelectedMethod(null); }}
                    className="text-xs text-red-500 hover:text-red-600 font-medium transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-muted/50 border-b border-border text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              <tr>
                <th className="px-6 py-3">Receipt / Invoice</th>
                <th className="px-6 py-3">Customer</th>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3 text-right">Amount</th>
                <th className="px-6 py-3">Method</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filteredPayments.length > 0 ? (
                filteredPayments.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-foreground">{item.receiptNo}</span>
                        <span className="text-[10px] text-muted-foreground mt-0.5">{item.invoiceRef}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-foreground">{item.customer}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-muted-foreground">{new Date(item.date).toLocaleDateString()}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-bold text-foreground">{fmt(item.amount)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted text-xs font-medium text-foreground">
                        {item.method}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider
                        ${item.status === 'completed' ? 'bg-emerald-500/10 text-emerald-600' : 
                          item.status === 'pending' ? 'bg-amber-500/10 text-amber-600' : 
                          'bg-red-500/10 text-red-600'}`}
                      >
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground text-sm">
                    No payments found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
