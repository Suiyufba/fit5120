import {
  createCommunityReport,
  listCommunityReports,
} from '../modules/communityReports/repositories/communityReportRepository.js';
import {
  createCommunityReportImage,
  findCommunityReportImage,
} from '../modules/communityReports/repositories/communityReportImageRepository.js';

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

function buildImagePublicUrl(req, imageId) {
  const proto = req.protocol;
  const host = req.get('host');
  return `${proto}://${host}/api/community-reports/images/${imageId}`;
}

export async function postCommunityReportImage(req, res) {
  try {
    const result = await createCommunityReportImage(req.body || {});
    if (result.error) {
      res.status(400).json({ error: result.error });
      return;
    }

    res.status(201).json({
      id: result.id,
      url: buildImagePublicUrl(req, result.id),
      byteSize: result.byteSize,
      storage: result.storage,
    });
  } catch (error) {
    console.error('Community report image upload failed:', error.message);
    res.status(500).json({ error: 'Failed to upload report image' });
  }
}

export async function getCommunityReportImage(req, res) {
  try {
    const record = await findCommunityReportImage(req.params.id);
    if (!record) {
      res.status(404).json({ error: 'Image not found' });
      return;
    }

    res.set('Content-Type', record.mime || 'application/octet-stream');
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    res.send(record.buffer);
  } catch (error) {
    console.error('Community report image fetch failed:', error.message);
    res.status(500).json({ error: 'Failed to load report image' });
  }
}
