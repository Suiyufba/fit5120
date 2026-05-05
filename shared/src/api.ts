import type { Coordinate, Difficulty, RoutePayload, RouteOption, ScoringBreakdown, UserLevel } from './route.js';

// ── Generic API Wrapper ─────────────────────────────────────────

export interface ApiError {
  error: string;
  details?: string;
}

// ── Route Planning ──────────────────────────────────────────────

export interface PlanRouteRequest {
  start: Coordinate;
  end: Coordinate;
}

export interface PlanRouteResponse {
  userLevel: UserLevel;
  recommendedRoute: RoutePayload;
  alternatives: RoutePayload[];
  routeOptions: RouteOption[];
  scoringBreakdown: ScoringBreakdown;
}

// ── Route Plan History ──────────────────────────────────────────

export interface RoutePlanHistoryItem {
  id: string;
  createdAt: string;
  start: Coordinate | null;
  end: Coordinate | null;
  planPayload: PlanRouteResponse;
}

export interface RoutePlanHistoryResponse {
  history: RoutePlanHistoryItem[];
}

export interface DeleteRoutePlanHistoryResponse {
  ok: boolean;
  deleted: boolean;
}

export interface ClearRoutePlanHistoryResponse {
  ok: boolean;
  deletedCount: number;
}

// ── Hazard Query ────────────────────────────────────────────────

export interface HazardQueryParams {
  bbox?: string; // "west,south,east,north"
  layers?: string; // comma-separated hazard types
}
