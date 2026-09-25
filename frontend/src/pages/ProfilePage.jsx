import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import api from "../services/api";
import { Button } from "../components/ui/Button";
import Input from "../components/ui/Input";
import Textarea from "../components/ui/Textarea";
import Avatar from "../components/ui/Avatar";
import Alert from "../components/ui/Alert";
import Spinner from "../components/ui/Spinner";
import EmptyState from "../components/ui/EmptyState";
import ListingGrid from "../components/ListingGrid";
import { formatMonthYear, STATUS_LABELS } from "../lib/format";

const STATUS_FILTERS = ["ALL", "ACTIVE", "SOLD", "REMOVED"];

export default function ProfilePage() {
  const { user, updateProfile } = useAuth();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(() => ({
    name: user?.name ?? "",
    bio: user?.bio ?? "",
    avatarUrl: user?.avatarUrl ?? "",
  }));
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  const [listings, setListings] = useState([]);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [listingsLoading, setListingsLoading] = useState(true);
  const [listingsError, setListingsError] = useState("");

  useEffect(() => {
    let cancelled = false;

    api
      .get("/listings/mine", {
        params: {
          limit: 24,
          ...(statusFilter !== "ALL" && { status: statusFilter }),
        },
      })
      .then((res) => {
        if (!cancelled) setListings(res.data.data);
      })
      .catch((err) => {
        if (!cancelled) {
          setListings([]);
          setListingsError(
            err.response?.data?.error || "Could not load your listings."
          );
        }
      })
      .finally(() => {
        if (!cancelled) setListingsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [statusFilter]);

  function handleFilterChange(status) {
    if (status === statusFilter) return;
    setListingsLoading(true);
    setListingsError("");
    setStatusFilter(status);
  }

  function startEditing() {
    setForm({
      name: user.name ?? "",
      bio: user.bio ?? "",
      avatarUrl: user.avatarUrl ?? "",
    });
    setErrors({});
    setServerError("");
    setSuccess("");
    setEditing(true);
  }

  function cancelEditing() {
    setEditing(false);
    setErrors({});
    setServerError("");
    setSuccess("");
  }

  function validate() {
    const errs = {};
    if (!form.name.trim()) {
      errs.name = "Name is required";
    } else if (form.name.trim().length > 100) {
      errs.name = "Must be 100 characters or less";
    }
    if (form.bio.length > 500) {
      errs.bio = "Must be 500 characters or less";
    }
    if (form.avatarUrl.trim()) {
      try {
        new URL(form.avatarUrl.trim());
      } catch {
        errs.avatarUrl = "Enter a full URL starting with http:// or https://";
      }
    }
    return errs;
  }

  async function handleSave(event) {
    event.preventDefault();
    setServerError("");
    setSuccess("");

    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    try {
      await updateProfile({
        name: form.name.trim(),
        bio: form.bio.trim(),
        avatarUrl: form.avatarUrl.trim(),
      });
      setSuccess("Profile updated");
      setEditing(false);
    } catch (err) {
      const fieldErrors = err.response?.data?.details;
      if (Array.isArray(fieldErrors)) {
        setErrors(
          Object.fromEntries(fieldErrors.map((d) => [d.field, d.message]))
        );
      }
      setServerError(err.response?.data?.error || "Could not save your profile.");
    } finally {
      setSaving(false);
    }
  }

  const previewUser = {
    name: form.name || user.name,
    avatarUrl: form.avatarUrl.trim() || null,
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6">
      {/* ---------- Profile header ---------- */}
      <section className="bg-surface border border-border rounded-2xl shadow-card overflow-hidden">
        <div className="h-24 sm:h-32 bg-gradient-to-r from-campus-green to-campus-green-dark" />

        <div className="px-5 sm:px-8 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:gap-6 -mt-12 sm:-mt-14">
            <div className="rounded-full ring-4 ring-surface">
              <Avatar user={editing ? previewUser : user} size="lg" />
            </div>

            <div className="flex-1 mt-4 sm:mt-0 sm:pb-2 sm:pt-6 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-text truncate">
                {user.name}
              </h1>
              <p className="text-sm text-text-secondary truncate">{user.email}</p>
              <p className="text-xs text-text-muted mt-1">
                Member since {formatMonthYear(user.createdAt)}
              </p>
            </div>

            <div className="mt-4 sm:mt-0 sm:pb-2">
              {!editing && (
                <Button variant="secondary" onClick={startEditing}>
                  Edit profile
                </Button>
              )}
            </div>
          </div>

          {success && (
            <Alert variant="success" className="mt-5">
              {success}
            </Alert>
          )}

          {!editing && (
            <div className="mt-5 pt-5 border-t border-border">
              <h2 className="text-sm font-semibold text-text mb-1">About</h2>
              {user.bio ? (
                <p className="text-sm text-text-secondary whitespace-pre-line leading-relaxed">
                  {user.bio}
                </p>
              ) : (
                <p className="text-sm text-text-muted">
                  No bio yet. Add one so other students know what you sell.
                </p>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ---------- Edit form ---------- */}
      {editing && (
        <section className="bg-surface border border-border rounded-2xl shadow-card p-5 sm:p-6">
          <h2 className="text-lg font-bold text-text mb-1">Edit profile</h2>
          <p className="text-sm text-text-secondary mb-5">
            This information is visible to other students on Campusly.
          </p>

          {serverError && (
            <Alert variant="error" className="mb-4">
              {serverError}
            </Alert>
          )}

          <form onSubmit={handleSave} className="space-y-4">
            <Input
              label="Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              error={errors.name}
              maxLength={100}
              autoComplete="name"
            />

            <Textarea
              label="Bio"
              hint={`${form.bio.length}/500`}
              placeholder="e.g. Final-year CS student selling textbooks and gear."
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              error={errors.bio}
              maxLength={500}
            />

            <Input
              label="Profile photo URL"
              hint="Optional"
              type="url"
              placeholder="https://..."
              value={form.avatarUrl}
              onChange={(e) => setForm({ ...form, avatarUrl: e.target.value })}
              error={errors.avatarUrl}
            />

            <p className="text-xs text-text-muted">
              Direct photo upload arrives with listing image uploads in Phase 6.
              For now, paste an image link.
            </p>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={cancelEditing}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" loading={saving}>
                {saving ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </form>
        </section>
      )}

      {/* ---------- My listings ---------- */}
      <section>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-bold text-text">My listings</h2>
            <p className="text-sm text-text-muted">
              Only you can see sold and removed listings here.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {STATUS_FILTERS.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => handleFilterChange(status)}
                aria-pressed={statusFilter === status}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                  statusFilter === status
                    ? "bg-campus-green text-white"
                    : "bg-surface border border-border text-text-secondary hover:bg-surface-hover"
                }`}
              >
                {status === "ALL" ? "All" : STATUS_LABELS[status]}
              </button>
            ))}
          </div>
        </div>

        {listingsLoading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 rounded-2xl border border-border bg-surface">
            <Spinner className="h-7 w-7 text-campus-green" />
            <p className="text-sm text-text-muted">Loading your listings...</p>
          </div>
        ) : listingsError ? (
          <Alert variant="error">{listingsError}</Alert>
        ) : listings.length === 0 ? (
          <EmptyState
            icon="🛍️"
            title={statusFilter === "ALL" ? "You have no listings yet" : `No ${STATUS_LABELS[statusFilter].toLowerCase()} listings`}
            description="List something you no longer need and it will show up here and in the marketplace."
            action={
              <Link to="/listings/new">
                <Button>List an item</Button>
              </Link>
            }
          />
        ) : (
          <ListingGrid listings={listings} />
        )}
      </section>
    </div>
  );
}
