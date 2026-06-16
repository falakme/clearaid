/** Output languages offered by the translator's language selector. */
export const LANGUAGES = [
  "English",
  "Spanish",
  "Arabic",
  "Chinese (Simplified)",
  "French",
  "Hindi",
  "Portuguese",
  "Bengali",
  "Russian",
  "Urdu",
  "Vietnamese",
  "Tagalog",
  "Haitian Creole",
] as const;

export type Language = (typeof LANGUAGES)[number];
