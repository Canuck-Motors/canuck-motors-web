"use client";

import { useActionState } from "react";
import { testUberDelivery, testUberQuote, type UberTestResult } from "./actions";

const input = "w-full rounded-xl border border-black/10 px-4 py-3 text-sm";

export function UberTestForm() {
  const [quote, quoteAction, quoting] = useActionState<UberTestResult | null, FormData>(testUberQuote, null);
  const [delivery, deliveryAction, booking] = useActionState<UberTestResult | null, FormData>(testUberDelivery, null);
  const result = delivery ?? quote;

  return (
    <form className="grid max-w-xl gap-3">
      <input name="name" placeholder="Customer name" defaultValue="Test Customer" className={input} />
      <input name="phone" placeholder="Phone (+1...)" defaultValue="+16045550101" className={input} />
      <input name="street" placeholder="Street" defaultValue="800 Robson St" className={input} required />
      <div className="grid grid-cols-3 gap-3">
        <input name="city" placeholder="City" defaultValue="Vancouver" className={input} required />
        <input name="state" placeholder="Province" defaultValue="BC" className={input} required />
        <input name="zip" placeholder="Postal code" defaultValue="V6Z 2E4" className={input} required />
      </div>
      <div className="flex flex-wrap gap-3">
        <button formAction={quoteAction} disabled={quoting || booking} className="rounded-full border border-black/15 px-6 py-3 text-sm font-bold">
          {quoting ? "Getting quote..." : "1. Get quote"}
        </button>
        <button formAction={deliveryAction} disabled={quoting || booking} className="rounded-full bg-brand px-6 py-3 text-sm font-bold text-white">
          {booking ? "Booking..." : "2. Book test delivery"}
        </button>
      </div>
      {result && (
        <p className={`rounded-xl p-4 text-sm ${result.ok ? "bg-green-50 text-green-900" : "bg-red-50 text-red-900"}`}>
          {result.message}
          {result.trackingUrl && (
            <>
              {" "}
              <a href={result.trackingUrl} target="_blank" rel="noreferrer" className="font-bold underline">
                Tracking link
              </a>
            </>
          )}
        </p>
      )}
    </form>
  );
}
