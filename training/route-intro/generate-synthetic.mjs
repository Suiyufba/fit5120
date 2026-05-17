import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  generateRouteIntroduction,
  normalizeRouteIntroInput,
} from '../../ai-service/src/routeIntroService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const defaultOutputDir = path.join(__dirname, 'data', 'synthetic');

const HAZARD_LIBRARY = [
  { title: 'Bushfire watch', type: 'fire', severity: 'high', advice: 'Check emergency warnings and avoid committing to exposed sections.' },
  { title: 'Track washout', type: 'trail', severity: 'moderate', advice: 'Expect unstable footing and possible rerouting.' },
  { title: 'Heat warning', type: 'heat', severity: 'moderate', advice: 'Carry extra water and avoid the hottest part of the day.' },
  { title: 'Storm cell nearby', type: 'storm', severity: 'high', advice: 'Monitor weather and avoid exposed ridges if conditions build.' },
  { title: 'Flooded crossing', type: 'flood', severity: 'high', advice: 'Do not rely on creek crossings being safe at normal flow.' },
  { title: 'Fallen trees on trail', type: 'trail', severity: 'low', advice: 'Allow extra time for slower progress and minor detours.' },
  { title: 'Strong wind warning', type: 'storm', severity: 'moderate', advice: 'Use extra caution on open ground and at higher points.' },
  { title: 'Smoke haze nearby', type: 'fire', severity: 'moderate', advice: 'Reassess if visibility or air quality worsens.' },
];

