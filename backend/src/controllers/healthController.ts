import type { Request, Response } from 'express';
import { config } from '../config/index.js';

export function getHealth(_req: Request, res: Response): void {
  res.json({
    ok: true,
    service: 'hiking-hazard-aggregator',
    time: new Date().toISOString(),
    fetchIntervalMs: config.fetchIntervalMs,
  });
}
