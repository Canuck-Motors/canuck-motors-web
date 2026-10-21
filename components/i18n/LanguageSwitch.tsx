"use client";

import { useEffect, useState } from "react";
import { getLang, setLang, type Lang } from "@/lib/i18n/lang";

// EN | FR switch shown next to the cart
export default function LanguageSwitch() {
  const [lang, setCurrent] = useState<Lang>("en");
  useEffect(() => setCurrent(getLang()), []);

  return (
    <div
      data-no-translate
      role="group"
      aria-label={lang === "fr" ? "Langue" : "Language"}
      className="inline-flex items-center rounded-full border border-black/10 bg-white p-0.5 text-xs font-bold"
    >
      {(["en", "fr"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => l !== lang && setLang(l)}
          aria-pressed={lang === l}
          title={l === "en" ? "English" : "Français"}
          className={`rounded-full px-2.5 py-1.5 transition ${
            lang === l ? "bg-ink text-white" : "text-ink hover:bg-brand-tint hover:text-brand"
          }`}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
