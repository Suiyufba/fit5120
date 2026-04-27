function getNarrationConfig() {
  return {
    apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '',
    apiUrl: process.env.GEMINI_API_URL || 'https://generativelanguage.googleapis.com/v1beta',
    model: process.env.GEMINI_ROUTE_NARRATION_MODEL || 'gemini-2.5-flash-lite',
    timeoutMs: Number(process.env.GEMINI_ROUTE_NARRATION_TIMEOUT_MS || 4500),
  };
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

  const climbNote = totalAscent >= 500 ? `Expect around ${totalAscent} m of climbing` : '';

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

export function buildRouteIntroductionFallback(route = {}) {
  const difficulty = String(route.difficulty || 'moderate').toLowerCase();
  const riskSentence = route.goNoGo === 'No-Go'
    ? 'Current conditions suggest this route needs extra caution and may be better postponed unless the alerts clear.'
    : 'With sensible preparation, it can still be an enjoyable and manageable outing.';
  const alertSummary = zoneAlertSummary(route.zoneSummary);

  return `This track offers a ${difficulty} walk over approximately ${formatDistance(route.distanceKm)}, typically taking around ${formatDuration(route.durationMin)} to complete. The route features ${describeTerrain(route.geographyProfile)}, making it suitable for ${describeAudience(route)}. Hikers should be aware of ${describeRiskHighlights(route)}${alertSummary ? `, with ${alertSummary} in nearby zones` : ''}. ${riskSentence} It is a good option for enjoying ${describeHighlight(route)}.`;
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
  const timeoutMs = Number.isFinite(narrationConfig.timeoutMs) && narrationConfig.timeoutMs > 0
    ? narrationConfig.timeoutMs
    : 4500;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': narrationConfig.apiKey,
      },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              { text: buildPrompt(route) },
            ],
          },
        ],
      }),
    });
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    throw new Error(`Gemini narration request failed with ${response.status}`);
  }

  const payload = await response.json();
  return extractGeminiText(payload);
}

export async function generateRouteIntroduction(route = {}) {
  const narrationConfig = getNarrationConfig();
  const fallback = buildRouteIntroductionFallback(route);
  if (!narrationConfig.apiKey) {
    return fallback;
  }

  try {
    const generated = await generateRouteIntroductionWithGemini(route);
    return generated || fallback;
  } catch (error) {
    console.warn('Falling back to rule-based route introduction:', error.message);
    return fallback;
  }
}
