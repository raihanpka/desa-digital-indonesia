/**
 * @jest-environment node
 */
import { dispatchDocPipeline, DOC_PIPELINE_EVENT } from "./dispatch";

const env = { GITHUB_DISPATCH_TOKEN: "tok", GITHUB_REPO: "owner/repo" } as any;

describe("dispatchDocPipeline", () => {
  it("mengirim event_type dan hanya version di client_payload", async () => {
    const fetchMock = jest.fn().mockResolvedValue({ status: 204 });
    const r = await dispatchDocPipeline("v-123", env, fetchMock as any);
    expect(r).toEqual({ ok: true, status: 204 });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.github.com/repos/owner/repo/dispatches");
    expect(init.headers.Authorization).toBe("Bearer tok");
    expect(JSON.parse(init.body)).toEqual({
      event_type: DOC_PIPELINE_EVENT,
      client_payload: { version: "v-123" },
    });
  });

  it("mengembalikan ok false jika GitHub menolak", async () => {
    const fetchMock = jest.fn().mockResolvedValue({ status: 404 });
    const r = await dispatchDocPipeline("v", env, fetchMock as any);
    expect(r.ok).toBe(false);
    expect(r.status).toBe(404);
  });

  it("melempar error jika token atau repo belum diset", async () => {
    await expect(dispatchDocPipeline("v", {} as any)).rejects.toThrow(
      "GITHUB_DISPATCH_TOKEN"
    );
  });
});
