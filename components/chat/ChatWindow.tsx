"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import AxelIcon from "./AxelIcon";

type Choices = { level: string; options: string[]; spec?: string };
type Msg = {
  role: "user" | "assistant";
  content: string;
  choices?: Choices;
  local?: boolean; // handled in the browser, never sent to the AI
};

// Step 1: greet. Step 2: ask what they are looking for.
const WELCOME: Msg[] = [
  {
    role: "assistant",
    content: "Hi! I'm Axel, your Canuck Motors auto parts assistant.",
  },
  {
    role: "assistant",
    content: "How can I help you today?",
  },
];

const MENU = [
  { id: "parts", label: "I'm looking for parts" },
  { id: "order", label: "Help with my order" },
  { id: "login", label: "Login or password help" },
  { id: "team", label: "Talk to our team" },
];

const OPTIONS = [
  { label: "Water pump", text: "I'm looking for a water pump" },
  { label: "Brake pads", text: "I'm looking for brake pads" },
  { label: "Brake shoes", text: "I'm looking for brake shoes" },
  {
    label: "Timing belt kit with water pump",
    text: "I'm looking for a timing belt kit with water pump",
  },
  {
    label: "Front and rear brake kit",
    text: "I'm looking for a front and rear brake kit",
  },
];

const LEVEL_LABEL: Record<string, string> = {
  make: "Make",
  model: "Model",
  engine: "Engine",
  trim: "Trim",
};

const linkClass =
  "font-semibold text-brand underline underline-offset-2 hover:text-brand-dark";

const safeHref = (href: string) => /^(\/|https?:\/\/)/.test(href);

// Turns [text](url) into a link that opens in a new tab,
// so the customer keeps the chat open.
function renderLinks(text: string, keyPrefix: string) {
  return text.split(/(\[[^\]]+\]\([^)\s]+\))/g).map((piece, i) => {
    const md = piece.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
    if (md && safeHref(md[2])) {
      return (
        <a
          key={`${keyPrefix}-${i}`}
          href={md[2]}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass}
        >
          {md[1]}
        </a>
      );
    }

    return piece.split(/(https?:\/\/[^\s]+)/g).map((bit, j) =>
      /^https?:\/\//.test(bit) ? (
        <a
          key={`${keyPrefix}-${i}-${j}`}
          href={bit}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass}
        >
          View product
        </a>
      ) : (
        <span key={`${keyPrefix}-${i}-${j}`}>{bit}</span>
      )
    );
  });
}

function renderBold(text: string) {
  return (
    <span style={{ whiteSpace: "pre-line" }}>
      {text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={i}>{part.slice(2, -2)}</strong>
        ) : (
          <span key={i}>{renderLinks(part, String(i))}</span>
        )
      )}
    </span>
  );
}

