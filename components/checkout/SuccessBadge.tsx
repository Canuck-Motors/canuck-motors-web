"use client";

// A green tick that draws itself and then softly glows.
export default function SuccessBadge() {
  return (
    <div className="cm-badge-glow mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-emerald-100">
      <svg
        viewBox="0 0 48 48"
        className="cm-badge-pop h-14 w-14 text-emerald-600"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="24" cy="24" r="20" />
        <path className="cm-badge-tick" d="M14 25l7 7 13-15" />
      </svg>
    </div>
  );
}
