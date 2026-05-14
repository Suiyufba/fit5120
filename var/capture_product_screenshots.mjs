import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const baseUrl = "http://127.0.0.1:5173";
const outDir = "docs/product-promo-screenshots";

const pages = [
  ["01-home", "/"],
  ["02-risk-map", "/risk-map"],
  ["03-route-planner", "/route-planner"],
  ["04-route-detail", "/route-detail"],
  ["05-community-reports", "/community-reports"],
  ["06-report-hazard", "/report-hazard"],
  ["07-knowledge-hub", "/knowledge-hub"],
];

const sampleRoutePlan = {
  userLevel: "intermediate",
  start: { lat: -37.8812, lng: 145.313 },
  end: { lat: -37.8475, lng: 145.355 },
  recommendedRoute: {
    id: "promo-safe-route",
    geometry: [
      [-37.8812, 145.313],
      [-37.873, 145.322],
      [-37.865, 145.333],
      [-37.856, 145.344],
      [-37.8475, 145.355],
    ],
    distanceKm: 8.6,
    durationMin: 155,
    difficulty: "Moderate",
    riskScore: 24,
    riskLevel: "Low",
    goNoGo: "Go",
    safetyStatus: "Safe",
    intro: "A safer walking option with low current exposure and clear preparation guidance.",
    explanation: "This route avoids nearby high-risk alerts and keeps the climb manageable for an intermediate hiker.",
    keyRisks: [
      {
        id: "heat-1",
        title: "Exposed ridge section",
        type: "heat",
        severity: "moderate",
        distanceKm: 1.8,
        source: "HikeShield risk model",
        zoneLevel: 2,
        zoneLabel: "Moderate proximity",
        advice: "Start early, carry extra water, and pause before the ridge if temperatures rise.",
      },
      {
        id: "trail-1",
        title: "Uneven track surface",
        type: "trail",
        severity: "low",
        distanceKm: 0.7,
        source: "Community report",
        zoneLevel: 3,
        zoneLabel: "Nearby",
        advice: "Use hiking poles and watch footing after rain.",
      },
    ],
    zoneSummary: { level1Count: 0, level2Count: 1, level3Count: 1 },
    suggestedPrep: [
      "Download an offline map before leaving mobile coverage.",
      "Pack 2L water per person and a wind layer.",
      "Share the route link with your emergency contact.",
    ],
    geographyProfile: {
      totalAscentM: 320,
      totalDescentM: 285,
      maxSlopePct: 14,
      avgSlopePct: 6,
      terrainType: "forest track",
      surfaceType: "mixed gravel",
      trailCondition: "good",
      riverCrossingCount: 0,
      cliffExposureCount: 1,
      closureCount: 0,
    },
    noGoReasons: {
      hasExtremeTooClose: false,
      hasHighTooClose: false,
      hasFireTooClose: false,
      exceedsDistanceCap: false,
      exceedsDurationCap: false,
      hasRouteClosure: false,
      hasSevereCliffExposure: false,
      hasSteepTerrainForUser: false,
      exceedsScoreThreshold: false,
    },
    scoringBreakdown: {},
  },
  alternatives: [],
  routeOptions: [],
  scoringBreakdown: {},
};

await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 1440, height: 960 },
  deviceScaleFactor: 1,
  colorScheme: "light",
});
await page.addInitScript(() => {
  window.localStorage.setItem("hikeshield_site_access_granted", "true");
});
await page.addInitScript((routePlan) => {
  window.sessionStorage.setItem("gohiking_route_plan_v1", JSON.stringify(routePlan));
}, sampleRoutePlan);

async function openWhenReady(url) {
  let lastError;

  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
      return;
    } catch (error) {
      lastError = error;
      await page.waitForTimeout(750);
    }
  }

  throw lastError;
}

for (const [name, route] of pages) {
  const url = `${baseUrl}${route}`;
  await openWhenReady(url);
  await page.waitForTimeout(1800);
  const screenshotPath = path.join(outDir, `${name}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`${name}: ${url} -> ${screenshotPath}`);
}

await browser.close();
