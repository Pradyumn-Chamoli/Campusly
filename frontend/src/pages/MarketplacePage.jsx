import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../services/api";
import { Button } from "../components/ui/Button";
import EmptyState from "../components/ui/EmptyState";
import Alert from "../components/ui/Alert";
import ListingGrid, { ListingGridSkeleton } from "../components/ListingGrid";
import { CATEGORY_LABELS } from "../lib/format";

const PAGE_SIZE = 12;
const LOAD_ERROR = "Could not load the marketplace.";

export default function MarketplacePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const category = searchParams.get("category") ?? "";

  // One response object, tagged with what it was fetched for. Until a response
  // matches the current category/attempt, the page reads as "loading" — no
  // synchronous state writes needed inside the effect.
  const [response, setResponse] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState("");

  const loading =
    !response || response.category !== category || response.attempt !== attempt;

  useEffect(() => {
    let cancelled = false;

    api
      .get("/listings", {
        params: { page: 1, limit: PAGE_SIZE, ...(category && { category }) },
      })
      .then((res) => {
        if (!cancelled) {
          setResponse({
            category,
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
            category,
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
  }, [category, attempt]);

  const loadMore = useCallback(async () => {
    if (!response) return;

    const nextPage = response.page + 1;
    setLoadingMore(true);
    setMoreError("");

    try {
      const res = await api.get("/listings", {
        params: {
          page: nextPage,
          limit: PAGE_SIZE,
          ...(category && { category }),
        },
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
  }, [response, category]);

  function clearCategory() {
    setSearchParams({});
  }

  const listings = loading ? [] : response.listings;
  const error = loading ? "" : response.error;
  const hasMore = !loading && response.page < response.totalPages;
  const total = loading ? 0 : response.total;
  const categoryLabel = category ? CATEGORY_LABELS[category] ?? category : null;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text">Marketplace</h1>
          <p className="text-sm text-text-muted mt-0.5">
            {loading
              ? "Loading listings..."
              : total === 1
                ? "1 listing"
                : `${Math.min(listings.length, total)} of ${total} listings`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {categoryLabel && (
            <button
              type="button"
              onClick={clearCategory}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-campus-green-light text-campus-green text-xs font-semibold hover:bg-campus-green hover:text-white transition-colors cursor-pointer"
            >
              {categoryLabel}
              <span aria-hidden="true">✕</span>
              <span className="sr-only">Clear category filter</span>
            </button>
          )}
          <Link to="/">
            <Button variant="secondary" size="sm">Browse categories</Button>
          </Link>
        </div>
      </header>

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
      ) : listings.length === 0 ? (
        <EmptyState
          icon="🔍"
          title={
            categoryLabel
              ? `No ${categoryLabel.toLowerCase()} listings yet`
              : "No listings yet"
          }
          description={
            categoryLabel
              ? "Nothing in this category right now. Try another category."
              : "Be the first to list something — textbooks, gadgets, furniture and more."
          }
          action={
            categoryLabel ? (
              <Button variant="secondary" onClick={clearCategory}>
                Show all listings
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
    </div>
  );
}
