import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const defaultDataDir = path.join(__dirname, 'data');
const defaultReviewDir = path.join(__dirname, 'review');

function parseArgs(argv) {
  const args = {
    train: path.join(defaultDataDir, 'route_intro_train.jsonl'),
    eval: path.join(defaultDataDir, 'route_intro_eval.jsonl'),
    review: path.join(defaultReviewDir, 'route_intro_review_batch.json'),
    output: path.join(defaultDataDir, 'reviewed'),
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === '--train' && next) {
      args.train = path.resolve(repoRoot, next);
      i += 1;
    } else if (arg === '--eval' && next) {
      args.eval = path.resolve(repoRoot, next);
      i += 1;
    } else if (arg === '--review' && next) {
      args.review = path.resolve(repoRoot, next);
      i += 1;
    } else if (arg === '--output' && next) {
      args.output = path.resolve(repoRoot, next);
      i += 1;
    }
  }

  return args;
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function readJsonl(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

async function writeJsonl(filePath, records) {
  const text = records.map((item) => JSON.stringify(item)).join('\n');
  await fs.writeFile(filePath, text ? `${text}\n` : '', 'utf8');
}

function assistantIndex(record) {
  return Array.isArray(record?.messages)
    ? record.messages.findIndex((message) => message?.role === 'assistant')
    : -1;
}

function routeId(record) {
  return String(record?.metadata?.routeId || '').trim();
}

function reviewKeyForRecord(record) {
  const historyId = String(record?.metadata?.historyId || 'na').trim();
  const route = routeId(record);
  return `${historyId}::${route}`;
}

function applyReviewedEdits(records, reviewItems) {
  const approved = new Map();
  reviewItems
    .filter((item) => item?.approved && String(item?.reviewedIntro || '').trim())
    .forEach((item) => {
      approved.set(String(item.reviewId || item?.metadata?.routeId || '').trim(), item);
    });

  return records.map((record) => {
    const key = reviewKeyForRecord(record);
    if (!approved.has(key)) return record;

    const assistantPos = assistantIndex(record);
    if (assistantPos < 0) return record;

    const item = approved.get(key);
    const nextMessages = record.messages.slice();
    nextMessages[assistantPos] = {
      ...nextMessages[assistantPos],
      content: String(item.reviewedIntro).trim(),
    };

    return {
      ...record,
      messages: nextMessages,
      metadata: {
        ...(record.metadata || {}),
        targetSource: 'reviewed',
        reviewNotes: String(item.notes || '').trim(),
      },
    };
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const trainRows = await readJsonl(args.train);
  const evalRows = await readJsonl(args.eval);
  const review = await readJson(args.review);
  const items = Array.isArray(review?.items) ? review.items : [];

  const nextTrain = applyReviewedEdits(trainRows, items);
  const nextEval = applyReviewedEdits(evalRows, items);

  await fs.mkdir(args.output, { recursive: true });
  const trainPath = path.join(args.output, 'route_intro_train.reviewed.jsonl');
  const evalPath = path.join(args.output, 'route_intro_eval.reviewed.jsonl');
  const manifestPath = path.join(args.output, 'route_intro_review_manifest.json');

  await writeJsonl(trainPath, nextTrain);
  await writeJsonl(evalPath, nextEval);
  await fs.writeFile(
    manifestPath,
    JSON.stringify({
      generatedAt: new Date().toISOString(),
      reviewFile: args.review,
      approvedItems: items.filter((item) => item?.approved).length,
      trainExamples: nextTrain.length,
      evalExamples: nextEval.length,
    }, null, 2),
    'utf8',
  );

  console.log(`Wrote reviewed train file to ${trainPath}`);
  console.log(`Wrote reviewed eval file to ${evalPath}`);
  console.log(`Wrote review manifest to ${manifestPath}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
