"use client";

import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Brand } from "@/components/brand";
import { useStoredTranslator } from "@/lib/use-language";

export default function NotFound() {
  const { t, rtl } = useStoredTranslator();
  return (
    <div
      dir={rtl ? "rtl" : "ltr"}
      className="mx-auto flex min-h-[100dvh] max-w-screen-xl flex-col px-5 pb-6 pt-[max(1.5rem,env(safe-area-inset-top))] lg:px-8 lg:py-8"
    >
      {/* Header */}
      <header className="flex items-center justify-between gap-3">
        <Brand href="/" />
      </header>

      {/* Content */}
      <div className="mt-16 w-full max-w-3xl">
        <h1 className="font-display text-4xl font-extrabold tracking-tight">{t("not_found_title")}</h1>
        <p className="mt-3 text-xl text-muted-foreground">{t("not_found_body")}</p>
        <Link href="/" className={buttonVariants({ className: "mt-8" })}>
          {t("back_home")}
        </Link>
      </div>

      {/* Footer — same as every other page */}
      <footer className="mt-auto border-t border-border pt-6">
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
          {t("footer")}
        </p>
        <nav className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <Link href="/privacy" className="hover:text-foreground">{t("privacy_policy")}</Link>
          <span aria-hidden>·</span>
          <Link href="/terms" className="hover:text-foreground">{t("terms_of_service")}</Link>
        </nav>
      </footer>
    </div>
  );
}
