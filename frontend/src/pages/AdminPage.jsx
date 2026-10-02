import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { Button } from "../components/ui/Button";
import Alert from "../components/ui/Alert";
import Spinner from "../components/ui/Spinner";
import EmptyState from "../components/ui/EmptyState";
import Dialog from "../components/ui/Dialog";
import ListingGrid, { ListingGridSkeleton } from "../components/ListingGrid";
import {
  CATEGORY_EMOJI,
  REPORT_REASON_LABELS,
  REPORT_STATUS_LABELS,
  STATUS_LABELS,
  formatDate,
  formatPrice,
} from "../lib/format";
import { cn } from "../lib/utils";

const PAGE_SIZE = 20;
const REPORTS_LOAD_ERROR = "Could not load reports.";
const REMOVED_LOAD_ERROR = "Could not load removed listings.";
const ACTION_ERROR = "Could not resolve this report.";

const STATUS_FILTERS = ["ALL", "PENDING", "DISMISSED", "REMOVED"];

const VIEWS = [
  { value: "reports", label: "Reports" },
  { value: "removed", label: "Removed listings" },
];

// One badge colour per report state, matching the app's status palette.
const REPORT_BADGE = {
  PENDING: "bg-warning-light text-warning border-warning/20",
  DISMISSED: "bg-surface-hover text-text-secondary border-border",
  REMOVED: "bg-error-light text-error border-error/20",
};

