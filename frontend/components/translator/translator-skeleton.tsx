import { FileImage, Loader2, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { createTranslator } from "@/lib/i18n";

/** Calming skeleton state shown while the AI translates (or while a scanned PDF is being converted). */
export function TranslatorSkeleton({
  language = "English",
  converting = false,
  convertingFile = "",
}: {
  language?: string;
  converting?: boolean;
  convertingFile?: string;
}) {
  const t = createTranslator(language);

  return (
    <Card aria-busy="true" aria-live="polite">
      <div className="flex items-center gap-3 text-primary">
        {converting ? (
          <FileImage className="h-6 w-6 animate-pulse" />
        ) : (
          <Loader2 className="h-6 w-6 animate-spin" />
        )}
        <p className="text-xl font-semibold">
          {converting ? "Converting your PDF…" : t("skeleton_reading")}
        </p>
      </div>

      {converting ? (
        <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50/50 p-2.5 text-blue-800">
          <p className="text-xs font-semibold">
            📄 Scanned document detected — rendering pages to images on your device
          </p>
          {convertingFile && (
            <p className="mt-1 truncate text-xs text-blue-600 opacity-80">{convertingFile}</p>
          )}
        </div>
      ) : (
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/50 p-2.5 text-emerald-800">
          <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600 animate-pulse" />
          <span className="text-xs font-semibold">{t("skeleton_privacy")}</span>
        </div>
      )}

      <p className="mt-4 text-base text-muted-foreground">
        {converting
          ? "This takes a few seconds. The pages will then be read by AI."
          : t("skeleton_body")}
      </p>

      <div className="mt-8 space-y-8">
        <div>
          <div className="skeleton mb-3 h-4 w-32" />
          <div className="skeleton h-7 w-full" />
          <div className="skeleton mt-2 h-7 w-4/5" />
        </div>
        <div>
          <div className="skeleton mb-3 h-4 w-28" />
          <div className="skeleton h-12 w-2/3" />
        </div>
        <div className="space-y-3">
          <div className="skeleton h-4 w-36" />
          <div className="skeleton h-12 w-full" />
          <div className="skeleton h-12 w-full" />
          <div className="skeleton h-12 w-5/6" />
        </div>
      </div>
    </Card>
  );
}
