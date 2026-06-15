"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Camera, FileText, ImageIcon, UploadCloud, X } from "lucide-react";
import { cn } from "@/lib/utils";

const ACCEPT = ".pdf,image/png,image/jpeg,image/jpg,image/webp,application/pdf";
const MAX_MB = 10;

function prettySize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface Props {
  file: File | null;
  onFile: (file: File | null) => void;
}

/** Upload a PDF/image or snap a photo of a document (mobile camera). */
export function FileIntake({ file, onFile }: Props) {
  const browseRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");

  function accept(f: File | undefined | null) {
    if (!f) return;
    if (f.size > MAX_MB * 1024 * 1024) {
      setError(`That file is over ${MAX_MB} MB. Please choose a smaller one.`);
      return;
    }
    setError("");
    onFile(f);
  }


  if (file) {
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center gap-4 rounded-md border border-white/70 bg-card p-4 shadow-clay-sm"
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary shadow-clay-sm">
          {isPdf ? <FileText className="h-6 w-6" /> : <ImageIcon className="h-6 w-6" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold">{file.name}</p>
          <p className="text-sm text-muted-foreground">{prettySize(file.size)} · ready to translate</p>
        </div>
        <button
          onClick={() => onFile(null)}
          aria-label="Remove file"
          className="flex min-h-tap min-w-tap items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>
      </motion.div>
    );
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => browseRef.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && browseRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          accept(e.dataTransfer.files?.[0]);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-primary/30 bg-card p-8 text-center shadow-clay-inset transition-colors",
          dragging && "border-primary bg-primary/5",
        )}
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-md bg-primary/10 text-primary shadow-clay-sm">
          <UploadCloud className="h-7 w-7" />
        </span>
        <p className="mt-4 text-lg font-bold">Upload a document</p>
        <p className="mt-1 text-base text-muted-foreground">
          Drop a PDF or image here, or tap to browse. Max {MAX_MB} MB.
        </p>
      </div>

      <button
        type="button"
        onClick={() => cameraRef.current?.click()}
        className="mt-3 flex min-h-tap w-full items-center justify-center gap-2 rounded-md border border-white/70 bg-card font-bold text-foreground shadow-clay active:translate-y-0.5"
      >
        <Camera className="h-5 w-5" /> Take a photo
      </button>

      {error && <p className="mt-3 rounded-md bg-warning/15 p-3 text-base text-amber-800">{error}</p>}

      <input
        ref={browseRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => accept(e.target.files?.[0])}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => accept(e.target.files?.[0])}
      />
    </div>
  );
}
