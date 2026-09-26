import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import api from "../services/api";
import { Button } from "../components/ui/Button";
import EmptyState from "../components/ui/EmptyState";
import Alert from "../components/ui/Alert";
import ListingGrid, { ListingGridSkeleton } from "../components/ListingGrid";
import MarketplaceFilters from "../components/MarketplaceFilters";
import SearchBar from "../components/SearchBar";
import { CATEGORY_LABELS, CONDITION_LABELS } from "../lib/format";

const PAGE_SIZE = 12;
const LOAD_ERROR = "Could not load the marketplace.";
const FILTER_KEYS = ["search", "category", "condition", "minPrice", "maxPrice"];
const EMPTY_FILTERS = {
  search: "",
  category: "",
  condition: "",
  minPrice: "",
  maxPrice: "",
};

// Every key is always present (as "" when unset) so filter inputs stay
// controlled even before the user has touched them.
function readFilters(params) {
  const filters = { ...EMPTY_FILTERS };
  for (const key of FILTER_KEYS) {
    const value = params.get(key);
    if (value) filters[key] = value;
  }
  return filters;
}

function toQuery(filters) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }
  return params.toString();
}

function toApiParams(filters) {
  const params = {};
  for (const [key, value] of Object.entries(filters)) {
    if (value) params[key] = value;
  }
  return params;
}

function FiltersIcon() {
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
      <path d="M4 6h16M7 12h10M10 18h4" />
    </svg>
  );
}

