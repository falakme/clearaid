/** @type {import('next').NextConfig} */

import { copyFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Copy the pdfjs-dist worker to public/ at build/dev-start time so it can be
// served as a plain static asset and loaded via new Worker('/pdf.worker.min.mjs').
// The file is ~600 kB and only fetched when the user uploads a PDF.
try {
  const src = resolve(__dirname, "node_modules/pdfjs-dist/build/pdf.worker.min.mjs");
  const dst = resolve(__dirname, "public/pdf.worker.min.mjs");
  if (existsSync(src)) copyFileSync(src, dst);
} catch { /* ignore — worker copy is best-effort */ }

// Content-Security-Policy tuned for this app: same-origin everything, plus the
// inline script/style Next.js needs for hydration, blob/data images & audio
// (TTS playback, icons), and no framing. Adjust connect-src if you ever call
// the backend cross-origin instead of via the same-origin /api proxy.
const ContentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "media-src 'self' blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: ContentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // The app uses the microphone (voice input) on its own origin only.
  { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=(self)" },
];

const nextConfig = {
  reactStrictMode: true,
  // Produces a minimal standalone server for small Docker images.
  output: "standalone",
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
