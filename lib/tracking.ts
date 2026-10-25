// Public tracking page for the carriers we use, so staff never have to paste a link.
export function trackingUrlFor(carrier: string, trackingNumber: string): string | null {
  const c = carrier.toLowerCase().replace(/[^a-z]/g, "");
  const n = encodeURIComponent(trackingNumber.trim());
  if (!n) return null;
  if (c.includes("chitchats")) return `https://chitchats.com/tracking/${n}`;
  if (c.includes("canadapost")) return `https://www.canadapost-postescanada.ca/track-reperage/en#/search?searchFor=${n}`;
  if (c.includes("purolator")) return `https://www.purolator.com/en/shipping/tracker?pin=${n}`;
  if (c.includes("ups")) return `https://www.ups.com/track?tracknum=${n}`;
  if (c.includes("fedex")) return `https://www.fedex.com/fedextrack/?trknbr=${n}`;
  if (c.includes("canpar")) return `https://www.canpar.com/en/track/TrackingAction.do?reference=${n}`;
  return null;
}
