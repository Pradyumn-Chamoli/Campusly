import { useState } from "react";
import api from "../services/api";
import Dialog from "./ui/Dialog";
import { Button } from "./ui/Button";
import Textarea from "./ui/Textarea";
import { REPORT_REASON_LABELS } from "../lib/format";

// Report flow from docs/04_UI_UX_Design.md §13: pick a reason, optionally
// add a description, confirm, and get success feedback. Kept to one dialog
// so reporting never feels heavier than a couple of clicks.
export default function ReportDialog({ open, onClose, listing, onReported }) {
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleClose() {
    if (submitting) return;
    setReason("");
    setDescription("");
    setError("");
    onClose();
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!reason) {
      setError("Please choose a reason");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      await api.post("/reports", {
        listingId: listing.id,
        reason,
        ...(description.trim() && { description: description.trim() }),
      });
      handleClose();
      onReported?.();
    } catch (err) {
      setError(err.response?.data?.error || "Could not submit this report.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Report this listing"
      description={`Tell us what is wrong with "${listing?.title ?? ""}". Our team will review it.`}
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="danger"
            type="submit"
            form="report-listing-form"
            loading={submitting}
          >
            Submit report
          </Button>
        </>
      }
    >
      <form id="report-listing-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="report-reason"
            className="text-sm font-medium text-text mb-1.5 block"
          >
            Reason
          </label>
          <select
            id="report-reason"
            value={reason}
            onChange={(event) => {
              setReason(event.target.value);
              setError("");
            }}
            className={`w-full h-11 px-4 rounded-xl border bg-surface text-text text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-campus-green/20 focus:border-campus-green ${
              error && !reason
                ? "border-error focus:ring-error/20 focus:border-error"
                : "border-border hover:border-border-hover"
            } ${reason ? "" : "text-text-muted"}`}
            disabled={submitting}
            data-autofocus
          >
            <option value="" disabled>
              Select a reason
            </option>
            {Object.entries(REPORT_REASON_LABELS).map(([value, label]) => (
              <option key={value} value={value} className="text-text">
                {label}
              </option>
            ))}
          </select>
          {error && !reason && (
            <p className="mt-1.5 text-xs text-error">{error}</p>
          )}
        </div>

        <Textarea
          label="Description"
          hint={`${description.length}/1000`}
          placeholder="Add any details that will help us review this listing (optional)"
          rows={4}
          maxLength={1000}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          disabled={submitting}
        />

        {error && reason && (
          <p className="text-xs text-error" role="alert">
            {error}
          </p>
        )}
      </form>
    </Dialog>
  );
}
