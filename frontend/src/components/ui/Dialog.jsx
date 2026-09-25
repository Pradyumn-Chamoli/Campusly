import { useEffect, useRef } from "react";
import { cn } from "../../lib/utils";

// Minimal accessible dialog: Escape closes, backdrop click closes, focus moves
// into the dialog on open and returns to the opener on close.
export default function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
}) {
  const dialogRef = useRef(null);
  const previousFocus = useRef(null);

  useEffect(() => {
    if (!open) return;

    previousFocus.current = document.activeElement;

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }

      if (event.key !== "Tab") return;

      const focusable = dialogRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable || focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown, true);
    dialogRef.current
      ?.querySelector("[data-autofocus], button, input")
      ?.focus();

    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      previousFocus.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="presentation"
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className={cn(
          "relative w-full max-w-md rounded-2xl border border-border bg-surface shadow-lg p-6 menu-in",
          className
        )}
      >
        <h2 id="dialog-title" className="text-lg font-bold text-text">
          {title}
        </h2>
        {description && (
          <p className="text-sm text-text-secondary mt-2 leading-relaxed">
            {description}
          </p>
        )}
        {children && <div className="mt-4">{children}</div>}
        {footer && <div className="mt-6 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}
