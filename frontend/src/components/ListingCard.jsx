import { Link } from "react-router-dom";
import { cn } from "../lib/utils";
import {
  CATEGORY_EMOJI,
  CATEGORY_LABELS,
  CONDITION_LABELS,
  STATUS_LABELS,
  formatPrice,
} from "../lib/format";
import Avatar from "./ui/Avatar";

// `to` is optional: listing details arrive in Phase 6, so a card without it
// renders as a static tile instead of a link.
export default function ListingCard({ listing, to, showSeller = false, className }) {
  const image = listing.images?.[0];

  const body = (
    <>
      <div
        className={cn(
          "relative h-40 bg-gradient-to-br from-campus-green-light to-bg overflow-hidden",
          to && "group-hover:opacity-95 transition-opacity"
        )}
      >
        {image ? (
          <img
            src={image.url}
            alt={image.altText || listing.title}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-4xl opacity-40">
            {CATEGORY_EMOJI[listing.category] ?? "📦"}
          </div>
        )}

        <div className="absolute top-3 left-3 flex gap-1.5">
          <span className="px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-sm text-[10px] font-semibold text-campus-green">
            {CONDITION_LABELS[listing.condition] ?? listing.condition}
          </span>
          {listing.status && listing.status !== "ACTIVE" && (
            <span
              className={cn(
                "px-2.5 py-1 rounded-full text-[10px] font-semibold backdrop-blur-sm",
                listing.status === "SOLD"
                  ? "bg-campus-orange/90 text-white"
                  : "bg-text/80 text-white"
              )}
            >
              {STATUS_LABELS[listing.status] ?? listing.status}
            </span>
          )}
        </div>
      </div>

      <div className="p-4">
        <p className="text-lg font-bold text-text">{formatPrice(listing.price)}</p>
        <h3 className="text-sm font-semibold text-text mt-0.5 line-clamp-2">
          {listing.title}
        </h3>

        <div className="flex items-center justify-between gap-2 mt-3">
          {showSeller && listing.seller ? (
            <Link
              to={`/users/${listing.seller.id}`}
              className="flex items-center gap-2 min-w-0 hover:underline"
            >
              <Avatar user={listing.seller} size="xs" />
              <span className="text-xs font-medium text-text truncate">
                {listing.seller.name}
              </span>
            </Link>
          ) : (
            <span className="text-xs text-text-muted">
              {listing._count?.favorites ?? 0}{" "}
              {(listing._count?.favorites ?? 0) === 1 ? "save" : "saves"}
            </span>
          )}

          <span className="text-[10px] text-text-muted px-2 py-0.5 rounded-full bg-bg shrink-0">
            {CATEGORY_LABELS[listing.category] ?? listing.category}
          </span>
        </div>
      </div>
    </>
  );

  const shell =
    "block bg-surface border border-border rounded-2xl overflow-hidden transition-all";

  if (to) {
    return (
      <Link
        to={to}
        className={cn(
          shell,
          "hover:shadow-lg hover:border-campus-green/30 hover:-translate-y-0.5",
          className
        )}
      >
        {body}
      </Link>
    );
  }

  return <article className={cn(shell, className)}>{body}</article>;
}
