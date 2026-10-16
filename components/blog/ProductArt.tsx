import PartDiagram, { type DiagramLabel } from "@/components/blog/PartDiagram";

// Product photo as a red-ring "technical diagram" on Canuck Motors black (like the Product page).
export const DIAGRAM_BG: React.CSSProperties = {
  backgroundImage:
    "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
  backgroundSize: "28px 28px",
};

export default function ProductArt({
  src,
  alt,
  labels,
  uid,
  className = "",
}: {
  src: string;
  alt: string;
  labels?: DiagramLabel[];
  uid: string;
  className?: string;
}) {
  return (
    <div className={`absolute inset-0 overflow-hidden bg-ink p-2 ${className}`} style={DIAGRAM_BG}>
      <PartDiagram src={src} alt={alt} labels={labels} uid={uid} />
    </div>
  );
}
