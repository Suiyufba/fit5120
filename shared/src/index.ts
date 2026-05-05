// HikeShield shared type definitions
// Barrel export — import from 'hikeshield-shared'

export type {
  Hazard,
  HazardSeverity,
  HazardType,
  HazardSourceStatus,
  HazardMeta,
  HazardSnapshot,
  HazardApiResponse,
} from './hazard.js';

export type {
  Coordinate,
  RouteGeometry,
  GeographyProfile,
  KeyRisk,
  ZoneSummary,
  NoGoReasons,
  ScoringBreakdown,
  UserLevel,
  Difficulty,
  RiskLevel,
  SafetyStatus,
  GoNoGo,
  RouteCandidate,
  RoutePayload,
  RouteOption,
} from './route.js';

export type {
  ApiError,
  PlanRouteRequest,
  PlanRouteResponse,
  RoutePlanHistoryItem,
  RoutePlanHistoryResponse,
  DeleteRoutePlanHistoryResponse,
  ClearRoutePlanHistoryResponse,
  HazardQueryParams,
} from './api.js';

export type {
  User,
  RegisterRequest,
  LoginRequest,
  PasswordResetRequest,
  UpdateProfileRequest,
  UpdateSensitiveProfileRequest,
  AuthResponse,
  MeResponse,
} from './auth.js';
