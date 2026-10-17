import LoadingAnimation from "@/components/LoadingAnimation";

// Kept so older imports keep working: now the same hand-drawn loader, inline size.
export default function RoadLoader({ label, className = "" }: { label?: string; className?: string }) {
  return <LoadingAnimation variant="inline" message={label} className={className} />;
}
