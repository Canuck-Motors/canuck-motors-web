"use client";

import { useEffect, useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };

const WELCOME: Msg = {
  role: "assistant",
  content:
    "Hi! I'm the Canuck Motors parts assistant. What part are you looking for, and what vehicle is it for (year, make, model)?",
};

function renderBold(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i}>{part.slice(2, -2)}</strong>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

export default function ChatWindow({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<Msg[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      // Skip the welcome message so history starts with a user message
      const history = next.filter((m) => m !== WELCOME);
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });
      const data = await res.json();
      setMessages([
        ...next,
        {
          role: "assistant",
          content: data.reply ?? "Sorry, something went wrong. Please try again.",
        },
      ]);
    } catch {
      setMessages([
        ...next,
        { role: "assistant", content: "Connection problem. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-x-3 bottom-3 z-50 flex h-[70vh] max-h-[560px] flex-col overflow-hidden rounded-3xl border border-border bg-white shadow-2xl sm:inset-x-auto sm:bottom-5 sm:right-5 sm:w-[380px]">
      {/* Header */}
      <div className="flex items-center justify-between bg-ink px-5 py-4 text-white">
        <div>
          <p className="text-sm font-semibold">Canuck Motors</p>
          <p className="text-xs text-white/60">Parts assistant</p>
        </div>
        <button onClick={onClose} aria-label="Close chat" className="text-2xl leading-none text-white/70 hover:text-white">
          ×
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-3 overflow-y-auto bg-secondary p-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm ${
                m.role === "user"
                  ? "bg-brand text-white"
                  : "bg-white text-ink shadow-sm"
              }`}
            >
              {renderBold(m.content)}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-white px-4 py-2.5 text-sm text-muted-foreground shadow-sm">
              Typing...
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2 border-t border-border bg-white p-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          maxLength={500}
          placeholder="Ask about a part..."
          className="flex-1 rounded-full border border-input bg-secondary px-4 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}