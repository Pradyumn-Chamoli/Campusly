import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/Button";
import Alert from "../components/ui/Alert";
import Spinner from "../components/ui/Spinner";
import EmptyState from "../components/ui/EmptyState";
import RequestCard from "../components/RequestCard";
import { REQUEST_STATUS_LABELS } from "../lib/format";

const PAGE_SIZE = 20;
const LOAD_ERROR = "Could not load your requests.";
const UPDATE_ERROR = "Could not update this request.";

const ROLE_TABS = [
  { value: "buyer", label: "Buying" },
  { value: "seller", label: "Selling" },
  { value: "all", label: "All" },
];

const STATUS_FILTERS = ["ALL", "PENDING", "ACCEPTED", "COMPLETED"];

export default function RequestsPage() {
  const { user } = useAuth();

  // `attempt` tags the response with the fetch that produced it, so a changed
  // tab/filter reads as "loading" without resetting state inside the effect.
  const [response, setResponse] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("ALL");

  const [action, setAction] = useState({ id: null, status: "", busy: false });
  const [actionError, setActionError] = useState({ id: null, message: "" });
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let cancelled = false;

    api
      .get("/requests", {
        params: {
          page: 1,
          limit: PAGE_SIZE,
          ...(role !== "all" && { role }),
          ...(status !== "ALL" && { status }),
        },
      })
      .then((res) => {
        if (!cancelled) {
          setResponse({
            attempt,
            requests: res.data.data,
            total: res.data.pagination.total,
            error: "",
          });
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setResponse({
            attempt,
            requests: [],
            total: 0,
            error: err.response?.data?.error || LOAD_ERROR,
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [attempt, role, status]);

  async function handleAction(request, targetStatus) {
    setAction({ id: request.id, status: targetStatus, busy: true });
    setActionError({ id: null, message: "" });
    setNotice("");

    try {
      const res = await api.put(`/requests/${request.id}/status`, {
        status: targetStatus,
      });
      // Only this row changes status; everything else stays as it was.
      setResponse((prev) =>
        prev
          ? {
              ...prev,
              requests: prev.requests.map((item) =>
                item.id === request.id
                  ? { ...item, status: res.data.data.status }
                  : item
              ),
            }
          : prev
      );
      setNotice(res.data.message);
    } catch (err) {
      setActionError({
        id: request.id,
        message: err.response?.data?.error || UPDATE_ERROR,
      });
    } finally {
      setAction({ id: null, status: "", busy: false });
    }
  }

  const loading = !response || response.attempt !== attempt;
  const error = loading ? "" : response.error;
  const requests = loading ? [] : response.requests;
  const total = loading ? 0 : response.total;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-text">My requests</h1>
        <p className="text-sm text-text-muted mt-0.5">
          Track what you have asked for and what others want from you.
        </p>
      </header>

      {/* ---------- Role tabs ---------- */}
      <div
        className="flex gap-1 p-1 bg-surface-hover rounded-full border border-border w-fit mb-4"
        role="tablist"
        aria-label="Request role"
      >
        {ROLE_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={role === tab.value}
            onClick={() => setRole(tab.value)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer ${
              role === tab.value
                ? "bg-campus-green text-white"
                : "text-text-secondary hover:text-text"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ---------- Status filters ---------- */}
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
            {value === "ALL" ? "All" : REQUEST_STATUS_LABELS[value]}
          </button>
        ))}
      </div>

      {notice && (
        <div className="mb-4">
          <Alert variant="success">{notice}</Alert>
        </div>
      )}

      {error && (
        <div className="mb-4">
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
        <div className="flex flex-col items-center justify-center gap-3 py-16 rounded-2xl border border-border bg-surface">
          <Spinner className="h-7 w-7 text-campus-green" />
          <p className="text-sm text-text-muted">Loading your requests...</p>
        </div>
      ) : error && requests.length === 0 ? (
        // The error alert above is the only feedback needed for a failed
        // first load; an empty-state panel would be misleading.
        null
      ) : requests.length === 0 ? (
        <EmptyState
          icon="🤝"
          title={
            role === "seller"
              ? "No one has requested your items yet"
              : role === "buyer"
                ? "You haven't requested anything yet"
                : "No requests yet"
          }
          description={
            role === "seller"
              ? "When a student wants one of your listings, their request will show up here."
              : "Find something you like in the marketplace and send a request to the seller."
          }
          action={
            <Link to="/marketplace">
              <Button>Browse marketplace</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              user={user}
              busy={action.busy && action.id === request.id}
              error={actionError.id === request.id ? actionError.message : ""}
              onAction={handleAction}
            />
          ))}

          {total > requests.length && (
            <p className="text-center text-xs text-text-muted pt-2">
              Showing {requests.length} of {total} requests
            </p>
          )}
        </div>
      )}
    </div>
  );
}