export default function MarketplacePage() {
  const location = useLocation();
  const [, setSearchParams] = useSearchParams();
  // Memoised on the raw search string: `location.search` is referentially
  // stable, so filter changes retrigger the fetch exactly once.
  const filters = useMemo(
    () => readFilters(new URLSearchParams(location.search)),
    [location.search]
  );
  const filtersKey = useMemo(() => toQuery(filters), [filters]);

  // One response object, tagged with what it was fetched for. Until a response
  // matches the current filters/attempt, the page reads as "loading" — no
  // synchronous state writes needed inside the effect.
  const [response, setResponse] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const loading =
    !response || response.key !== filtersKey || response.attempt !== attempt;

  useEffect(() => {
    let cancelled = false;

    api
      .get("/listings", {
        params: { page: 1, limit: PAGE_SIZE, ...toApiParams(filters) },
      })
      .then((res) => {
        if (!cancelled) {
          setResponse({
            key: filtersKey,
            attempt,
            listings: res.data.data,
            total: res.data.pagination.total,
            page: res.data.pagination.page,
            totalPages: res.data.pagination.totalPages,
            error: "",
          });
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setResponse({
            key: filtersKey,
            attempt,
            listings: [],
            total: 0,
            page: 1,
            totalPages: 1,
            error: err.response?.data?.error || LOAD_ERROR,
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [filters, filtersKey, attempt]);

  // Written to the URL so searches and filters are shareable and survive a
  // reload. Unchanged values never push a history entry.
  const updateFilters = useCallback(
    (patch) => {
      const query = toQuery({ ...filters, ...patch });
      if (query !== filtersKey) setSearchParams(new URLSearchParams(query));
    },
    [filters, filtersKey, setSearchParams]
  );

  const clearFilters = useCallback(() => {
    if (filtersKey !== "") setSearchParams(new URLSearchParams());
  }, [filtersKey, setSearchParams]);

  const loadMore = useCallback(async () => {
    if (!response) return;

    const nextPage = response.page + 1;
    setLoadingMore(true);
    setMoreError("");

    try {
      const res = await api.get("/listings", {
        params: { page: nextPage, limit: PAGE_SIZE, ...toApiParams(filters) },
      });
      setResponse((prev) =>
        prev
          ? {
              ...prev,
              listings: [...prev.listings, ...res.data.data],
              total: res.data.pagination.total,
              page: res.data.pagination.page,
              totalPages: res.data.pagination.totalPages,
            }
          : prev
      );
    } catch (err) {
      setMoreError(err.response?.data?.error || "Could not load more listings.");
    } finally {
      setLoadingMore(false);
    }
  }, [response, filters]);

  const chips = [];
  if (filters.search) {
    chips.push({
      key: "search",
      label: `“${filters.search}”`,
      remove: () => updateFilters({ search: "" }),
    });
  }
  if (filters.category) {
    chips.push({
      key: "category",
      label: CATEGORY_LABELS[filters.category] ?? filters.category,
      remove: () => updateFilters({ category: "" }),
    });
  }
  if (filters.condition) {
    chips.push({
      key: "condition",
      label: CONDITION_LABELS[filters.condition] ?? filters.condition,
      remove: () => updateFilters({ condition: "" }),
    });
  }
  if (filters.minPrice) {
    chips.push({
      key: "minPrice",
      label: `From ₹${filters.minPrice}`,
      remove: () => updateFilters({ minPrice: "" }),
    });
  }
  if (filters.maxPrice) {
    chips.push({
      key: "maxPrice",
      label: `Up to ₹${filters.maxPrice}`,
      remove: () => updateFilters({ maxPrice: "" }),
    });
  }

  const listings = loading ? [] : response.listings;
  const error = loading ? "" : response.error;
  const hasMore = !loading && response.page < response.totalPages;
  const total = loading ? 0 : response.total;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <header className="mb-5">
        <h1 className="text-2xl font-bold text-text">Marketplace</h1>
        <p className="text-sm text-text-muted mt-0.5">
          {loading
            ? "Loading listings..."
            : total === 1
              ? "1 listing"
              : `${Math.min(listings.length, total)} of ${total} listings`}
        </p>

        <div className="mt-4 flex items-center gap-2">
          <SearchBar
            id="marketplace-search"
            className="w-full max-w-md"
            placeholder="Search textbooks, furniture, gadgets..."
            value={filters.search}
            onSearch={(term) => updateFilters({ search: term })}
          />
          <button
            type="button"
            onClick={() => setFiltersOpen((open) => !open)}
            aria-expanded={filtersOpen}
            className="lg:hidden inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-border bg-surface px-4 text-sm font-semibold text-text hover:bg-surface-hover transition-colors cursor-pointer"
          >
            <FiltersIcon />
            Filters
            {chips.length > 0 && (
              <span className="rounded-full bg-campus-green px-1.5 text-[11px] text-white">
                {chips.length}
              </span>
            )}
          </button>
        </div>
      </header>

      <div className="lg:grid lg:grid-cols-[260px_1fr] lg:items-start lg:gap-6">
        <aside
          className={`${filtersOpen ? "block" : "hidden"} lg:block mb-6 lg:mb-0`}
        >
          <MarketplaceFilters
            filters={filters}
            onChange={updateFilters}
            onClear={clearFilters}
          />
        </aside>

        <section>
          {chips.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                Active
              </span>
              {chips.map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  onClick={chip.remove}
                  className="inline-flex items-center gap-1.5 rounded-full bg-campus-green-light px-3 py-1.5 text-xs font-semibold text-campus-green hover:bg-campus-green hover:text-white transition-colors cursor-pointer"
                >
                  {chip.label}
                  <span aria-hidden="true">✕</span>
                  <span className="sr-only">Remove filter</span>
                </button>
              ))}
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs font-semibold text-text-secondary hover:text-text underline cursor-pointer"
              >
                Clear all
              </button>
            </div>
          )}

          {error && (
            <div className="mb-6">
              <Alert variant="error">
                {error}{" "}
                <button
                  type="button"
                  onClick={() => setAttempt((value) => value + 1)}
                  className="font-semibold underline cursor-pointer"
                >
                  Try again
                </button>
              </Alert>
            </div>
          )}

          {loading ? (
            <ListingGridSkeleton count={6} />
          ) : error ? (
            // The error alert above is the only feedback needed for a failed
            // first page; an empty-state panel would be misleading.
            null
          ) : listings.length === 0 ? (
            <EmptyState
              icon="🔍"
              title={chips.length > 0 ? "No listings match your filters" : "No listings yet"}
              description={
                chips.length > 0
                  ? "Try a different search term or widen your filters."
                  : "Be the first to list something — textbooks, gadgets, furniture and more."
              }
              action={
                chips.length > 0 ? (
                  <Button variant="secondary" onClick={clearFilters}>
                    Clear filters
                  </Button>
                ) : (
                  <Link to="/listings/new">
                    <Button>List an item</Button>
                  </Link>
                )
              }
            />
          ) : (
            <>
              <ListingGrid listings={listings} />

              {moreError && (
                <div className="mt-6">
                  <Alert variant="error">{moreError}</Alert>
                </div>
              )}

              <div className="mt-8 flex justify-center">
                {loadingMore ? (
                  <Button loading>Loading more...</Button>
                ) : (
                  hasMore && (
                    <Button variant="secondary" onClick={loadMore}>
                      Load more
                    </Button>
                  )
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
