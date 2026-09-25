import { forwardRef } from "react";
import { cn } from "../../lib/utils";

const Textarea = forwardRef(({ className, label, error, hint, rows = 4, ...props }, ref) => {
  return (
    <div className="w-full">
      {label && (
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-sm font-medium text-text">{label}</label>
          {hint && <span className="text-xs text-text-muted">{hint}</span>}
        </div>
      )}
      <textarea
        ref={ref}
        rows={rows}
        className={cn(
          "w-full px-4 py-3 rounded-xl border bg-surface text-text text-sm resize-y",
          "placeholder:text-text-muted",
          "transition-all duration-200",
          "focus:outline-none focus:ring-2 focus:ring-campus-green/20 focus:border-campus-green",
          error
            ? "border-error focus:ring-error/20 focus:border-error"
            : "border-border hover:border-border-hover",
          className
        )}
        {...props}
      />
      {error && <p className="mt-1.5 text-xs text-error">{error}</p>}
    </div>
  );
});

Textarea.displayName = "Textarea";

export default Textarea;
