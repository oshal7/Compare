// Light "identity" helpers for the canvas onboarding: pull just a name + image so
// a product card feels alive immediately, before any heavy parameter extraction.

export interface LightIdentity {
  name?: string;
  imageUrl?: string;
}

/** Parse name + hero image from the markdown the r.jina reader returns for a URL. */
export function parseUrlIdentity(markdown: string): LightIdentity {
  const id: LightIdentity = {};
  const title = markdown.match(/^\s*Title:\s*(.+)$/im);
  if (title) id.name = title[1].trim();
  if (!id.name) {
    const h1 = markdown.match(/^\s*#\s+(.+)$/m);
    if (h1) id.name = h1[1].trim();
  }
  // First real (http) markdown image.
  const imgs = markdown.matchAll(/!\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/g);
  for (const m of imgs) {
    const url = m[1];
    if (!/\.svg(\?|$)/i.test(url)) {
      id.imageUrl = url;
      break;
    }
  }
  return id;
}

export function firstLine(text: string): string {
  const line = text.split(/\r?\n/).map((l) => l.trim()).find((l) => l.length > 1);
  return (line ?? "").slice(0, 80);
}

export function cleanFilename(name: string): string {
  return name.replace(/\.[a-z0-9]+$/i, "").replace(/[_-]+/g, " ").trim();
}

const GRADIENTS = [
  "linear-gradient(135deg,#38bdf8,#818cf8)",
  "linear-gradient(135deg,#818cf8,#f43f5e)",
  "linear-gradient(135deg,#22d3ee,#38bdf8)",
  "linear-gradient(135deg,#f59e0b,#f43f5e)",
  "linear-gradient(135deg,#34d399,#38bdf8)",
];

/** A stable gradient + initials monogram for products without an image. */
export function monogram(seed: string): { initials: string; gradient: string } {
  const initials =
    seed
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "?";
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return { initials, gradient: GRADIENTS[h % GRADIENTS.length] };
}
