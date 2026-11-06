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
    <div className="bg-card rounded-xl border border-border p-3 md:p-4 shadow-sm">
      <div className="flex items-start justify-between mb-2 md:mb-3">
        <div className={`w-7 h-7 md:w-9 md:h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
          <Icon size={14} className="text-white md:hidden" />
          <Icon size={18} className="text-white hidden md:block" />
        </div>
        <div
          className={`flex items-center gap-0.5 text-[10px] md:text-xs font-semibold ${
            trendUp ? "text-emerald-600" : "text-red-500"
          }`}
        >
          {trendUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
          <span className="hidden xs:inline">{trend}</span>
        </div>
      </div>
      <div className="text-lg md:text-2xl font-bold font-['Plus_Jakarta_Sans'] text-foreground leading-tight">{value}</div>
      <div className="text-[10px] md:text-xs text-muted-foreground mt-0.5 md:mt-1 leading-tight">{label}</div>
      <div className="text-[9px] md:text-[10px] text-muted-foreground/70 mt-0.5 hidden md:block">{sub}</div>
    </div>
  );
}

