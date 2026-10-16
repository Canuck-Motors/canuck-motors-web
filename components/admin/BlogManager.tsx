"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ChevronDown, Circle, Loader2, Sparkles, XCircle } from "lucide-react";
import {
  clearPhotos,
  deletePost,
  setPostStatus,
  stepHumanize,
  stepResearch,
  stepSaveDraft,
  stepTailor,
  updatePostText,
} from "@/app/admin/blog/actions";

export type AdminPost = {
  id: number;
  slug: string;
  title: string;
  description: string;
  status: "draft" | "published" | "unpublished";
  mode: string;
  generatedBy: string;
  topic: string;
  createdAt: string;
  publishedAt: string;
  bodyHtml: string;
  photoCount: number;
  photos: { url: string; source: string; credit: string; creditUrl: string; pageUrl: string }[];
};

const STEPS = [
  { label: "AI researches your topic (news or how to find the right part)", note: "Researching and picking real facts" },
  { label: "AI tailors it to Canuck Motors", note: "Our real products and photos, links, quick answer and FAQ" },
  { label: "Humanizing the writing", note: "Natural voice, no robotic phrases" },
  { label: "Saving as a draft", note: "You review it, then publish" },
];

type StepState = "idle" | "running" | "done" | "error";

const badge: Record<AdminPost["status"], string> = {
  draft: "bg-amber-100 text-amber-800",
  published: "bg-emerald-100 text-emerald-800",
  unpublished: "bg-zinc-200 text-zinc-700",
};

