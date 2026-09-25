import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/Button";
import Avatar from "../components/ui/Avatar";
import Alert from "../components/ui/Alert";
import Spinner from "../components/ui/Spinner";
import EmptyState from "../components/ui/EmptyState";
import ListingCard from "../components/ListingCard";
import { formatMonthYear } from "../lib/format";

// Keying on the id remounts the view per seller, so each seller starts from a
// clean loading state instead of resetting state inside an effect.
export default function PublicProfilePage() {
  const { id } = useParams();

  return <ProfileView key={id} userId={id} />;
}

function ProfileView({ userId }) {
  const { user } = useAuth();

  const [profile, setProfile] = useState(null);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [listingsError, setListingsError] = useState("");

  useEffect(() => {
    let cancelled = false;

    api
      .get(`/users/${userId}`)
      .then((res) => {
        if (!cancelled) setProfile(res.data.data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.response?.data?.error || "Could not load this profile.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!profile) return;
    let cancelled = false;

    api
      .get("/listings", { params: { sellerId: userId, limit: 24 } })
      .then((res) => {
        if (!cancelled) setListings(res.data.data);
      })
      .catch((err) => {
        if (!cancelled) {
          setListingsError(
            err.response?.data?.error || "Could not load this seller's listings."
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [profile, userId]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Spinner className="h-7 w-7 text-campus-green" />
        <p className="text-sm text-text-muted">Loading profile...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16 space-y-4">
        <Alert variant="error">{error}</Alert>
        <Link to="/">
          <Button variant="secondary">Back to home</Button>
        </Link>
      </div>
    );
  }

  const isOwnProfile = user?.id === profile.id;
  const firstName = profile.name.split(" ")[0];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6">
      <section className="bg-surface border border-border rounded-2xl shadow-card overflow-hidden">
        <div className="h-24 sm:h-32 bg-gradient-to-r from-campus-green to-campus-green-dark" />

        <div className="px-5 sm:px-8 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:gap-6 -mt-12 sm:-mt-14">
            <div className="rounded-full ring-4 ring-surface">
              <Avatar user={profile} size="lg" />
            </div>

            <div className="flex-1 mt-4 sm:mt-0 sm:pb-2 sm:pt-6 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-text truncate">
                  {profile.name}
                </h1>
                {isOwnProfile && (
                  <span className="px-2 py-0.5 rounded-full bg-campus-green-light text-campus-green text-[10px] font-semibold">
                    This is you
                  </span>
                )}
              </div>
              <p className="text-xs text-text-muted mt-1">
                Member since {formatMonthYear(profile.createdAt)}
              </p>
            </div>

            <div className="mt-4 sm:mt-0 sm:pb-2">
              {isOwnProfile ? (
                <Link to="/profile">
                  <Button variant="secondary">Edit your profile</Button>
                </Link>
              ) : (
                <Button disabled title="Chat arrives in a later phase">
                  Message
                </Button>
              )}
            </div>
          </div>

          <div className="mt-5 pt-5 border-t border-border flex flex-col sm:flex-row sm:items-start gap-x-8 gap-y-3">
            <div className="shrink-0">
              <p className="text-2xl font-bold text-text">
                {profile.activeListings ?? 0}
              </p>
              <p className="text-xs text-text-muted">
                Active {profile.activeListings === 1 ? "listing" : "listings"}
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text">About</p>
              <p className="text-sm text-text-secondary mt-0.5 whitespace-pre-line leading-relaxed">
                {profile.bio || "This seller has not added a bio yet."}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-bold text-text mb-4">
          {firstName}&apos;s listings
        </h2>

        {listingsError ? (
          <Alert variant="error">{listingsError}</Alert>
        ) : listings.length === 0 ? (
          <EmptyState
            icon="🛒"
            title="No active listings"
            description={
              isOwnProfile
                ? "Your active listings will appear here."
                : "This seller has nothing available right now. Check back later."
            }
            action={
              isOwnProfile ? (
                <Link to="/listings/new">
                  <Button>List an item</Button>
                </Link>
              ) : (
                <Link to="/">
                  <Button variant="secondary">Browse marketplace</Button>
                </Link>
              )
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
