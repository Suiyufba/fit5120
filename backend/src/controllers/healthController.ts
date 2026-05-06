// @ts-nocheck
import { config } from '../config/index.js';

export function getHealth(_req, res) {
  res.json({
    ok: true,
    service: 'hiking-hazard-aggregator',
    time: new Date().toISOString(),
    fetchIntervalMs: config.fetchIntervalMs,
  });
}
