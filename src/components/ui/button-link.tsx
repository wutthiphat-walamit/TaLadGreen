import * as React from "react";
import Link, { type LinkProps } from "next/link";
import type { VariantProps } from "class-variance-authority";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ButtonLinkProps
  extends LinkProps,
    VariantProps<typeof buttonVariants> {
  className?: string;
  children?: React.ReactNode;
}

/**
 * A navigation link styled as a button.
 * Prevents invalid <a><button /></a> markup from nesting Button inside Link.
 */
export function ButtonLink({
  className,
  variant,
  size,
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    >
      {children}
    </Link>
  );
}
