import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

function parseArgs(argv) {
  const args = {
    trainInput: path.join(__dirname, 'data', 'combined', 'route_intro_train.combined.jsonl'),
    evalInput: path.join(__dirname, 'data', 'combined', 'route_intro_eval.combined.jsonl'),
    output: path.join(__dirname, 'data', 'combined-smoke'),
    trainCount: 96,
    evalCount: 24,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === '--train-input' && next) {
      args.trainInput = path.resolve(repoRoot, next);
      index += 1;
    } else if (arg === '--eval-input' && next) {
      args.evalInput = path.resolve(repoRoot, next);
      index += 1;
    } else if (arg === '--output' && next) {
      args.output = path.resolve(repoRoot, next);
      index += 1;
    } else if (arg === '--train-count' && next) {
      args.trainCount = Math.max(1, Number.parseInt(next, 10) || args.trainCount);
      index += 1;
    } else if (arg === '--eval-count' && next) {
      args.evalCount = Math.max(1, Number.parseInt(next, 10) || args.evalCount);
      index += 1;
    }
  }

  return args;
}

async function readJsonl(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

async function writeJsonl(filePath, rows) {
  const text = rows.map((row) => JSON.stringify(row)).join('\n');
  await fs.writeFile(filePath, text ? `${text}\n` : '', 'utf8');
}

function sampleBalanced(rows, limit) {
  const groups = new Map();
  for (const row of rows) {
    const difficulty = String(row?.metadata?.difficulty || 'Moderate');
    if (!groups.has(difficulty)) groups.set(difficulty, []);
    groups.get(difficulty).push(row);
  }

  const orderedGroups = [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right));

  const selected = [];
  let added = true;

  while (selected.length < limit && added) {
    added = false;
    for (const [, bucket] of orderedGroups) {
      if (selected.length >= limit) break;
      if (bucket.length) {
        selected.push(bucket.shift());
        added = true;
      }
    }
  }

  return selected;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const [trainRows, evalRows] = await Promise.all([
    readJsonl(args.trainInput),
    readJsonl(args.evalInput),
  ]);

  const sampledTrain = sampleBalanced(trainRows, args.trainCount);
  const sampledEval = sampleBalanced(evalRows, args.evalCount);

  await fs.mkdir(args.output, { recursive: true });
  const trainPath = path.join(args.output, 'route_intro_train.sampled.jsonl');
  const evalPath = path.join(args.output, 'route_intro_eval.sampled.jsonl');
  const manifestPath = path.join(args.output, 'route_intro_sample_manifest.json');

  await writeJsonl(trainPath, sampledTrain);
  await writeJsonl(evalPath, sampledEval);
  await fs.writeFile(
    manifestPath,
    JSON.stringify({
      generatedAt: new Date().toISOString(),
      trainInput: args.trainInput,
      evalInput: args.evalInput,
      trainExamples: sampledTrain.length,
      evalExamples: sampledEval.length,
    }, null, 2),
    'utf8',
  );

  console.log(`Wrote sampled train file to ${trainPath}`);
  console.log(`Wrote sampled eval file to ${evalPath}`);
  console.log(`Wrote sample manifest to ${manifestPath}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
