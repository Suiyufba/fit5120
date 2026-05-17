import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

function parseArgs(argv) {
  const args = {
    reviewedTrain: path.join(__dirname, 'data', 'bootstrap', 'reviewed', 'route_intro_train.reviewed.jsonl'),
    reviewedEval: path.join(__dirname, 'data', 'bootstrap', 'reviewed', 'route_intro_eval.reviewed.jsonl'),
    geminiTrain: path.join(__dirname, 'data', 'synthetic-gemini', 'route_intro_train.synthetic.jsonl'),
    geminiEval: path.join(__dirname, 'data', 'synthetic-gemini', 'route_intro_eval.synthetic.jsonl'),
    fallbackTrain: path.join(__dirname, 'data', 'synthetic', 'route_intro_train.synthetic.jsonl'),
    fallbackEval: path.join(__dirname, 'data', 'synthetic', 'route_intro_eval.synthetic.jsonl'),
    output: path.join(__dirname, 'data', 'combined'),
    fallbackTrainLimit: 800,
    fallbackEvalLimit: 120,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === '--reviewed-train' && next) {
      args.reviewedTrain = path.resolve(repoRoot, next);
      i += 1;
    } else if (arg === '--reviewed-eval' && next) {
      args.reviewedEval = path.resolve(repoRoot, next);
      i += 1;
    } else if (arg === '--gemini-train' && next) {
      args.geminiTrain = path.resolve(repoRoot, next);
      i += 1;
    } else if (arg === '--gemini-eval' && next) {
      args.geminiEval = path.resolve(repoRoot, next);
      i += 1;
    } else if (arg === '--fallback-train' && next) {
      args.fallbackTrain = path.resolve(repoRoot, next);
      i += 1;
    } else if (arg === '--fallback-eval' && next) {
      args.fallbackEval = path.resolve(repoRoot, next);
      i += 1;
    } else if (arg === '--output' && next) {
      args.output = path.resolve(repoRoot, next);
      i += 1;
    } else if (arg === '--fallback-train-limit' && next) {
      args.fallbackTrainLimit = Math.max(0, Number.parseInt(next, 10) || 0);
      i += 1;
    } else if (arg === '--fallback-eval-limit' && next) {
      args.fallbackEvalLimit = Math.max(0, Number.parseInt(next, 10) || 0);
      i += 1;
    }
  }

  return args;
}

async function readJsonlIfExists(filePath) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return raw
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

async function writeJsonl(filePath, rows) {
  const text = rows.map((row) => JSON.stringify(row)).join('\n');
  await fs.writeFile(filePath, text ? `${text}\n` : '', 'utf8');
}

function getUserPayload(record) {
  const user = record?.messages?.find((message) => message.role === 'user');
  return JSON.parse(user?.content || '{}');
}

function getAssistantText(record) {
  return String(record?.messages?.find((message) => message.role === 'assistant')?.content || '').trim();
}

function recordKey(record) {
  const payload = getUserPayload(record);
  return JSON.stringify(payload);
}

function hasUnsupportedGeminiClaims(record) {
  const text = getAssistantText(record).toLowerCase();
  const payload = getUserPayload(record);
  const geo = payload.geographyProfile || {};

  if ((geo.riverCrossingCount || 0) === 0 && /(river crossing|river crossings|creek crossing|creek crossings)/.test(text)) {
    return true;
  }

  if ((geo.cliffExposureCount || 0) === 0 && /(cliff|drop-off|drop offs|drop-offs|exposed edge|significant drop)/.test(text)) {
    return true;
  }

  if ((geo.closureCount || 0) === 0 && /(track closure|trail closure|closed section|closed track)/.test(text)) {
    return true;
  }

  return false;
}

function annotateSource(record, datasetLabel) {
  return {
    ...record,
    metadata: {
      ...(record.metadata || {}),
      combinedFrom: datasetLabel,
    },
  };
}

function mergeByPriority(groups, limit = Infinity) {
  const seen = new Set();
  const rows = [];
  const stats = {};

  for (const group of groups) {
    let accepted = 0;
    let skippedDuplicate = 0;
    let skippedQuality = 0;

    for (const record of group.rows) {
      if (rows.length >= limit) break;
      if (group.filter && !group.filter(record)) {
        skippedQuality += 1;
        continue;
      }

      const key = recordKey(record);
      if (seen.has(key)) {
        skippedDuplicate += 1;
        continue;
      }

      seen.add(key);
      rows.push(annotateSource(record, group.name));
      accepted += 1;
    }

    stats[group.name] = {
      input: group.rows.length,
      accepted,
      skippedDuplicate,
      skippedQuality,
    };

    if (rows.length >= limit) break;
  }

  return { rows, stats };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const [
    reviewedTrain,
    reviewedEval,
    geminiTrain,
    geminiEval,
    fallbackTrain,
    fallbackEval,
  ] = await Promise.all([
    readJsonlIfExists(args.reviewedTrain),
    readJsonlIfExists(args.reviewedEval),
    readJsonlIfExists(args.geminiTrain),
    readJsonlIfExists(args.geminiEval),
    readJsonlIfExists(args.fallbackTrain),
    readJsonlIfExists(args.fallbackEval),
  ]);

  const trainMerged = mergeByPriority([
    { name: 'reviewed-train', rows: reviewedTrain },
    { name: 'gemini-train', rows: geminiTrain, filter: (record) => !hasUnsupportedGeminiClaims(record) },
    { name: 'fallback-train', rows: fallbackTrain },
  ], reviewedTrain.length + geminiTrain.length + args.fallbackTrainLimit);

  const evalMerged = mergeByPriority([
    { name: 'reviewed-eval', rows: reviewedEval },
    { name: 'gemini-eval', rows: geminiEval, filter: (record) => !hasUnsupportedGeminiClaims(record) },
    { name: 'fallback-eval', rows: fallbackEval },
  ], reviewedEval.length + geminiEval.length + args.fallbackEvalLimit);

  await fs.mkdir(args.output, { recursive: true });
  const trainPath = path.join(args.output, 'route_intro_train.combined.jsonl');
  const evalPath = path.join(args.output, 'route_intro_eval.combined.jsonl');
  const manifestPath = path.join(args.output, 'route_intro_combined_manifest.json');

  await writeJsonl(trainPath, trainMerged.rows);
  await writeJsonl(evalPath, evalMerged.rows);
  await fs.writeFile(
    manifestPath,
    JSON.stringify({
      generatedAt: new Date().toISOString(),
      trainExamples: trainMerged.rows.length,
      evalExamples: evalMerged.rows.length,
      fallbackTrainLimit: args.fallbackTrainLimit,
      fallbackEvalLimit: args.fallbackEvalLimit,
      trainStats: trainMerged.stats,
      evalStats: evalMerged.stats,
    }, null, 2),
    'utf8',
  );

  console.log(`Wrote combined train file to ${trainPath}`);
  console.log(`Wrote combined eval file to ${evalPath}`);
  console.log(`Wrote combined manifest to ${manifestPath}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
