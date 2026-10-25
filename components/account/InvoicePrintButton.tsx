"use client";

export default function InvoicePrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-full bg-black px-5 py-2 text-sm font-bold text-white print:hidden"
    >
      Download PDF / Print
    </button>
  );
}
