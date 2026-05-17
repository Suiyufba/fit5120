import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';
import {
  buildRouteIntroductionFallback,
  normalizeRouteIntroInput,
  validateRouteIntroInput,
} from '../../ai-service/src/routeIntroService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const defaultOutputDir = path.join(__dirname, 'data');

function parseArgs(argv) {
  const args = {
    input: '',
    output: defaultOutputDir,
    limit: 1000,
    split: 0.9,
    seed: 42,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === '--input' && next) {
      args.input = next;
      i += 1;
    } else if (arg === '--output' && next) {
      args.output = path.resolve(repoRoot, next);
      i += 1;
    } else if (arg === '--limit' && next) {
      args.limit = Math.max(1, Number.parseInt(next, 10) || args.limit);
      i += 1;
    } else if (arg === '--split' && next) {
      const value = Number.parseFloat(next);
      args.split = Number.isFinite(value) && value > 0 && value < 1 ? value : args.split;
      i += 1;
    } else if (arg === '--seed' && next) {
      args.seed = Number.parseInt(next, 10) || args.seed;
      i += 1;
    }
  }

  return args;
}

function mulberry32(seed) {
  let value = seed >>> 0;
  return function next() {
    value |= 0;
    value = (value + 0x6D2B79F5) | 0;
    let t = Math.imul(value ^ (value >>> 15), 1 | value);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(items, seed) {
  const random = mulberry32(seed);
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildSystemPrompt() {
  return 'Write one short user-friendly hiking route introduction from structured route data. Use only the facts provided.';
}

function routePromptPayload(route) {
  const normalized = normalizeRouteIntroInput(route);
  return {
    distanceKm: Number(normalized.distanceKm.toFixed(1)),
    durationMin: Math.round(normalized.durationMin),
    difficulty: normalized.difficulty,
    riskLevel: normalized.riskLevel,
    goNoGo: normalized.goNoGo,
    geographyProfile: normalized.geographyProfile,
    zoneSummary: normalized.zoneSummary,
    keyRisks: normalized.keyRisks.slice(0, 3).map((risk) => ({
      title: risk?.title || '',
      type: risk?.type || '',
      severity: risk?.severity || '',
      distanceKm: Number(Number(risk?.distanceKm || 0).toFixed(2)),
      advice: risk?.advice || '',
    })),
  };
}

function safeJsonParse(value, fallback) {
  if (value && typeof value === 'object') return value;
  if (typeof value !== 'string') return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function buildExamplesFromHistoryRow(row) {
  const historyId = row?.id ?? null;
  const createdAt = row?.created_at || row?.createdAt || '';
  const planPayload = safeJsonParse(row?.plan_payload ?? row?.planPayload, {});
  const recommendedRoute = planPayload?.recommendedRoute || null;
  const routeOptions = Array.isArray(planPayload?.routeOptions) ? planPayload.routeOptions : [];
  const alternatives = Array.isArray(planPayload?.alternatives) ? planPayload.alternatives : [];
  const candidates = [recommendedRoute, ...routeOptions, ...alternatives].filter(Boolean);

  const deduped = [];
  const seen = new Set();
  candidates.forEach((route) => {
    const routeId = String(route?.id || '').trim();
    const key = routeId || JSON.stringify([
      Number(route?.distanceKm || 0).toFixed(1),
      Math.round(Number(route?.durationMin || 0)),
      route?.difficulty || '',
      route?.riskLevel || '',
      route?.goNoGo || '',
    ]);
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(route);
    }
  });

  return deduped.flatMap((route, index) => {
    const normalized = normalizeRouteIntroInput(route);
    const validationError = validateRouteIntroInput(normalized);
    if (validationError) return [];

    const assistant = String(route?.intro || '').trim() || buildRouteIntroductionFallback(normalized);
    const promptPayload = routePromptPayload(normalized);

    return [{
      messages: [
        { role: 'system', content: buildSystemPrompt() },
        { role: 'user', content: JSON.stringify(promptPayload) },
        { role: 'assistant', content: assistant },
      ],
      metadata: {
        historyId,
        createdAt,
        routeId: String(route?.id || `history-${historyId || 'na'}-route-${index + 1}`),
        targetSource: String(route?.introSource || (String(route?.intro || '').trim() ? 'existing-intro' : 'fallback')),
        difficulty: normalized.difficulty,
        riskLevel: normalized.riskLevel,
        goNoGo: normalized.goNoGo,
      },
    }];
  });
}

async function loadHistoryFromJson(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  const parsed = JSON.parse(raw);
  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed?.history)) return parsed.history;
  if (Array.isArray(parsed?.rows)) return parsed.rows;
  return [];
}

async function loadHistoryFromDatabase(limit) {
  const databaseUrl = String(process.env.DATABASE_URL || '').trim();
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required when --input is not provided');
  }

  const databaseSsl = String(process.env.DATABASE_SSL || 'true').toLowerCase() !== 'false';
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: databaseSsl ? { rejectUnauthorized: false } : false,
    max: 2,
    idleTimeoutMillis: 10000,
  });

  try {
    const result = await pool.query(
      `
        SELECT id, user_id, session_id, start_point, end_point, plan_payload, created_at
        FROM route_plan_history
        ORDER BY created_at DESC
        LIMIT $1
      `,
      [limit],
    );
    return result.rows || [];
  } finally {
    await pool.end().catch(() => {});
  }
}

async function writeJsonl(filePath, records) {
  const text = records.map((item) => JSON.stringify(item)).join('\n');
  await fs.writeFile(filePath, text ? `${text}\n` : '', 'utf8');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const historyRows = args.input
    ? await loadHistoryFromJson(path.resolve(repoRoot, args.input))
    : await loadHistoryFromDatabase(args.limit);

  const examples = historyRows.flatMap(buildExamplesFromHistoryRow);
  const shuffled = shuffle(examples, args.seed);
  const splitIndex = Math.max(1, Math.floor(shuffled.length * args.split));
  const train = shuffled.slice(0, splitIndex);
  const evalSet = shuffled.slice(splitIndex);

  await fs.mkdir(args.output, { recursive: true });
  const trainPath = path.join(args.output, 'route_intro_train.jsonl');
  const evalPath = path.join(args.output, 'route_intro_eval.jsonl');
  const manifestPath = path.join(args.output, 'route_intro_manifest.json');

  await writeJsonl(trainPath, train);
  await writeJsonl(evalPath, evalSet);
  await fs.writeFile(
    manifestPath,
    JSON.stringify({
      generatedAt: new Date().toISOString(),
      input: args.input || 'postgres:route_plan_history',
      outputDir: args.output,
      rowsRead: historyRows.length,
      examplesWritten: shuffled.length,
      trainExamples: train.length,
      evalExamples: evalSet.length,
      split: args.split,
      seed: args.seed,
    }, null, 2),
    'utf8',
  );

  console.log(`Wrote ${train.length} train example(s) to ${trainPath}`);
  console.log(`Wrote ${evalSet.length} eval example(s) to ${evalPath}`);
  console.log(`Wrote manifest to ${manifestPath}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
