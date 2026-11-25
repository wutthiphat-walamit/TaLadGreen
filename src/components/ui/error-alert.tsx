import { AlertCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ErrorAlertProps {
  message: string;
  onRetry?: () => void;
  className?: string;
}

/**
 * Shared inline error message with an optional Thai retry action.
 */
export function ErrorAlert({ message, onRetry, className }: ErrorAlertProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col gap-3 rounded-2xl border border-[#FECACA] bg-[#FEF2F2] p-4 text-sm text-[#DC2626] sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <div className="flex items-start gap-2.5">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 sm:mt-0" />
        <span>{message}</span>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="h-4 w-4" />
          ลองใหม่
        </Button>
      )}
    </div>
  );
}
