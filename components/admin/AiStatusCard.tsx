"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { AlertTriangle, CheckCircle2, ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { checkAiStatus, type AiStatus } from "@/app/admin/ai-status-actions";

export default function AiStatusCard() {
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [pending, start] = useTransition();

  const run = useCallback(() => {
    start(async () => {
      try {
        setStatus(await checkAiStatus());
      } catch {
        setStatus({
          state: "error",
          message: "Could not run the check.",
          checkedAt: new Date().toISOString(),
        });
      }
    });
  }, []);

  useEffect(() => {
    run();
  }, [run]);

  const ok = status?.state === "ok";
  const bad = status && !ok;
  const title = !status
    ? "Checking AI service…"
    : ok
      ? "AI service is working"
      : "AI service needs attention";
  const text = !status
    ? "Chatbot and blog generation."
    : ok
      ? "Chatbot and blog generation can reach Claude."
      : (status as { message: string }).message + " Chatbot and blog generation may fail until this is fixed.";

  return (
    <div
      className={`mt-8 flex flex-wrap items-center gap-4 rounded-2xl border p-4 ${
        bad ? "border-red-200 bg-red-50" : "border-black/5 bg-white"
      }`}
      role={bad ? "alert" : undefined}
    >
      {!status ? (
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
      ) : ok ? (
        <CheckCircle2 className="h-6 w-6 text-emerald-600" aria-hidden="true" />
      ) : (
        <AlertTriangle className="h-6 w-6 text-red-600" aria-hidden="true" />
      )}
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-black ${bad ? "text-red-700" : "text-ink"}`}>{title}</p>
        <p className="text-sm text-muted-foreground">{text}</p>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={run}
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-xl border border-black/10 bg-white px-3 py-1.5 text-sm font-semibold hover:bg-black/5 disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${pending ? "animate-spin" : ""}`} aria-hidden="true" />
          Check now
        </button>
        <a
          href="https://console.anthropic.com/settings/billing"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-xl border border-black/10 bg-white px-3 py-1.5 text-sm font-semibold hover:bg-black/5"
        >
          Billing
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      </div>
    </div>
  );
}
