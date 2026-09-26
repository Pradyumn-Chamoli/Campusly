import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useFavorites } from "../contexts/FavoritesContext";
import { cn } from "../lib/utils";

function HeartIcon({ filled }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

// Save/unsave a listing. The state comes from FavoritesContext, so the same
// button works on cards, on the details page and on the favorites page.
// `variant` controls the visual: "overlay" floats on a card image, "pill" is
// a labelled button for the details page.
export default function FavoriteButton({
  listingId,
  variant = "overlay",
  className,
  onChange,
  onError,
}) {
  const { user } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const navigate = useNavigate();
  const location = useLocation();
  const [busy, setBusy] = useState(false);

  const active = isFavorite(listingId);

  async function handleClick() {
    if (busy) return;

    if (!user) {
      navigate("/login", { state: { from: location } });
      return;
    }

    setBusy(true);
    const result = await toggleFavorite(listingId);
    setBusy(false);

    if (result.ok) onChange?.(listingId, result.favorited);
    else onError?.(result.error);
  }

  if (variant === "pill") {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        aria-pressed={active}
        className={cn(
          "inline-flex h-10 items-center justify-center gap-2 rounded-full border px-5 text-sm font-semibold transition-colors cursor-pointer",
          "focus:outline-none focus:ring-2 focus:ring-campus-green/30 focus:ring-offset-2",
          "disabled:opacity-60 disabled:pointer-events-none",
          active
            ? "border-campus-green bg-campus-green-light text-campus-green hover:bg-campus-green hover:text-white"
            : "border-border bg-surface text-text hover:border-campus-green/40 hover:text-campus-green",
          className
        )}
      >
        <HeartIcon filled={active} />
        {active ? "Saved" : "Save"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      aria-pressed={active}
      aria-label={active ? "Remove from favorites" : "Save to favorites"}
      title={active ? "Remove from favorites" : "Save to favorites"}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 backdrop-blur-sm shadow-sm transition-all cursor-pointer",
        "hover:bg-white hover:shadow focus:outline-none focus:ring-2 focus:ring-campus-green/30",
        "disabled:opacity-60 disabled:pointer-events-none",
        active ? "text-campus-orange" : "text-text-secondary hover:text-text",
        className
      )}
    >
      <HeartIcon filled={active} />
    </button>
  );
}
