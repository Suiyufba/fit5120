import { planSaferRoute } from '../modules/routes/services/routePlannerService.js';
import {
  clearRoutePlanHistory,
  createRoutePlanHistoryEntry,
  deleteRoutePlanHistoryEntry,
  listRoutePlanHistory,
} from '../modules/routes/repositories/routePlanHistoryRepository.js';

function normalizeSessionId(raw) {
  return String(raw || '').trim().slice(0, 128);
}

function routeHistoryFromRow(row) {
  return {
    id: row.id,
    createdAt: row.created_at,
    start: row.start_point || {},
    end: row.end_point || {},
    planPayload: row.plan_payload || {},
  };
}

export async function postPlanRoute(req, res) {
  try {
    const sessionId = normalizeSessionId(req.headers['x-plan-session-id']);
    const payload = await planSaferRoute({
      userId: req.auth?.userId,
      start: req.body?.start,
      end: req.body?.end
    });

    await createRoutePlanHistoryEntry({
      userId: req.auth?.userId,
      sessionId,
      start: req.body?.start,
      end: req.body?.end,
      planPayload: payload,
    }).catch((error) => {
      console.warn('Failed to persist route plan history:', error.message);
    });
    res.json(payload);
  } catch (error) {
    const statusCode =
      error.message?.includes('must include numeric')
      || error.message?.includes('out of range')
        ? 400
        : error.message?.includes('User not found')
          ? 404
          : error.message?.includes('OSRM')
            ? 503
            : 500;

    res.status(statusCode).json({
      error: error.message || 'Failed to plan route'
    });
  }
}

export async function getRoutePlanHistory(req, res) {
  try {
    const sessionId = normalizeSessionId(req.headers['x-plan-session-id']);
    const rows = await listRoutePlanHistory({
      userId: req.auth?.userId,
      sessionId,
      limit: req.query?.limit || 20,
    });
    res.json({
      history: rows.map(routeHistoryFromRow),
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      history: [],
      error: error.message || 'Failed to fetch route history',
    });
  }
}

export async function deleteRoutePlanHistoryItem(req, res) {
  try {
    const sessionId = normalizeSessionId(req.headers['x-plan-session-id']);
    const deleted = await deleteRoutePlanHistoryEntry({
      entryId: req.params?.id,
      userId: req.auth?.userId,
      sessionId,
    });
    res.json({ ok: true, deleted });
  } catch (error) {
    res.status(500).json({
      error: error.message || 'Failed to delete route history item',
    });
  }
}

export async function clearRoutePlanHistoryItems(req, res) {
  try {
    const sessionId = normalizeSessionId(req.headers['x-plan-session-id']);
    const deletedCount = await clearRoutePlanHistory({
      userId: req.auth?.userId,
      sessionId,
    });
    res.json({
      ok: true,
      deletedCount,
    });
  } catch (error) {
    res.status(500).json({
      error: error.message || 'Failed to clear route history',
    });
  }
}
