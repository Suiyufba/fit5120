/**
 * Unified API error codes.
 */
export const ErrorCode = {
  ROUTE_TOO_FAR: 'ROUTE_TOO_FAR',
  ROUTE_TOO_CLOSE: 'ROUTE_TOO_CLOSE',
  ROUTE_INVALID_POINT: 'ROUTE_INVALID_POINT',
  ROUTE_SERVICE_DOWN: 'ROUTE_SERVICE_DOWN',
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_EMAIL_EXISTS: 'AUTH_EMAIL_EXISTS',
  AUTH_UNAUTHORIZED: 'AUTH_UNAUTHORIZED',
  AUTH_RESET_FAILED: 'AUTH_RESET_FAILED',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  HAZARD_FETCH_FAILED: 'HAZARD_FETCH_FAILED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
  CORS_DENIED: 'CORS_DENIED',
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];

/**
 * Standard API error response shape.
 */
export interface ApiError {
  error: string;
  code: ErrorCodeType;
  details?: Record<string, unknown>;
}

export function apiError(message: string, code: ErrorCodeType, details?: Record<string, unknown>): ApiError {
  return { error: message, code, ...(details ? { details } : {}) };
}
