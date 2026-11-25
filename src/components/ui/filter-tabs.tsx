import { cn } from "@/lib/utils";

export interface FilterTabOption<T extends string> {
  id: T;
  label: string;
}

interface FilterTabsProps<T extends string> {
  options: readonly FilterTabOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
}

/**
 * Segmented filter control shared by the savers and transactions pages.
 */
export function FilterTabs<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: FilterTabsProps<T>) {
  return (
    <div className="flex items-center gap-2" role="group" aria-label={ariaLabel}>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          aria-pressed={value === option.id}
          onClick={() => onChange(option.id)}
          className={cn(
            "cursor-pointer rounded-xl px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] focus-visible:ring-offset-2",
            value === option.id
              ? "bg-[#0F766E] text-white"
              : "bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0]"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
