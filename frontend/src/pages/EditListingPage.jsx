import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/Button";
import Alert from "../components/ui/Alert";
import Spinner from "../components/ui/Spinner";
import ListingForm from "../components/ListingForm";

export default function EditListingPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Tagged by the id it was fetched for, so a changed param reads as loading
  // without a synchronous state write in the effect.
  const [response, setResponse] = useState({ requestId: null, listing: null });
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    api
      .get(`/listings/${id}`)
      .then((res) => {
        if (!cancelled) {
          setResponse({ requestId: id, listing: res.data.data });
          setError("");
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setResponse({ requestId: id, listing: null });
          setError(err.response?.data?.error || "Could not load this listing.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const loading = response.requestId !== id;
  const listing = loading ? null : response.listing;

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Spinner className="h-7 w-7 text-campus-green" />
        <p className="text-sm text-text-muted">Loading listing...</p>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16 space-y-4">
        <Alert variant="error">{error || "Listing not found."}</Alert>
        <Link to="/marketplace">
          <Button variant="secondary">Back to marketplace</Button>
        </Link>
      </div>
    );
  }

  // The backend enforces ownership too — this just avoids showing a form that
  // will be rejected.
  const isOwner = user && user.id === listing.sellerId;

  if (!isOwner) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16 space-y-4">
        <Alert variant="error">You can only edit your own listings.</Alert>
        <Link to={`/listings/${listing.id}`}>
          <Button variant="secondary">Back to listing</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-text">Edit listing</h1>
        <p className="text-sm text-text-muted mt-1 truncate">{listing.title}</p>
      </header>

      <ListingForm
        mode="edit"
        listing={listing}
        existingImages={listing.images}
        notice={location.state?.notice}
        onSaved={(listingId, extra = {}) =>
          navigate(`/listings/${listingId}`, extra.notice ? { state: extra } : undefined)
        }
        onCancel={() => navigate(`/listings/${listing.id}`)}
      />
    </div>
  );
}
