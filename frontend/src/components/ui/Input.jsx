import { forwardRef } from "react";
import { cn } from "../../lib/utils";

const Input = forwardRef(({ className, label, error, icon, hint, ...props }, ref) => {
  return (
    <div className="w-full">
      {label && (
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-sm font-medium text-text">{label}</label>
          {hint && <span className="text-xs text-text-muted">{hint}</span>}
        </div>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
            {icon}
          </div>
        )}
        <input
          ref={ref}
          className={cn(
            "w-full h-11 px-4 rounded-xl border bg-surface text-text text-sm",
            "placeholder:text-text-muted",
            "transition-all duration-200",
            "focus:outline-none focus:ring-2 focus:ring-campus-green/20 focus:border-campus-green",
            icon && "pl-10",
            error
              ? "border-error focus:ring-error/20 focus:border-error"
              : "border-border hover:border-border-hover",
            className
          )}
          {...props}
        />
      </div>
      {error && (
        <p className="mt-1.5 text-xs text-error">{error}</p>
      )}
    </div>
  );
});

Input.displayName = "Input";

export default Input;
