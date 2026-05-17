import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

const DEFAULT_API_BASE = 'http://127.0.0.1:8080/api';
const DEFAULT_OUTPUT = path.join(__dirname, 'data', 'bootstrap', 'route_history_bootstrap.json');

const ROUTE_SEEDS = [
  {
    id: 'melbourne-geelong',
    start: { lat: -37.8136, lng: 144.9631 },
    end: { lat: -38.1499, lng: 144.3617 },
  },
  {
    id: 'geelong-lorne',
    start: { lat: -38.1499, lng: 144.3617 },
    end: { lat: -38.5427, lng: 143.9767 },
  },
  {
    id: 'ballarat-daylesford',
    start: { lat: -37.5622, lng: 143.8503 },
    end: { lat: -37.3417, lng: 144.1420 },
  },
  {
    id: 'bendigo-castlemaine',
    start: { lat: -36.7570, lng: 144.2794 },
    end: { lat: -37.0671, lng: 144.2168 },
  },
  {
    id: 'warnambool-port-fairy',
    start: { lat: -38.3818, lng: 142.4871 },
    end: { lat: -38.3854, lng: 142.2378 },
  },
  {
    id: 'healesville-warburton',
    start: { lat: -37.6534, lng: 145.5179 },
    end: { lat: -37.7530, lng: 145.6900 },
  },
  {
    id: 'traralgon-sale',
    start: { lat: -38.1953, lng: 146.5415 },
    end: { lat: -38.1090, lng: 147.0660 },
  },
  {
    id: 'bright-myrtleford',
    start: { lat: -36.7296, lng: 146.9605 },
    end: { lat: -36.5618, lng: 146.7234 },
  },
  {
    id: 'halls-gap-stawell',
    start: { lat: -37.1360, lng: 142.5190 },
    end: { lat: -37.0560, lng: 142.7800 },
  },
  {
    id: 'apollo-bay-colac',
    start: { lat: -38.7548, lng: 143.6686 },
    end: { lat: -38.3398, lng: 143.5849 },
  },
];

function parseArgs(argv) {
  const args = {
    apiBase: DEFAULT_API_BASE,
    output: DEFAULT_OUTPUT,
    limit: ROUTE_SEEDS.length,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === '--api-base' && next) {
      args.apiBase = next;
      i += 1;
    } else if (arg === '--output' && next) {
      args.output = path.resolve(repoRoot, next);
      i += 1;
    } else if (arg === '--limit' && next) {
      args.limit = Math.max(1, Number.parseInt(next, 10) || args.limit);
      i += 1;
    }
  }

  return args;
}

async function fetchPlan(apiBase, seed, index) {
  const response = await fetch(`${String(apiBase).replace(/\/$/, '')}/routes/plan`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-Plan-Session-Id': `bootstrap-${seed.id}-${index + 1}`,
    },
    body: JSON.stringify({
      start: seed.start,
      end: seed.end,
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`${seed.id}: ${payload?.error || `HTTP ${response.status}`}`);
  }

  return payload;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const selected = ROUTE_SEEDS.slice(0, args.limit);
  const rows = [];
  const failures = [];

  for (let index = 0; index < selected.length; index += 1) {
    const seed = selected[index];
    try {
      const planPayload = await fetchPlan(args.apiBase, seed, index);
      rows.push({
        id: index + 1,
        createdAt: new Date().toISOString(),
        start: seed.start,
        end: seed.end,
        planPayload,
      });
      console.log(`Fetched route plan for ${seed.id}`);
    } catch (error) {
      failures.push({ seed: seed.id, error: error.message || String(error) });
      console.warn(`Failed to fetch ${seed.id}: ${error.message || error}`);
    }
  }

  await fs.mkdir(path.dirname(args.output), { recursive: true });
  await fs.writeFile(
    args.output,
    JSON.stringify({
      generatedAt: new Date().toISOString(),
      apiBase: args.apiBase,
      rows,
      failures,
    }, null, 2),
    'utf8',
  );

  console.log(`Wrote ${rows.length} bootstrap route history row(s) to ${args.output}`);
  if (failures.length) {
    console.log(`Recorded ${failures.length} failure(s) in the same file`);
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
