"use client";

import { useEffect } from "react";
import { getLang } from "@/lib/i18n/lang";
import { lookupFr, normKey } from "@/lib/i18n/fr";

// When French is on, swaps the English text on screen for French:
// 1) the site's own wording from lib/i18n/fr.ts (instant)
// 2) everything else (product text, blog posts, chatbot replies) from /api/translate,
//    which translates once and saves it, so it is instant for everyone after that.
// The admin pages stay in English.

const SKIP = 'script,style,noscript,template,code,pre,textarea,svg,[data-no-translate],[contenteditable="true"]';
const ATTRS = ["placeholder", "aria-label", "title", "alt"];
const CACHE_KEY = "cm_fr_cache_v1";

export default function FrenchRuntime() {
  useEffect(() => {
    if (getLang() !== "fr") return;
    const root = document.documentElement;
    const isAdmin = () => window.location.pathname.startsWith("/admin");

    let cache: Record<string, string> = {};
    try { cache = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}"); } catch {}
    const saveCache = () => {
      try {
        const s = JSON.stringify(cache);
        localStorage.setItem(CACHE_KEY, s.length > 3_000_000 ? "{}" : s);
      } catch {}
    };

    // Text that never needs translating: numbers, part numbers, codes, emails, links, names
    const skipText = (t: string) =>
      !/[A-Za-z]{2}/.test(t) ||
      !/[a-z]/.test(t) || // ALL CAPS codes: CM1253260, VIN, OE
      /^\S+@\S+\.\S+$/.test(t) ||
      /^https?:\/\//.test(t) ||
      /[àâçéèêëîïôûùœ]/i.test(t); // already French

    // Known now (string), unknown (undefined), or nothing to do (null)
    const known = (t: string): string | null | undefined => {
      const dict = lookupFr(t);
      if (dict != null) return dict;
      if (skipText(t)) return null;
      return cache[normKey(t)];
    };

    // ---- server translations, batched ----
    const waiting = new Map<string, Array<(fr: string) => void>>();
    let timer: ReturnType<typeof setTimeout> | null = null;
    const ask = (text: string, done: (fr: string) => void) => {
      const k = normKey(text);
      if (!waiting.has(k)) waiting.set(k, []);
      waiting.get(k)!.push(done);
      if (!timer) timer = setTimeout(flush, 120);
    };
    async function flush() {
      timer = null;
      const keys = [...waiting.keys()];
      for (let i = 0; i < keys.length; i += 40) {
        const batch = keys.slice(i, i + 40);
        try {
          const res = await fetch("/api/translate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ texts: batch }),
          });
          if (!res.ok) throw new Error(String(res.status));
          const { translations } = (await res.json()) as { translations: (string | null)[] };
          batch.forEach((k, j) => {
            const fr = translations?.[j];
            const cbs = waiting.get(k) ?? [];
            waiting.delete(k);
            if (typeof fr === "string" && fr.trim()) {
              cache[k] = fr;
              cbs.forEach((cb) => cb(fr));
            }
          });
          saveCache();
        } catch {
          batch.forEach((k) => waiting.delete(k)); // leave English; retried on next page
        }
      }
    }

    // Keep the spaces around the text as they were
    const wrap = (raw: string, core: string, fr: string) => {
      const at = raw.indexOf(core);
      return at < 0 ? fr : raw.slice(0, at) + fr + raw.slice(at + core.length);
    };

    // Only touch nodes React has already taken over (hydrated); the rest are retried shortly.
    // Changing text React has not hydrated yet makes it throw a hydration error.
    let pendingNodes = false;
    const reactKey = (n: Node, prefix: string) => {
      for (const k in n) if (k.startsWith(prefix)) return k;
      return null;
    };
    const hydrated = (n: Node) => {
      // Text nodes carry no React marker: their element does, once it is hydrated
      const own = n.nodeType === Node.ELEMENT_NODE ? (n as Element) : n.parentElement;
      for (let el = own; el; el = el.parentElement) {
        const k = reactKey(el, "__reactProps$");
        if (k) {
          // Hydrated element, or HTML that React inserts as a block (blog posts) inside one
          if (el === own || (el as any)[k]?.dangerouslySetInnerHTML) return true;
          break;
        }
      }
      pendingNodes = true;
      return false;
    };

    // ---- text nodes ----
    const ours = new WeakMap<Node, string>(); // node -> the French we wrote
    const doText = (n: Text) => {
      const parent = n.parentElement;
      if (!parent || parent.closest(SKIP) || isAdmin()) return;
      const raw = n.nodeValue ?? "";
      if (!raw.trim() || ours.get(n) === raw) return;
      if (parent.closest("head") == null && !hydrated(n)) return;
      const core = raw.trim();
      const fr = known(core);
      const apply = (t: string) => {
        if (n.nodeValue !== raw) return; // changed meanwhile
        const v = wrap(raw, core, t);
        ours.set(n, v);
        n.nodeValue = v;
      };
      if (typeof fr === "string") apply(fr);
      else if (fr === undefined) ask(core, apply);
    };

    // ---- attributes ----
    const oursAttr = new WeakMap<Element, Record<string, string>>();
    const doAttrs = (el: Element) => {
      if (el.closest(SKIP) || isAdmin()) return;
      if (!ATTRS.some((a) => el.hasAttribute(a)) || !hydrated(el)) return;
      for (const a of ATTRS) {
        const raw = el.getAttribute(a);
        if (!raw) continue;
        const mine = oursAttr.get(el) ?? {};
        if (mine[a] === raw) continue;
        const core = raw.trim();
        const fr = known(core);
        const apply = (t: string) => {
          if (el.getAttribute(a) !== raw) return;
          mine[a] = t;
          oursAttr.set(el, mine);
          el.setAttribute(a, t);
        };
        if (typeof fr === "string") apply(fr);
        else if (fr === undefined) ask(core, apply);
      }
    };

    const walk = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) return doText(node as Text);
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      const el = node as Element;
      if (el.matches(SKIP)) return;
      doAttrs(el);
      const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
      let cur: Node | null = w.nextNode();
      while (cur) {
        if (cur.nodeType === Node.TEXT_NODE) doText(cur as Text);
        else doAttrs(cur as Element);
        cur = w.nextNode();
      }
    };

    const observer = new MutationObserver((list) => {
      for (const m of list) {
        if (m.type === "characterData") doText(m.target as Text);
        else if (m.type === "attributes") doAttrs(m.target as Element);
        else m.addedNodes.forEach(walk);
      }
    });

    const pass = () => {
      pendingNodes = false;
      const title = document.head.querySelector("title");
      if (title) walk(title);
      walk(document.body);
    };

    // First pass now, then again while parts of the page are still hydrating
    pass();
    if (!pendingNodes) root.classList.remove("i18n-pending");
    observer.observe(root, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
    let tries = 0;
    const retry = setInterval(() => {
      tries++;
      if (!pendingNodes || tries > 8) root.classList.remove("i18n-pending");
      // Slow pages can take a while to hydrate (dev mode): keep checking for up to 2 minutes
      if (!pendingNodes || tries > 400) return clearInterval(retry);
      pass();
    }, 300);

    return () => {
      observer.disconnect();
      clearInterval(retry);
    };
  }, []);

  return null;
}
