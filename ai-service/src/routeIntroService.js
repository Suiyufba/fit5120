import path from 'node:path';
import readline from 'node:readline';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getNarrationConfig() {
  return {
    provider: String(process.env.ROUTE_INTRO_PROVIDER || 'auto').trim().toLowerCase(),
    apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '',
    apiUrl: process.env.GEMINI_API_URL || 'https://generativelanguage.googleapis.com/v1beta',
    model: process.env.GEMINI_ROUTE_NARRATION_MODEL || 'gemini-2.5-flash-lite',
    timeoutMs: Number.parseInt(process.env.GEMINI_TIMEOUT_MS || '20000', 10) || 20000,
    localModelAdapterPath: process.env.ROUTE_INTRO_MODEL_ADAPTER_PATH || '',
    localModelPythonBin: process.env.ROUTE_INTRO_MODEL_PYTHON_BIN || 'python3',
    localModelStartupTimeoutMs: Number.parseInt(process.env.ROUTE_INTRO_MODEL_STARTUP_TIMEOUT_MS || '60000', 10) || 60000,
    localModelTimeoutMs: Number.parseInt(process.env.ROUTE_INTRO_MODEL_TIMEOUT_MS || '45000', 10) || 45000,
    localModelDeviceMap: process.env.ROUTE_INTRO_MODEL_DEVICE_MAP || 'auto',
    localModelMaxNewTokens: Number.parseInt(process.env.ROUTE_INTRO_MODEL_MAX_NEW_TOKENS || '160', 10) || 160,
  };
}

let localModelWorker = null;
let localModelWorkerPromise = null;
let localModelQueue = Promise.resolve();

export function getRouteIntroProvider(config = getNarrationConfig()) {
  if (config.provider === 'local-model') return 'local-model';
  if (config.provider === 'gemini') return 'gemini';
  if (config.provider === 'fallback') return 'fallback';
  if (config.localModelAdapterPath) return 'local-model';
  if (config.apiKey) return 'gemini';
  return 'fallback';
}

function resetLocalModelWorker(error) {
  if (localModelWorker?.process && !localModelWorker.process.killed) {
    localModelWorker.process.kill();
  }
  if (localModelWorker?.pending) {
    localModelWorker.pending.reject(error);
  }
  localModelWorker = null;
  localModelWorkerPromise = null;
}

