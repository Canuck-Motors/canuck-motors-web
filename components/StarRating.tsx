import { Star } from "lucide-react";

// Read-only stars (supports halves via a clipped overlay).
export default function StarRating({ rating, className = "h-4 w-4" }: { rating: number; className?: string }) {
  return (
    <span className="relative inline-flex" role="img" aria-label={`${rating.toFixed(1)} out of 5 stars`}>
      <span className="flex gap-0.5 text-black/15">
        {[1, 2, 3, 4, 5].map((n) => (
          <Star key={n} className={`${className} fill-current`} aria-hidden="true" />
        ))}
      </span>
      <span className="absolute inset-0 flex gap-0.5 overflow-hidden text-amber-400" style={{ width: `${Math.max(0, Math.min(5, rating)) * 20}%` }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Star key={n} className={`${className} shrink-0 fill-current`} aria-hidden="true" />
        ))}
      </span>
    </span>
  );
}
