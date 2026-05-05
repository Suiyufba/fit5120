// ── Hazard Severity ──────────────────────────────────────────────

export type HazardSeverity = 'low' | 'moderate' | 'high' | 'extreme';

// ── Hazard Type ─────────────────────────────────────────────────

export type HazardType = 'fire' | 'flood' | 'storm' | 'heat' | 'trail' | 'other';

// ── Hazard ──────────────────────────────────────────────────────

export interface Hazard {
  id: string;
  type: HazardType;
  severity: HazardSeverity;
  title: string;
  description: string;
  source: string;
  sourceUrl?: string;
  updatedAt: string; // ISO 8601
  coordinates: [lat: number, lng: number];
  feelsLike?: number;
}

// ── Hazard Snapshot ─────────────────────────────────────────────

export interface HazardSourceStatus {
  name: string;
  ok: boolean;
  count: number;
  error: string | null;
}

export interface HazardMeta {
  count: number;
  totalBeforeFilter: number;
  sourceStatus: HazardSourceStatus[];
  lastError: string | null;
  ageMs?: number | null;
}

export interface HazardSnapshot {
  hazards: Hazard[];
  fetchedAt: string; // ISO 8601
  fromFallback: boolean;
  sourceStatus: HazardSourceStatus[];
  lastError: string | null;
}

// ── Hazard API Response ─────────────────────────────────────────

export interface HazardApiResponse {
  hazards: Hazard[];
  fetchedAt: string;
  fromFallback: boolean;
  isStale?: boolean;
  meta: HazardMeta;
}
