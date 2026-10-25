"use client";

import { getLang } from "@/lib/i18n/lang";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import AxelIcon from "./AxelIcon";

// `send` (optional) is the exact message each option sends, e.g. "Change my answer"
type Choices = { level: string; options: string[]; spec?: string; send?: string[] };
type Msg = {
  role: "user" | "assistant";
  content: string;
  choices?: Choices;
  local?: boolean; // handled in the browser, never sent to the AI
  old?: boolean; // from an earlier visit: shown above, never sent to the AI
  divider?: boolean; // "New conversation" separator
  welcome?: boolean; // the two greeting messages
};

// Chat is kept in this browser (localStorage) for 24 hours.
export const STORE_PREFIX = "cm-axel-chat-v2:";
const MAX_AGE = 24 * 60 * 60 * 1000;

type Saved = { t: number; messages: Msg[] };

function loadChat(STORE_KEY: string): Saved | null {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Saved;
    if (!data || Date.now() - data.t > MAX_AGE || !Array.isArray(data.messages) || data.messages.length === 0) {
      localStorage.removeItem(STORE_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function saveChat(STORE_KEY: string, messages: Msg[]) {
  try {
    // Only real conversation is kept (not the greeting or the divider)
    const real = messages.filter((m) => !m.welcome && !m.divider);
    if (!real.some((m) => m.role === "user")) {
      localStorage.removeItem(STORE_KEY);
      return;
    }
    localStorage.setItem(
      STORE_KEY,
      JSON.stringify({ t: Date.now(), messages: real.slice(-60) }),
    );
  } catch {
    /* storage blocked or full: chat still works, just not saved */
  }
}

// Step 1: greet (by first name when the customer is signed in). Step 2: ask what they need.
function makeWelcome(name: string): Msg[] {
  return [
    {
      role: "assistant",
      content: name
        ? `Hi ${name}! I'm Axel, your Canuck Motors auto parts assistant.`
        : "Hi! I'm Axel, your Canuck Motors auto parts assistant.",
      welcome: true,
    },
    {
      role: "assistant",
      content: "How can I help you today?",
      welcome: true,
    },
  ];
}

const MENU = [
  { id: "parts", label: "I'm looking for parts" },
  { id: "order", label: "Help with my order" },
  { id: "login", label: "Login or password help" },
  { id: "team", label: "Talk to our team" },
];

type PartOption = { label: string; text: string };

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

function renderInline(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i}>{part.slice(2, -2)}</strong>
    ) : (
      <span key={i}>{renderLinks(part, String(i))}</span>
    )
  );
}

// Product lines ("• [name](url) - price" plus an optional indented note line)
// are shown as one small card per part, so each note clearly belongs to its part.
function renderBold(text: string) {
  const lines = text.split("\n");
  const out: React.ReactNode[] = [];
  let buf: string[] = [];

  const flush = (key: string) => {
    const t = buf.join("\n").trim();
    buf = [];
    if (t) {
      out.push(
        <span key={key} style={{ whiteSpace: "pre-line" }} className="block">
          {renderInline(t)}
        </span>
      );
    }
  };

  for (let n = 0; n < lines.length; n++) {
    const line = lines[n];
    if (line.startsWith("• ")) {
      flush(`t${n}`);
      const notes: string[] = [];
      while (n + 1 < lines.length && /^\s{3}\S/.test(lines[n + 1])) {
        notes.push(lines[n + 1].trim());
        n++;
      }
      out.push(
        <div
          key={`c${n}`}
          className="my-1.5 rounded-xl border border-black/10 bg-secondary/60 px-3 py-2"
        >
          <div className="text-[15px] font-semibold">{renderInline(line.slice(2))}</div>
          {notes.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {notes
                .flatMap((note) => note.split(" · "))
                .filter(Boolean)
                .map((detail, k) => (
                  <span
                    key={k}
                    className="inline-flex items-center gap-1 rounded-full border border-brand/20 bg-white px-2.5 py-1 text-[13px] font-semibold leading-none text-ink shadow-sm"
                  >
                    <span aria-hidden="true" className="text-brand">
                      ✓
                    </span>
                    {detail}
                  </span>
                ))}
            </div>
          )}
        </div>
      );
    } else {
      buf.push(line);
    }
  }
  flush("end");

  return <div>{out}</div>;
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
  "min-h-[40px] rounded-full border border-brand/30 bg-white px-4 py-2 text-sm font-bold text-brand sm:min-h-0 sm:px-3.5 sm:text-[13px] shadow-sm transition hover:-translate-y-0.5 hover:bg-brand hover:text-white";

