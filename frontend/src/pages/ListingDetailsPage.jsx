import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/Button";
import Alert from "../components/ui/Alert";
import Spinner from "../components/ui/Spinner";
import Avatar from "../components/ui/Avatar";
import Dialog from "../components/ui/Dialog";
import FavoriteButton from "../components/FavoriteButton";
import {
  CATEGORY_EMOJI,
  CATEGORY_LABELS,
  CONDITION_LABELS,
  formatDate,
  formatPrice,
} from "../lib/format";

const LOAD_ERROR = "Could not load this listing.";

export default function ListingDetailsPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  // `requestId` tells us which `id` this response belongs to, so a changed
  // param reads as "still loading" without an extra state write in the effect.
  const [response, setResponse] = useState({
    requestId: null,
    listing: null,
    error: "",
  });
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const [selected, setSelected] = useState(0);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // The API count is accurate when the listing loads; each save/unsaved
  // during this visit is tracked so the number stays truthful without a
  // refetch. Reset when navigating to another listing.
  const [saveDelta, setSaveDelta] = useState(0);
  const [prevId, setPrevId] = useState(id);
  if (prevId !== id) {
    setPrevId(id);
    setSaveDelta(0);
  }

  useEffect(() => {
    let cancelled = false;

    api
      .get(`/listings/${id}`)
      .then((res) => {
        if (!cancelled) {
          setResponse({ requestId: id, listing: res.data.data, error: "" });
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setResponse({
            requestId: id,
            listing: null,
            error: err.response?.data?.error || LOAD_ERROR,
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const loading = response.requestId !== id;
  const listing = loading ? null : response.listing;
  const loadError = loading ? "" : response.error;

  const images = listing?.images ?? [];
  const isOwner = Boolean(user && listing && user.id === listing.sellerId);

  function handleImageKeyDown(event) {
    if (images.length < 2) return;
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      setSelected((current) =>
        event.key === "ArrowRight"
          ? (current + 1) % images.length
          : (current - 1 + images.length) % images.length
      );
    }
  }

  async function toggleSold() {
    setBusy(true);
    setNotice("");
    setActionError("");
    try {
      const res = await api.put(`/listings/${listing.id}`, {
        status: listing.status === "SOLD" ? "ACTIVE" : "SOLD",
      });
      setResponse((prev) => ({ ...prev, listing: res.data.data }));
      setNotice(
        res.data.data.status === "SOLD"
          ? "Marked as sold. It is hidden from the marketplace."
          : "Relisted. It is visible in the marketplace again."
      );
    } catch (err) {
      setActionError(err.response?.data?.error || "Could not update this listing.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    setBusy(true);
    setActionError("");
    try {
      await api.delete(`/listings/${listing.id}`);
      navigate("/profile", { replace: true });
    } catch (err) {
      setBusy(false);
      setConfirmDelete(false);
      setActionError(err.response?.data?.error || "Could not delete this listing.");
    }
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Spinner className="h-7 w-7 text-campus-green" />
        <p className="text-sm text-text-muted">Loading listing...</p>
      </div>
    );
  }

  if (loadError || !listing) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16 space-y-4">
        <Alert variant="error">{loadError || "Listing not found."}</Alert>
        <Link to="/marketplace">
          <Button variant="secondary">Back to marketplace</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6">
      <nav className="text-sm text-text-muted flex items-center gap-2">
        <Link to="/marketplace" className="hover:text-campus-green">
          Marketplace
        </Link>
        <span aria-hidden="true">/</span>
        <Link
          to={`/marketplace?category=${listing.category}`}
          className="hover:text-campus-green"
        >
          {CATEGORY_LABELS[listing.category]}
        </Link>
      </nav>

      {actionError && <Alert variant="error">{actionError}</Alert>}
      {notice && <Alert variant="success">{notice}</Alert>}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ---------- Gallery ---------- */}
        <div className="lg:col-span-3">
          <div
            className="relative aspect-[4/3] rounded-2xl overflow-hidden border border-border bg-gradient-to-br from-campus-green-light to-bg flex items-center justify-center"
            onKeyDown={handleImageKeyDown}
            tabIndex={images.length > 1 ? 0 : -1}
            role={images.length > 1 ? "group" : undefined}
            aria-label={
              images.length > 1
                ? "Image gallery. Use left and right arrow keys to change image."
                : undefined
            }
          >
            {images.length > 0 ? (
              <img
                src={images[selected].url}
                alt={images[selected].altText || listing.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="text-6xl opacity-40" aria-hidden="true">
                {CATEGORY_EMOJI[listing.category] ?? "📦"}
              </div>
            )}

            <div className="absolute top-4 left-4 flex flex-wrap gap-1.5">
              <span className="px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-sm text-xs font-semibold text-campus-green">
                {CONDITION_LABELS[listing.condition]}
              </span>
              {listing.status !== "ACTIVE" && (
                <span
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-sm ${
                    listing.status === "SOLD"
                      ? "bg-campus-orange/90 text-white"
                      : "bg-text/80 text-white"
                  }`}
                >
                  {listing.status === "SOLD" ? "Sold" : "Removed"}
                </span>
              )}
            </div>

            {images.length > 1 && (
              <div className="absolute inset-x-0 bottom-3 flex justify-center gap-2">
                {images.map((image, index) => (
                  <button
                    key={image.id}
                    type="button"
                    onClick={() => setSelected(index)}
                    aria-label={`Show image ${index + 1}`}
                    aria-current={index === selected}
                    className={`h-2.5 rounded-full transition-all cursor-pointer ${
                      index === selected
                        ? "w-6 bg-campus-green"
                        : "w-2.5 bg-white/70 hover:bg-white"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {images.length > 1 && (
            <div className="grid grid-cols-5 gap-2 mt-3">
              {images.map((image, index) => (
                <button
                  key={image.id}
                  type="button"
                  onClick={() => setSelected(index)}
                  aria-label={`Show image ${index + 1}`}
                  className={`aspect-square rounded-xl overflow-hidden border-2 transition-colors cursor-pointer ${
                    index === selected
                      ? "border-campus-green"
                      : "border-transparent hover:border-border-hover"
                  }`}
                >
                  <img
                    src={image.url}
                    alt={image.altText || `${listing.title} thumbnail ${index + 1}`}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ---------- Details ---------- */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-surface border border-border rounded-2xl p-5 sm:p-6 shadow-card">
            <p className="text-3xl font-bold text-text">{formatPrice(listing.price)}</p>
            <h1 className="text-xl font-bold text-text mt-1">{listing.title}</h1>

            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-xs text-text-muted">
                {Math.max(0, (listing._count?.favorites ?? 0) + saveDelta)}{" "}
                {Math.max(0, (listing._count?.favorites ?? 0) + saveDelta) === 1
                  ? "save"
                  : "saves"}
              </p>
              <FavoriteButton
                variant="pill"
                listingId={listing.id}
                onChange={(_listingId, favorited) => {
                  setSaveDelta((delta) => delta + (favorited ? 1 : -1));
                  setActionError("");
                  setNotice(
                    favorited
                      ? "Saved to your favorites."
                      : "Removed from your favorites."
                  );
                }}
                onError={setActionError}
              />
            </div>

            <dl className="mt-4 pt-4 border-t border-border space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-text-muted">Condition</dt>
                <dd className="font-medium text-text">
                  {CONDITION_LABELS[listing.condition]}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-text-muted">Category</dt>
                <dd className="font-medium text-text">
                  {CATEGORY_LABELS[listing.category]}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-text-muted">Posted</dt>
                <dd className="font-medium text-text">{formatDate(listing.createdAt)}</dd>
              </div>
            </dl>

            <div className="mt-5 space-y-2">
              {isOwner ? (
                <>
                  <Link to={`/listings/${listing.id}/edit`} className="block">
                    <Button className="w-full">Edit listing</Button>
                  </Link>
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={toggleSold}
                    loading={busy}
                    disabled={listing.status === "REMOVED"}
                  >
                    {listing.status === "SOLD" ? "Relist" : "Mark as sold"}
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full text-error hover:bg-error-light"
                    onClick={() => setConfirmDelete(true)}
                  >
                    Delete listing
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    className="w-full"
                    disabled
                    title="Messaging arrives in a later phase"
                  >
                    Contact seller
                  </Button>
                  <p className="text-xs text-text-muted text-center">
                    {listing.status === "SOLD"
                      ? "This item has already been sold."
                      : "Meet on campus to complete the exchange."}
                  </p>
                </>
              )}
            </div>
          </div>

          <Link
            to={`/users/${listing.seller.id}`}
            className="flex items-center gap-3 bg-surface border border-border rounded-2xl p-4 shadow-card hover:border-campus-green/30 transition-colors"
          >
            <Avatar user={listing.seller} size="md" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text truncate">
                {listing.seller.name}
              </p>
              <p className="text-xs text-text-muted">
                {listing.status === "SOLD" ? "Item sold" : "Active seller"}
              </p>
            </div>
            <span className="ml-auto text-xs font-medium text-campus-green shrink-0">
              View profile
            </span>
          </Link>

          <div className="bg-surface border border-border rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-text mb-2">Description</h2>
            <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-line">
              {listing.description}
            </p>
          </div>
        </div>
      </div>

      <Dialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete this listing?"
        description={`"${listing.title}" will be permanently removed, along with its photos. This cannot be undone.`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete} loading={busy}>
              Delete listing
            </Button>
          </>
        }
      />
    </div>
  );
}
