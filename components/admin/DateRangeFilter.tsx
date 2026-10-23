"use client";

export type DateRange = { mode: string; from: string; to: string };
export const ALL_TIME: DateRange = { mode: "all", from: "", to: "" };

const ym = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
const ymd = (iso: string) => {
  const d = new Date(iso);
  return `${ym(iso)}-${String(d.getDate()).padStart(2, "0")}`;
};

export function inRange(iso: string, r: DateRange) {
  if (r.mode === "all") return true;
  if (r.mode === "custom") {
    const day = ymd(iso);
    if (r.from && day < r.from) return false;
    if (r.to && day > r.to) return false;
    return true;
  }
  return ym(iso) === r.mode;
}

export function monthOptions(dates: string[]) {
  const set = new Set(dates.map(ym));
  return [...set].sort().reverse();
}

const monthLabel = (m: string) => {
  const [y, mo] = m.split("-").map(Number);
  return new Date(y, mo - 1, 1).toLocaleString("en-CA", { month: "long", year: "numeric" });
};

export function DateRangeFilter({
  dates,
  value,
  onChange,
}: {
  dates: string[];
  value: DateRange;
  onChange: (r: DateRange) => void;
}) {
  const months = monthOptions(dates);
  const input = "rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={value.mode}
        onChange={(e) => onChange({ ...value, mode: e.target.value })}
        className={input}
        aria-label="Month"
      >
        <option value="all">All months</option>
        {months.map((m) => (
          <option key={m} value={m}>
            {monthLabel(m)}
          </option>
        ))}
        <option value="custom">Custom range…</option>
      </select>
      {value.mode === "custom" && (
        <>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            From
            <input
              type="date"
              value={value.from}
              onChange={(e) => onChange({ ...value, from: e.target.value })}
              className={input}
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            To
            <input
              type="date"
              value={value.to}
              onChange={(e) => onChange({ ...value, to: e.target.value })}
              className={input}
            />
          </label>
        </>
      )}
    </div>
  );
}
