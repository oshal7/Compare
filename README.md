# DecisionLens (Compare)

**A gamified, AI-powered portal that turns links, screenshots, PDFs, and pasted specs into one
confident, explainable decision.**

When we buy something important — insurance, a used car, a phone, a laptop — we open ten tabs, paste
values into a spreadsheet, and still feel unsure. **DecisionLens** extracts the parameters that
actually matter for that *kind* of decision, lays every option side by side, then plays you through
four quick behavioral games that strip out bias and converge on a **single winner** — with a full,
shareable decision audit trail.

> **Runs entirely in your browser and hosts on GitHub Pages** — no server, no backend, no accounts.

---

## Try it

Live: **https://oshal7.github.io/Compare/** (note the capital **C** — GitHub Pages paths are case-sensitive).

Or run locally:

```bash
npm install
npm run dev      # → http://localhost:5173/
```

Click **"Try a sample phone comparison" → "Build comparison"** to see the whole flow with zero setup.

## How it works — the core loop

```
Ingest  →  Extract  →  Normalize  →  Compare  →  Play games  →  Converge  →  Share
```

1. **Ingest** — paste text/HTML, upload a **PDF** (parsed with pdf.js), drop a **screenshot** (OCR'd
   with tesseract.js), or add a **URL** (fetched via the keyless r.jina.ai reader).
2. **Extract** — the AI detects the **category**, projects the **parameters that matter** for it, and
   pulls values into a typed schema with **confidence + source provenance** (the *3-Tier Parameter
   Engine*: baseline → page-found → your custom rows).
3. **Compare** — an interactive glassmorphic matrix with editable cells, best-in-column markers,
   confidence badges, and hard-constraint toggles.
4. **Play the four games** — 100-Chip Allocation (weights), Bracket Tournament (with hesitation
   telemetry), Blind Trade-off (brands hidden), and Regret Pre-Mortem (fine-print risk scenarios).
5. **Converge** — a transparent **Consensus Score** ranks the options, flags **brand bias** and the
   **friction hotspot**, and reveals a winner.
6. **Share** — the whole board compresses into a share URL (or export JSON); it reconstructs in any
   browser with no backend.

## AI engines — pick what suits you

Set the engine in the top-right settings. All three are interchangeable behind one interface:

| Engine | Key needed? | Notes |
|---|---|---|
| **Sample data** | No | Parses pasted specs locally with regex. Zero setup — the default, always works. |
| **In-browser AI** | No | Runs a small model **fully in your browser via WebGPU** (WebLLM). ~1GB one-time download. |
| **Claude (your key)** | Your Anthropic key | Highest quality + screenshot vision. Your key is stored **only in your browser**, never in the repo. |

## Deploying to GitHub Pages

A GitHub Actions workflow (`.github/workflows/deploy.yml`) builds the static site and publishes it.
**One-time setup:** in the repo, go to **Settings → Pages → Source: "GitHub Actions"**. After the next
push, the site is live at `https://oshal7.github.io/Compare/`.

> `vite.config.ts` uses `base: "./"` (relative asset paths) so the app works at the case-sensitive
> Pages project path regardless of casing, and would survive a custom-domain or user/org-page move.

## Tech

Vite · React · TypeScript · Tailwind · Framer Motion · Zustand · IndexedDB (`idb`) ·
`@mlc-ai/web-llm` · `@anthropic-ai/sdk` (browser) · `pdfjs-dist` · `tesseract.js` · `lz-string` ·
Vitest. See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the design and the reconciliations that
static hosting forced (Vite instead of Next.js, client-side everything).

## Documentation

- [`docs/PRODUCT.md`](docs/PRODUCT.md) — product definition + the landed PRD
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — system design, data flow, GitHub-Pages reconciliations
- [`docs/AI_INTELLIGENCE.md`](docs/AI_INTELLIGENCE.md) — the category-aware AI pipeline
- [`docs/GLOSSARY.md`](docs/GLOSSARY.md) — shared vocabulary
- [`CLAUDE.md`](CLAUDE.md) — working notes for AI coding sessions

## Status & roadmap

Milestone 1 is built: ingestion, the 3-tier engine, the matrix, **all four games**, the full consensus
engine, journey, persistence, sharing, and the Pages deploy. Next: real accounts/cross-device sync
(needs a backend), PDF export of the audit trail, live spectator voting, and a fuller sound pass.
