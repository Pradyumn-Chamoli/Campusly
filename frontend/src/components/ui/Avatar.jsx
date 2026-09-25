import { useState } from "react";
import { cn } from "../../lib/utils";

const SIZES = {
  xs: "w-6 h-6 text-[10px]",
  sm: "w-8 h-8 text-xs",
  md: "w-12 h-12 text-base",
  lg: "w-20 h-20 sm:w-24 sm:h-24 text-2xl sm:text-3xl",
};

function initialsFor(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

// Avatar with an initials fallback so the UI never shows a broken image.
export default function Avatar({ user, size = "sm", className }) {
  const name = user?.name ?? "";
  const avatarUrl = user?.avatarUrl;
  // Remembers which URL failed so a new URL is retried automatically.
  const [failedUrl, setFailedUrl] = useState(null);

  if (avatarUrl && failedUrl !== avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name ? `${name}'s profile picture` : "Profile picture"}
        className={cn(
          "rounded-full object-cover bg-campus-green-light shrink-0",
          SIZES[size],
          className
        )}
        loading="lazy"
        onError={() => setFailedUrl(avatarUrl)}
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      className={cn(
        "rounded-full bg-campus-green text-white flex items-center justify-center font-semibold shrink-0 select-none",
        SIZES[size],
        className
      )}
    >
      {initialsFor(name)}
    </div>
  );
}
