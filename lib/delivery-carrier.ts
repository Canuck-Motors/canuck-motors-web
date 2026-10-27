// How an order was originally delivered, in plain words (shared by labels and the admin and customer pages).
export function deliveryCarrierLabel(input: {
  carrier?: string | null;
  tracking?: string | null;
  deliveryMethod?: string | null;
  provider?: string | null;
}) {
  const carrier = String(input.carrier ?? "").trim();
  const tracking = String(input.tracking ?? "").trim();
  if (carrier) return [carrier, tracking && `#${tracking}`].filter(Boolean).join(" ");
  if (String(input.deliveryMethod ?? "") === "uber") return "Uber same-day courier";
  if (String(input.provider ?? "") === "amazon_mcf") return "Amazon MCF";
  return "Standard shipping";
}