async function ensureLocalModelWorker(config = getNarrationConfig()) {
  if (localModelWorker) return localModelWorker;
  if (localModelWorkerPromise) return localModelWorkerPromise;

  if (!config.localModelAdapterPath) {
    throw new Error('ROUTE_INTRO_MODEL_ADAPTER_PATH is required for local-model provider');
  }

  localModelWorkerPromise = new Promise((resolve, reject) => {
    const workerPath = path.join(__dirname, 'localRouteIntroWorker.py');
    const child = spawn(config.localModelPythonBin, [workerPath], {
      cwd: path.resolve(__dirname, '..', '..'),
      env: {
        ...process.env,
        ROUTE_INTRO_MODEL_ADAPTER_PATH: config.localModelAdapterPath,
        ROUTE_INTRO_MODEL_DEVICE_MAP: config.localModelDeviceMap,
        ROUTE_INTRO_MODEL_MAX_NEW_TOKENS: String(config.localModelMaxNewTokens),
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const rl = readline.createInterface({ input: child.stdout });
    let startupResolved = false;
    let stderr = '';

    const workerState = {
      process: child,
      rl,
      pending: null,
    };
    const startupTimer = setTimeout(() => {
      const error = new Error('Local route intro worker startup timed out');
      reject(error);
      resetLocalModelWorker(error);
    }, config.localModelStartupTimeoutMs);

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('exit', (code) => {
      const error = new Error(
        `Local route intro worker exited with code ${code ?? 'unknown'}${stderr ? `: ${stderr.trim()}` : ''}`,
      );
      clearTimeout(startupTimer);
      if (!startupResolved) {
        reject(error);
      }
      resetLocalModelWorker(error);
    });

    rl.on('line', (line) => {
      let payload;
      try {
        payload = JSON.parse(line);
      } catch {
        return;
      }

      if (!startupResolved) {
        if (payload?.ok && payload?.event === 'ready') {
          startupResolved = true;
          clearTimeout(startupTimer);
          localModelWorker = workerState;
          resolve(workerState);
        } else {
          clearTimeout(startupTimer);
          reject(new Error(payload?.error || 'Local route intro worker failed to initialize'));
          resetLocalModelWorker(new Error(payload?.error || 'Local route intro worker failed to initialize'));
        }
        return;
      }

      if (workerState.pending) {
        const pending = workerState.pending;
        workerState.pending = null;
        if (payload?.ok) {
          pending.resolve(payload);
        } else {
          pending.reject(new Error(payload?.error || 'Local route intro worker failed'));
        }
      }
    });
  });

  return localModelWorkerPromise;
}

function formatDistance(distanceKm) {
  const value = Number(distanceKm || 0);
  return `${value.toFixed(1)} km`;
}

function formatDuration(durationMin) {
  const totalMinutes = Math.max(1, Math.round(Number(durationMin || 0)));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours && minutes) return `${hours} hr ${minutes} min`;
  if (hours) return `${hours} hr`;
  return `${minutes} min`;
}

function describeTerrain(geographyProfile = {}) {
  const terrain = String(geographyProfile.terrainType || '').trim().toLowerCase();
  const surface = String(geographyProfile.surfaceType || '').trim().toLowerCase();
  const trail = String(geographyProfile.trailCondition || '').trim().toLowerCase();
  const maxSlope = Number(geographyProfile.maxSlopePct || 0);
  const totalAscent = Math.round(Number(geographyProfile.totalAscentM || 0));

  const slopeNote =
    maxSlope >= 30 ? 'steep climbs' :
    maxSlope >= 18 ? 'some sustained climbs' :
    maxSlope >= 10 ? 'rolling gradients' :
    'gentle gradients';

  const terrainNote =
    terrain.includes('rock') ? 'rocky sections' :
    terrain.includes('forest') || terrain.includes('bush') ? 'bush tracks' :
    terrain.includes('trail') || terrain.includes('path') ? 'formed walking paths' :
    terrain.includes('coast') ? 'coastal trail sections' :
    'mixed trail conditions';

  const surfaceNote =
    surface.includes('loose') ? 'loose underfoot patches' :
    surface.includes('rock') ? 'firmer rocky footing' :
    surface.includes('compacted') || surface.includes('sealed') ? 'more predictable footing' :
    'variable footing';

  const trailNote =
    trail.includes('rough') || trail.includes('poor') ? 'with rough trail segments' :
    trail.includes('wet') || trail.includes('mud') ? 'with some slippery sections' :
    trail.includes('good') ? 'on generally well-formed trail' :
    '';

  const climbNote = totalAscent >= 500
    ? `with about ${totalAscent} m of climbing`
    : '';

  return [terrainNote, slopeNote, surfaceNote, trailNote, climbNote]
    .filter(Boolean)
    .join(', ');
}

function describeAudience(route = {}) {
  const difficulty = String(route.difficulty || '').toLowerCase();
  if (difficulty === 'easy') return 'beginners with basic fitness and some preparation';
  if (difficulty === 'hard') return 'experienced hikers who are comfortable managing effort and changing conditions';
  return 'walkers with moderate fitness who are prepared for a longer or more uneven outing';
}

function zoneAlertSummary(zoneSummary = {}) {
  const parts = [];
  const level1 = Number(zoneSummary.level1Count || 0);
  const level2 = Number(zoneSummary.level2Count || 0);
  const level3 = Number(zoneSummary.level3Count || 0);
  if (level1 > 0) parts.push(`${level1} nearby high-priority alert${level1 > 1 ? 's' : ''}`);
  if (level2 > 0) parts.push(`${level2} buffer-zone alert${level2 > 1 ? 's' : ''}`);
  if (level3 > 0) parts.push(`${level3} watch-zone alert${level3 > 1 ? 's' : ''}`);
  return parts.join(', ');
}

function describeRiskHighlights(route = {}) {
  const risks = Array.isArray(route.keyRisks) ? route.keyRisks.slice(0, 3) : [];
  if (!risks.length) return 'the usual footing and weather checks before departure';
  return risks
    .map((risk) => {
      const title = String(risk.title || risk.type || 'nearby alert').trim();
      const distanceKm = Number(risk.distanceKm);
      if (Number.isFinite(distanceKm) && distanceKm > 0) {
        return `${title} about ${distanceKm.toFixed(1)} km from the route`;
      }
      return title;
    })
    .join(', ');
}

function describeHighlight(route = {}) {
  const terrain = String(route?.geographyProfile?.terrainType || '').toLowerCase();
  if (terrain.includes('forest') || terrain.includes('bush')) return 'Victoria bush scenery and trail atmosphere';
  if (terrain.includes('coast')) return 'coastal scenery and open outlooks';
  if (terrain.includes('ridge') || terrain.includes('mount')) return 'higher-elevation views and a more adventurous feel';
  return 'local landscapes and time on the trail';
}

export function normalizeRouteIntroInput(payload = {}) {
  const route = payload && typeof payload === 'object' ? payload : {};
  return {
    distanceKm: Number(route.distanceKm || 0),
    durationMin: Number(route.durationMin || 0),
    difficulty: String(route.difficulty || 'Moderate'),
    riskLevel: String(route.riskLevel || 'Low'),
    goNoGo: String(route.goNoGo || 'Go'),
    geographyProfile: route.geographyProfile && typeof route.geographyProfile === 'object'
      ? route.geographyProfile
      : {},
    zoneSummary: route.zoneSummary && typeof route.zoneSummary === 'object'
      ? route.zoneSummary
      : {},
    keyRisks: Array.isArray(route.keyRisks) ? route.keyRisks : [],
  };
}

export function validateRouteIntroInput(route = {}) {
  if (!Number.isFinite(route.distanceKm) || route.distanceKm < 0) {
    return 'distanceKm must be a non-negative number';
  }
  if (!Number.isFinite(route.durationMin) || route.durationMin < 0) {
    return 'durationMin must be a non-negative number';
  }
  return '';
}

export function buildRouteIntroductionFallback(route = {}) {
  const difficulty = String(route.difficulty || 'moderate').toLowerCase();
  const article = ['a', 'e', 'i', 'o', 'u'].includes(difficulty[0]) ? 'an' : 'a';
  const riskSentence = route.goNoGo === 'No-Go'
    ? 'Current conditions suggest this route needs extra caution and may be better postponed unless the alerts clear.'
    : 'With sensible preparation, it can still be an enjoyable and manageable outing.';
  const alertSummary = zoneAlertSummary(route.zoneSummary);

  return `This track offers ${article} ${difficulty} walk over approximately ${formatDistance(route.distanceKm)}, typically taking around ${formatDuration(route.durationMin)} to complete. The route features ${describeTerrain(route.geographyProfile)}, making it suitable for ${describeAudience(route)}. Hikers should be aware of ${describeRiskHighlights(route)}${alertSummary ? `, with ${alertSummary} in nearby zones` : ''}. ${riskSentence} It is a good option for enjoying ${describeHighlight(route)}.`;
}

function buildPrompt(route = {}) {
  const keyRisks = Array.isArray(route.keyRisks) ? route.keyRisks.slice(0, 3) : [];
  const facts = {
    distanceKm: Number(route.distanceKm || 0).toFixed(1),
    durationMin: Math.round(Number(route.durationMin || 0)),
    difficulty: route.difficulty || 'Moderate',
    riskLevel: route.riskLevel || 'Low',
    goNoGo: route.goNoGo || 'Go',
    geographyProfile: route.geographyProfile || {},
    zoneSummary: route.zoneSummary || {},
    keyRisks: keyRisks.map((risk) => ({
      title: risk.title,
      type: risk.type,
      severity: risk.severity,
      distanceKm: risk.distanceKm,
      advice: risk.advice,
    })),
  };

  return [
    'Write one short user-friendly introduction paragraph for a hiking route in Victoria, Australia.',
    'Use only the facts provided. Do not invent scenery, facilities, track names, or conditions.',
    'Mention difficulty, distance, duration, likely terrain feel, who the route suits, and the most important nearby risks or alerts.',
    'Keep it to 80-120 words in plain English. No markdown, no bullet points, and no quotation marks.',
    JSON.stringify(facts),
  ].join('\n');
}

export function extractGeminiText(payload) {
  const candidates = Array.isArray(payload?.candidates) ? payload.candidates : [];
  for (const candidate of candidates) {
    const parts = Array.isArray(candidate?.content?.parts) ? candidate.content.parts : [];
    const text = parts
      .map((part) => (typeof part?.text === 'string' ? part.text.trim() : ''))
      .filter(Boolean)
      .join(' ')
      .trim();
    if (text) return text;
  }
  return '';
}

async function generateRouteIntroductionWithGemini(route = {}) {
  const narrationConfig = getNarrationConfig();
  const apiUrl = `${String(narrationConfig.apiUrl).replace(/\/$/, '')}/models/${encodeURIComponent(narrationConfig.model)}:generateContent`;
  const response = await fetch(apiUrl, {
    method: 'POST',
    signal: AbortSignal.timeout(narrationConfig.timeoutMs),
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': narrationConfig.apiKey,
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: buildPrompt(route) }],
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini narration request failed with ${response.status}`);
  }

  const payload = await response.json();
  return extractGeminiText(payload);
}

async function generateRouteIntroductionWithLocalModel(route = {}, config = getNarrationConfig()) {
  const worker = await ensureLocalModelWorker(config);

  const execute = () => new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      const error = new Error('Local route intro worker timed out');
      resetLocalModelWorker(error);
      reject(error);
    }, config.localModelTimeoutMs);

    worker.pending = {
      resolve: (payload) => {
        clearTimeout(timer);
        resolve(payload);
      },
      reject: (error) => {
        clearTimeout(timer);
        reject(error);
      },
    };

    worker.process.stdin.write(`${JSON.stringify({ route })}\n`);
  });

  localModelQueue = localModelQueue.then(execute, execute);
  const payload = await localModelQueue;
  return String(payload?.intro || '').trim();
}

export async function generateRouteIntroduction(route = {}) {
  const normalized = normalizeRouteIntroInput(route);
  const validationError = validateRouteIntroInput(normalized);
  if (validationError) {
    throw new Error(validationError);
  }

  const narrationConfig = getNarrationConfig();
  const fallback = buildRouteIntroductionFallback(normalized);

  const provider = getRouteIntroProvider(narrationConfig);
  if (provider === 'fallback') {
    return { intro: fallback, source: 'fallback', model: 'rule-based' };
  }

  if (provider === 'local-model') {
    try {
      const generated = await generateRouteIntroductionWithLocalModel(normalized, narrationConfig);
      if (generated) {
        const modelName = path.basename(narrationConfig.localModelAdapterPath || 'local-model');
        return { intro: generated, source: 'local-model', model: modelName };
      }
    } catch (error) {
      console.warn('Falling back to rule-based route introduction:', error.message);
      return { intro: fallback, source: 'fallback', model: 'rule-based' };
    }
  }

  if (!narrationConfig.apiKey) {
    return { intro: fallback, source: 'fallback', model: 'rule-based' };
  }

  try {
    const generated = await generateRouteIntroductionWithGemini(normalized);
    if (generated) {
      return { intro: generated, source: 'gemini', model: narrationConfig.model };
    }
  } catch (error) {
    console.warn('Falling back to rule-based route introduction:', error.message);
  }

  return { intro: fallback, source: 'fallback', model: 'rule-based' };
}
