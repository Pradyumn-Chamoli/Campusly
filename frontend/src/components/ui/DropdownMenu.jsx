import { cloneElement, useEffect, useRef, useState } from "react";
import { cn } from "../../lib/utils";

// Lightweight dropdown menu (shadcn-style API, no extra dependency).
// Accessible: aria-haspopup/aria-expanded, Escape to close and restore focus,
// arrow/Home/End key navigation, and close on outside click.
export function DropdownMenu({ trigger, children, align = "right", className }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const contentRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event) {
      if (!containerRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  // Move focus to the first item whenever the menu opens.
  useEffect(() => {
    if (open) {
      contentRef.current?.querySelector("[data-menu-item]")?.focus();
    }
  }, [open]);

  function handleContentKeyDown(event) {
    const items = Array.from(
      contentRef.current?.querySelectorAll("[data-menu-item]") ?? []
    );
    if (items.length === 0) return;

    const currentIndex = items.indexOf(document.activeElement);

    const focusAt = (index) => {
      event.preventDefault();
      items[(index + items.length) % items.length]?.focus();
    };

    switch (event.key) {
      case "ArrowDown":
        focusAt(currentIndex + 1);
        break;
      case "ArrowUp":
        focusAt(currentIndex - 1);
        break;
      case "Home":
        focusAt(0);
        break;
      case "End":
        focusAt(items.length - 1);
        break;
      default:
        break;
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      {cloneElement(trigger, {
        ref: triggerRef,
        onClick: () => setOpen((value) => !value),
        "aria-haspopup": "menu",
        "aria-expanded": open,
      })}

      {open && (
        <div
          ref={contentRef}
          role="menu"
          onKeyDown={handleContentKeyDown}
          onClick={() => setOpen(false)}
          className={cn(
            "absolute z-50 mt-2 min-w-56 rounded-2xl border border-border bg-surface p-1.5 shadow-lg menu-in",
            align === "right" ? "right-0" : "left-0",
            className
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export function DropdownMenuItem({ className, icon, danger = false, ...props }) {
  return (
    <button
      type="button"
      role="menuitem"
      data-menu-item
      className={cn(
        "w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-left transition-colors cursor-pointer",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-campus-green/30",
        danger
          ? "text-error hover:bg-error-light focus-visible:bg-error-light"
          : "text-text-secondary hover:bg-surface-hover hover:text-text focus-visible:bg-surface-hover",
        className
      )}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {props.children}
    </button>
  );
}

export function DropdownMenuLabel({ children, className }) {
  return (
    <div
      className={cn(
        "px-3 pt-2 pb-2.5 border-b border-border mb-1.5",
        className
      )}
    >
      {children}
    </div>
  );
}

export function DropdownMenuSeparator() {
  return <div className="h-px bg-border my-1.5" role="separator" />;
}
