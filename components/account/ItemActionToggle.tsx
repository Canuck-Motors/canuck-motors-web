"use client";

import { useState, type ReactNode } from "react";

// Keeps a cancel/return form hidden until the customer chooses to open it.
export default function ItemActionToggle({
  label,
  question,
  tone = "default",
  bare = false,
  children,
}: {
  label: string;
  question: string;
  tone?: "default" | "danger";
  bare?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const button =
    tone === "danger"
      ? "border-red-300 text-red-700 hover:bg-red-50"
      : "border-black/15 text-ink hover:border-brand hover:text-brand";
  return (
    <div className={bare ? "" : "mt-4 border-t pt-4"}>
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`rounded-full border px-4 py-2 text-sm font-bold ${button}`}
        >
          {label}
        </button>
      ) : (
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-bold text-ink">{question}</p>
            <button type="button" onClick={() => setOpen(false)} className="text-xs font-semibold text-muted-foreground underline">
              No, keep it
            </button>
          </div>
          {children}
        </div>
      )}
    </div>
  );
}
