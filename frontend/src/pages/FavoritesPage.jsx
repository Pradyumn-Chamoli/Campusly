import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { Button } from "../components/ui/Button";
import Alert from "../components/ui/Alert";
import EmptyState from "../components/ui/EmptyState";
import ListingGrid, { ListingGridSkeleton } from "../components/ListingGrid";

const PAGE_SIZE = 12;
const LOAD_ERROR = "Could not load your favorites.";

export default function FavoritesPage() {
  // One response object tagged with its fetch attempt, so a changed page
  // reads as "loading" without an extra state write inside the effect.
  const [response, setResponse] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState("");

  useEffect(() => {
    let cancelled = false;

    api
      .get("/favorites", { params: { page: 1, limit: PAGE_SIZE } })
      .then((res) => {
        if (!cancelled) {
          setResponse({
            attempt,
            favorites: res.data.data,
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
            attempt,
            favorites: [],
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
  }, [attempt]);

  const loadMore = useCallback(async () => {
    if (!response) return;

    const nextPage = response.page + 1;
    setLoadingMore(true);
    setMoreError("");

    try {
      const res = await api.get("/favorites", {
        params: { page: nextPage, limit: PAGE_SIZE },
      });
      setResponse((prev) =>
        prev
          ? {
              ...prev,
              favorites: [...prev.favorites, ...res.data.data],
              total: res.data.pagination.total,
              page: res.data.pagination.page,
              totalPages: res.data.pagination.totalPages,
            }
          : prev
      );
    } catch (err) {
      setMoreError(err.response?.data?.error || "Could not load more favorites.");
    } finally {
      setLoadingMore(false);
    }
  }, [response]);

  // The heart on the card already called the API; here we only drop the row
  // from the list so the grid matches the new state.
  const handleFavoriteChange = useCallback((listingId, favorited) => {
    if (favorited) return;
    setResponse((prev) =>
      prev
        ? {
            ...prev,
            favorites: prev.favorites.filter(
              (favorite) => favorite.listing.id !== listingId
            ),
            total: Math.max(0, prev.total - 1),
          }
        : prev
    );
  }, []);

  const loading = !response || response.attempt !== attempt;
  const error = loading ? "" : response.error;
  const favorites = loading ? [] : response.favorites;
  const total = loading ? 0 : response.total;
  const hasMore = !loading && response.page < response.totalPages;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-text">Favorites</h1>
        <p className="text-sm text-text-muted mt-0.5">
          {loading
            ? "Loading your saved listings..."
            : total === 1
              ? "1 saved listing"
              : `${total} saved listing${total === 1 ? "" : "s"}`}
        </p>
      </header>

      {notice && (
        <div className="mb-6">
          <Alert variant="success">{notice}</Alert>
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
      ) : error && favorites.length === 0 ? (
        // The error alert above is the only feedback needed for a failed
        // first page; an empty-state panel would be misleading.
        null
      ) : favorites.length === 0 ? (
        <EmptyState
          icon="💚"
          title="No favorites yet"
          description="Tap the heart on any listing to save it here for later."
          action={
            <Link to="/marketplace">
              <Button>Browse marketplace</Button>
            </Link>
          }
        />
      ) : (
        <>
          <ListingGrid
            listings={favorites.map((favorite) => favorite.listing)}
            onFavoriteChange={handleFavoriteChange}
          />

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
