// Client-side input readers. No server: PDFs are parsed with pdf.js, screenshots
// OCR'd with tesseract.js, and URLs fetched through the keyless, CORS-friendly
// r.jina.ai reader.

import * as pdfjsLib from "pdfjs-dist";
// Vite resolves this worker URL at build time.
import PdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = PdfWorker;

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

export async function readPdfText(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  const parts: string[] = [];
  const maxPages = Math.min(pdf.numPages, 20);
  for (let i = 1; i <= maxPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    parts.push(content.items.map((it) => ("str" in it ? it.str : "")).join(" "));
  }
  return parts.join("\n\n").trim();
}

export async function ocrImage(file: File, onProgress?: (p: number) => void): Promise<string> {
  const Tesseract = (await import("tesseract.js")).default;
  const { data } = await Tesseract.recognize(file, "eng", {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === "recognizing text") onProgress?.(m.progress);
    },
  });
  return data.text.trim();
}

export async function fetchUrlText(url: string): Promise<string> {
  const target = url.trim().replace(/^https?:\/\//, "");
  const res = await fetch(`https://r.jina.ai/https://${target}`, {
    headers: { "X-Return-Format": "markdown" },
  });
  if (!res.ok) {
    throw new Error(
      `Couldn't fetch that URL from the browser (status ${res.status}). Try pasting the page text instead.`,
    );
  }
  const text = (await res.text()).trim();
  if (!text) throw new Error("The URL returned no readable content. Paste the page text instead.");
  return text;
}
