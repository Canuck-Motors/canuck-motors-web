"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import AxelIcon from "./AxelIcon";

const ChatWindow = dynamic(() => import("./ChatWindow"), { ssr: false });

export default function ChatLauncher() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {open && <ChatWindow onClose={() => setOpen(false)} />}
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
