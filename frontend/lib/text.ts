/**
 * Strip emojis and variation selectors from a string.
 * ClearAid keeps a clean, professional look — emojis are removed both
 * server-side and again here as a defensive client-side pass.
 */
const EMOJI =
  /[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE00}-\u{FE0F}\u{200D}]/gu;

export function stripEmoji(input: string): string {
  return input.replace(EMOJI, "").replace(/[ \t]{2,}/g, " ");
}
