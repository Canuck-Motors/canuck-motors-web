"use client";

import { useMemo, useState, useTransition } from "react";
import { setUserRole } from "@/app/admin/users/actions";
import { ChevronDown, Download, Search } from "lucide-react";

export type UserRow = { id: string; name: string; email: string; phone: string; joined: string; roleId: number | null; role: string; isMe: boolean };
export type RoleOpt = { id: number; name: string };

function RoleCell({ r, roles, onMsg }: { r: UserRow; roles: RoleOpt[]; onMsg: (m: { ok: boolean; text: string }) => void }) {
  const [val, setVal] = useState(r.roleId ?? 0);
  const [pending, start] = useTransition();
  if (r.isMe) return <span className="font-semibold capitalize text-ink">{r.role || "—"} (you)</span>;
  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <select
          value={val}
          onChange={(e) => setVal(Number(e.target.value))}
          className="appearance-none rounded-xl border border-black/10 bg-white py-2 pl-3 pr-10 text-sm font-medium capitalize text-ink shadow-sm outline-none transition hover:border-black/20 focus:border-brand/60 focus:ring-4 focus:ring-brand/10"
        >
          {r.roleId == null && <option value={0}>—</option>}
          {roles.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/45"
          aria-hidden="true"
        />
      </div>
      {val !== (r.roleId ?? 0) && val !== 0 && (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              try {
                onMsg({ ok: true, text: `${r.name || r.email}: ${await setUserRole(r.id, val)}` });
              } catch (e) {
                onMsg({ ok: false, text: e instanceof Error ? e.message : "Something went wrong." });
              }
            })
          }
          className="rounded-full bg-ink px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save"}
        </button>
      )}
    </div>
  );
}

export default function UsersTable({ rows, roles }: { rows: UserRow[]; roles: RoleOpt[] }) {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(50);

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) => `${r.name} ${r.email} ${r.phone}`.toLowerCase().includes(term));
  }, [rows, q]);

  const downloadCsv = () => {
    const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v);
    const lines = shown.map((r) =>
      [r.name, r.email, r.phone, r.role, r.joined ? r.joined.slice(0, 10) : ""].map(esc).join(",")
    );
    const blob = new Blob([["Name,Email,Phone,Role,Joined", ...lines].join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `users-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex min-w-[260px] flex-1 items-center rounded-full border border-black/10 bg-white px-4 shadow-sm focus-within:border-brand/60 focus-within:ring-4 focus-within:ring-brand/10">
          <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setLimit(50);
            }}
            placeholder="Search name, email or phone..."
            aria-label="Search users"
            className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm outline-none"
          />
        </div>
        <span className="text-sm text-muted-foreground">{shown.length} users</span>
        <button
          type="button"
          onClick={downloadCsv}
          className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold hover:border-brand hover:text-brand"
        >
          <Download className="h-4 w-4" aria-hidden="true" /> Download CSV
        </button>
      </div>

      {msg && (
        <p
          role="status"
          className={`mt-3 rounded-lg px-4 py-2.5 text-sm font-semibold ${msg.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`}
        >
          {msg.text}
        </p>
      )}

      <div className="mt-4 overflow-x-auto rounded-[26px] border border-black/5 bg-white shadow-[0_16px_46px_rgba(0,0,0,0.06)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-secondary/60 text-xs uppercase tracking-[0.14em] text-muted-foreground">
            <tr>
              <th className="px-5 py-3">Name</th>
              <th className="px-3 py-3">Email</th>
              <th className="px-3 py-3">Phone</th>
              <th className="px-3 py-3">Role</th>
              <th className="px-3 py-3">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {shown.slice(0, limit).map((r) => (
              <tr key={r.id}>
                <td className="px-5 py-3 font-semibold text-ink">{r.name || "—"}</td>
                <td className="px-3 py-3 text-muted-foreground">{r.email || "—"}</td>
                <td className="px-3 py-3 text-muted-foreground">{r.phone || "—"}</td>
                <td className="px-3 py-3">
                  <RoleCell r={r} roles={roles} onMsg={setMsg} />
                </td>
                <td className="px-3 py-3 text-muted-foreground">
                  {r.joined ? new Date(r.joined).toLocaleDateString("en-CA") : "—"}
                </td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-muted-foreground">
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {shown.length > limit && (
        <button
          type="button"
          onClick={() => setLimit((l) => l + 50)}
          className="mt-4 rounded-full border border-black/10 bg-white px-5 py-2.5 text-sm font-semibold hover:border-brand hover:text-brand"
        >
          Show more
        </button>
      )}
    </div>
  );
}
