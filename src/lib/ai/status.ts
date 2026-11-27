// ==================================================================
// Status dokumen di doc_embeddings.
// Dokumen tanpa field status (data lama) dianggap production,
// sehingga pencarian tidak berubah sebelum ada backfill.
// ==================================================================

export type DocStatus = "staging" | "production" | "rejected";

export const HIDDEN_DOC_STATUSES: string[] = ["staging", "rejected"];

/** True jika dokumen boleh dipakai dalam pencarian chatbot. */
export function isServableDoc(status: unknown): boolean {
  if (status === undefined || status === null) return true;
  return !HIDDEN_DOC_STATUSES.includes(String(status));
}
