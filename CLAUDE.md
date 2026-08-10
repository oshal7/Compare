# CLAUDE.md — Working Notes for AI Coding Sessions

Guidance for Claude Code (and other AI sessions) working in this repository.

## What this project is
**Compare** is an AI-powered portal to compare things across different websites (insurance, used
cars, phones, anything) from **links, screenshots, HTML, or PDFs**, and narrow many options down
to **one confident, explainable decision**. See [`README.md`](README.md).

## Source of truth
Read these before proposing or writing code:
- [`README.md`](README.md) — vision and the core loop.
- [`docs/PRODUCT.md`](docs/PRODUCT.md) — product definition, **PRD slot**, and **open questions**.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — components, data flow, proposed stack.
- [`docs/AI_INTELLIGENCE.md`](docs/AI_INTELLIGENCE.md) — the AI pipeline (the core differentiator).
- [`docs/GLOSSARY.md`](docs/GLOSSARY.md) — use these terms consistently.

## Current status — do not build the app yet
This repo currently holds **vision + architecture only**. The detailed **PRD is still coming.**
Before writing application code:
1. Confirm the PRD has landed in [`docs/PRODUCT.md`](docs/PRODUCT.md) (PRD slot filled).
2. Resolve the relevant **open questions** (launch categories, stack, auth, sharing model…).
3. Then implement against the confirmed scope.

If asked to build before the PRD is confirmed, flag the open questions first.

## When building the AI pieces
- Follow the pipeline in [`docs/AI_INTELLIGENCE.md`](docs/AI_INTELLIGENCE.md): detect → schema →
  extract → normalize → score → explain, with a human in the loop.
- Consult the **`claude-api` skill** for current Claude model IDs, tool-calling, vision, and
  prompt-caching before writing any API code — don't hardcode model names from memory.

## Stack
The stack in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) is a **proposal**, not a decision.
Confirm it against the PRD before scaffolding.

## Git conventions
- Develop on branch **`claude/multi-website-comparison-app-kij0al`**.
- Commit with clear, descriptive messages; push with `git push -u origin <branch>`.
- **Do not open a pull request unless explicitly asked.**
