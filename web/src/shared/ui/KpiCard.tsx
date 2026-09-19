import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

interface KpiCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  sub: string;
  trend: string;
  trendUp: boolean;
  color: string;
}

export function KpiCard({ icon: Icon, label, value, sub, trend, trendUp, color }: KpiCardProps) {
  return (
    <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
          <Icon size={18} className="text-white" />
        </div>
        <div
          className={`flex items-center gap-0.5 text-xs font-semibold ${
            trendUp ? "text-emerald-600" : "text-red-500"
          }`}
        >
          {trendUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {trend}
        </div>
      </div>
      <div className="text-2xl font-bold font-['Plus_Jakarta_Sans'] text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
      <div className="text-[10px] text-muted-foreground/70 mt-0.5">{sub}</div>
    </div>
  );
}
