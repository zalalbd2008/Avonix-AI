-- Full-text retrieval fallback (ADR-005).
--
-- When no embedding provider is configured, retrieval uses this instead of
-- vector similarity. Worse results, but the chat still answers — rather than a
-- feature that looks configured and silently returns nothing.
--
-- An expression index, not a stored column: a duplicated tsvector column would
-- drift from `content` the moment anything updates one without the other.
--
-- Apply after every `drizzle-kit migrate`.

CREATE INDEX IF NOT EXISTS knowledge_chunks_fts_idx
  ON knowledge_chunks
  USING GIN (to_tsvector('english', coalesce(title, '') || ' ' || content));
