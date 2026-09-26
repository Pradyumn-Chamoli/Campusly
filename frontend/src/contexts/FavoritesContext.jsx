import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import api from "../services/api";
import { useAuth } from "./AuthContext";

const FavoritesContext = createContext(null);

// Loads the signed-in user's saved listing ids once, then keeps them in sync
// optimistically when a listing is saved or unsaved. Pages read this instead
// of asking the API whether a single listing is saved.
export function FavoritesProvider({ children }) {
  const { user } = useAuth();
  const [favoriteIds, setFavoriteIds] = useState(() => new Set());
  const [loadedUser, setLoadedUser] = useState(null);
  const [error, setError] = useState("");
  // Toggles still in flight while the initial load runs. Re-applied when the
  // load lands so a fast click is never overwritten by the fetch result.
  const pendingRef = useRef(new Map());
  const loadInFlightRef = useRef(false);

  // Reset the saved ids as soon as the signed-in user changes, so one user
  // never sees another user's favorites while the next load is in flight.
  const [prevUser, setPrevUser] = useState(user);
  if (prevUser !== user) {
    setPrevUser(user);
    setFavoriteIds(new Set());
    setLoadedUser(null);
    setError("");
  }

  const loading = Boolean(user) && loadedUser !== user;

  useEffect(() => {
    if (!user) return undefined;

    let cancelled = false;
    // The Map never changes identity; copying it keeps the cleanup from
    // reading the ref itself.
    const pending = pendingRef.current;
    loadInFlightRef.current = true;

    (async () => {
      try {
        const ids = new Set();
        let page = 1;
        let totalPages = 1;

        do {
          const res = await api.get("/favorites", {
            params: { page, limit: 100 },
          });
          res.data.data.forEach((favorite) => ids.add(favorite.listing.id));
          totalPages = res.data.pagination.totalPages;
          page += 1;
        } while (page <= totalPages && !cancelled);

        if (!cancelled) {
          setFavoriteIds(() => {
            const next = new Set(ids);
            for (const [listingId, favorited] of pending) {
              if (favorited) next.add(listingId);
              else next.delete(listingId);
            }
            return next;
          });
          setLoadedUser(user);
        }
      } catch (err) {
        if (!cancelled) {
          setLoadedUser(user);
          setError(
            err.response?.data?.error || "Could not load your saved listings."
          );
        }
      } finally {
        if (!cancelled) {
          loadInFlightRef.current = false;
          pending.clear();
        }
      }
    })();

    return () => {
      cancelled = true;
      loadInFlightRef.current = false;
      pending.clear();
    };
  }, [user]);

  const isFavorite = useCallback((listingId) => favoriteIds.has(listingId), [
    favoriteIds,
  ]);

  const toggleFavorite = useCallback(
    async (listingId) => {
      const wasFavorite = favoriteIds.has(listingId);

      // Optimistic: flip immediately, roll back if the API disagrees.
      pendingRef.current.set(listingId, !wasFavorite);
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (wasFavorite) next.delete(listingId);
        else next.add(listingId);
        return next;
      });

      try {
        if (wasFavorite) {
          await api.delete(`/favorites/${listingId}`);
        } else {
          await api.post("/favorites", { listingId });
        }
        return { ok: true, favorited: !wasFavorite };
      } catch (err) {
        pendingRef.current.delete(listingId);
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          if (wasFavorite) next.add(listingId);
          else next.delete(listingId);
          return next;
        });
        return {
          ok: false,
          error: err.response?.data?.error || "Could not update your saved listings.",
        };
      } finally {
        // On success the pending value is only cleared once the initial load
        // has landed, otherwise a load that started earlier would overwrite
        // this change with older server data.
        if (!loadInFlightRef.current) pendingRef.current.delete(listingId);
      }
    },
    [favoriteIds]
  );

  const value = useMemo(
    () => ({ favoriteIds, loading, error, isFavorite, toggleFavorite }),
    [favoriteIds, loading, error, isFavorite, toggleFavorite]
  );

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error("useFavorites must be used within a FavoritesProvider");
  }
  return context;
}
