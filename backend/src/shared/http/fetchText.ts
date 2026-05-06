import { config } from '../../config/index.js';

export async function fetchText(url: string, options: { headers?: Record<string, string>; timeoutMs?: number } = {}): Promise<string> {
  if (!url) {
    throw new Error('Missing URL');
  }

  const timeoutMs = options.timeoutMs || config.requestTimeoutMs;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: options.headers || {},
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} from ${url}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}
