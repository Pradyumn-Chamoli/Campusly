import { useEffect, useRef, useState } from "react";
import api from "../services/api";
import { Button } from "./ui/Button";
import Input from "./ui/Input";
import Textarea from "./ui/Textarea";
import Alert from "./ui/Alert";
import Spinner from "./ui/Spinner";

const CATEGORY_OPTIONS = [
  { value: "BOOKS", label: "Books" },
  { value: "ELECTRONICS", label: "Electronics" },
  { value: "FURNITURE", label: "Furniture" },
  { value: "CLOTHING", label: "Clothing" },
  { value: "STATIONERY", label: "Stationery" },
  { value: "SPORTS", label: "Sports" },
  { value: "OTHER", label: "Other" },
];

const CONDITION_OPTIONS = [
  { value: "NEW", label: "New" },
  { value: "LIKE_NEW", label: "Like New" },
  { value: "GOOD", label: "Good" },
  { value: "FAIR", label: "Fair" },
  { value: "POOR", label: "Poor" },
];

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_NEW_FILES = 5;
const MAX_IMAGES_TOTAL = 10;
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const EMPTY_FIELDS = {
  title: "",
  description: "",
  price: "",
  category: "",
  condition: "",
};

export default function ListingForm({
  mode,
  listing = null,
  existingImages = [],
  notice = "",
  onSaved,
  onCancel,
}) {
  const isEdit = mode === "edit";

  const [fields, setFields] = useState(() =>
    listing
      ? {
          title: listing.title ?? "",
          description: listing.description ?? "",
          price: listing.price === undefined || listing.price === null ? "" : String(listing.price),
          category: listing.category ?? "",
          condition: listing.condition ?? "",
        }
      : EMPTY_FIELDS
  );
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [files, setFiles] = useState([]);
  const [removedIds, setRemovedIds] = useState([]);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);

  const inputRef = useRef(null);
  const listingIdRef = useRef(listing?.id ?? null);

  useEffect(() => {
    listingIdRef.current = listing?.id ?? null;
  }, [listing]);

  // Object URLs must be released when previews go away. One effect resets the
  // ref, another (mount-only) revokes whatever is left on unmount — revoking on
  // every change would break previews for files that are still shown.
  const filesRef = useRef(files);

  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  useEffect(() => {
    return () => {
      filesRef.current.forEach((file) => URL.revokeObjectURL(file.preview));
    };
  }, []);

  function setField(name, value) {
    setFields((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => {
      if (!current[name]) return current;
      const next = { ...current };
      delete next[name];
      return next;
    });
  }

  function validate() {
    const errs = {};
    const title = fields.title.trim();
    const description = fields.description.trim();

    if (!title) errs.title = "Title is required";
    else if (title.length > 150) errs.title = "Must be 150 characters or less";

    if (!description) errs.description = "Description is required";
    else if (description.length > 2000)
      errs.description = "Must be 2000 characters or less";

    const price = fields.price;
    if (price === "" || price === null) {
      errs.price = "Price is required";
    } else if (!/^\d+(\.\d{1,2})?$/.test(String(price).trim())) {
      errs.price = "Use numbers only, with at most 2 decimal places";
    } else if (Number(price) < 0.01) {
      errs.price = "Price must be greater than 0";
    }

    if (!fields.category) errs.category = "Choose a category";
    if (!fields.condition) errs.condition = "Choose a condition";

    return errs;
  }

  function handleFiles(selected) {
    const accepted = [];
    const rejected = [];

    for (const file of selected) {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        rejected.push(`${file.name} is not a JPEG, PNG or WebP`);
      } else if (file.size > MAX_FILE_SIZE) {
        rejected.push(`${file.name} is larger than 5MB`);
      } else {
        accepted.push(Object.assign(file, { preview: URL.createObjectURL(file) }));
      }
    }

    if (rejected.length > 0) {
      setServerError(rejected[0]);
      return;
    }

    const keptExisting = existingImages.length - removedIds.length;
    const capacity = Math.min(
      MAX_NEW_FILES - files.length,
      MAX_IMAGES_TOTAL - keptExisting - files.length
    );
    const toAdd = accepted.slice(0, capacity);
    const overflow = accepted.slice(capacity);

    if (overflow.length > 0) {
      overflow.forEach((file) => URL.revokeObjectURL(file.preview));
      setServerError(
        capacity <= 0
          ? `A listing can have up to ${MAX_IMAGES_TOTAL} photos`
          : `You can add up to ${MAX_NEW_FILES} new photos at a time`
      );
    } else {
      setServerError("");
    }

    if (toAdd.length > 0) {
      setFiles((current) => [...current, ...toAdd]);
    }
  }

  function removeFile(file) {
    URL.revokeObjectURL(file.preview);
    setFiles((current) => current.filter((item) => item !== file));
  }

  function removeExistingImage(imageId) {
    setRemovedIds((current) => [...current, imageId]);
  }

  async function uploadNewImages(listingId) {
    if (files.length === 0) return;

    const body = new FormData();
    files.forEach((file) => body.append("images", file));
    body.append("altText", fields.title.trim());

    await api.post(`/listings/${listingId}/images`, body, {
      onUploadProgress: (event) => {
        if (!event.total) return;
        setUploadProgress(Math.round((event.loaded / event.total) * 100));
      },
    });
  }

  function applyError(error) {
    const details = error.response?.data?.details;
    if (Array.isArray(details)) {
      setFieldErrors(Object.fromEntries(details.map((d) => [d.field, d.message])));
    }
    setServerError(error.response?.data?.error || "Something went wrong. Please try again.");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setServerError("");

    const errs = validate();
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);

    try {
      const payload = {
        title: fields.title.trim(),
        description: fields.description.trim(),
        price: Number(fields.price),
        category: fields.category,
        condition: fields.condition,
      };

      let listingId = listingIdRef.current;

      if (!isEdit) {
        const created = await api.post("/listings", payload);
        listingId = created.data.data.id;
        listingIdRef.current = listingId;
      } else {
        // Send only what changed to avoid a pointless write.
        const changed = Object.fromEntries(
          Object.entries(payload).filter(
            ([key, value]) => String(value) !== String(listing?.[key])
          )
        );

        if (Object.keys(changed).length > 0) {
          await api.put(`/listings/${listingId}`, changed);
        }

        await Promise.all(
          removedIds.map((imageId) =>
            api.delete(`/listings/${listingId}/images/${imageId}`)
          )
        );
      }

      try {
        setUploadProgress(0);
        await uploadNewImages(listingId);
      } catch (uploadError) {
        // The listing itself saved, so send the user somewhere useful.
        if (!isEdit) {
          onSaved(listingId, {
            notice: "Your listing was saved, but the photos did not upload. Add them from the edit page.",
          });
          return;
        }
        applyError(uploadError);
        return;
      } finally {
        setUploadProgress(null);
      }

      onSaved(listingId, {});
    } catch (error) {
      applyError(error);
    } finally {
      setSaving(false);
    }
  }

  const remaining = MAX_NEW_FILES - files.length;
  const totalImages = existingImages.length - removedIds.length + files.length;

  return (
    <div className="bg-surface border border-border rounded-2xl shadow-card p-5 sm:p-6">
      {notice && (
        <Alert variant="success" className="mb-5">
          {notice}
        </Alert>
      )}

      {serverError && (
        <Alert variant="error" className="mb-5">
          {serverError}
        </Alert>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {/* ---------- Photos ---------- */}
        <section>
          <div className="flex items-baseline justify-between mb-1.5">
            <h2 className="text-sm font-medium text-text">Photos</h2>
            <span className="text-xs text-text-muted">
              {totalImages}/{MAX_IMAGES_TOTAL} · JPEG, PNG or WebP · max 5MB
            </span>
          </div>

          <div className="flex flex-wrap gap-3">
            {existingImages
              .filter((image) => !removedIds.includes(image.id))
              .map((image) => (
                <div
                  key={image.id}
                  className="relative w-24 h-24 rounded-xl overflow-hidden border border-border group"
                >
                  <img
                    src={image.url}
                    alt={image.altText || "Listing photo"}
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeExistingImage(image.id)}
                    aria-label="Remove photo"
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-white/90 text-error text-sm font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity cursor-pointer hover:bg-white"
                  >
                    ✕
                  </button>
                </div>
              ))}

            {files.map((file) => (
              <div
                key={file.preview}
                className="relative w-24 h-24 rounded-xl overflow-hidden border border-campus-green/40 group"
              >
                <img
                  src={file.preview}
                  alt={file.name}
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeFile(file)}
                  aria-label={`Remove ${file.name}`}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-white/90 text-error text-sm font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity cursor-pointer hover:bg-white"
                >
                  ✕
                </button>
              </div>
            ))}

            {remaining > 0 && totalImages < MAX_IMAGES_TOTAL && (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="w-24 h-24 rounded-xl border-2 border-dashed border-border hover:border-campus-green hover:bg-campus-green-light flex flex-col items-center justify-center gap-1 text-text-muted hover:text-campus-green transition-colors cursor-pointer"
              >
                <span className="text-2xl leading-none">+</span>
                <span className="text-[11px] font-medium">Add photos</span>
              </button>
            )}
          </div>

          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_TYPES.join(",")}
            multiple
            className="sr-only"
            onChange={(event) => {
              handleFiles(Array.from(event.target.files ?? []));
              event.target.value = "";
            }}
          />

          <p className="mt-2 text-xs text-text-muted">
            {totalImages >= MAX_IMAGES_TOTAL
              ? `This listing already has the maximum of ${MAX_IMAGES_TOTAL} photos.`
              : remaining === 0
                ? "You have reached the new-photo limit for this batch."
                : `${remaining} of ${MAX_NEW_FILES} new photos remaining.`}
          </p>
        </section>

        {/* ---------- Details ---------- */}
        <section className="space-y-4">
          <h2 className="text-sm font-medium text-text">Listing details</h2>

          <Input
            label="Title"
            placeholder="e.g. Calculus textbook, 8th edition"
            value={fields.title}
            onChange={(e) => setField("title", e.target.value)}
            error={fieldErrors.title}
            maxLength={150}
            hint={`${fields.title.length}/150`}
          />

          <Textarea
            label="Description"
            placeholder="Describe condition, what is included, pickup details..."
            value={fields.description}
            onChange={(e) => setField("description", e.target.value)}
            error={fieldErrors.description}
            maxLength={2000}
            hint={`${fields.description.length}/2000`}
            rows={6}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Input
                label="Price"
                placeholder="0"
                inputMode="decimal"
                value={fields.price}
                onChange={(e) => setField("price", e.target.value)}
                error={fieldErrors.price}
              />
              <p className="mt-1.5 text-xs text-text-muted">Amount in ₹</p>
            </div>

            <div>
              <label className="text-sm font-medium text-text mb-1.5 block">
                Condition
              </label>
              <select
                value={fields.condition}
                onChange={(e) => setField("condition", e.target.value)}
                className={`w-full h-11 px-4 rounded-xl border bg-surface text-text text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-campus-green/20 focus:border-campus-green ${
                  fieldErrors.condition
                    ? "border-error focus:ring-error/20 focus:border-error"
                    : "border-border hover:border-border-hover"
                } ${fields.condition ? "" : "text-text-muted"}`}
              >
                <option value="" disabled>
                  Select condition
                </option>
                {CONDITION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value} className="text-text">
                    {option.label}
                  </option>
                ))}
              </select>
              {fieldErrors.condition && (
                <p className="mt-1.5 text-xs text-error">{fieldErrors.condition}</p>
              )}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-text mb-1.5 block">
              Category
            </label>
            <select
              value={fields.category}
              onChange={(e) => setField("category", e.target.value)}
              className={`w-full h-11 px-4 rounded-xl border bg-surface text-text text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-campus-green/20 focus:border-campus-green ${
                fieldErrors.category
                  ? "border-error focus:ring-error/20 focus:border-error"
                  : "border-border hover:border-border-hover"
              } ${fields.category ? "" : "text-text-muted"}`}
            >
              <option value="" disabled>
                Select category
              </option>
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value} className="text-text">
                  {option.label}
                </option>
              ))}
            </select>
            {fieldErrors.category && (
              <p className="mt-1.5 text-xs text-error">{fieldErrors.category}</p>
            )}
          </div>
        </section>

        {uploadProgress !== null && (
          <div>
            <div className="flex items-center justify-between text-xs text-text-secondary mb-1.5">
              <span className="inline-flex items-center gap-1.5">
                <Spinner className="h-3.5 w-3.5" />
                Uploading photos...
              </span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-surface-hover overflow-hidden">
              <div
                className="h-full bg-campus-green transition-all duration-200"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2 border-t border-border">
          <Button
            type="button"
            variant="ghost"
            onClick={() => (onCancel ? onCancel() : window.history.back())}
          >
            Cancel
          </Button>
          <Button type="submit" loading={saving} disabled={uploadProgress !== null}>
            {isEdit ? "Save changes" : "Publish listing"}
          </Button>
        </div>
      </form>
    </div>
  );
}
