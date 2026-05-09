import { createServer } from 'node:http';
import { createApp } from '../../config/appFactory.js';

/**
 * Sends an HTTP request to the Express app without starting a real server.
 */
export function request(
  method: string,
  path: string,
  options?: { body?: unknown; headers?: Record<string, string> },
): Promise<{ status: number; body: unknown; headers: Record<string, string> }> {
  const app = createApp();
  const server = createServer(app);

  return new Promise((resolve, reject) => {
    server.listen(0, () => {
      const addr = server.address() as { port: number };
      const url = `http://localhost:${addr.port}${path}`;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options?.headers || {}),
      };

      fetch(url, {
        method,
        headers,
        body: options?.body !== undefined ? JSON.stringify(options.body) : undefined,
        redirect: 'manual',
      })
        .then(async (response) => {
          const resHeaders: Record<string, string> = {};
          response.headers.forEach((value, key) => {
            resHeaders[key] = value;
          });

          let body: unknown;
          try {
            body = await response.json();
          } catch {
            body = await response.text();
          }

          server.close();
          resolve({ status: response.status, body, headers: resHeaders });
        })
        .catch((err) => {
          server.close();
          reject(err);
        });
    });
  });
}
