import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "bg-[#F0FDFA] text-[#0F766E] border border-[#99F6E4]",
        success: "bg-[#F0FDF4] text-[#16A34A] border border-[#BBF7D0]",
        danger: "bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]",
        neutral: "bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0]",
        warning: "bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
