import {
  createCommunityReport,
  listCommunityReports,
} from '../modules/communityReports/repositories/communityReportRepository.js';

export async function getCommunityReports(req, res) {
  try {
    const limit = req.query.limit || 50;
    const { reports, storage } = await listCommunityReports(limit);

    res.json({
      reports,
      storage,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Community reports fetch failed:', error.message);
    res.status(500).json({ reports: [], error: 'Failed to fetch community reports' });
  }
}

export async function postCommunityReport(req, res) {
  try {
    const result = await createCommunityReport(req.body || {});

    if (result.error) {
      res.status(400).json({ error: result.error });
      return;
    }

    res.status(201).json({ report: result.report, storage: result.storage });
  } catch (error) {
    console.error('Community report create failed:', error.message);
    res.status(500).json({ error: 'Failed to submit community report' });
  }
}
