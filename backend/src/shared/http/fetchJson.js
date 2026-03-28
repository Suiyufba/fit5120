import { config } from '../../config/index.js';

export async function fetchJson(url, options = {}) {
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
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} from ${url}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}