export default function AdminPage() {
  const [view, setView] = useState("reports");
  const [status, setStatus] = useState("ALL");

  // Reports response, tagged with the filters it was fetched for so a
  // changed filter reads as "loading" without extra state writes.
  const [reportsResponse, setReportsResponse] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const [removedResponse, setRemovedResponse] = useState(null);
  const [removedAttempt, setRemovedAttempt] = useState(0);

  // Moderation action state: which report is being resolved and by what.
  const [confirming, setConfirming] = useState(null);
  const [action, setAction] = useState({ id: null, busy: false });
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (view !== "reports") return undefined;
    let cancelled = false;

    api
      .get("/reports", {
        params: {
          page: 1,
          limit: PAGE_SIZE,
          ...(status !== "ALL" && { status }),
        },
      })
      .then((res) => {
        if (!cancelled) {
          setReportsResponse({
            attempt,
            status,
            reports: res.data.data,
            total: res.data.pagination.total,
            error: "",
          });
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setReportsResponse({
            attempt,
            status,
            reports: [],
            total: 0,
            error: err.response?.data?.error || REPORTS_LOAD_ERROR,
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [view, status, attempt]);

  useEffect(() => {
    if (view !== "removed") return undefined;
    let cancelled = false;

    api
      .get("/admin/listings/removed", {
        params: { page: 1, limit: PAGE_SIZE },
      })
      .then((res) => {
        if (!cancelled) {
          setRemovedResponse({
            attempt: removedAttempt,
            listings: res.data.data,
            total: res.data.pagination.total,
            error: "",
          });
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setRemovedResponse({
            attempt: removedAttempt,
            listings: [],
            total: 0,
            error: err.response?.data?.error || REMOVED_LOAD_ERROR,
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [view, removedAttempt]);

  // Dismiss leaves the listing alone; Remove hides it from the marketplace.
  // Either way the report moves out of the pending queue.
  async function handleResolve(report, resolution) {
    setAction({ id: report.id, busy: true });
    setActionError("");

    try {
      const res = await api.put(`/reports/${report.id}/resolve`, {
        action: resolution,
      });
      const resolved = res.data.data;
      setReportsResponse((prev) =>
        prev
          ? {
              ...prev,
              reports: prev.reports.map((item) =>
                item.id === report.id
                  ? {
                      ...item,
                      status: resolved.status,
                      resolvedAt: resolved.resolvedAt,
                      listing: {
                        ...item.listing,
                        // REMOVE hides the listing; DISMISS leaves it alone.
                        status:
                          resolution === "REMOVE"
                            ? "REMOVED"
                            : item.listing.status,
                      },
                    }
                  : item
              ),
            }
          : prev
      );
      setNotice(res.data.message);
      setConfirming(null);
      // The removed-listings view must reflect a new removal immediately.
      if (resolution === "REMOVE") setRemovedResponse(null);
    } catch (err) {
      setActionError(err.response?.data?.error || ACTION_ERROR);
    } finally {
      setAction({ id: null, busy: false });
    }
  }

  // Loading/error are computed from each response's own fetch tags, not the
  // active view, so a null response (tab switched before the first fetch
  // settled) still reads as "loading" instead of dereferencing null.
  const loadingReports =
    !reportsResponse ||
    reportsResponse.attempt !== attempt ||
    reportsResponse.status !== status;
  const reportsError = loadingReports ? "" : reportsResponse.error;
  const reports = loadingReports ? [] : reportsResponse.reports;
  const total = loadingReports ? 0 : reportsResponse.total;

  const loadingRemoved =
    !removedResponse || removedResponse.attempt !== removedAttempt;
  const removedError = loadingRemoved ? "" : removedResponse.error;
  const removedListings = loadingRemoved ? [] : removedResponse.listings;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-text">Admin dashboard</h1>
        <p className="text-sm text-text-muted mt-0.5">
          Review reported listings and moderate the marketplace.
        </p>
      </header>

      {/* ---------- View tabs ---------- */}
      <div
        className="flex gap-1 p-1 bg-surface-hover rounded-full border border-border w-fit mb-4"
        role="tablist"
        aria-label="Admin view"
      >
        {VIEWS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={view === tab.value}
            onClick={() => setView(tab.value)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer ${
              view === tab.value
                ? "bg-campus-green text-white"
                : "text-text-secondary hover:text-text"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {view === "reports" && (
        <div className="flex flex-wrap gap-1.5 mb-6">
          {STATUS_FILTERS.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={status === value}
              onClick={() => setStatus(value)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                status === value
                  ? "bg-campus-green text-white"
                  : "bg-surface border border-border text-text-secondary hover:bg-surface-hover"
              }`}
            >
              {value === "ALL"
                ? "All"
                : REPORT_STATUS_LABELS[value]}
            </button>
          ))}
        </div>
      )}

      {notice && (
        <div className="mb-4">
          <Alert variant="success">{notice}</Alert>
        </div>
      )}

      {actionError && (
        <div className="mb-4">
          <Alert variant="error">{actionError}</Alert>
        </div>
      )}

      {(view === "reports" ? reportsError : removedError) && (
        <div className="mb-4">
          <Alert variant="error">
            {view === "reports" ? reportsError : removedError}{" "}
            <button
              type="button"
              onClick={() =>
                view === "reports"
                  ? setAttempt((value) => value + 1)
                  : setRemovedAttempt((value) => value + 1)
              }
              className="font-semibold underline cursor-pointer"
            >
              Try again
            </button>
          </Alert>
        </div>
      )}

      {/* ---------- Reports queue ---------- */}
      {view === "reports" && (
        <>
          {loadingReports ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 rounded-2xl border border-border bg-surface">
              <Spinner className="h-7 w-7 text-campus-green" />
              <p className="text-sm text-text-muted">Loading reports...</p>
            </div>
          ) : reportsError && reports.length === 0 ? (
            // The error alert above is the only feedback needed for a failed
            // first load; an empty-state panel would be misleading.
            null
          ) : reports.length === 0 ? (
            <EmptyState
              icon="🛡️"
              title={
                status === "PENDING"
                  ? "No pending reports"
                  : "No reports yet"
              }
              description={
                status === "ALL"
                  ? "When students report a listing, it will show up here for review."
                  : "No reports match this filter."
              }
            />
          ) : (
            <div className="space-y-4">
              {reports.map((report) => (
                <ReportRow
                  key={report.id}
                  report={report}
                  busy={action.busy && action.id === report.id}
                  onResolve={handleResolve}
                  onInspect={() => setConfirming(report)}
                />
              ))}

              {total > reports.length && (
                <p className="text-center text-xs text-text-muted pt-2">
                  Showing {reports.length} of {total} reports
                </p>
              )}
            </div>
          )}
        </>
      )}

      {/* ---------- Removed listings ---------- */}
      {view === "removed" && (
        <>
          {loadingRemoved ? (
            <ListingGridSkeleton count={3} />
          ) : removedError ? (
            // The error alert above already covers a failed load.
            null
          ) : removedListings.length === 0 ? (
            <EmptyState
              icon="🗑️"
              title="No removed listings"
              description="Listings hidden by moderation will appear here."
            />
          ) : (
            <>
              <p className="text-sm text-text-muted mb-4">
                {removedListings.length === 1
                  ? "1 removed listing"
                  : `${removedListings.length} removed listings`}
              </p>
              <ListingGrid listings={removedListings} />
            </>
          )}
        </>
      )}

      {/* ---------- Confirm removal (the only destructive action) ---------- */}
      <Dialog
        open={Boolean(confirming)}
        onClose={() => !action.busy && setConfirming(null)}
        title="Remove this listing?"
        description={`"${confirming?.listing.title}" will be hidden from the marketplace. This can only be undone manually.`}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setConfirming(null)}
              disabled={action.busy}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={action.busy}
              onClick={() => confirming && handleResolve(confirming, "REMOVE")}
            >
              Remove listing
            </Button>
          </>
        }
      />
    </div>
  );
}

function ReportRow({ report, busy, onResolve, onInspect }) {
  const image = report.listing.images?.[0];
  const isPending = report.status === "PENDING";

  return (
    <article className="bg-surface border border-border rounded-2xl p-4 shadow-card">
      <div className="flex flex-col sm:flex-row gap-4">
        {/* ---------- Reported listing ---------- */}
        <Link
          to={`/listings/${report.listing.id}`}
          className="relative w-full sm:w-28 h-28 shrink-0 rounded-xl overflow-hidden bg-gradient-to-br from-campus-green-light to-bg flex items-center justify-center hover:opacity-90 transition-opacity"
        >
          {image ? (
            <img
              src={image.url}
              alt={image.altText || report.listing.title}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <span className="text-3xl opacity-40" aria-hidden="true">
              {CATEGORY_EMOJI[report.listing.category] ?? "📦"}
            </span>
          )}
        </Link>

        {/* ---------- Report details ---------- */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <Link
                to={`/listings/${report.listing.id}`}
                className="font-semibold text-text hover:text-campus-green transition-colors line-clamp-1"
              >
                {report.listing.title}
              </Link>
              <p className="text-sm font-bold text-text mt-0.5">
                {formatPrice(report.listing.price)}
                {report.listing.status !== "ACTIVE" && (
                  <span className="ml-2 text-xs font-semibold text-text-muted">
                    {STATUS_LABELS[report.listing.status] ?? report.listing.status}
                  </span>
                )}
              </p>
            </div>
            <span
              className={cn(
                "px-2.5 py-1 rounded-full border text-[11px] font-semibold shrink-0",
                REPORT_BADGE[report.status]
              )}
            >
              {REPORT_STATUS_LABELS[report.status]}
            </span>
          </div>

          <p className="text-xs text-text-muted mt-2">
            Reported by{" "}
            <span className="font-medium text-text-secondary">
              {report.reporter.name}
            </span>{" "}
            on {formatDate(report.createdAt)} · Reason:{" "}
            <span className="font-medium text-text-secondary">
              {REPORT_REASON_LABELS[report.reason] ?? report.reason}
            </span>
          </p>

          {report.description && (
            <p className="text-sm text-text-secondary mt-2 bg-bg border border-border rounded-xl px-3 py-2">
              {report.description}
            </p>
          )}

          {report.status !== "PENDING" && report.resolvedAt && (
            <p className="text-xs text-text-muted mt-2">
              Resolved {formatDate(report.resolvedAt)}
              {report.resolvedBy ? ` by ${report.resolvedBy.name}` : ""}
            </p>
          )}

          {isPending && (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="secondary"
                loading={busy}
                disabled={busy}
                onClick={() => onResolve(report, "DISMISS")}
              >
                Dismiss
              </Button>
              <Button
                size="sm"
                variant="danger"
                disabled={busy}
                onClick={() => onInspect(report)}
              >
                Remove listing
              </Button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
