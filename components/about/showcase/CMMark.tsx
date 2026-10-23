// The Canuck Motors "CM" mark, traced from public/logo/canuck-motors-icon.png.
// Renders as a nested <svg> so it can be dropped into any SVG at (x, y) with a given width.

const RIGHT = "M138 212 L267 213 L316 166 L317 304 L408 305 L409 242 L486 166 L487 304 L578 305 L579 35 L486 34 L410 109 L408 34 L316 34 Z";
const LEFT = "M159 34 L35 159 L35 305 L298 305 L298 231 L126 230 L126 198 L289 34 Z";

export function CMMark({
  x = 0,
  y = 0,
  width,
  fill = "#d32f2f",
  opacity = 1,
  emboss,
}: {
  x?: number;
  y?: number;
  width: number;
  fill?: string;
  opacity?: number;
  /** Light colour drawn 1.5px up-left to fake a stamped/cast edge. */
  emboss?: string;
}) {
  const height = (width * 271) / 544;
  return (
    <svg x={x} y={y} width={width} height={height} viewBox="35 34 544 271" opacity={opacity} aria-hidden="true">
      {emboss && (
        <g transform="translate(-6 -6)" fill={emboss}>
          <path d={LEFT} />
          <path d={RIGHT} />
        </g>
      )}
      <g fill={fill}>
        <path d={LEFT} />
        <path d={RIGHT} />
      </g>
    </svg>
  );
}
