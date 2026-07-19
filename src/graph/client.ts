import { graphBaseUrl } from "../config/env.js";

/** Error thrown when the Graph API returns a non-2xx response. */
export class GraphApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: number,
    readonly type?: string,
    readonly fbtraceId?: string,
  ) {
    super(message);
    this.name = "GraphApiError";
  }
}

interface GraphErrorBody {
  error?: {
    message: string;
    type?: string;
    code?: number;
    fbtrace_id?: string;
  };
}

interface RequestOptions {
  method?: "GET" | "POST" | "DELETE";
  accessToken: string;
  body?: unknown;
  query?: Record<string, string | undefined>;
}

/**
 * Thin wrapper around the Graph API using the global fetch (Node 18+).
 * Centralizes auth header, JSON handling, and error normalization.
 */
export async function graphRequest<T>(path: string, options: RequestOptions): Promise<T> {
  const url = new URL(`${graphBaseUrl}/${path.replace(/^\//, "")}`);
  for (const [k, v] of Object.entries(options.query ?? {})) {
    if (v !== undefined) url.searchParams.set(k, v);
  }

  const res = await fetch(url, {
    method: options.method ?? "GET",
    headers: {
      Authorization: `Bearer ${options.accessToken}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await res.text();
  const data = text ? (JSON.parse(text) as unknown) : {};

  if (!res.ok) {
    const err = (data as GraphErrorBody).error;
    throw new GraphApiError(
      err?.message ?? `Graph API request failed with status ${res.status}`,
      res.status,
      err?.code,
      err?.type,
      err?.fbtrace_id,
    );
  }

  return data as T;
}
