# Product Definition — Compare

> This is the living product definition. When the user's **PRD** arrives, reconcile it against
> the **[PRD slot](#prd-slot)** and **[open questions](#open-questions)** below rather than
> writing a parallel document.

## 1. Vision

Buying decisions for high-stakes purchases are overwhelming: too many options, presented
inconsistently across websites, judged on parameters that differ by category, and clouded by
bias. **Compare turns scattered options from many portals into one clear, explainable decision.**

The point of the portal is not to show *more* data — it is to **reduce the cognitive load** and
help the user make an **effective, confident decision** at the moment of purchase.

## 2. Who it's for (personas)

- **The overwhelmed buyer** — has 5–15 browser tabs open for insurance / a used car / a phone
  and cannot mentally hold all the trade-offs. Wants a confident answer, fast.
- **The careful researcher** — wants to *see the reasoning*, adjust priorities, and keep a
  record of why a choice was made.
- **The sharer** — a family member or advisor who receives a comparison (and its journey) and
  can understand the decision without redoing the research.

## 3. Core user journey

```
1. Sign in (lightweight — magic link / social)
2. Start a comparison → choose or auto-detect a category
3. Add options by INPUT:
      • paste a link            (scraped)
      • upload a screenshot     (vision extraction)
      • upload a PDF / HTML     (document extraction)
4. System extracts + normalizes each option into the category's parameters
5. Review the side-by-side comparison
      • correct any extracted value
      • adjust weights to reflect what YOU care about
6. See the recommendation + pros/cons + "why not the others"
7. Narrow the funnel: shortlist, eliminate (with a reason), converge to one
8. Save & share (comparison + decision journey)
```

## 4. Signature concepts

### 4.1 Flexible ingestion
Input is **always a source**, most often a **link**, but equally a **screenshot**, an **HTML
page**, or a **PDF**. Anything we can extract data from is a valid input. See
[`ARCHITECTURE.md`](ARCHITECTURE.md) for how each type is handled.

### 4.2 Scrape & persist
Extracted data is **saved**. A returning user — or someone opening a shared link — sees results
instantly without re-scraping. Cached, structured records are the unit of reuse.

### 4.3 Category intelligence
The system detects **what** is being compared and auto-selects the **parameters that matter** for
that category. This is the heart of the product — detailed in
[`AI_INTELLIGENCE.md`](AI_INTELLIGENCE.md).

### 4.4 Bias reduction → single solution
The explicit goal is to **narrow many options down to one**. Compare does this with:
- transparent, **re-weightable** scoring (the user controls what matters),
- surfacing **dominated options** (worse on every axis the user cares about),
- plain-language **pros/cons and "why not"** so the choice is understood, not just asserted.

### 4.5 The decision journey
Compare records **how the decision was made** — the narrowing funnel:

```
   All candidates  ─►  Shortlisted  ─►  Eliminated (with reason)  ─►  Chosen
```

This journey is a first-class, **shareable** artifact: it lets someone else see *how* you got
from many options to one, and lets you revisit the reasoning later.

### 4.6 Lightweight login & sharing
Auth is deliberately **simple** (e.g. magic-link or social login) — enough to save and attribute
comparisons, not a heavy identity system. Every comparison and journey can be **shared via a
link**, with view/edit permissions to be defined in the PRD.

## 5. Scope

### MVP (proposed — confirm in PRD)
- Lightweight auth.
- Ingest **link + screenshot + PDF**; extract into a category schema.
- Auto **category detection** + seeded schemas for 2–3 launch categories (e.g. insurance,
  used car) with an LLM-generated fallback schema.
- Side-by-side comparison with **editable values** and **adjustable weights**.
- Recommendation with pros/cons and "why not."
- Save + share a comparison.

### Later (proposed)
- Full decision-journey timeline UI.
- Broader category library and community/shared schemas.
- Native mobile client (screenshot capture is natural on phones).
- Collaboration (multiple people on one comparison).

### Explicit non-goals (for now)
- Being a price-tracking or affiliate marketplace.
- Guaranteeing live/real-time data (data is scraped-and-saved, freshness policy TBD in PRD).
- Heavy enterprise auth / SSO.

## 6. Success signals (to refine in PRD)
- Time from "many options" to "a confident decision" drops sharply.
- Users converge to a single choice (funnel completion).
- Shared comparisons are opened and understood by recipients.

---

## PRD slot

> **Paste / link the detailed PRD here when it arrives.** Then update the sections above to match
> it, and resolve the open questions below.

_(empty — awaiting the user's PRD)_

## Open questions

These need the PRD (or a user decision) before implementation:

1. **Launch categories** — which categories are guaranteed at MVP (insurance? used car? both)?
2. **Data freshness** — is a saved scrape "good enough forever," or do we re-fetch on some TTL?
3. **Scraping policy** — how do we handle sites that block scraping, paywalls, or ToS limits?
   (Screenshot/PDF upload is the fallback path.)
4. **Sharing model** — public link vs. account-gated; view-only vs. collaborative editing.
5. **Auth method** — magic-link email, Google/social, or both.
6. **Trust & accuracy** — how do we present extraction confidence and let users correct values?
7. **Platform priority** — web-only first, or web + mobile in parallel.
8. **Stack confirmation** — accept the recommended stack in [`ARCHITECTURE.md`](ARCHITECTURE.md)
   or choose another.
9. **Monetization / limits** — free vs. paid tiers, per-comparison or per-source limits (if any).
