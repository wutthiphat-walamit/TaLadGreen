"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

interface DialogContextValue {
  titleId: string;
  descriptionId: string;
}

const DialogContext = React.createContext<DialogContextValue | null>(null);

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

/**
 * Accessible modal dialog with Escape/backdrop dismissal, focus trapping,
 * scroll locking, focus restoration, and aria-labelledby/aria-describedby.
 */
export function Dialog({ open, onOpenChange, children }: DialogProps) {
  const titleId = React.useId();
  const descriptionId = React.useId();
  const panelRef = React.useRef<HTMLDivElement>(null);
  const previousFocusRef = React.useRef<HTMLElement | null>(null);
  const onOpenChangeRef = React.useRef(onOpenChange);

  React.useEffect(() => {
    onOpenChangeRef.current = onOpenChange;
  }, [onOpenChange]);

  React.useEffect(() => {
    if (!open) return;

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const getFocusableElements = (): HTMLElement[] => {
      const panel = panelRef.current;
      if (!panel) return [];
      return Array.from(
        panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      ).filter((element) => element.getAttribute("aria-hidden") !== "true");
    };

    const focusFirstElement = () => {
      const first = getFocusableElements()[0];
      if (first) {
        first.focus();
      } else {
        panelRef.current?.focus();
      }
    };

    // The dialog content is mounted before this effect runs.
    focusFirstElement();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onOpenChangeRef.current(false);
        return;
      }

      if (event.key !== "Tab") return;

      const focusable = getFocusableElements();
      if (focusable.length === 0) {
        event.preventDefault();
        panelRef.current?.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey) {
        if (active === first || !panelRef.current?.contains(active)) {
          event.preventDefault();
          last.focus();
        }
        return;
      }

      if (active === last || !panelRef.current?.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;

      const previousFocus = previousFocusRef.current;
      if (previousFocus && document.contains(previousFocus)) {
        previousFocus.focus();
      }
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-[1px]"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        className="relative z-10 w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-2xl border border-[#E2E8F0] bg-white shadow-xl focus:outline-none"
      >
        <DialogContext.Provider value={{ titleId, descriptionId }}>
          {children}
        </DialogContext.Provider>
      </div>
    </div>
  );
}

export function DialogHeader({
  className,
  children,
  onClose,
}: {
  className?: string;
  children: React.ReactNode;
  onClose?: () => void;
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 border-b border-[#E2E8F0] px-6 py-4",
        className
      )}
    >
      <div className="flex-1">{children}</div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="ปิดหน้าต่าง"
          className="cursor-pointer rounded-lg p-1.5 text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#1E2937] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] focus-visible:ring-offset-2"
        >
          <X className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}

export function DialogTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  const context = React.useContext(DialogContext);

  return (
    <h2
      id={context?.titleId}
      className={cn("text-lg font-bold text-[#1E2937]", className)}
      {...props}
    />
  );
}

export function DialogDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  const context = React.useContext(DialogContext);

  return (
    <p
      id={context?.descriptionId}
      className={cn("mt-1 text-sm text-[#64748B]", className)}
      {...props}
    />
  );
}

export function DialogBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-6 py-5", className)} {...props} />;
}

export function DialogFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse sm:flex-row sm:justify-end gap-2 border-t border-[#E2E8F0] bg-[#F8FAFC] px-6 py-4 rounded-b-2xl",
        className
      )}
      {...props}
    />
  );
}
