// ==================================================================
// Konfigurasi provider AI terpusat.
// Baseline dan Two-Stage memakai modul ini; hanya nilai env yang berbeda.
// ==================================================================

export type EmbeddingProvider = "ollama" | "openrouter";

export type AIConfig = {
  embeddingProvider: EmbeddingProvider;
  embeddingModel: string;
  rerankerModel: string;
  rerankerEnabled: boolean;
  candidateTopN: number;
  finalTopK: number;
  openrouterBaseUrl: string;
  openrouterApiKey: string | undefined;
  ollamaBaseUrl: string;
  timeoutMs: number;
};

function readInt(value: string | undefined, fallback: number): number {
  const parsed = parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function loadAIConfig(env: NodeJS.ProcessEnv = process.env): AIConfig {
  // Default ollama: vektor di doc_embeddings masih dari mxbai. Pindah ke openrouter
  // hanya lewat env eksplisit setelah embedding ulang.
  const provider = (env.EMBEDDING_PROVIDER || "ollama").toLowerCase();
  if (provider !== "ollama" && provider !== "openrouter") {
    throw new Error(`EMBEDDING_PROVIDER tidak dikenal: ${provider}`);
  }

  const config: AIConfig = {
    embeddingProvider: provider,
    embeddingModel:
      env.EMBEDDING_MODEL ||
      (provider === "openrouter"
        ? "voyageai/voyage-4-lite"
        : env.OLLAMA_EMBED_MODEL || "mxbai-embed-large:latest"),
    rerankerModel: env.RERANKER_MODEL || "voyageai/rerank-3-lite",
    // Mati secara default sampai endpoint rerank OpenRouter diverifikasi.
    rerankerEnabled: env.RERANKER_ENABLED === "true",
    candidateTopN: readInt(env.CANDIDATE_TOP_N, 20),
    finalTopK: readInt(env.FINAL_TOP_K, 5),
    openrouterBaseUrl: env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
    openrouterApiKey: env.OPENROUTER_API_KEY,
    ollamaBaseUrl: env.OLLAMA_BASE_URL || "http://127.0.0.1:11434",
    timeoutMs: readInt(env.AI_TIMEOUT_MS, 30000),
  };

  if (config.finalTopK > config.candidateTopN) {
    throw new Error("FINAL_TOP_K harus lebih kecil atau sama dengan CANDIDATE_TOP_N");
  }
  return config;
}
