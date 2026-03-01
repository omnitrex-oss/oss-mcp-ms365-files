import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GraphClient } from "../../src/graph/client.js";
import type { AuthManager } from "../../src/auth/msal.js";

function createMockAuth(): AuthManager {
  return {
    getAccessToken: vi.fn().mockResolvedValue("mock-token"),
    init: vi.fn(),
    logout: vi.fn(),
  } as unknown as AuthManager;
}

function mockResponse(status: number, body: unknown, headers?: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

describe("GraphClient", () => {
  const originalFetch = globalThis.fetch;
  let auth: AuthManager;
  let client: GraphClient;

  beforeEach(() => {
    auth = createMockAuth();
    client = new GraphClient(auth, { maxRetries: 2, timeoutMs: 5000 });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("sends GET request with Authorization header", async () => {
    const mockFetch = vi.fn().mockResolvedValue(mockResponse(200, { value: [] }));
    globalThis.fetch = mockFetch;

    await client.get("/me/drive/root/children");

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe("https://graph.microsoft.com/v1.0/me/drive/root/children");
    expect((options.headers as Record<string, string>).Authorization).toBe("Bearer mock-token");
  });

  it("sends POST request with JSON body", async () => {
    const mockFetch = vi.fn().mockResolvedValue(mockResponse(201, { id: "folder-1" }));
    globalThis.fetch = mockFetch;

    await client.post("/me/drive/root/children", { name: "Reports", folder: {} });

    const [, options] = mockFetch.mock.calls[0];
    expect(options.method).toBe("POST");
    expect(options.body).toBe(JSON.stringify({ name: "Reports", folder: {} }));
  });

  it("handles 204 No Content", async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    globalThis.fetch = mockFetch;

    await client.delete("/me/drive/items/item-1");
    // Should not throw
  });

  it("throws GraphError on 404", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      mockResponse(404, { error: { code: "itemNotFound", message: "Item not found" } }),
    );
    globalThis.fetch = mockFetch;

    await expect(client.get("/me/drive/items/bad-id")).rejects.toThrow("Item not found");
  });

  it("retries on 429 with Retry-After", async () => {
    let callCount = 0;
    const mockFetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve(
          new Response(JSON.stringify({ error: { code: "activityLimitReached", message: "Throttled" } }), {
            status: 429,
            headers: { "Content-Type": "application/json", "Retry-After": "1" },
          }),
        );
      }
      return Promise.resolve(mockResponse(200, { value: [] }));
    });
    globalThis.fetch = mockFetch;

    const result = await client.get<{ value: unknown[] }>("/me/drive/root/children");
    expect(result.value).toEqual([]);
    expect(callCount).toBe(2);
  }, 10_000);

  it("downloads raw bytes via getRaw", async () => {
    const buffer = Buffer.from("file content");
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(buffer, {
        status: 200,
        headers: { "Content-Type": "application/pdf" },
      }),
    );
    globalThis.fetch = mockFetch;

    const result = await client.getRaw("/me/drive/items/item-1/content");
    expect(result.contentType).toBe("application/pdf");
    expect(result.buffer.toString()).toBe("file content");
  });
});
