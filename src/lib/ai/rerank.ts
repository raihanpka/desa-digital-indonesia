// ==================================================================
// Tahap kedua Two-Stage: urutkan ulang kandidat dan ambil K teratas.
// Fungsi murni supaya bisa diuji tanpa jaringan.
// ==================================================================

import { RerankItem } from "./openrouter";

/**
 * Terapkan hasil reranker ke kandidat ANN.
 * Index di hasil reranker merujuk ke posisi kandidat asli.
 * Jika reranker dinonaktifkan, urutan ANN dipertahankan.
 */
export function selectTopK<T>(
  candidates: T[],
  rerankResults: RerankItem[] | null,
  k: number
): T[] {
  // Tanpa hasil rerank yang valid, pakai urutan ANN; jangan kembalikan kosong.
  if (rerankResults === null || rerankResults.length === 0) {
    return candidates.slice(0, k);
  }
  const seen = new Set<number>();
  const ordered: T[] = [];
  const sorted = [...rerankResults].sort((a, b) => b.score - a.score);
  for (const r of sorted) {
    if (!Number.isInteger(r.index) || r.index < 0 || r.index >= candidates.length) continue;
    if (seen.has(r.index)) continue;
    seen.add(r.index);
    ordered.push(candidates[r.index]);
    if (ordered.length === k) break;
  }
  return ordered.length > 0 ? ordered : candidates.slice(0, k);
}
