import { useState } from "react";
import { cn } from "../lib/utils";
import { CATEGORY_EMOJI, CATEGORY_LABELS, CONDITION_LABELS } from "../lib/format";

const CATEGORIES = Object.keys(CATEGORY_LABELS);
const CONDITIONS = Object.keys(CONDITION_LABELS);

const PRICE_PRESETS = [
  { label: "Under ₹500", minPrice: "", maxPrice: "500" },
  { label: "₹500 – ₹2,000", minPrice: "500", maxPrice: "2000" },
  { label: "₹2,000+", minPrice: "2000", maxPrice: "" },
];

function isValidAmount(value) {
  if (value === "") return true;
  return /^\d+(\.\d{1,2})?$/.test(value);
}

function Section({ title, action, children }) {
  return (
    <div className="border-b border-border px-4 py-4 last:border-b-0">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-text">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function Pill({ active, onClick, children, title }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer",
        active
          ? "border-campus-green bg-campus-green text-white"
          : "border-border bg-surface text-text-secondary hover:border-campus-green/40 hover:text-text"
      )}
    >
      {children}
    </button>
  );
}

// Filter panel for the marketplace: category, condition and price range.
// Every change is reported through `onChange` so the page can write it to the
// URL. Values toggle off when the active option is clicked again.
export default function MarketplaceFilters({ filters, onChange, onClear }) {
  const [minDraft, setMinDraft] = useState(filters.minPrice);
  const [maxDraft, setMaxDraft] = useState(filters.maxPrice);
  const [priceError, setPriceError] = useState("");

  // Keep the inputs in sync when filters change elsewhere (chips, clear all).
  // Adjusted during render so the panel never shows stale values.
  const [prevPrice, setPrevPrice] = useState({
    min: filters.minPrice,
    max: filters.maxPrice,
  });
  if (
    prevPrice.min !== filters.minPrice ||
    prevPrice.max !== filters.maxPrice
  ) {
    setPrevPrice({ min: filters.minPrice, max: filters.maxPrice });
    setMinDraft(filters.minPrice);
    setMaxDraft(filters.maxPrice);
  }

  function commitPrice() {
    const min = minDraft.trim();
    const max = maxDraft.trim();

    if (!isValidAmount(min) || !isValidAmount(max)) {
      setPriceError("Enter a valid amount, e.g. 500 or 499.50");
      return;
    }
    if (min && max && Number(min) > Number(max)) {
      setPriceError("Minimum price can't be higher than maximum price");
      return;
    }

    setPriceError("");
    if (min !== filters.minPrice || max !== filters.maxPrice) {
      onChange({ minPrice: min, maxPrice: max });
    }
  }

  function applyPreset(preset) {
    setPriceError("");
    onChange({ minPrice: preset.minPrice, maxPrice: preset.maxPrice });
  }

  return (
    <div className="rounded-2xl border border-border bg-surface overflow-hidden">
      <Section
        title="Categories"
        action={
          filters.category ? (
            <button
              type="button"
              onClick={() => onChange({ category: "" })}
              className="text-xs font-medium text-campus-green hover:underline cursor-pointer"
            >
              Clear
            </button>
          ) : null
        }
      >
        <div className="grid grid-cols-2 gap-1.5">
          <Pill
            active={!filters.category}
            onClick={() => onChange({ category: "" })}
          >
            All
          </Pill>
          {CATEGORIES.map((category) => (
            <Pill
              key={category}
              active={filters.category === category}
              onClick={() =>
                onChange({
                  category: filters.category === category ? "" : category,
                })
              }
            >
              <span aria-hidden="true" className="mr-1">
                {CATEGORY_EMOJI[category]}
              </span>
              {CATEGORY_LABELS[category]}
            </Pill>
          ))}
        </div>
      </Section>

      <Section title="Condition">
        <div className="flex flex-wrap gap-1.5">
          <Pill
            active={!filters.condition}
            onClick={() => onChange({ condition: "" })}
          >
            Any
          </Pill>
          {CONDITIONS.map((condition) => (
            <Pill
              key={condition}
              active={filters.condition === condition}
              onClick={() =>
                onChange({
                  condition: filters.condition === condition ? "" : condition,
                })
              }
            >
              {CONDITION_LABELS[condition]}
            </Pill>
          ))}
        </div>
      </Section>

      <Section title="Price range">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-text-muted">
              ₹
            </span>
            <input
              type="text"
              inputMode="decimal"
              value={minDraft}
              onChange={(event) => setMinDraft(event.target.value)}
              onBlur={commitPrice}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  commitPrice();
                }
              }}
              placeholder="Min"
              aria-label="Minimum price"
              className="h-9 w-full rounded-lg border border-border bg-surface pl-6 pr-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-campus-green/20 focus:border-campus-green"
            />
          </div>
          <span className="text-text-muted" aria-hidden="true">
            –
          </span>
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-text-muted">
              ₹
            </span>
            <input
              type="text"
              inputMode="decimal"
              value={maxDraft}
              onChange={(event) => setMaxDraft(event.target.value)}
              onBlur={commitPrice}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  commitPrice();
                }
              }}
              placeholder="Max"
              aria-label="Maximum price"
              className="h-9 w-full rounded-lg border border-border bg-surface pl-6 pr-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-campus-green/20 focus:border-campus-green"
            />
          </div>
        </div>

        {priceError && <p className="mt-2 text-xs text-error">{priceError}</p>}

        <div className="mt-3 flex flex-wrap gap-1.5">
          {PRICE_PRESETS.map((preset) => {
            const active =
              filters.minPrice === preset.minPrice &&
              filters.maxPrice === preset.maxPrice &&
              (preset.minPrice !== "" || preset.maxPrice !== "");
            return (
              <Pill
                key={preset.label}
                active={active}
                onClick={() => (active ? applyPreset({ minPrice: "", maxPrice: "" }) : applyPreset(preset))}
              >
                {preset.label}
              </Pill>
            );
          })}
        </div>
      </Section>

      <div className="px-4 py-4">
        <button
          type="button"
          onClick={onClear}
          className="w-full rounded-full border border-border px-4 py-2 text-sm font-semibold text-text-secondary hover:bg-surface-hover hover:text-text transition-colors cursor-pointer"
        >
          Clear all filters
        </button>
      </div>
    </div>
  );
}
