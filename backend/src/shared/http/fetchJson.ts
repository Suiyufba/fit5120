import { config } from '../../config/index.js';

export interface FetchOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
}

export interface FetchError extends Error {
  status?: number;
  responseBody?: string;
}

export async function fetchJson<T = unknown>(url: string, options: FetchOptions = {}): Promise<T> {
  if (!url) {
    throw new Error('Missing URL');
  }

  const timeoutMs = options.timeoutMs || config.requestTimeoutMs;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: options.headers || {},
      body: options.body,
      signal: controller.signal,
    });

    if (!response.ok) {
      let details = '';
      try {
        details = await response.text();
      } catch {
        // ignore
      }
      const suffix = details ? `: ${details.slice(0, 500)}` : '';
      const error: FetchError = new Error(`HTTP ${response.status} from ${url}${suffix}`);
      error.status = response.status;
      error.responseBody = details;
      throw error;
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}
