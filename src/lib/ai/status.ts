// ==================================================================
// Status dokumen di doc_embeddings.
// Dokumen tanpa field status (data lama) dianggap production,
// sehingga pencarian tidak berubah sebelum ada backfill.
// ==================================================================

export type DocStatus = "staging" | "production" | "rejected";

export const HIDDEN_DOC_STATUSES: string[] = ["staging", "rejected"];

