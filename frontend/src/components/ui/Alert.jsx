import { cn } from "../../lib/utils";

const VARIANTS = {
  error: "bg-error-light border-error/20 text-error",
  success: "bg-success-light border-success/20 text-success",
  info: "bg-campus-green-light border-campus-green/20 text-campus-green",
};

export default function Alert({ variant = "info", className, children, ...props }) {
  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={cn(
        "p-3 rounded-xl border text-sm",
        VARIANTS[variant] ?? VARIANTS.info,
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
