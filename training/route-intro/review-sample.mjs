import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const defaultDataDir = path.join(__dirname, 'data');

function parseArgs(argv) {
  const args = {
    input: path.join(defaultDataDir, 'route_intro_train.jsonl'),
    output: path.join(__dirname, 'review', 'route_intro_review_batch.json'),
    count: 50,
    seed: 42,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === '--input' && next) {
      args.input = path.resolve(repoRoot, next);
      i += 1;
    } else if (arg === '--output' && next) {
      args.output = path.resolve(repoRoot, next);
      i += 1;
    } else if (arg === '--count' && next) {
      args.count = Math.max(1, Number.parseInt(next, 10) || args.count);
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

async function readJsonl(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function extractAssistant(record) {
  const messages = Array.isArray(record?.messages) ? record.messages : [];
  return messages.find((message) => message?.role === 'assistant')?.content || '';
}

function extractUser(record) {
  const messages = Array.isArray(record?.messages) ? record.messages : [];
  return messages.find((message) => message?.role === 'user')?.content || '{}';
}

function reviewKey(record, fallbackIndex) {
  const historyId = String(record?.metadata?.historyId || 'na').trim();
  const routeId = String(record?.metadata?.routeId || `sample-${fallbackIndex + 1}`).trim();
  return `${historyId}::${routeId}`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const rows = await readJsonl(args.input);
  const selected = shuffle(rows, args.seed).slice(0, args.count);

  const reviewPayload = {
    generatedAt: new Date().toISOString(),
    sourceFile: args.input,
    count: selected.length,
    instructions: [
      'Edit reviewedIntro where needed.',
      'Keep the paragraph factual and based only on the provided route JSON.',
      'Set approved to true when the example is ready for training.',
    ],
    items: selected.map((record, index) => ({
      reviewId: reviewKey(record, index),
      metadata: record?.metadata || {},
      routeJson: JSON.parse(extractUser(record)),
      currentIntro: extractAssistant(record),
      reviewedIntro: extractAssistant(record),
      approved: false,
      notes: '',
    })),
  };

  await fs.mkdir(path.dirname(args.output), { recursive: true });
  await fs.writeFile(args.output, JSON.stringify(reviewPayload, null, 2), 'utf8');
  console.log(`Wrote ${selected.length} review item(s) to ${args.output}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
