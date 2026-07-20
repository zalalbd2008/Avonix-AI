# ADR-005 — Embedding model for retrieval

**Status:** Accepted · 2026-07-21

## Context

The AI chat widget answers from the client's own website content, which means
retrieval: crawl the pages, chunk them, embed the chunks, and find the relevant
ones at question time. ADR-004 chose Postgres with pgvector for storage but left
the embedding model open, because Anthropic does not publish one.

Three options were considered, and one more surfaced while thinking about it.

| Option | For | Against |
|---|---|---|
| **Voyage AI** | Anthropic's recommended pairing; strong retrieval quality; **200M free tokens** on the voyage-4 generation, then $0.02/M for lite | A third vendor |
| **OpenAI** | Cheap, ubiquitous, every tutorial uses it | A competitor's API sitting in the middle of a product whose answers come from Claude |
| **Local (Transformers.js)** | No cost, no data leaves | Slow on serverless cold starts; weaker retrieval; model weights in the deploy bundle |
| **Postgres full-text only** | Free, already installed, no vendor | Misses the cases that matter: "do you open on Saturdays?" does not lexically match a page titled "Practice hours" |

## Decision

**voyage-4-lite at 1024 dimensions.**

The free allowance is what settles it. 200 million tokens is roughly 400,000
documents — far past the point where this product either has paying customers or
has been abandoned. Retrieval quality is paid for out of a budget that does not
exist yet, and $0.02 per million tokens afterwards is not a line item worth
optimising.

1024 is Voyage's default. The models are Matryoshka-trained, so 512 or 256 stay
available later without re-embedding from scratch if index size ever matters.

**Two further decisions that matter more than the model choice:**

1. **The provider sits behind an interface**, exactly like the email providers in
   `lib/email/providers/`. Swapping Voyage for OpenAI, or for a local model, is
   one file. This is the real hedge — not the model, the seam.

2. **Without an API key, retrieval degrades to Postgres full-text search rather
   than failing.** The chat still answers, less well, and the code path is
   exercised in development without anyone signing up for an account. This is
   the same rule as the email dev transport: there is no state where the feature
   appears to work and silently does not.

## Consequences

- `knowledge_chunks.embedding` is `vector(1024)`. Changing model dimension later
  means re-embedding the corpus; the migration is cheap while the corpus is
  small, and expensive later. This is the decision most likely to be regretted.
- Two vendors are now in the answer path: Voyage for retrieval, Anthropic for
  generation. Either being down degrades the widget rather than breaking the
  product, because retrieval falls back to full-text and the chat endpoint fails
  closed to a "we could not answer" message.
- Embedding happens on crawl, not on question, so a slow embed call costs an
  indexing job rather than a visitor's patience.
- Queries are embedded per question, which is one API call per visitor message.
  That is the ongoing cost, and it is metered per agency alongside the Claude
  spend (ADR-004 made metering mandatory).

## Rejected

**OpenAI** — cheaper per token, but routing a Claude-answered product's
retrieval through a competitor is a dependency worth avoiding when the
alternative is free at this volume.

**Local models** — the cost saving is real and the privacy story is better, but
cold-start latency on serverless makes visitor-facing chat feel broken, and
retrieval quality at small model sizes is meaningfully worse. Worth revisiting if
embedding spend ever becomes visible.