export default function ChatWindow({
  onClose,
  storeKey,
  name,
  signedIn = false,
}: {
  onClose: () => void;
  storeKey: string; // one saved chat per person (see ChatLauncher)
  name?: string; // first name of the signed-in customer
  signedIn?: boolean; // signed in: the chat is also saved to the account (any device)
}) {
  const WELCOME = useMemo(() => makeWelcome(name ?? ""), [name]);
  // ChatWindow only renders in the browser, so localStorage is safe here
  // Every visit starts a fresh chat; the earlier chat sits above it (scroll up)
  const [messages, setMessages] = useState<Msg[]>(() => {
    const saved = loadChat(storeKey);
    if (!saved) return WELCOME;
    const old = saved.messages.map((m) => ({ ...m, old: true, choices: undefined }));
    return [
      ...old,
      { role: "assistant" as const, content: "New conversation", divider: true, local: true },
      ...WELCOME,
    ];
  });
  const [partOptions, setPartOptions] = useState<PartOption[]>([]);
  useEffect(() => {
    let alive = true;
    fetch("/api/chat/parts")
      .then((r) => r.json())
      .then((j: { options?: PartOption[] }) => alive && setPartOptions(j.options ?? []))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [intro, setIntro] = useState(true);
  const [stage, setStage] = useState<"menu" | "parts" | "chat">("menu");
  const pathname = usePathname();
  const endRef = useRef<HTMLDivElement>(null);
  const ctxRef = useRef<unknown>(null); // last search, so spec answers narrow it

  // Signed in: load the chat saved on the account (other device or an earlier visit)
  // when this browser has nothing newer, and continue the last vehicle search
  const accountLoaded = useRef(!signedIn);
  useEffect(() => {
    if (!signedIn) return;
    let alive = true;
    fetch("/api/chat/history")
      .then((r) => r.json())
      .then((j: { messages?: { role: "user" | "assistant"; content: string }[]; context?: unknown }) => {
        if (!alive) return;
        const remote = (j.messages ?? []).filter((m) => m && m.content);
        const local = loadChat(storeKey);
        if (remote.length && (!local || local.messages.length < remote.length)) {
          setMessages((cur) => {
            // Keep anything typed before the history arrived
            const fresh = cur.filter((m) => !m.old && !m.divider && !WELCOME.includes(m));
            return [
              ...remote.map((m) => ({ ...m, old: true })),
              { role: "assistant" as const, content: "New conversation", divider: true, local: true },
              ...WELCOME,
              ...fresh,
            ];
          });
        }
        if (j.context && !ctxRef.current) ctxRef.current = j.context;
      })
      .catch(() => {})
      .finally(() => {
        accountLoaded.current = true;
      });
    return () => {
      alive = false;
    };
  }, [signedIn, storeKey, WELCOME]);

  // Save the chat after every change (browser; and the account when signed in)
  useEffect(() => {
    if (loading) return;
    saveChat(storeKey, messages);
    if (!signedIn || !accountLoaded.current) return;
    const real = messages
      .filter((m) => !m.welcome && !m.divider && !m.local)
      .map((m) => ({ role: m.role, content: m.content }));
    if (!real.some((m) => m.role === "user")) return;
    const t = setTimeout(() => {
      fetch("/api/chat/history", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: real.slice(-60), context: ctxRef.current }),
      }).catch(() => {});
    }, 800);
    return () => clearTimeout(t);
  }, [messages, loading, storeKey, signedIn]);

  const newChat = () => {
    try {
      localStorage.removeItem(storeKey);
    } catch {}
    if (signedIn) fetch("/api/chat/history", { method: "DELETE" }).catch(() => {});
    ctxRef.current = null;
    setMessages([...WELCOME]);
    setStage("menu");
    setInput("");
  };

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
    ctxRef.current = null; // a menu choice starts fresh: no answers from an earlier search
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
        .filter((m) => !WELCOME.includes(m) && !m.local && !m.old && !m.divider)
        .map((m) => ({ role: m.role, content: m.content }));
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history,
          // A new conversation (no earlier question asked in it) starts a new search
          context: history.some((m, i) => m.role === "user" && i < history.length - 1) ? ctxRef.current : null,
          page: { path: pathname, title: document.title },
          lang: getLang(),
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
      className={`cm-window fixed inset-0 z-50 flex h-[100dvh] flex-col overflow-hidden bg-white sm:inset-auto sm:bottom-5 sm:right-5 sm:h-[78vh] sm:max-h-[620px] sm:w-[390px] sm:rounded-3xl sm:border sm:border-black/10 sm:shadow-[0_24px_70px_rgba(0,0,0,0.25)]`}
    >
      {/* Header: Axel only, kept slim */}
      <div className="relative bg-white px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
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
          {messages.length > WELCOME.length && (
            <button
              type="button"
              onClick={newChat}
              className="rounded-full px-3 py-2 text-xs font-bold text-ink/60 transition hover:bg-brand-tint hover:text-brand"
            >
              Clear history
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Minimize chat"
            title="Minimize (your chat is kept)"
            className="flex h-10 w-10 items-center justify-center rounded-full sm:h-8 sm:w-8 text-xl font-bold leading-none text-ink/60 transition hover:bg-brand-tint hover:text-brand"
          >
            –
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close chat"
            className="flex h-10 w-10 items-center justify-center rounded-full sm:h-8 sm:w-8 text-xl leading-none text-ink/60 transition hover:bg-brand-tint hover:text-brand"
          >
            ×
          </button>
        </div>

        <div className="cm-stripe absolute inset-x-0 bottom-0 h-1" />
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-3 overflow-y-auto overscroll-contain bg-secondary p-3 sm:p-4">
        {messages.map((m, i) =>
          m.divider ? (
            <div
              key={i}
              className="cm-pop flex items-center gap-3 py-1 text-[11px] font-bold uppercase tracking-widest text-ink/40"
            >
              <span className="h-px flex-1 bg-black/10" />
              {m.content}
              <span className="h-px flex-1 bg-black/10" />
            </div>
          ) : (
          <div
            key={i}
            className={`cm-pop flex items-end gap-2 ${
              m.role === "user" ? "justify-end" : "justify-start"
            }`}
            style={
              WELCOME.includes(m)
                ? { animationDelay: `${WELCOME.indexOf(m) * 450}ms` }
                : undefined
            }
          >
            {m.role === "assistant" && <Avatar size="h-7 w-7" />}
            <div
              className={`max-w-[86%] break-words rounded-2xl px-4 py-2.5 text-[15px] leading-6 sm:max-w-[82%] ${m.old ? "opacity-60" : ""} ${
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
          ),
        )}

        {/* Step 2: what do you need? Step 3: which part? */}
        {stage === "menu" && (
          <div
            className="cm-pop flex flex-wrap gap-2 pl-9"
            style={{ animationDelay: messages.every((m) => m.old || m.divider || WELCOME.includes(m)) ? "1100ms" : "0ms" }}
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
            {partOptions.map((o) => (
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
              className="min-h-[40px] rounded-full border border-ink/20 bg-ink px-4 py-2 text-sm font-bold text-white sm:min-h-0 sm:px-3.5 sm:text-[13px] shadow-sm transition hover:-translate-y-0.5 hover:bg-brand"
            >
              Find parts by VIN
            </button>
          </div>
        )}

        {/* Real options from the catalog (engine, trim, and so on) */}
        {choices && (
          <div className="cm-pop pl-9">
            <p className="mb-2 text-[13px] font-semibold text-muted-foreground">
              {choices.level === "confirm"
                ? "Is this your vehicle?"
                : choices.spec === "more"
                  ? "Want me to keep going?"
                  : choices.send?.length
                  ? "Want to change something?"
                  : choices.level === "spec"
                  ? "Choose one"
                  : `Choose your ${LEVEL_LABEL[choices.level] ?? "option"}`}
            </p>
            <div className="flex flex-wrap gap-2">
              {choices.options.map((option, i) => (
                <button
                  key={option}
                  type="button"
                  onClick={() =>
                    send(
                      choices.send?.[i]
                        ? choices.send[i]
                        : choices.level === "confirm"
                        ? option
                        : choices.level === "spec"
                          ? `Spec: ${choices.spec} = ${option}`
                          : `${LEVEL_LABEL[choices.level] ?? "Option"}: ${option}`
                    )
                  }
                  className={chip}
                >
                  {choices.level === "spec" && choices.spec === "Position" && option.toLowerCase() === "all"
                    ? "Front & rear kit"
                    : option}
                </button>
              ))}
              {choices.level === "engine" && (
                <>
                  <button type="button" onClick={() => send("Not sure")} className={chip}>
                    Not sure
                  </button>
                  <button
                    type="button"
                    onClick={() => send("I want to find parts using my VIN")}
                    className="min-h-[40px] rounded-full border border-ink/20 bg-ink px-4 py-2 text-sm font-bold text-white sm:min-h-0 sm:px-3.5 sm:text-[13px] shadow-sm transition hover:-translate-y-0.5 hover:bg-brand"
                  >
                    Use my VIN
                  </button>
                </>
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
      <div className="border-t border-border bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
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
            className="min-w-0 flex-1 rounded-full border border-input bg-secondary px-4 py-3 text-base outline-none sm:py-2.5 sm:text-[15px] focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
          <button
            type="button"
            onClick={() => send()}
            disabled={loading || !input.trim()}
            className="shrink-0 rounded-full bg-brand px-5 py-3 text-sm font-bold text-white transition hover:bg-brand-dark disabled:opacity-50 sm:py-2.5"
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
