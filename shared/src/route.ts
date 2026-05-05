import type { Hazard, HazardSeverity, HazardType } from './hazard.js';

// ── Coordinates & Geometry ──────────────────────────────────────

export interface Coordinate {
  lat: number;
  lng: number;
}

/** Array of [lat, lng] positions — the wire format from OpenRouteService */
export type RouteGeometry = Array<[number, number]>;

// ── Geography Profile ───────────────────────────────────────────

export interface GeographyProfile {
  totalAscentM: number;
  totalDescentM: number;
  maxSlopePct: number;
  avgSlopePct: number;
  terrainType: string;
  surfaceType: string;
  trailCondition: string;
  riverCrossingCount: number;
  cliffExposureCount: number;
  closureCount: number;
}

// ── Key Risk ────────────────────────────────────────────────────

export interface KeyRisk {
  id: string;
  title: string;
  type: HazardType;
  severity: HazardSeverity;
  distanceKm: number;
  source: string;
  zoneLevel: number;
  zoneLabel: string;
  advice: string;
}

// ── Zone Summary ────────────────────────────────────────────────

export interface ZoneSummary {
  level1Count: number;
  level2Count: number;
  level3Count: number;
}

// ── No-Go Decision ──────────────────────────────────────────────

export interface NoGoReasons {
  hasExtremeTooClose: boolean;
  hasHighTooClose: boolean;
  hasFireTooClose: boolean;
  exceedsDistanceCap: boolean;
  exceedsDurationCap: boolean;
  hasRouteClosure: boolean;
  hasSevereCliffExposure: boolean;
  hasSteepTerrainForUser: boolean;
  exceedsScoreThreshold: boolean;
}

// ── Scoring Breakdown ───────────────────────────────────────────

export interface ScoringBreakdown {
  // Layer 1: Base Risk
  baseRisk: number;
  hazardExposure: number;
  diversityBoost: number;
  routeEffort: number;
  burdenScore: number;
  elevationFatigue: number;
  terrainDanger: number;
  zoneCoverage: number;
  terrainSurface: number;
  exposureCounts: number;

  // Layer 2: Environmental Multiplier
  envMultiplier: number;
  sunAdjust: number;
  seasonAdjust: number;
  tempAdjust: number;
  sunsetHour: number;
  finishHour: number;

  // Layer 3: Interaction Penalty
  interactionPenalty: number;

  // Final
  baseWeightedTotal: number;
  profileFactor: number;
  weightedTotal: number;
  noGoFloorScore: number;
}

// ── User Level & Difficulty ─────────────────────────────────────

export type UserLevel = 'newcomer' | 'intermediate' | 'advanced';

export type Difficulty = 'Easy' | 'Moderate' | 'Hard';

export type RiskLevel = 'Low' | 'Moderate' | 'High' | 'Extreme';

export type SafetyStatus = 'Safe' | 'Dangerous';

export type GoNoGo = 'Go' | 'No-Go';

// ── Route Candidate (internal scoring result) ───────────────────

export interface RouteCandidate {
  id: string;
  geometry: RouteGeometry;
  distanceKm: number;
  durationMin: number;
  difficulty: Difficulty;
  riskScore: number;
  riskLevel: RiskLevel;
  goNoGo: GoNoGo;
  safetyStatus: SafetyStatus;
  noGoReasons: NoGoReasons;
  explanation: string;
  keyRisks: KeyRisk[];
  zoneSummary: ZoneSummary;
  suggestedPrep: string[];
  geographyProfile: GeographyProfile;
  scoringBreakdown: ScoringBreakdown;
  intro?: string;
}

// ── API Payload (what the client receives) ──────────────────────

export type RoutePayload = RouteCandidate;

export interface RouteOption extends RoutePayload {
  targetDifficulty: Difficulty;
}
