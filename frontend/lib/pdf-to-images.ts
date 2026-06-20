/**
 * Client-side PDF utilities for ClarityAI.
 *
 * When a PDF has no selectable text (i.e. it is a scanned document), we
 * render each page to a JPEG on the user's device using PDF.js and send
 * those images instead. This reuses the existing image → OCR → AI pipeline
 * on the backend without requiring any server-side PDF renderer.
 *
 * The pdfjs worker is served from /pdf.worker.min.mjs (copied to public/ by
 * next.config.mjs at build time) so it works fully offline as a PWA.
 */

// Minimum number of characters that must be extractable from the first 3 pages
// for the PDF to be considered "text-based" (not scanned).
const TEXT_THRESHOLD = 80;

// Cap the number of pages rendered to images — avoids huge payloads.
const MAX_PAGES = 8;

// 2× gives ~150 DPI for a standard US letter page. Good enough for Tesseract.
const RENDER_SCALE = 2.0;

type PdfJs = typeof import("pdfjs-dist");
let _pdfjs: PdfJs | null = null;

async function getPdfjs(): Promise<PdfJs> {
  if (_pdfjs) return _pdfjs;
  const pdfjs = await import("pdfjs-dist");
  // Worker served from the same origin — no CDN dependency, works offline.
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  _pdfjs = pdfjs;
  return pdfjs;
}

/**
 * Returns true if the PDF contains extractable (selectable) text.
 * Checks only the first 3 pages to keep latency under ~200 ms.
 */
export async function pdfHasSelectableText(file: File): Promise<boolean> {
  const pdfjs = await getPdfjs();
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buffer }).promise;

  const checkPages = Math.min(pdf.numPages, 3);
  let text = "";

  for (let i = 1; i <= checkPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    text += content.items.map((item: any) => ("str" in item ? item.str : "")).join(" ");
    if (text.trim().length >= TEXT_THRESHOLD) return true;
  }

  return false;
}

/**
 * Renders every page (up to MAX_PAGES) of a scanned PDF to a JPEG File.
 * Call this only after pdfHasSelectableText() returns false.
 */
export async function pdfToImages(file: File): Promise<File[]> {
  const pdfjs = await getPdfjs();
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buffer }).promise;

  const pageCount = Math.min(pdf.numPages, MAX_PAGES);
  const images: File[] = [];
  const baseName = file.name.replace(/\.pdf$/i, "");

  for (let i = 1; i <= pageCount; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: RENDER_SCALE });

    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const ctx = canvas.getContext("2d", { alpha: false })!;
    // White background is critical for OCR accuracy on scanned documents.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({ canvasContext: ctx, viewport }).promise;

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("canvas.toBlob failed"))),
        "image/jpeg",
        0.92,
      );
    });

    images.push(new File([blob], `${baseName}-p${i}.jpg`, { type: "image/jpeg" }));
  }

  return images;
}

/**
 * Prepares a file list for submission. Scanned PDFs are silently converted to
 * JPEG images so they go through the backend's OCR path. All other files (
 * text-based PDFs, images, plain text) pass through unchanged.
 *
 * @param files    The raw file list from the intake form.
 * @param onScan   Optional callback fired when a scanned PDF is detected,
 *                 receiving the file's name. Use it to show a "converting…"
 *                 message in the UI.
 */
export async function prepareFiles(
  files: File[],
  onScan?: (fileName: string) => void,
): Promise<File[]> {
  const result: File[] = [];

  for (const file of files) {
    const isPdf =
      file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      result.push(file);
      continue;
    }

    try {
      const hasText = await pdfHasSelectableText(file);
      if (hasText) {
        result.push(file);
      } else {
        onScan?.(file.name);
        const images = await pdfToImages(file);
        result.push(...images);
      }
    } catch {
      // If pdfjs fails for any reason, fall back to sending the original file
      // and let the backend surface a clean error.
      result.push(file);
    }
  }

  return result;
}
