"use client";

export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-full bg-black px-5 py-2 text-sm font-bold text-white print:hidden"
    >
      Print
    </button>
  );
}
