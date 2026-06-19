import type { Metadata, Viewport } from "next";
import { Montserrat, Fira_Sans, Fira_Code } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/service-worker";
import { InstallPrompt } from "@/components/install-prompt";
import { OfflineBadge } from "@/components/offline-badge";
import { Providers } from "@/components/providers";
import { TranslatorProvider } from "@/lib/translator-context";

// Display headings — Montserrat (--font-display)
const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
});

// Body copy — Fira Sans (--font-body)
const firaSans = Fira_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-fira-sans",
  display: "swap",
});

// Monospace — Fira Code (--font-mono)
const firaCode = Fira_Code({
  subsets: ["latin"],
  variable: "--font-fira-code",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ClarityAI — Making complex information, simple.",
  description:
    "ClarityAI: Making complex information, simple. Paste or photograph a confusing letter, bill, or form and get a clear plain-language summary, an actionable plan, and trusted local help.",
  manifest: "/manifest.json",
  applicationName: "ClarityAI",
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ClarityAI",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#2563EB",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${montserrat.variable} ${firaSans.variable} ${firaCode.variable}`}>
      <body className="min-h-screen font-sans">
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
