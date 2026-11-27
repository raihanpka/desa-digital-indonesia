// ==================================================================
// Pemicu workflow doc-pipeline lewat GitHub repository_dispatch.
// Payload hanya berisi version. Teks dokumen dimuat worker dari MongoDB.
// Token disimpan di server (GITHUB_DISPATCH_TOKEN), tidak pernah di klien.
// ==================================================================

export const DOC_PIPELINE_EVENT = "document-uploaded";

export type DispatchResult = { ok: boolean; status: number };

export async function dispatchDocPipeline(
  version: string,
  env: NodeJS.ProcessEnv = process.env,
  fetchImpl: typeof fetch = fetch
): Promise<DispatchResult> {
  const token = env.GITHUB_DISPATCH_TOKEN;
  const repo = env.GITHUB_REPO; // format: owner/repo
  if (!token || !repo) {
    throw new Error("GITHUB_DISPATCH_TOKEN dan GITHUB_REPO harus diset");
  }

  const response = await fetchImpl(
    `https://api.github.com/repos/${repo}/dispatches`,
    {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        event_type: DOC_PIPELINE_EVENT,
        client_payload: { version },
      }),
      // Batas waktu supaya respons unggahan tidak menggantung.
      signal: AbortSignal.timeout(5000),
    }
  );
  return { ok: response.status === 204, status: response.status };
}
