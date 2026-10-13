export function nextStatus(status: string) {
  switch (status) {
    case "paid":
      return "processing";
    case "processing":
      return "packed";
    case "packed":
      return "ready_to_ship";
    case "ready_to_ship":
      return "shipped";
    case "shipped":
      return "out_for_delivery";
    case "out_for_delivery":
      return "delivered";
    case "pending":
    case "payment_pending":
      return "cancelled";
    default:
      return null;
  }
}

export const TO_SHIP_STATUSES = ["paid", "processing", "packed", "ready_to_ship"];
