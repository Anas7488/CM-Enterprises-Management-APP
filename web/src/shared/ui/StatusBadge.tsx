interface StatusBadgeProps {
  status: string;
}

const STATUS_STYLES: Record<string, string> = {
  new: "bg-blue-50 text-blue-700 border-blue-100",
  approved: "bg-cyan-50 text-cyan-700 border-cyan-100",
  preparing: "bg-amber-50 text-amber-700 border-amber-100",
  partially_available: "bg-orange-50 text-orange-700 border-orange-100",
  pending: "bg-red-50 text-red-700 border-red-100",
  ready: "bg-purple-50 text-purple-700 border-purple-100",
  dispatched: "bg-indigo-50 text-indigo-700 border-indigo-100",
  delivered: "bg-emerald-50 text-emerald-700 border-emerald-100",
  cancelled: "bg-gray-100 text-gray-500 border-gray-200",
  unpaid: "bg-red-50 text-red-700 border-red-100",
  partially_paid: "bg-amber-50 text-amber-700 border-amber-100",
  paid: "bg-emerald-50 text-emerald-700 border-emerald-100",
  void: "bg-gray-100 text-gray-500 border-gray-200",
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const key = status.toLowerCase().replace(/\s+/g, "_");
  const style = STATUS_STYLES[key] || "bg-gray-50 text-gray-600 border-gray-100";

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${style}`}
    >
      {status}
    </span>
  );
}
