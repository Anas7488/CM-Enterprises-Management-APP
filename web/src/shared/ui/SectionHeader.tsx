interface SectionHeaderProps {
  title: string;
  action?: string;
  onActionClick?: () => void;
}

export function SectionHeader({ title, action, onActionClick }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {action && (
        <button
          onClick={onActionClick}
          className="text-xs font-medium text-[#1E3A8A] hover:underline"
        >
          {action}
        </button>
      )}
    </div>
  );
}