function parseArgs(argv) {
  const args = {
    input: path.join(__dirname, 'data', 'bootstrap', 'reviewed', 'route_intro_train.reviewed.jsonl'),
    evalInput: path.join(__dirname, 'data', 'bootstrap', 'reviewed', 'route_intro_eval.reviewed.jsonl'),
    output: defaultOutputDir,
    count: 1200,
    split: 0.9,
    seed: 42,
    delayMs: 0,
    geminiOnly: false,
    maxAttempts: null,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === '--input' && next) {
      args.input = path.resolve(repoRoot, next);
      i += 1;
    } else if (arg === '--eval-input' && next) {
      args.evalInput = path.resolve(repoRoot, next);
      i += 1;
    } else if (arg === '--output' && next) {
      args.output = path.resolve(repoRoot, next);
      i += 1;
    } else if (arg === '--count' && next) {
      args.count = Math.max(1, Number.parseInt(next, 10) || args.count);
      i += 1;
    } else if (arg === '--split' && next) {
      const value = Number.parseFloat(next);
      args.split = Number.isFinite(value) && value > 0 && value < 1 ? value : args.split;
      i += 1;
    } else if (arg === '--seed' && next) {
      args.seed = Number.parseInt(next, 10) || args.seed;
      i += 1;
    } else if (arg === '--delay-ms' && next) {
      args.delayMs = Math.max(0, Number.parseInt(next, 10) || 0);
      i += 1;
    } else if (arg === '--max-attempts' && next) {
      args.maxAttempts = Math.max(1, Number.parseInt(next, 10) || 0);
      i += 1;
    } else if (arg === '--gemini-only') {
      args.geminiOnly = true;
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

function sample(items, random) {
  return items[Math.floor(random() * items.length)];
}

function weightedSample(weightedItems, random) {
  const total = weightedItems.reduce((sum, item) => sum + item.weight, 0);
  let threshold = random() * total;
  for (const item of weightedItems) {
    threshold -= item.weight;
    if (threshold <= 0) return item.value;
  }
  return weightedItems[weightedItems.length - 1]?.value;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
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

function extractUserJson(record) {
  const user = record.messages.find((message) => message.role === 'user');
  return JSON.parse(user?.content || '{}');
}

function round1(value) {
  return Math.round(value * 10) / 10;
}

function maybeAdjustDifficulty(route, random) {
  const duration = route.durationMin;
  const ascent = Number(route.geographyProfile?.totalAscentM || 0);
  const slope = Number(route.geographyProfile?.maxSlopePct || 0);

  if (duration > 900 || ascent > 900 || slope > 14) return 'Hard';
  if (duration < 180 && ascent < 180 && slope < 7) return random() < 0.5 ? 'Easy' : 'Moderate';
  return 'Moderate';
}

function chooseDifficultyProfile(random) {
  return weightedSample([
    { value: 'Easy', weight: 0.26 },
    { value: 'Moderate', weight: 0.48 },
    { value: 'Hard', weight: 0.26 },
  ], random);
}

function chooseRiskProfile(difficulty, random) {
  if (difficulty === 'Easy') {
    return weightedSample([
      { value: 'Low', weight: 0.6 },
      { value: 'Moderate', weight: 0.34 },
      { value: 'High', weight: 0.06 },
    ], random);
  }

  if (difficulty === 'Hard') {
    return weightedSample([
      { value: 'Low', weight: 0.08 },
      { value: 'Moderate', weight: 0.46 },
      { value: 'High', weight: 0.46 },
    ], random);
  }

  return weightedSample([
    { value: 'Low', weight: 0.22 },
    { value: 'Moderate', weight: 0.56 },
    { value: 'High', weight: 0.22 },
  ], random);
}

function buildZoneSummaryForRisk(riskProfile, random) {
  if (riskProfile === 'Low') {
    return {
      level1Count: 0,
      level2Count: random() < 0.2 ? 1 : 0,
      level3Count: random() < 0.55 ? Math.floor(random() * 2) + 1 : 0,
    };
  }

  if (riskProfile === 'High') {
    return {
      level1Count: random() < 0.7 ? Math.floor(random() * 2) + 1 : 0,
      level2Count: Math.floor(random() * 3) + 1,
      level3Count: random() < 0.75 ? Math.floor(random() * 3) + 1 : 0,
    };
  }

  return {
    level1Count: random() < 0.18 ? 1 : 0,
    level2Count: Math.floor(random() * 2) + 1,
    level3Count: random() < 0.65 ? Math.floor(random() * 3) + 1 : 0,
  };
}

function metricRangesForDifficulty(difficulty) {
  if (difficulty === 'Easy') {
    return {
      distanceKm: [2.0, 12.0],
      durationMin: [45, 210],
      totalAscentM: [0, 260],
      totalDescentM: [0, 260],
      maxSlopePct: [0, 8],
      avgSlopePct: [0, 5],
    };
  }

  if (difficulty === 'Hard') {
    return {
      distanceKm: [12.0, 48.0],
      durationMin: [240, 960],
      totalAscentM: [350, 1500],
      totalDescentM: [300, 1500],
      maxSlopePct: [10, 24],
      avgSlopePct: [3, 12],
    };
  }

  return {
    distanceKm: [6.0, 24.0],
    durationMin: [120, 480],
    totalAscentM: [120, 800],
    totalDescentM: [100, 800],
    maxSlopePct: [4, 14],
    avgSlopePct: [1, 8],
  };
}

function rangedValue(baseValue, min, max, random, allowFloat = false) {
  const fallback = min + ((max - min) * random());
  const base = Number.isFinite(Number(baseValue)) && Number(baseValue) > 0
    ? clamp(Number(baseValue) * (0.8 + (random() * 0.4)), min, max)
    : fallback;
  return allowFloat ? round1(base) : Math.round(base);
}

function inferGoNoGo(riskProfile, difficulty, random) {
  if (riskProfile === 'High') return 'No-Go';
  if (riskProfile === 'Low') return 'Go';
  if (difficulty === 'Hard' && random() < 0.08) return 'No-Go';
  return 'Go';
}

function mutateHazards(seedRoute, riskProfile, random) {
  const hazards = [];
  const sourceHazards = Array.isArray(seedRoute.keyRisks) ? seedRoute.keyRisks : [];
  const desiredCount =
    riskProfile === 'Low'
      ? (random() < 0.55 ? 0 : 1)
      : riskProfile === 'High'
        ? (random() < 0.35 ? 2 : 3)
        : (random() < 0.3 ? 1 : 2);

  for (let i = 0; i < desiredCount; i += 1) {
    const template = sourceHazards[i] || sample(HAZARD_LIBRARY, random);
    const severity =
      riskProfile === 'High'
        ? (template.severity === 'low' ? 'moderate' : template.severity)
        : riskProfile === 'Low'
          ? (template.severity === 'high' ? 'moderate' : 'low')
          : template.severity;
    hazards.push({
      title: template.title,
      type: template.type,
      severity,
      distanceKm: round1(clamp(Number(template.distanceKm || (0.5 + random() * 4.5)), 0.3, 5.0)),
      advice: template.advice || '',
    });
  }

  return hazards;
}

function mutateRoute(seedRoute, seedMeta, index, random) {
  const normalized = normalizeRouteIntroInput(seedRoute);
  const targetDifficulty = chooseDifficultyProfile(random);
  const targetRisk = chooseRiskProfile(targetDifficulty, random);
  const ranges = metricRangesForDifficulty(targetDifficulty);

  const geographyProfile = {
    ...(normalized.geographyProfile || {}),
    totalAscentM: rangedValue(normalized.geographyProfile?.totalAscentM, ranges.totalAscentM[0], ranges.totalAscentM[1], random),
    totalDescentM: rangedValue(normalized.geographyProfile?.totalDescentM, ranges.totalDescentM[0], ranges.totalDescentM[1], random),
    maxSlopePct: rangedValue(normalized.geographyProfile?.maxSlopePct, ranges.maxSlopePct[0], ranges.maxSlopePct[1], random, true),
    avgSlopePct: rangedValue(normalized.geographyProfile?.avgSlopePct, ranges.avgSlopePct[0], ranges.avgSlopePct[1], random, true),
    terrainType: normalized.geographyProfile?.terrainType || (random() < 0.4 ? 'bush trail' : 'mixed'),
    surfaceType: normalized.geographyProfile?.surfaceType || (random() < 0.5 ? 'rocky' : 'unknown'),
    trailCondition: normalized.geographyProfile?.trailCondition || (random() < 0.3 ? 'good' : 'unknown'),
  };

  const route = {
    distanceKm: rangedValue(normalized.distanceKm, ranges.distanceKm[0], ranges.distanceKm[1], random, true),
    durationMin: rangedValue(normalized.durationMin, ranges.durationMin[0], ranges.durationMin[1], random),
    difficulty: targetDifficulty,
    geographyProfile,
    zoneSummary: buildZoneSummaryForRisk(targetRisk, random),
    keyRisks: mutateHazards(normalized, targetRisk, random),
  };

  route.difficulty = targetDifficulty;
  route.riskLevel = targetRisk;
  route.goNoGo = inferGoNoGo(targetRisk, route.difficulty, random);

  return {
    route,
    metadata: {
      syntheticId: `synthetic-${index + 1}`,
      seedHistoryId: seedMeta.historyId,
      seedRouteId: seedMeta.routeId,
    },
  };
}

function buildExample(route, intro, introSource, introModel, metadata) {
  const userPayload = {
    distanceKm: Number(route.distanceKm.toFixed(1)),
    durationMin: Math.round(route.durationMin),
    difficulty: route.difficulty,
    riskLevel: route.riskLevel,
    goNoGo: route.goNoGo,
    geographyProfile: route.geographyProfile,
    zoneSummary: route.zoneSummary,
    keyRisks: route.keyRisks,
  };

  return {
    messages: [
      {
        role: 'system',
        content: 'Write one short user-friendly hiking route introduction from structured route data. Use only the facts provided.',
      },
      {
        role: 'user',
        content: JSON.stringify(userPayload),
      },
      {
        role: 'assistant',
        content: intro,
      },
    ],
    metadata: {
      ...metadata,
      targetSource: introSource,
      targetModel: introModel,
      difficulty: route.difficulty,
      riskLevel: route.riskLevel,
      goNoGo: route.goNoGo,
    },
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const random = mulberry32(args.seed);
  const reviewedTrain = await readJsonl(args.input);
  const reviewedEval = await readJsonl(args.evalInput);
  const seeds = [...reviewedTrain, ...reviewedEval];

  if (!seeds.length) {
    throw new Error('No reviewed seed examples found. Generate and review a base dataset first.');
  }

  const syntheticExamples = [];
  const acceptedSourceCounts = {};
  let attempts = 0;
  const maxAttempts = args.maxAttempts || (args.geminiOnly ? args.count * 8 : args.count);

  while (syntheticExamples.length < args.count && attempts < maxAttempts) {
    const index = attempts;
    attempts += 1;
    const seed = sample(seeds, random);
    const seedRoute = extractUserJson(seed);
    const synthetic = mutateRoute(seedRoute, seed.metadata || {}, index, random);
    const generated = await generateRouteIntroduction(synthetic.route);
    const generatedSource = `synthetic-${generated.source}`;

    if (args.geminiOnly && generated.source !== 'gemini') {
      console.log(`[skip ${attempts}/${maxAttempts}] ${generatedSource}`);
      if (args.delayMs > 0) {
        await sleep(args.delayMs);
      }
      continue;
    }

    acceptedSourceCounts[generatedSource] = (acceptedSourceCounts[generatedSource] || 0) + 1;
    syntheticExamples.push(
      buildExample(
        synthetic.route,
        generated.intro,
        generatedSource,
        generated.model,
        synthetic.metadata,
      ),
    );
    console.log(`[accept ${syntheticExamples.length}/${args.count}] ${generatedSource}`);

    if (args.delayMs > 0 && syntheticExamples.length < args.count) {
      await sleep(args.delayMs);
    }
  }

  if (!syntheticExamples.length) {
    throw new Error('No synthetic examples were generated with the requested settings.');
  }

  if (args.geminiOnly && syntheticExamples.length < args.count) {
    console.warn(`Requested ${args.count} Gemini-only samples but only collected ${syntheticExamples.length} within ${attempts} attempts.`);
  }

  const splitIndex = Math.max(1, Math.floor(syntheticExamples.length * args.split));
  const train = syntheticExamples.slice(0, splitIndex);
  const evalSet = syntheticExamples.slice(splitIndex);

  await fs.mkdir(args.output, { recursive: true });
  const trainPath = path.join(args.output, 'route_intro_train.synthetic.jsonl');
  const evalPath = path.join(args.output, 'route_intro_eval.synthetic.jsonl');
  const manifestPath = path.join(args.output, 'route_intro_synthetic_manifest.json');

  await writeJsonl(trainPath, train);
  await writeJsonl(evalPath, evalSet);
  await fs.writeFile(
    manifestPath,
    JSON.stringify({
      generatedAt: new Date().toISOString(),
      seedInput: args.input,
      evalSeedInput: args.evalInput,
      syntheticExamples: syntheticExamples.length,
      trainExamples: train.length,
      evalExamples: evalSet.length,
      split: args.split,
      seed: args.seed,
      attempts,
      geminiOnly: args.geminiOnly,
      delayMs: args.delayMs,
      acceptedSourceCounts,
    }, null, 2),
    'utf8',
  );

  console.log(`Wrote ${train.length} synthetic train example(s) to ${trainPath}`);
  console.log(`Wrote ${evalSet.length} synthetic eval example(s) to ${evalPath}`);
  console.log(`Wrote synthetic manifest to ${manifestPath}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
