import type { Metadata, Viewport } from "next";
import { Montserrat, Fira_Sans, Fira_Code } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/service-worker";
import { InstallPrompt } from "@/components/install-prompt";
import { OfflineBadge } from "@/components/offline-badge";
import { Providers } from "@/components/providers";
import { TranslatorProvider } from "@/lib/translator-context";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
});

const firaSans = Fira_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-fira-sans",
  display: "swap",
});

const firaCode = Fira_Code({
  subsets: ["latin"],
  variable: "--font-fira-code",
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://clarityai.falak.me";
const TITLE    = "ClarityAI – Any document, in plain language";
const DESC     =
  "Paste or photograph any legal, medical, or government document and instantly get a plain-language summary, a step-by-step action plan, and verified local support resources. Free, private, no sign-in required.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),

  title: {
    default: TITLE,
    // Sub-pages: e.g. "Privacy Policy | ClarityAI"
    template: "%s | ClarityAI",
  },
  description: DESC,

  keywords: [
    "document translator",
    "plain language",
    "understand legal documents",
    "eviction notice explained",
    "medical bill help",
    "official document AI",
    "free legal aid tool",
    "document simplifier",
    "benefits letter help",
    "AI document reader",
    "know your rights",
  ],

  authors:   [{ name: "ClarityAI", url: SITE_URL }],
  creator:   "ClarityAI",
  publisher: "ClarityAI",

  alternates: { canonical: SITE_URL },

  // ── Open Graph ─────────────────────────────────────────────────────────────
  openGraph: {
    type:        "website",
    locale:      "en_US",
    url:         SITE_URL,
    siteName:    "ClarityAI",
    title:       TITLE,
    description: DESC,
    images: [
      {
        url:    `${SITE_URL}/og-image.png`,
        width:  1200,
        height: 630,
        alt:    "ClarityAI – Any document, in plain language",
      },
    ],
  },

  // ── Twitter / X card ───────────────────────────────────────────────────────
  twitter: {
    card:        "summary_large_image",
    title:       TITLE,
    description: "Turn any confusing document into plain language, a clear action plan, and local support — free and private.",
    images:      [`${SITE_URL}/og-image.png`],
  },

  // ── Robots ─────────────────────────────────────────────────────────────────
  robots: {
    index:  true,
    follow: true,
    googleBot: {
      index:              true,
      follow:             true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet":       -1,
    },
  },

  // ── PWA / App shell ────────────────────────────────────────────────────────
  manifest:        "/manifest.json",
  applicationName: "ClarityAI",
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32",   type: "image/png"     },
      { url: "/icons/icon-192.png",   sizes: "192x192", type: "image/png"     },
      { url: "/icons/icon.svg",                          type: "image/svg+xml" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  appleWebApp: {
    capable:         true,
    statusBarStyle:  "default",
    title:           "ClarityAI",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor:     "#2563EB",
  width:          "device-width",
  initialScale:   1,
  maximumScale:   5,
  viewportFit:    "cover",
};

// Structured data — WebApplication schema for Google rich results.
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "ClarityAI",
  url: SITE_URL,
  description: DESC,
  applicationCategory: "UtilitiesApplication",
  operatingSystem: "Web",
  browserRequirements: "Any modern browser",
  inLanguage: ["en", "es", "fr", "ar", "zh", "hi"],
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  featureList: [
    "Instant plain-language document explanation",
    "Step-by-step action plan with deadlines",
    "Verified local support resources",
    "6 languages with native-script labels",
    "Read-aloud audio in 6 languages",
    "Privacy-first — nothing stored on servers",
    "Works offline as a Progressive Web App",
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${montserrat.variable} ${firaSans.variable} ${firaCode.variable}`}
    >
      <body className="min-h-screen font-sans">
        {/* JSON-LD structured data for Google rich results */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        <Providers>
          <TranslatorProvider>{children}</TranslatorProvider>
        </Providers>

        <OfflineBadge />
        <ServiceWorkerRegister />
        <InstallPrompt />
      </body>
    </html>
  );
}
