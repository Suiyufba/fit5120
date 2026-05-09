import { randomUUID } from 'node:crypto';

type LogLevel = 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  requestId?: string;
  route?: string;
  statusCode?: number;
  latencyMs?: number;
  timestamp: string;
  [key: string]: unknown;
}

function formatEntry(entry: LogEntry): string {
  const parts: string[] = [
    `[${entry.timestamp}]`,
    entry.level.toUpperCase(),
  ];
  if (entry.requestId) parts.push(`req=${entry.requestId.slice(0, 8)}`);
  if (entry.route) parts.push(entry.route);
  if (entry.statusCode !== undefined) parts.push(String(entry.statusCode));
  if (entry.latencyMs !== undefined) parts.push(`${entry.latencyMs}ms`);

  const meta = { ...entry };
  delete meta.level;
  delete meta.message;
  delete meta.timestamp;
  delete meta.requestId;
  delete meta.route;
  delete meta.statusCode;
  delete meta.latencyMs;

  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  return `${parts.join(' ')} — ${entry.message}${metaStr}`;
}

function log(level: LogLevel, message: string, extra?: Record<string, unknown>): void {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...extra,
  };

  const line = formatEntry(entry);

  switch (level) {
    case 'error':
      console.error(line);
      break;
    case 'warn':
      console.warn(line);
      break;
    default:
      console.log(line);
  }
}

export const logger = {
  info(message: string, extra?: Record<string, unknown>): void {
    log('info', message, extra);
  },
  warn(message: string, extra?: Record<string, unknown>): void {
    log('warn', message, extra);
  },
  error(message: string, extra?: Record<string, unknown>): void {
    log('error', message, extra);
  },
  /**
   * Log an HTTP request with latency.
   */
  request(method: string, path: string, statusCode: number, latencyMs: number): void {
    log('info', `${method} ${path}`, {
      requestId: randomUUID().slice(0, 12),
      route: `${method} ${path}`,
      statusCode,
      latencyMs: Math.round(latencyMs),
    });
  },
};
