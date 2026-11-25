import { cn, getInitials } from "@/lib/utils";

interface AvatarProps {
  firstName: string;
  lastName?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * Initials avatar component (no external image upload in MVP v1.0).
 */
export function Avatar({
  firstName,
  lastName,
  size = "md",
  className,
}: AvatarProps) {
  const sizeClass =
    size === "sm"
      ? "h-9 w-9 text-xs"
      : size === "lg"
      ? "h-14 w-14 text-lg"
      : "h-11 w-11 text-sm";

  return (
    <div
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-[#F0FDFA] text-[#0F766E] border border-[#99F6E4] font-bold select-none",
        sizeClass,
        className
      )}
    >
      {getInitials(firstName, lastName)}
    </div>
  );
}
