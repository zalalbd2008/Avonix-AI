import { EMBEDDING_DIMENSIONS, type EmbeddingProvider } from "./types";

const MODEL = "voyage-4-lite";
const ENDPOINT = "https://api.voyageai.com/v1/embeddings";

/**
 * Voyage AI, per ADR-005.
 *
 * `input_type` matters: Voyage embeds a question and a passage differently, and
 * telling it which is which measurably improves retrieval. Getting this wrong is
 * silent — results are simply a bit worse — which is why it is explicit here.
 */
export function voyageProvider(apiKey: string): EmbeddingProvider {
  async function embed(texts: string[], inputType: "document" | "query") {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        input: texts,
        input_type: inputType,
        output_dimension: EMBEDDING_DIMENSIONS,
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`voyage ${res.status}: ${detail.slice(0, 300)}`);
    }

    const json = (await res.json()) as {
      data?: { index: number; embedding: number[] }[];
    };
    const rows = json.data ?? [];
    if (rows.length !== texts.length) {
      throw new Error(`voyage returned ${rows.length} embeddings for ${texts.length} inputs`);
    }

    // Voyage documents that results come back in order, but sorting by the
    // index it returns costs nothing and removes the assumption.
    return rows.sort((a, b) => a.index - b.index).map((r) => r.embedding);
  }

  return {
    name: "voyage",
    dimensions: EMBEDDING_DIMENSIONS,
    embedDocuments: (texts) => embed(texts, "document"),
    async embedQuery(text) {
      const [vector] = await embed([text], "query");
      return vector;
    },
  };
}
