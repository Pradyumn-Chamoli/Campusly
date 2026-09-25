import { useNavigate } from "react-router-dom";
import ListingForm from "../components/ListingForm";

export default function CreateListingPage() {
  const navigate = useNavigate();

  function handleSaved(listingId, { notice } = {}) {
    if (notice) {
      navigate(`/listings/${listingId}/edit`, { state: { notice } });
      return;
    }
    navigate(`/listings/${listingId}`);
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-text">List an item</h1>
        <p className="text-sm text-text-muted mt-1">
          Add photos and details. Your listing appears in the marketplace
          straight away.
        </p>
      </header>

      <ListingForm
        mode="create"
        onSaved={handleSaved}
        onCancel={() => navigate("/marketplace")}
      />
    </div>
  );
}
