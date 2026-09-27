import { Link } from "react-router-dom";
import { cn } from "../lib/utils";
import { CATEGORY_EMOJI, REQUEST_STATUS_LABELS, formatPrice } from "../lib/format";
import { availableActions } from "../lib/requestActions";
import { Button } from "./ui/Button";

// One badge colour per lifecycle state so a request's status is readable at
// a glance across every card.
const STATUS_STYLES = {
  PENDING: "bg-warning-light text-warning border-warning/20",
  ACCEPTED: "bg-campus-green-light text-campus-green border-campus-green/20",
  COMPLETED: "bg-success-light text-success border-success/20",
  REJECTED: "bg-error-light text-error border-error/20",
  CANCELLED: "bg-surface-hover text-text-secondary border-border",
};

export default function RequestCard({
  request,
  user,
  busy = false,
  onAction,
  error = "",
}) {
  const image = request.listing.images?.[0];
  const actions = availableActions(request, user);
  const isBuyer = request.buyer.id === user?.id;
  const counterparty = isBuyer ? request.seller : request.buyer;

  return (
    <article className="bg-surface border border-border rounded-2xl p-4 shadow-card">
      {error && (
        <div className="mb-3">
          <p className="text-xs text-error" role="alert">
            {error}
          </p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4">
        {/* ---------- Listing ---------- */}
        <Link
          to={`/listings/${request.listing.id}`}
          className="relative w-full sm:w-28 h-28 sm:h-28 shrink-0 rounded-xl overflow-hidden bg-gradient-to-br from-campus-green-light to-bg flex items-center justify-center hover:opacity-90 transition-opacity"
        >
          {image ? (
            <img
              src={image.url}
              alt={image.altText || request.listing.title}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <span className="text-3xl opacity-40" aria-hidden="true">
              {CATEGORY_EMOJI[request.listing.category] ?? "📦"}
            </span>
          )}
        </Link>

        {/* ---------- Details ---------- */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <Link
                to={`/listings/${request.listing.id}`}
                className="font-semibold text-text hover:text-campus-green transition-colors line-clamp-1"
              >
                {request.listing.title}
              </Link>
              <p className="text-sm font-bold text-text mt-0.5">
                {formatPrice(request.listing.price)}
              </p>
            </div>
            <span
              className={cn(
                "px-2.5 py-1 rounded-full border text-[11px] font-semibold shrink-0",
                STATUS_STYLES[request.status]
              )}
            >
              {REQUEST_STATUS_LABELS[request.status]}
            </span>
          </div>

          <p className="text-xs text-text-muted mt-2">
            {isBuyer ? "You requested this from" : "Requested by"}{" "}
            <Link
              to={`/users/${counterparty.id}`}
              className="font-medium text-text-secondary hover:text-campus-green"
            >
              {counterparty.name}
            </Link>
          </p>

          {request.note && (
            <p className="text-sm text-text-secondary mt-2 bg-bg border border-border rounded-xl px-3 py-2">
              <span className="font-medium text-text">
                {isBuyer ? "Your note" : "Note"}:
              </span>{" "}
              {request.note}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-text-muted">
              Requested on {new Date(request.createdAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>

            {actions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {actions.map((action) => (
                  <Button
                    key={action.status}
                    size="sm"
                    variant={action.variant}
                    loading={busy}
                    disabled={busy}
                    onClick={() => onAction(request, action.status)}
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
