# Compare

**An AI-powered portal for comparing anything across different websites — and deciding with confidence.**

When we buy something important — insurance, a used car, a phone, a credit card — we open ten
tabs, paste values into a spreadsheet, and still end up overwhelmed. Too many options, too many
parameters, too much bias. **Compare exists to remove that load and get you to one confident
decision.**

You bring the sources — a **link**, a **screenshot**, an **HTML page**, or a **PDF** — from any
portal. Compare extracts the data, figures out *which* parameters actually matter for that kind
of purchase, lays every option side by side, and walks you from "many confusing choices" down to
**one recommended answer** — while showing you exactly *why*.

> **Status:** Foundation / pre-build. This repository currently contains the product vision and
> architecture. The detailed PRD and application code are next. See
> [`docs/PRODUCT.md`](docs/PRODUCT.md) for the PRD slot and open questions.

---

## The problem

Comparison shopping for high-stakes purchases is slow, biased, and exhausting:

- Every website presents data differently, so options aren't directly comparable.
- It's hard to know *which* parameters matter (a used car isn't judged like an insurance plan).
- Persuasive design and our own biases push us toward the wrong choice.
- The reasoning behind a decision is lost — you can't easily revisit or share *why* you chose.

## What Compare does

The core loop:

```
Ingest  →  Extract  →  Normalize  →  Compare  →  Decide  →  Share
```

1. **Ingest** — Paste a link, or upload a screenshot / HTML / PDF from any portal.
2. **Extract** — Scrape and pull out the meaningful data (AI-assisted; vision for images/PDFs).
3. **Normalize** — Reconcile units, currency, and formats so options line up cleanly.
4. **Compare** — The system detects the **category** and auto-selects the **right parameters**
   for it, then places every option side by side.
5. **Decide** — A transparent, re-weightable score plus plain-language pros/cons narrows the
   field to a recommendation — with the reasoning shown, not hidden.
6. **Share** — Comparisons are saved and shareable, including the **decision journey**: how you
   started from many options, eliminated some, and arrived at the final pick.

## The intelligence (why this isn't just a spreadsheet)

Compare is **category-aware**. It understands the *context* of what you're comparing and picks
the parameters that matter for that specific decision:

- **Insurance** → premium, coverage, deductible, claim-settlement ratio, network, exclusions…
- **Used car** → make, model, year, kilometers driven, number of owners, scratches/condition,
  service history, accident history, price…
- **Phone / electronics** → chip, RAM, storage, battery, camera, display, warranty, price…

For categories it hasn't seen, the AI **generates the right parameter set on the fly**. Every
extracted value carries confidence and provenance, and the final recommendation is **explainable
and re-weightable** — you can adjust what *you* care about and see the answer update. See
[`docs/AI_INTELLIGENCE.md`](docs/AI_INTELLIGENCE.md) for the full design.

## Key capabilities

| Capability | Summary |
|---|---|
| Flexible input | Link, screenshot, HTML, or PDF — anything we can extract data from |
| Scrape + persist | Extracted data is saved, so repeat and shared views are instant |
| Category intelligence | Auto-detects the category and the parameters that matter |
| Bias reduction | Transparent, re-weightable scoring; explains *why not* the others |
| Decision journey | Visualizes the narrowing funnel from many options to one |
| Lightweight login | Simple auth (e.g. magic-link / social) — not heavy |
| Shareable | Any comparison, including its journey, can be shared via a link |

## Documentation

- [`docs/PRODUCT.md`](docs/PRODUCT.md) — Product definition, personas, journey, PRD slot & open questions
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — System design, data flow, proposed stack
- [`docs/AI_INTELLIGENCE.md`](docs/AI_INTELLIGENCE.md) — How the "smartness" is built
- [`docs/GLOSSARY.md`](docs/GLOSSARY.md) — Shared vocabulary
- [`CLAUDE.md`](CLAUDE.md) — Working notes for AI coding sessions

## Roadmap (indicative)

- **Now:** Product vision + architecture foundation (this repo).
- **Next:** Confirm the PRD, lock scope and stack, then build the MVP ingestion → compare loop.
- **Later:** Broaden category coverage, refine the decision-journey UX, add mobile.

_Recommended stack and scope are proposals to confirm against the forthcoming PRD._
