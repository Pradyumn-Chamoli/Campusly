import { cn } from "../../lib/utils";

// Shimmer block used while listing grids and profiles load.
export default function Skeleton({ className, ...props }) {
  return (
    <div
      aria-hidden="true"
      className={cn("rounded-xl bg-surface-hover animate-pulse", className)}
      {...props}
    />
  );
}
