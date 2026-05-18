import type { TpConfig } from "../config.js";

export class TpError extends Error {
  constructor(message: string, public readonly status: number, public readonly url: string, public readonly body?: string) {
    super(message);
    this.name = "TpError";
  }
}

export interface TpQueryParams {
  where?: string;
  include?: string[];
  take?: number;
  skip?: number;
  orderBy?: string;
  orderByDesc?: string;
  [extra: string]: string | string[] | number | boolean | undefined;
}

export class TpClient {
  constructor(private readonly cfg: TpConfig) {}

  private buildUrl(path: string, params?: TpQueryParams): string {
    const url = new URL(`${this.cfg.baseUrl}/api/v1/${path.replace(/^\/+/, "")}`);
    url.searchParams.set("format", "json");
    url.searchParams.set("access_token", this.cfg.token);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value === undefined) continue;
        if (Array.isArray(value)) {
          url.searchParams.set(key, `[${value.join(",")}]`);
        } else {
          url.searchParams.set(key, String(value));
        }
      }
    }
    return url.toString();
  }

  async get<T = unknown>(path: string, params?: TpQueryParams): Promise<T> {
    const url = this.buildUrl(path, params);
    return this.requestJson<T>("GET", url);
  }

  async post<T = unknown>(path: string, body: unknown): Promise<T> {
    const url = this.buildUrl(path);
    return this.requestJson<T>("POST", url, body);
  }

  async put<T = unknown>(path: string, body: unknown): Promise<T> {
    const url = this.buildUrl(path);
    return this.requestJson<T>("POST", url, body);
  }

  async delete<T = unknown>(path: string): Promise<T> {
    const url = this.buildUrl(path);
    return this.requestJson<T>("DELETE", url);
  }

  async fetchBinary(absoluteOrRelativeUrl: string): Promise<{ data: Buffer; mimeType: string; size: number }> {
    const url = this.normalizeBinaryUrl(absoluteOrRelativeUrl);
    const res = await this.fetchWithRetry(url, { method: "GET" });
    if (!res.ok) {
      const body = await safeText(res);
      throw new TpError(`Binary fetch failed: ${res.status} ${res.statusText}`, res.status, url, body);
    }
    const mimeType = res.headers.get("content-type")?.split(";")[0]?.trim() ?? "application/octet-stream";
    const buf = Buffer.from(await res.arrayBuffer());
    return { data: buf, mimeType, size: buf.length };
  }

  private normalizeBinaryUrl(input: string): string {
    let url: URL;
    if (/^https?:\/\//i.test(input)) {
      url = new URL(input);
    } else {
      url = new URL(input.replace(/^\/+/, ""), `${this.cfg.baseUrl}/`);
    }
    if (!url.searchParams.has("access_token")) {
      url.searchParams.set("access_token", this.cfg.token);
    }
    return url.toString();
  }

  private async requestJson<T>(method: string, url: string, body?: unknown): Promise<T> {
    const init: RequestInit = {
      method,
      headers: {
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    };
    const res = await this.fetchWithRetry(url, init);
    const text = await safeText(res);
    if (!res.ok) {
      throw new TpError(`TP ${method} ${res.status}: ${res.statusText}`, res.status, url, text);
    }
    if (!text) return undefined as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new TpError(`TP returned non-JSON response`, res.status, url, text.slice(0, 500));
    }
  }

  private async fetchWithRetry(url: string, init: RequestInit, attempts = 3): Promise<Response> {
    let lastErr: unknown;
    for (let i = 0; i < attempts; i++) {
      try {
        const res = await fetch(url, init);
        if (res.status === 429 || (res.status >= 500 && res.status < 600)) {
          if (i < attempts - 1) {
            await sleep(250 * 2 ** i);
            continue;
          }
        }
        return res;
      } catch (err) {
        lastErr = err;
        if (i < attempts - 1) {
          await sleep(250 * 2 ** i);
          continue;
        }
      }
    }
    throw lastErr ?? new Error("Unknown fetch failure");
  }
}

async function safeText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "";
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