const fmt = (iso: string) => (iso ? new Date(iso).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" }) : "");

export default function BlogManager({ posts }: { posts: AdminPost[] }) {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [steps, setSteps] = useState<StepState[]>(["idle", "idle", "idle", "idle"]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const [previewId, setPreviewId] = useState<number | null>(null);
  const preview = posts.find((x) => x.id === previewId) ?? null;
  const setPreview = (p: AdminPost | null) => setPreviewId(p ? p.id : null);
  const [editing, setEditing] = useState<AdminPost | null>(null);
  const [msg, setMsg] = useState("");
  const [listOpen, setListOpen] = useState(false);

  const mark = (i: number, s: StepState) => setSteps((prev) => prev.map((v, idx) => (idx === i ? s : v)));

  async function generate() {
    setRunning(true);
    setError("");
    setMsg("");
    setSteps(["running", "idle", "idle", "idle"]);
    try {
      const r = await stepResearch(topic);
      if (!r.ok) throw new Error(r.error);
      mark(0, "done");
      mark(1, "running");
      const t = await stepTailor(r.data);
      if (!t.ok) throw new Error(t.error);
      mark(1, "done");
      mark(2, "running");
      const h = await stepHumanize(t.data);
      if (!h.ok) throw new Error(h.error);
      mark(2, "done");
      mark(3, "running");
      const s = await stepSaveDraft(h.data, r.data);
      if (!s.ok) throw new Error(s.error);
      mark(3, "done");
      setPreviewId(s.data.id);
      setMsg(`Draft saved with ${s.data.photos} product photo(s) and ${s.data.stock} stock photo(s). ${s.data.stock === 0 ? `No stock photos: ${s.data.photoNote} ` : ""}Check the preview, then publish from there when you're happy.`);
      setTopic("");
      router.refresh();
    } catch (e) {
      setSteps((prev) => prev.map((v) => (v === "running" ? "error" : v)));
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setRunning(false);
    }
  }

  function act(fn: () => Promise<unknown>, done: string) {
    setMsg("");
    start(async () => {
      try {
        await fn();
        setMsg(done);
        router.refresh();
      } catch (e) {
        setMsg(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  return (
    <div className="mt-8 space-y-8">
      <section className="rounded-[26px] border border-black/5 bg-white p-6 shadow-[0_12px_36px_rgba(0,0,0,0.06)]">
        <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
          <label className="text-sm font-semibold text-ink">
            What should the blog be about?
            <input
              value={topic}
              disabled={running}
              onChange={(e) => setTopic(e.target.value)}
              maxLength={200}
              placeholder="e.g. How to choose the right water pump for a Ford F-150, or new Canadian tariffs on auto parts"
              className="mt-1.5 w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand/60 focus:ring-4 focus:ring-brand/10"
            />
          </label>
          <button type="button" onClick={generate} disabled={running || !topic.trim()} className="cm-button-primary inline-flex items-center justify-center gap-2 disabled:opacity-60">
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Generate new blog
          </button>
        </div>

        {steps.some((s) => s !== "idle") && (
          <ol className="mt-6 space-y-3">
            {STEPS.map((s, i) => (
              <li key={s.label} className="flex items-start gap-3">
                {steps[i] === "done" ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
                ) : steps[i] === "running" ? (
                  <Loader2 className="mt-0.5 h-5 w-5 animate-spin text-brand" />
                ) : steps[i] === "error" ? (
                  <XCircle className="mt-0.5 h-5 w-5 text-red-600" />
                ) : (
                  <Circle className="mt-0.5 h-5 w-5 text-black/20" />
                )}
                <div>
                  <p className="text-sm font-bold text-ink">
                    {i + 1}. {s.label}
                  </p>
                  <p className="text-xs text-muted-foreground">{s.note}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
        {running && <p className="mt-4 text-xs text-muted-foreground">This takes 1 to 3 minutes. Keep this page open.</p>}
        {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      </section>

      {msg && <p className="rounded-xl bg-ink/5 p-3 text-sm font-medium text-ink">{msg}</p>}

      <section className="space-y-4">
        <button
          type="button"
          onClick={() => setListOpen((o) => !o)}
          aria-expanded={listOpen}
          className="flex w-full items-center justify-between rounded-2xl border border-black/5 bg-white px-5 py-4 text-left shadow-[0_8px_24px_rgba(0,0,0,0.05)] transition hover:border-brand/30"
        >
          <span className="text-lg font-black text-ink">AI articles ({posts.length})</span>
          <ChevronDown className={`h-5 w-5 text-ink transition-transform duration-300 ${listOpen ? "rotate-180" : ""}`} aria-hidden="true" />
        </button>
        {listOpen && posts.length === 0 && <p className="text-sm text-muted-foreground">Nothing yet. Press Generate new blog.</p>}
        {listOpen && posts.map((p) => (
          <article key={p.id} className="rounded-[22px] border border-black/5 bg-white p-5 shadow-[0_8px_24px_rgba(0,0,0,0.05)]">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className={`rounded-full px-2.5 py-1 font-bold capitalize ${badge[p.status]}`}>{p.status}</span>
              <span className="text-muted-foreground">
                {p.generatedBy === "auto" ? "Auto (15-day)" : "Manual"} · {p.mode === "news" ? "News" : "Guide"} · created {fmt(p.createdAt)}
                {p.publishedAt ? ` · published ${fmt(p.publishedAt)}` : ""}
              </span>
            </div>
            <h3 className="mt-2 text-base font-black text-ink">{p.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setPreview(p)}
                className={p.status !== "published" ? "rounded-xl bg-brand px-3 py-1.5 text-sm font-bold text-white hover:opacity-90" : "rounded-xl border border-black/10 px-3 py-1.5 text-sm font-semibold hover:bg-black/5"}
              >
                {p.status !== "published" ? "Preview & publish" : "Preview"}
              </button>
              <button type="button" onClick={() => setEditing(p)} className="rounded-xl border border-black/10 px-3 py-1.5 text-sm font-semibold hover:bg-black/5">
                Edit title
              </button>
              {p.status !== "published" ? null : (
                <>
                  <a href={`/blog/${p.slug}`} target="_blank" rel="noreferrer" className="rounded-xl border border-black/10 px-3 py-1.5 text-sm font-semibold hover:bg-black/5">
                    View live
                  </a>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => act(() => setPostStatus(p.id, "unpublished"), "Unpublished.")}
                    className="rounded-xl border border-black/10 px-3 py-1.5 text-sm font-semibold hover:bg-black/5 disabled:opacity-60"
                  >
                    Unpublish
                  </button>
                </>
              )}
              {p.photoCount > 0 && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => act(() => clearPhotos(p.id), "Stock photos removed from this article.")}
                  className="rounded-xl border border-black/10 px-3 py-1.5 text-sm font-semibold hover:bg-black/5 disabled:opacity-60"
                >
                  Remove stock photos ({p.photoCount})
                </button>
              )}
              {p.status !== "published" && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    if (confirm("Delete this article for good?")) act(() => deletePost(p.id), "Deleted.");
                  }}
                  className="rounded-xl px-3 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
                >
                  Delete
                </button>
              )}
            </div>
          </article>
        ))}
      </section>

      {preview && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4" onClick={() => setPreview(null)}>
          <div className="my-8 w-full max-w-3xl rounded-[24px] bg-white p-6 md:p-10" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-2xl font-black tracking-[-0.03em] text-ink">{preview.title}</h2>
              <div className="flex shrink-0 gap-2">
                {preview.status !== "published" && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      const id = preview.id;
                      setPreview(null);
                      act(() => setPostStatus(id, "published"), "Published. It is live on /blog.");
                    }}
                    className="rounded-xl bg-brand px-3 py-1.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-60"
                  >
                    Publish
                  </button>
                )}
                <button type="button" onClick={() => setPreview(null)} className="rounded-xl border border-black/10 px-3 py-1.5 text-sm font-semibold">
                  Close
                </button>
              </div>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{preview.description}</p>
            {preview.photos[0] && (
              <div className="mt-6 overflow-hidden rounded-2xl bg-ink">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview.photos[0].url} alt="" className="aspect-[16/7] w-full object-cover" />
              </div>
            )}
            <div
              className="mt-6 space-y-4 text-[15px] leading-7 text-muted-foreground [&_a]:font-semibold [&_a]:text-brand [&_blockquote]:rounded-2xl [&_blockquote]:border-l-4 [&_blockquote]:border-brand [&_blockquote]:bg-brand-tint/50 [&_blockquote]:p-4 [&_blockquote]:text-ink [&_figure]:my-6 [&_figure]:rounded-3xl [&_figure]:bg-ink [&_figure]:p-5 [&_figure_a]:text-white [&_img]:mx-auto [&_img]:h-48 [&_img]:w-48 [&_img]:rounded-full [&_img]:border-4 [&_img]:border-brand [&_img]:bg-zinc-100 [&_img]:object-contain [&_img]:p-2 [&_figcaption]:text-white/80 [&_figcaption]:text-center [&_figcaption]:mt-2 [&_figcaption]:text-sm [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-black [&_h2]:text-ink [&_h3]:mt-5 [&_h3]:font-black [&_h3]:text-ink [&_ol]:list-decimal [&_ol]:pl-6 [&_td]:border [&_td]:p-2 [&_th]:border [&_th]:p-2 [&_ul]:list-disc [&_ul]:pl-6"
              dangerouslySetInnerHTML={{ __html: preview.bodyHtml }}
            />
            {preview.photos[1] && (
              <div className="mt-6 overflow-hidden rounded-2xl bg-ink">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview.photos[1].url} alt="" className="aspect-[16/9] w-full object-cover" />
              </div>
            )}
          </div>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setEditing(null)}>
          <form
            className="w-full max-w-lg space-y-4 rounded-[24px] bg-white p-6"
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const id = editing.id;
              setEditing(null);
              act(() => updatePostText(id, String(f.get("title")), String(f.get("description"))), "Saved.");
            }}
          >
            <label className="block text-sm font-semibold text-ink">
              Title
              <input name="title" defaultValue={editing.title} maxLength={120} className="mt-1.5 w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm" />
            </label>
            <label className="block text-sm font-semibold text-ink">
              Description (shown on Google and on the blog card)
              <textarea name="description" defaultValue={editing.description} rows={3} maxLength={300} className="mt-1.5 w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm" />
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setEditing(null)} className="rounded-xl border border-black/10 px-4 py-2 text-sm font-semibold">
                Cancel
              </button>
              <button type="submit" className="cm-button-primary">
                Save
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
