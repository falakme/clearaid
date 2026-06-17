/**
 * Lightweight, fully offline i18n for ClearAid's static UI.
 *
 * All interface strings are translated client-side from a bundled JSON
 * dictionary (`lib/i18n/ui.json`) — no network, no API, no latency. The
 * dictionary covers every language offered by the language selector
 * (`lib/languages.ts`). Changing the language instantly re-renders the chrome
 * in the chosen language; missing keys fall back to English.
 */
import ui from "./i18n/ui.json";

/** Maps a human-readable language name to its dictionary code. */
export const LANG_CODES: Record<string, string> = {
  English: "en",
  Spanish: "es",
  Arabic: "ar",
  "Chinese (Simplified)": "zh",
  French: "fr",
  Hindi: "hi",
  Portuguese: "pt",
  Bengali: "bn",
  Russian: "ru",
  Urdu: "ur",
  Vietnamese: "vi",
  Tagalog: "tl",
  "Haitian Creole": "ht",
};

/** Right-to-left scripts that need `dir="rtl"`. */
const RTL_CODES = new Set(["ar", "ur"]);

/** BCP-47 locales for the Web Speech API, keyed by dictionary code. */
const SPEECH_LOCALES: Record<string, string> = {
  en: "en-US",
  es: "es-ES",
  ar: "ar-SA",
  zh: "zh-CN",
  fr: "fr-FR",
  hi: "hi-IN",
  pt: "pt-BR",
  bn: "bn-BD",
  ru: "ru-RU",
  ur: "ur-PK",
  vi: "vi-VN",
  tl: "fil-PH",
  ht: "ht-HT",
};

/** Best-effort speech-recognition locale for the chosen language. */
export function speechLocale(language: string): string {
  return SPEECH_LOCALES[langCode(language)] ?? "en-US";
}

type Dictionary = Record<string, string>;
const TABLE = ui as Record<string, Dictionary>;
const EN = TABLE.en;

/** Canonical set of translatable UI keys (derived from the English entry). */
export type UiKey = keyof typeof ui.en;

/** Resolve a language name (or code) to a known dictionary code. */
export function langCode(language: string): string {
  if (TABLE[language]) return language; // already a code
  return LANG_CODES[language] ?? "en";
}

/** Whether a language should render right-to-left. */
export function isRTL(language: string): boolean {
  return RTL_CODES.has(langCode(language));
}

/** A bound translation function. */
export type Translator = (key: UiKey) => string;

/**
 * Build a translator bound to a language. Returns the localized string for a
 * key, falling back to English and finally to the raw key.
 */
export function createTranslator(language: string): Translator {
  const dict = TABLE[langCode(language)] ?? EN;
  return (key: UiKey) => dict[key] ?? EN[key] ?? String(key);
}
