# Glossary — Compare

Shared vocabulary so the PRD, the docs, and the code all use terms the same way.

| Term | Meaning |
|---|---|
| **Comparison** | A single workspace comparing a set of options for one buying decision. |
| **Option** | One candidate being compared (a specific insurance plan, a specific used car). |
| **Ingestion Source** | An input attached to an option: a `url`, `screenshot`, `pdf`, or `html`. |
| **Category** | What is being compared — e.g. `insurance`, `used-car`, `phone`. Drives the schema. |
| **Category Schema** | The set of parameters that matter for a category, with type, unit, weight, and direction. Versioned; seeded or LLM-generated. |
| **Parameter** | One comparable attribute within a schema (e.g. `premium`, `km_driven`). |
| **Direction** | Whether a higher or lower value is better for a parameter (e.g. price → lower better). |
| **Weight** | How much a parameter matters in scoring. Has a default; **user-adjustable**. |
| **ParameterValue** | An extracted value for one parameter on one option, with confidence and provenance. |
| **Provenance** | Where an extracted value came from (which source/field) — shown for trust. |
| **Confidence** | The AI's certainty about an extracted value; low confidence is flagged in the UI. |
| **Normalization** | Reconciling units, currency, and formats so values are directly comparable. |
| **Dominated Option** | An option worse on every axis the user cares about — a safe elimination. |
| **Score** | The transparent weighted result used to rank options. |
| **Recommendation** | The suggested single choice, with pros/cons and reasoning. |
| **Decision Journey** | The recorded narrowing funnel: candidates → shortlisted → eliminated (with reason) → chosen. |
| **Journey Step** | One event in the journey (added, shortlisted, eliminated, chosen) with a reason and timestamp. |
| **Share Link** | A link that shares a comparison and/or its journey, with a permission scope. |
