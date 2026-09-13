import { cn } from "../lib/utils";

export default function Logo({ size = "md", className }) {
  const sizes = {
    sm: "w-7 h-7",
    md: "w-9 h-9",
    lg: "w-11 h-11",
  };

  return (
    <div
      className={cn(
        "rounded-xl bg-campus-green flex items-center justify-center relative",
        sizes[size],
        className
      )}
    >
      <span className="text-white font-bold" style={{ fontSize: size === "sm" ? "16px" : size === "lg" ? "24px" : "20px" }}>
        C
      </span>
      <span className="absolute bg-campus-orange rounded-full" style={{
        width: size === "sm" ? "6px" : size === "lg" ? "9px" : "7px",
        height: size === "sm" ? "6px" : size === "lg" ? "9px" : "7px",
        top: size === "sm" ? "3px" : size === "lg" ? "4px" : "4px",
        right: size === "sm" ? "4px" : size === "lg" ? "6px" : "5px",
      }} />
    </div>
  );
}
