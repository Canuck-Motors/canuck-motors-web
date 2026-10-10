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
  // undefined = still checking who is signed in
  const [who, setWho] = useState<string | undefined>(undefined);

  useEffect(() => {
    const supabase = createClient();
    wipe(); // drop the old shared chat from before chats were per person

    supabase.auth.getSession().then(({ data }) => setWho(data.session?.user.id ?? "guest"));

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        wipe(); // nothing stays behind for the next person
        setOpen(false);
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
      {open && who && (
        <ChatWindow key={who} storeKey={`${PREFIX}${who}`} onClose={() => setOpen(false)} />
      )}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Chat with Axel, our parts assistant"
          className="cm-pulse group fixed bottom-5 right-5 z-50 flex h-14 items-center gap-2 rounded-full bg-brand pl-3.5 pr-5 text-white shadow-xl transition hover:scale-105 hover:bg-brand-dark"
        >
          <AxelIcon className="h-8 w-8" />
          <span className="text-sm font-black tracking-tight">Ask Axel</span>
        </button>
      )}
    </>
  );
}
