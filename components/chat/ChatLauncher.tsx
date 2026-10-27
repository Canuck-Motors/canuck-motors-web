"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import AxelIcon from "./AxelIcon";

const ChatWindow = dynamic(() => import("./ChatWindow"), { ssr: false });

const PREFIX = "cm-axel-chat-v2:";

// Removes every saved chat in this browser (used on sign-out)
function wipe(only?: string) {
  try {
    localStorage.removeItem("cm-axel-chat-v1"); // old, shared key
    for (const k of Object.keys(localStorage)) {
      if (k.startsWith(PREFIX) && (!only || k === only)) localStorage.removeItem(k);
    }
  } catch {
    /* storage blocked */
  }
}

export default function ChatLauncher() {
  const [open, setOpen] = useState(false);
  // A saved conversation exists: the button turns white with red text so the
  // customer can see their chat is still there.
  const [hasChat, setHasChat] = useState(false);
  // Once opened, the window stays mounted (just hidden) so a reply that is still
  // being written arrives even if the customer minimizes the chat.
  const [started, setStarted] = useState(false);
  // undefined = still checking who is signed in
  const [who, setWho] = useState<string | undefined>(undefined);
  const [firstName, setFirstName] = useState("");
  // Minimize: the window drops down, then the Ask Axel button bounces in
  const [closing, setClosing] = useState(false);
  const [bounce, setBounce] = useState(false);

  const boxRef = useRef<HTMLDivElement>(null);
  const minimize = () => {
    if (closing) return; // one animation per click
    setClosing(true);
    const win = boxRef.current?.querySelector<HTMLElement>(".cm-window");
    const done = () => {
      setOpen(false);
      setClosing(false);
      setBounce(true);
    };
    if (!win || typeof win.animate !== "function") {
      done();
      return;
    }
    // Mac "genie" effect: the bottom of the window pinches in toward the Ask Axel
    // button, then the whole thing is sucked into the corner.
    win.style.transformOrigin = "bottom right";
    const full = "polygon(-80px -80px, calc(100% + 80px) -80px, calc(100% + 80px) calc(100% + 80px), -80px calc(100% + 80px))";
    const pinch = "polygon(0% 0%, 100% 0%, 100% 100%, 70% 100%)";
    const point = "polygon(40% 0%, 100% 0%, 100% 100%, 96% 100%)";
    const anim = win.animate(
      [
        { clipPath: full, transform: "translate3d(0, 0, 0) scale(1, 1)", opacity: 1, offset: 0 },
        { clipPath: pinch, transform: "translate3d(0, 8px, 0) scale(0.95, 0.97)", opacity: 1, offset: 0.5 },
        { clipPath: point, transform: "translate3d(0, 20px, 0) scale(0.06, 0.12)", opacity: 0, offset: 1 },
      ],
      { duration: 600, easing: "cubic-bezier(0.55, 0, 0.7, 0.4)", fill: "forwards" },
    );
    anim.onfinish = done;
  };
  const nameOf = (u?: { user_metadata?: Record<string, unknown> } | null) => {
    const n = u?.user_metadata?.first_name;
    return typeof n === "string" ? n.trim() : "";
  };

  const checkChat = (id: string | undefined) => {
    try {
      const raw = id ? localStorage.getItem(`${PREFIX}${id}`) : null;
      const data = raw ? (JSON.parse(raw) as { t?: number; messages?: unknown[] }) : null;
      setHasChat(Boolean(data && Array.isArray(data.messages) && data.messages.length > 0 && Date.now() - Number(data.t ?? 0) < 24 * 60 * 60 * 1000));
    } catch {
      setHasChat(false);
    }
  };

  useEffect(() => {
    checkChat(who);
  }, [who, open]);

  useEffect(() => {
    const supabase = createClient();
    wipe(); // drop the old shared chat from before chats were per person

    supabase.auth.getSession().then(({ data }) => {
      setFirstName(nameOf(data.session?.user));
      setWho(data.session?.user.id ?? "guest");
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        wipe(); // nothing stays behind for the next person
        setOpen(false);
        setStarted(false);
        setFirstName("");
        setWho("guest");
      } else if (session?.user) {
        setFirstName(nameOf(session.user));
        // Signed in: the guest chat does not carry over to the account
        setWho((prev) => {
          if (prev === "guest") wipe(`${PREFIX}guest`);
          return session.user.id;
        });
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <>
      {(open || started) && who && (
        <div ref={boxRef} className={open ? "" : "hidden"}>
          <ChatWindow key={who} storeKey={`${PREFIX}${who}`} name={firstName} signedIn={who !== "guest"} onClose={minimize} />
        </div>
      )}
      {!open && (
        <button
          type="button"
          onClick={() => {
            // clear the leftover minimize animation so the window shows normally
            boxRef.current?.querySelector<HTMLElement>(".cm-window")?.getAnimations().forEach((x) => x.cancel());
            setStarted(true);
            setOpen(true);
          }}
          aria-label="Chat with Axel, our parts assistant"
          onAnimationEnd={() => setBounce(false)}
          className={`group fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-50 flex h-14 sm:bottom-5 sm:right-5 items-center gap-2 rounded-full pl-3.5 pr-5 shadow-xl transition hover:scale-105 ${
            hasChat
              ? "border-2 border-brand bg-white text-brand hover:bg-brand-tint"
              : "bg-brand text-white hover:bg-brand-dark"
          }`}
        >
          <AxelIcon className="h-8 w-8" inverted={hasChat} />
          <span className="text-sm font-black tracking-tight">Ask Axel</span>
        </button>
      )}
    </>
  );
}
