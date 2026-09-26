import { useEffect, useRef, useState } from "react";
import { cn } from "../lib/utils";

function SearchIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function ClearIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

// Shared search field. Keystrokes are debounced so callers can react without
// updating the URL (or calling the API) on every character. Enter and the
// optional button fire immediately.
export default function SearchBar({
  value = "",
  onSearch,
  onSubmit,
  placeholder = "Search listings...",
  id,
  className,
  autoFocus = false,
  submitLabel,
  submitClassName,
  maxLength = 100,
}) {
  const [term, setTerm] = useState(value);
  const onSearchRef = useRef(onSearch);
  const onSubmitRef = useRef(onSubmit);
  const timerRef = useRef(null);
  const firstRunRef = useRef(true);

  // Keep the latest callbacks without re-running the debounced effect.
  useEffect(() => {
    onSearchRef.current = onSearch;
    onSubmitRef.current = onSubmit;
  });

  // Follow external changes (back/forward navigation, "clear filters").
  // State is adjusted during render instead of in an effect so typing stays
  // in the same commit as the URL update that caused the change.
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setTerm(value);
  }

  useEffect(() => {
    if (firstRunRef.current) {
      firstRunRef.current = false;
      return;
    }
    timerRef.current = setTimeout(() => onSearchRef.current?.(term.trim()), 350);
    return () => clearTimeout(timerRef.current);
  }, [term]);

  // Cancels any pending debounced search, e.g. right after Enter.
  function flush() {
    clearTimeout(timerRef.current);
    onSearchRef.current?.(term.trim());
  }

  function handleSubmit(event) {
    event.preventDefault();
    flush();
    onSubmitRef.current?.(term.trim());
  }

  function handleClear() {
    clearTimeout(timerRef.current);
    setTerm("");
    onSearchRef.current?.("");
  }

  return (
    <form
      role="search"
      onSubmit={handleSubmit}
      className={cn("relative flex w-full items-center gap-2", className)}
    >
      <div className="relative flex-1">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted">
          <SearchIcon />
        </span>
        <label htmlFor={id} className="sr-only">
          {placeholder}
        </label>
        <input
          id={id}
          type="text"
          inputMode="search"
          autoComplete="off"
          maxLength={maxLength}
          value={term}
          autoFocus={autoFocus}
          onChange={(event) => setTerm(event.target.value)}
          placeholder={placeholder}
          className={cn(
            "h-10 w-full rounded-full border bg-surface pl-9 pr-9 text-sm text-text",
            "placeholder:text-text-muted transition-all duration-200",
            "focus:outline-none focus:ring-2 focus:ring-campus-green/20 focus:border-campus-green",
            "border-border hover:border-border-hover"
          )}
        />
        {term && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-text-muted hover:bg-surface-hover hover:text-text transition-colors cursor-pointer"
          >
            <ClearIcon />
          </button>
        )}
      </div>

      {submitLabel && (
        <button
          type="submit"
          className={cn(
            "h-10 shrink-0 rounded-full bg-campus-green px-5 text-sm font-semibold text-white hover:bg-campus-green-hover transition-colors cursor-pointer",
            submitClassName
          )}
        >
          {submitLabel}
        </button>
      )}
    </form>
  );
}
