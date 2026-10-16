"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
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

    supabase.auth.getSession().then(({ data }) => setWho(data.session?.user.id ?? "guest"));

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        wipe(); // nothing stays behind for the next person
        setOpen(false);
        setStarted(false);
        setWho("guest");
      } else if (session?.user) {
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
        <div className={open ? "" : "hidden"}>
          <ChatWindow key={who} storeKey={`${PREFIX}${who}`} onClose={() => setOpen(false)} />
        </div>
      )}
      {!open && (
        <button
          type="button"
          onClick={() => {
            setStarted(true);
            setOpen(true);
          }}
          aria-label="Chat with Axel, our parts assistant"
          className={`cm-pulse group fixed bottom-5 right-5 z-50 flex h-14 items-center gap-2 rounded-full pl-3.5 pr-5 shadow-xl transition hover:scale-105 ${
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
