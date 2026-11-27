// ==================================================================
// Klien OpenRouter untuk embedding dan reranking.
// Usage (prompt_tokens, total_tokens, cost) dikembalikan agar bisa dicatat.
// ==================================================================

import { AIConfig } from "./config";

export type Usage = {
  promptTokens?: number;
  totalTokens?: number;
  cost?: number;
};

export type EmbeddingResult = { vector: number[]; usage: Usage };

export type RerankItem = { index: number; score: number };
export type RerankResult = { results: RerankItem[]; usage: Usage };

function requireKey(config: AIConfig): string {
  if (!config.openrouterApiKey) {
    throw new Error("OPENROUTER_API_KEY belum diset");
  }
  return config.openrouterApiKey;
}

async function postJson(url: string, key: string, body: unknown, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`OpenRouter HTTP ${response.status}: ${detail.slice(0, 200)}`);
    }
    return response.json();
  } finally {
    clearTimeout(timer);
  }
}

function toUsage(raw: any): Usage {
  return {
    promptTokens: raw?.prompt_tokens,
    totalTokens: raw?.total_tokens,
    cost: raw?.cost,
  };
}

export async function embedWithOpenRouter(
  text: string,
  config: AIConfig
): Promise<EmbeddingResult> {
  const key = requireKey(config);
  const data = await postJson(
    `${config.openrouterBaseUrl}/embeddings`,
    key,
    { model: config.embeddingModel, input: text },
    config.timeoutMs
  );
  const vector: number[] | undefined = data?.data?.[0]?.embedding;
  if (!vector || vector.length === 0) {
    throw new Error("Embedding kosong dari OpenRouter");
  }
  return { vector, usage: toUsage(data?.usage) };
}

// Endpoint rerank OpenRouter mengikuti format Cohere-compatible:
// { model, query, documents, top_n } -> { results: [{ index, relevance_score }] }.
// Format ini belum diverifikasi dengan panggilan nyata; uji dulu sebelum dipakai.
export async function rerankWithOpenRouter(
  query: string,
  documents: string[],
  topN: number,
  config: AIConfig
): Promise<RerankResult> {
  const key = requireKey(config);
  const data = await postJson(
    `${config.openrouterBaseUrl}/rerank`,
    key,
    { model: config.rerankerModel, query, documents, top_n: topN },
    config.timeoutMs
  );
  const raw: any[] = Array.isArray(data?.results) ? data.results : [];
  // Buang item yang index-nya bukan integer atau skornya bukan angka hingga.
  const results: RerankItem[] = raw
    .map((r) => ({ index: r?.index, score: r?.relevance_score ?? r?.score }))
    .filter(
      (r) => Number.isInteger(r.index) && Number.isFinite(r.score)
    ) as RerankItem[];
  return { results, usage: toUsage(data?.usage) };
}
