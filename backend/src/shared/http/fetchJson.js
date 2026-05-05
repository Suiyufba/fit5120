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
      let details = '';
      if (typeof response.text === 'function') {
        details = await response.text().catch(() => '');
      } else if (typeof response.json === 'function') {
        const payload = await response.json().catch(() => null);
        details = payload ? JSON.stringify(payload) : '';
      }
      const suffix = details ? `: ${details.slice(0, 500)}` : '';
      /** @type {Error & { status?: number, responseBody?: string }} */
      const error = new Error(`HTTP ${response.status} from ${url}${suffix}`);
      error.status = response.status;
      error.responseBody = details;
      throw error;
    }

    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}
