import { planSaferRoute } from '../modules/routes/services/routePlannerService.js';

export async function postPlanRoute(req, res) {
  try {
    const payload = await planSaferRoute({
      userId: req.auth?.userId,
      start: req.body?.start,
      end: req.body?.end
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
