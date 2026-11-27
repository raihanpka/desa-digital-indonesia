/**
 * @jest-environment node
 */
import { loadAIConfig } from "./config";
import { selectTopK } from "./rerank";
import { embedWithOpenRouter, rerankWithOpenRouter } from "./openrouter";

describe("loadAIConfig", () => {
  it("memakai Ollama dan mxbai secara default, reranker mati", () => {
    const c = loadAIConfig({} as any);
    expect(c.embeddingProvider).toBe("ollama");
    expect(c.embeddingModel).toBe("mxbai-embed-large:latest");
    expect(c.rerankerEnabled).toBe(false);
    expect(c.candidateTopN).toBe(20);
    expect(c.finalTopK).toBe(5);
  });

  it("memakai OpenRouter dan voyage-4-lite hanya jika diminta eksplisit", () => {
    const c = loadAIConfig({ EMBEDDING_PROVIDER: "openrouter", RERANKER_ENABLED: "true" } as any);
    expect(c.embeddingProvider).toBe("openrouter");
    expect(c.embeddingModel).toBe("voyageai/voyage-4-lite");
    expect(c.rerankerModel).toBe("voyageai/rerank-3-lite");
    expect(c.rerankerEnabled).toBe(true);
  });

  it("menolak provider yang tidak dikenal", () => {
    expect(() => loadAIConfig({ EMBEDDING_PROVIDER: "foo" } as any)).toThrow(
      "EMBEDDING_PROVIDER tidak dikenal"
    );
  });

  it("menolak FINAL_TOP_K lebih besar dari CANDIDATE_TOP_N", () => {
    expect(() =>
      loadAIConfig({ CANDIDATE_TOP_N: "3", FINAL_TOP_K: "5" } as any)
    ).toThrow("FINAL_TOP_K");
  });
});

describe("selectTopK", () => {
  const cands = ["a", "b", "c", "d"];

  it("tanpa reranker mengambil K teratas dari urutan ANN", () => {
    expect(selectTopK(cands, null, 2)).toEqual(["a", "b"]);
  });

  it("mengurutkan ulang berdasarkan skor reranker", () => {
    const rr = [
      { index: 2, score: 0.9 },
      { index: 0, score: 0.1 },
      { index: 3, score: 0.5 },
    ];
    expect(selectTopK(cands, rr, 2)).toEqual(["c", "d"]);
  });

  it("kembali ke urutan ANN jika hasil rerank kosong", () => {
    expect(selectTopK(cands, [], 2)).toEqual(["a", "b"]);
  });

  it("mengabaikan index non-integer", () => {
    const rr = [
      { index: undefined as any, score: 1 },
      { index: 1.5, score: 0.9 },
      { index: 2, score: 0.5 },
    ];
    expect(selectTopK(cands, rr, 3)).toEqual(["c"]);
  });

  it("mengabaikan index di luar jangkauan dan duplikat", () => {
    const rr = [
      { index: 9, score: 1 },
      { index: 1, score: 0.8 },
      { index: 1, score: 0.7 },
    ];
    expect(selectTopK(cands, rr, 3)).toEqual(["b"]);
  });
});

describe("OpenRouter client", () => {
  const config = loadAIConfig({ OPENROUTER_API_KEY: "test-key", EMBEDDING_PROVIDER: "openrouter" } as any);
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("embedding mengirim model dan input, lalu mengembalikan vektor dan usage", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ embedding: [0.1, 0.2] }],
        usage: { prompt_tokens: 3, total_tokens: 3, cost: 0.00000006 },
      }),
    });
    global.fetch = fetchMock as any;
    const r = await embedWithOpenRouter("halo", config);
    expect(r.vector).toEqual([0.1, 0.2]);
    expect(r.usage.totalTokens).toBe(3);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://openrouter.ai/api/v1/embeddings");
    expect(JSON.parse(init.body)).toEqual({
      model: "voyageai/voyage-4-lite",
      input: "halo",
    });
    expect(init.headers.Authorization).toBe("Bearer test-key");
  });

  it("rerank memetakan relevance_score ke score", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [{ index: 1, relevance_score: 0.9 }],
      }),
    }) as any;
    const r = await rerankWithOpenRouter("q", ["x", "y"], 1, config);
    expect(r.results).toEqual([{ index: 1, score: 0.9 }]);
  });

  it("membuang item rerank dengan index atau skor tidak valid", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          { index: "x", relevance_score: 0.9 },
          { index: 0, relevance_score: NaN },
          { index: 1, relevance_score: 0.4 },
        ],
      }),
    }) as any;
    const r = await rerankWithOpenRouter("q", ["x", "y"], 2, config);
    expect(r.results).toEqual([{ index: 1, score: 0.4 }]);
  });

  it("melempar error jika kunci API tidak ada", async () => {
    const noKey = loadAIConfig({} as any);
    await expect(embedWithOpenRouter("halo", noKey)).rejects.toThrow(
      "OPENROUTER_API_KEY"
    );
  });
});
