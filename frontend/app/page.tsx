import { TranslatorApp } from "@/components/translator/translator-app";

/**
 * The single, frictionless app surface. No login, no onboarding, no location
 * prompt — visiting the site drops you straight into the translator.
 *
 * The whole experience is a two-state mobile-first PWA driven by
 * <TranslatorApp>:
 *   - State 0: the full-viewport intake screen (with Judge Demo Mode).
 *   - State 1: the tabbed dashboard (Summary / Tasks / Resources / Settings)
 *     with a floating glassmorphic bottom navigation.
 */
export default function HomePage() {
  return <TranslatorApp docType="general" storageKey="home" />;
}
