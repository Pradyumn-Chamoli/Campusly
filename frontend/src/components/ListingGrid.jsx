import ListingCard from "./ListingCard";
import Skeleton from "./ui/Skeleton";

// Shared responsive grid for every place listings are shown: marketplace,
// profile, seller pages. Pass `className` to override the default columns.
export default function ListingGrid({
  listings,
  to,
  showSeller = false,
  className,
}) {
  return (
    <div
      className={
        className ?? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
      }
    >
      {listings.map((listing) => (
        <ListingCard
          key={listing.id}
          listing={listing}
          to={to ?? `/listings/${listing.id}`}
          showSeller={showSeller}
        />
      ))}
    </div>
  );
}

export function ListingGridSkeleton({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="bg-surface border border-border rounded-2xl overflow-hidden">
          <Skeleton className="h-40 rounded-none" />
          <div className="p-4 space-y-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <div className="flex items-center justify-between pt-2">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
