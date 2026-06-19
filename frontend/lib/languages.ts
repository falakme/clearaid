/** Output languages offered by the translator's language selector. */
export const LANGUAGES = [
  "English",
  "Spanish",
  "French",
  "Arabic",
  "Chinese (Simplified)",
  "Hindi",
  "German",
  "Portuguese",
  "Vietnamese",
  "Tagalog",
  "Korean",
  "Urdu",
  "Bengali",
  "Russian",
  "Haitian Creole",
] as const;

export type Language = (typeof LANGUAGES)[number];

/**
 * Display name for each language written in that language's own script.
 * The `value` passed to the API remains the English name above; this is
 * only for how the option appears in the <select> dropdown.
 */
export const LANGUAGE_NATIVE_NAMES: Record<Language, string> = {
  "English":             "English",
  "Spanish":             "Español",
  "French":              "Français",
  "Arabic":              "عربي",
  "Chinese (Simplified)":"中文",
  "Hindi":               "हिन्दी",
  "German":              "Deutsch",
  "Portuguese":          "Português",
  "Vietnamese":          "Tiếng Việt",
  "Tagalog":             "Filipino",
  "Korean":              "한국어",
  "Urdu":                "اردو",
  "Bengali":             "বাংলা",
  "Russian":             "Русский",
  "Haitian Creole":      "Kreyòl",
};