function Avatar({ size, active = false }: { size: string; active?: boolean }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full bg-brand shadow-sm ${size}`}
    >
      <AxelIcon active={active} className="h-[62%] w-[62%]" />
    </span>
  );
}

const chip =
  "rounded-full border border-brand/30 bg-white px-3.5 py-2 text-xs font-bold text-brand shadow-sm transition hover:-translate-y-0.5 hover:bg-brand hover:text-white";

export default function ChatWindow({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<Msg[]>(WELCOME);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [intro, setIntro] = useState(true);
  const [stage, setStage] = useState<"menu" | "parts" | "chat">("menu");
  const pathname = usePathname();
  const endRef = useRef<HTMLDivElement>(null);
  const ctxRef = useRef<unknown>(null); // last search, so spec answers narrow it

  // Axel "drives in" for a moment when the chat opens
  useEffect(() => {
    const t = setTimeout(() => setIntro(false), 2200);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

    const last = messages[messages.length - 1];
  const choices = !loading && last.role === "assistant" ? last.choices : undefined;

  const pickMenu = (id: string, label: string) => {
    const user: Msg = { role: "user", content: label, local: true };
    if (id === "parts") {
      setMessages((m) => [
        ...m,
        user,
        {
          role: "assistant",
          local: true,
          content: "Great! What part are you looking for? Pick one, or type it below.",
        },
      ]);
      setStage("parts");
    } else if (id === "login") {
      setMessages((m) => [
        ...m,
        user,
        {
          role: "assistant",
          local: true,
          content:
            "No problem. You sign in with your email address. To reset your password, use [Forgot password](/auth/forgot-password) and we'll email you a link. If you don't remember which email you used, try your usual ones on the [login page](/login), or reach our team from [About us](/about).",
        },
      ]);
      setStage("menu");
    } else if (id === "order") {
      setMessages((m) => [
        ...m,
        user,
        {
          role: "assistant",
          local: true,
          content:
            "You can see your order status and details in [My orders](/account/orders). Sign in first if asked. If something looks wrong, tell us from [About us](/about).",
        },
      ]);
      setStage("menu");
    } else {
      setMessages((m) => [
        ...m,
        user,
        {
          role: "assistant",
          local: true,
          content:
            "Our team is happy to help. Please reach us through [About us](/about). Or tell me the part you need and I'll find it.",
        },
      ]);
      setStage("menu");
    }
  };

  const send = async (override?: string) => {
    const text = (override ?? input).trim();
    if (!text || loading) return;

    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setStage("chat");
    setInput("");
    setLoading(true);

    try {
      // Skip the welcome messages so history starts with a user message
      const history = next
        .filter((m) => !WELCOME.includes(m) && !m.local)
        .map((m) => ({ role: m.role, content: m.content }));
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history,
          context: ctxRef.current,
          page: { path: pathname, title: document.title },
        }),
      });
      const data = await res.json();
      if (data.context) ctxRef.current = data.context;
      if (data.debug) console.warn("Axel debug:", data.debug);
      setMessages([
        ...next,
        {
          role: "assistant",
          content: data.reply ?? "Sorry, something went wrong. Please try again.",
          choices: data.choices ?? undefined,
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
    <div
      role="dialog"
      aria-label="Chat with Axel, the Canuck Motors parts assistant"
      className="cm-window fixed inset-x-3 bottom-3 z-50 flex h-[78vh] max-h-[620px] flex-col overflow-hidden rounded-3xl border border-black/10 bg-white shadow-[0_24px_70px_rgba(0,0,0,0.25)] sm:inset-x-auto sm:bottom-5 sm:right-5 sm:w-[390px]"
    >
      {/* Header: Axel only, kept slim */}
      <div className="relative bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <Avatar size="h-9 w-9" active={loading || intro} />
          <div className="min-w-0 flex-1">
            <p className="text-base font-black leading-tight tracking-tight text-ink">
              Axel
            </p>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
              </span>
              Auto parts assistant
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close chat"
            className="flex h-8 w-8 items-center justify-center rounded-full text-xl leading-none text-ink/60 transition hover:bg-brand-tint hover:text-brand"
          >
            ×
          </button>
        </div>

        <div className="cm-stripe absolute inset-x-0 bottom-0 h-1" />
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-3 overflow-y-auto bg-secondary p-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`cm-pop flex items-end gap-2 ${
              m.role === "user" ? "justify-end" : "justify-start"
            }`}
            style={
              WELCOME.includes(m) ? { animationDelay: `${i * 450}ms` } : undefined
            }
          >
            {m.role === "assistant" && <Avatar size="h-7 w-7" />}
            <div
              className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-sm leading-6 ${
                m.role === "user"
                  ? "rounded-br-md bg-brand text-white"
                  : "rounded-bl-md bg-white text-ink shadow-sm"
              }`}
            >
              {renderBold(
                m.role === "user"
                  ? m.content.replace(/^Spec:\s*(.+?)\s*=\s*/i, "$1: ")
                  : m.content
              )}
            </div>
          </div>
        ))}

        {/* Step 2: what do you need? Step 3: which part? */}
        {stage === "menu" && (
          <div
            className="cm-pop flex flex-wrap gap-2 pl-9"
            style={{ animationDelay: messages.length <= WELCOME.length ? "1100ms" : "0ms" }}
          >
            {MENU.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => pickMenu(o.id, o.label)}
                className={chip}
              >
                {o.label}
              </button>
            ))}
          </div>
        )}

        {stage === "parts" && (
          <div className="cm-pop flex flex-wrap gap-2 pl-9">
            {OPTIONS.map((o) => (
              <button
                key={o.label}
                type="button"
                onClick={() => send(o.text)}
                className={chip}
              >
                {o.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => send("I want to find parts using my VIN")}
              className="rounded-full border border-ink/20 bg-ink px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-brand"
            >
              Find parts by VIN
            </button>
          </div>
        )}

        {/* Real options from the catalog (engine, trim, and so on) */}
        {choices && (
          <div className="cm-pop pl-9">
            <p className="mb-2 text-xs font-semibold text-muted-foreground">
              {choices.level === "confirm"
                ? "Is this your vehicle?"
                : `Choose your ${LEVEL_LABEL[choices.level] ?? "option"}`}
            </p>
            <div className="flex flex-wrap gap-2">
              {choices.options.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() =>
                    send(
                      choices.level === "confirm"
                        ? option
                        : `${LEVEL_LABEL[choices.level] ?? "Option"}: ${option}`
                    )
                  }
                  className={chip}
                >
                  {option}
                </button>
              ))}
              {choices.level === "engine" && (
                <button
                  type="button"
                  onClick={() =>
                    send("I don't know my engine. Help me use my VIN instead.")
                  }
                  className="rounded-full border border-ink/20 bg-ink px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-brand"
                >
                  I don&apos;t know - use my VIN
                </button>
              )}
            </div>
          </div>
        )}

        {loading && (
          <div className="cm-pop flex items-end gap-2">
            <Avatar size="h-7 w-7" active />
            <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md bg-white px-4 py-3 shadow-sm">
              <span className="cm-dot h-1.5 w-1.5 rounded-full bg-brand" />
              <span
                className="cm-dot h-1.5 w-1.5 rounded-full bg-brand"
                style={{ animationDelay: "0.15s" }}
              />
              <span
                className="cm-dot h-1.5 w-1.5 rounded-full bg-brand"
                style={{ animationDelay: "0.3s" }}
              />
              <span className="ml-1 text-xs text-muted-foreground">
                Axel is checking the catalog
              </span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border bg-white p-3">
        <div className="flex gap-2">
          <label htmlFor="axel-input" className="sr-only">
            Message Axel
          </label>
          <input
            id="axel-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            maxLength={500}
            placeholder="Ask Axel, or paste your VIN..."
            className="flex-1 rounded-full border border-input bg-secondary px-4 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
          <button
            type="button"
            onClick={() => send()}
            disabled={loading || !input.trim()}
            className="rounded-full bg-brand px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-dark disabled:opacity-50"
          >
            Send
          </button>
        </div>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          Parts shown are matched to your vehicle from our catalog.
        </p>
      </div>
    </div>
  );
}
