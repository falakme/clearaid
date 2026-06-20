import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://clarityai.falak.me";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // App-state routes have no meaningful standalone content for Google.
        disallow: ["/api/", "/dash/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
