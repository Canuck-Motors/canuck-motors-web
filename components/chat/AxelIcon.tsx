// Axel's mark: a gear with a bolt-hole "A". The gear turns only while
// Axel is working ("active") or when the parent has class "group" and is hovered.
export default function AxelIcon({
  className = "",
  active = false,
}: {
  className?: string;
  active?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${className} ${active ? "cm-driving" : ""}`}
      aria-hidden="true"
    >
      <g className="cm-wheel">
        {Array.from({ length: 8 }).map((_, i) => (
          <rect
            key={i}
            x="10.3"
            y="0.8"
            width="3.4"
            height="5"
            rx="1"
            className="fill-white"
            transform={`rotate(${i * 45} 12 12)`}
          />
        ))}
        <circle cx="12" cy="12" r="8" className="fill-white" />
      </g>
      <path
        d="M12 7.2 16 16.4h-2.2l-.7-1.7h-2.2l-.7 1.7H8L12 7.2Zm0 3.6-.8 2.1h1.6L12 10.8Z"
        className="fill-brand"
      />
    </svg>
  );
}
