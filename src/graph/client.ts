import type { AuthManager } from "../auth/msal.js";
import { GraphError, parseGraphError } from "./error.js";
import { paginate, type PaginatedResult } from "./pagination.js";

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

export interface GraphClientOptions {
  timeoutMs?: number;
  maxRetries?: number;
}

interface RequestOptions {
  method: string;
  path: string;
  body?: unknown;
  headers?: Record<string, string>;
  raw?: boolean;
}

/**
 * Lightweight Microsoft Graph API HTTP client.
 * Handles auth header injection, 429 retry, 401 refresh, and error parsing.
 */
export class GraphClient {
  private auth: AuthManager;
  private timeoutMs: number;
  private maxRetries: number;

  constructor(auth: AuthManager, options: GraphClientOptions = {}) {
    this.auth = auth;
    this.timeoutMs = options.timeoutMs ?? 30_000;
    this.maxRetries = options.maxRetries ?? 3;
  }

  async get<T = unknown>(path: string): Promise<T> {
    return this.request<T>({ method: "GET", path });
  }

  async post<T = unknown>(path: string, body?: unknown): Promise<T> {
    return this.request<T>({ method: "POST", path, body });
  }

  async patch<T = unknown>(path: string, body: unknown): Promise<T> {
    return this.request<T>({ method: "PATCH", path, body });
  }

  async delete(path: string): Promise<void> {
    await this.request<void>({ method: "DELETE", path });
  }

  async putBytes(
    url: string,
    data: Buffer,
    contentRange: string,
    contentType: string,
  ): Promise<unknown> {
    const token = await this.auth.getAccessToken();
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": contentType,
        "Content-Range": contentRange,
        "Content-Length": data.byteLength.toString(),
      },
      body: data,
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw parseGraphError(response.status, body);
    }

    if (
      response.headers.get("content-length") === "0" ||
      response.status === 204
    ) {
      return undefined;
    }
    return response.json();
  }

  /**
   * GET raw response (for file downloads).
   */
  async getRaw(path: string): Promise<{ buffer: Buffer; contentType: string }> {
    const token = await this.auth.getAccessToken();
    const url = path.startsWith("http") ? path : `${GRAPH_BASE}${path}`;

    const response = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(60_000), // Longer timeout for downloads
      redirect: "follow",
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw parseGraphError(response.status, body);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get("content-type") ?? "application/octet-stream";
    return { buffer, contentType };
  }

  async getPaginated<T>(
    path: string,
    maxPages?: number,
  ): Promise<PaginatedResult<T>> {
    const url = path.startsWith("http") ? path : `${GRAPH_BASE}${path}`;
    return paginate<T>(
      async (pageUrl) => {
        const fullUrl = pageUrl.startsWith("http")
          ? pageUrl
          : `${GRAPH_BASE}${pageUrl}`;
        return this.request({
          method: "GET",
          path: fullUrl,
        });
      },
      url,
      maxPages,
    );
  }

  private async request<T>(options: RequestOptions): Promise<T> {
    let lastError: Error | null = null;
    let retries = 0;

    while (retries <= this.maxRetries) {
      try {
        const token = await this.auth.getAccessToken();
        const url = options.path.startsWith("http")
          ? options.path
          : `${GRAPH_BASE}${options.path}`;

        const headers: Record<string, string> = {
          Authorization: `Bearer ${token}`,
          ...options.headers,
        };

        if (options.body) {
          headers["Content-Type"] = "application/json";
        }

        const response = await fetch(url, {
          method: options.method,
          headers,
          body: options.body ? JSON.stringify(options.body) : undefined,
          signal: AbortSignal.timeout(this.timeoutMs),
        });

        if (response.status === 204 || response.status === 202) {
          return undefined as T;
        }

        if (response.ok) {
          if (options.raw) return undefined as T;
          return (await response.json()) as T;
        }

        const body = await response.json().catch(() => null);
        const error = parseGraphError(response.status, body);

        if (error.isThrottled && retries < this.maxRetries) {
          const retryAfter = parseInt(
            response.headers.get("Retry-After") ?? "5",
            10,
          );
          await sleep(retryAfter * 1000);
          retries++;
          lastError = error;
          continue;
        }

        if (error.isUnauthorized && retries === 0) {
          retries++;
          lastError = error;
          continue;
        }

        throw error;
      } catch (error) {
        if (error instanceof GraphError) throw error;
        lastError = error as Error;
        retries++;
      }
    }

    throw lastError ?? new Error("Request failed after retries");
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
