export type EmbeddingProvider = {
  name: string;
  /** Must match knowledge_chunks.embedding, or nothing will ever match. */
  dimensions: number;
  /** Content being stored. Some providers optimise this differently to a query. */
  embedDocuments(texts: string[]): Promise<number[][]>;
  /** A visitor's question. */
  embedQuery(text: string): Promise<number[]>;
};

export const EMBEDDING_DIMENSIONS = 1024;
