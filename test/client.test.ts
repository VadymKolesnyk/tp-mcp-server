import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { TpClient, TpError } from "../src/tp/client.js";

const cfg = { token: "TOK", baseUrl: "https://tp.example.com" };

describe("TpClient", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("builds JSON URL with access_token and format", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ Items: [] }), { status: 200, headers: { "content-type": "application/json" } })
    );
    const client = new TpClient(cfg);
    await client.get("UserStories", { where: "Id eq 1", include: ["Id", "Name"], take: 5 });
    const url = new URL(fetchMock.mock.calls[0][0] as string);
    expect(url.origin + url.pathname).toBe("https://tp.example.com/api/v1/UserStories");
    expect(url.searchParams.get("format")).toBe("json");
    expect(url.searchParams.get("access_token")).toBe("TOK");
    expect(url.searchParams.get("where")).toBe("Id eq 1");
    expect(url.searchParams.get("include")).toBe("[Id,Name]");
    expect(url.searchParams.get("take")).toBe("5");
  });

  it("throws TpError with body on non-2xx", async () => {
    fetchMock.mockResolvedValueOnce(new Response("bad request body", { status: 400 }));
    const client = new TpClient(cfg);
    await expect(client.get("UserStories")).rejects.toBeInstanceOf(TpError);
  });

  it("retries on 500 and succeeds", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response("oops", { status: 500 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "content-type": "application/json" } })
      );
    const client = new TpClient(cfg);
    const out = await client.get<{ ok: boolean }>("Anything");
    expect(out.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("fetchBinary returns buffer + mimeType", async () => {
    const bin = new Uint8Array([1, 2, 3, 4]);
    fetchMock.mockResolvedValueOnce(
      new Response(bin, { status: 200, headers: { "content-type": "image/png" } })
    );
    const client = new TpClient(cfg);
    const out = await client.fetchBinary("/Attachment.aspx?AttachmentID=10");
    expect(out.mimeType).toBe("image/png");
    expect(out.size).toBe(4);
    expect(Array.from(out.data)).toEqual([1, 2, 3, 4]);
    const url = new URL(fetchMock.mock.calls[0][0] as string);
    expect(url.searchParams.get("access_token")).toBe("TOK");
  });
});
