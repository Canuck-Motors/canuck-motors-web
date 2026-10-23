// Site language, kept in a cookie so every page (and the chatbot) knows it
export type Lang = "en" | "fr";
export const LANG_COOKIE = "cm_lang";

export function getLang(): Lang {
  if (typeof document === "undefined") return "en";
  return /(?:^|;\s*)cm_lang=fr(?:;|$)/.test(document.cookie) ? "fr" : "en";
}

export function setLang(lang: Lang) {
  document.cookie = `${LANG_COOKIE}=${lang}; path=/; max-age=31536000; samesite=lax`;
  // Reload so every screen (including server-rendered parts) starts fresh in the new language
  window.location.reload();
}

// Runs before the page paints: hide the page briefly while French is applied
export const LANG_BOOT_SCRIPT = `try{if(/(?:^|;\\s*)cm_lang=fr(?:;|$)/.test(document.cookie)){var h=document.documentElement;h.lang="fr";h.classList.add("i18n-pending");setTimeout(function(){h.classList.remove("i18n-pending")},1500)}}catch(e){}`;
