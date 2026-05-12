import type { Request, Response } from 'express';
import { config } from '../config/index.js';
import {
  createCommunityReport,
  listCommunityReports,
} from '../modules/communityReports/repositories/communityReportRepository.js';
import {
  createCommunityReportImage,
  findCommunityReportImage,
} from '../modules/communityReports/repositories/communityReportImageRepository.js';

export async function getCommunityReports(req: Request, res: Response): Promise<void> {
  try {
    const limit = req.query.limit || 50;
    const { reports, storage } = await listCommunityReports(Number(limit));

    res.json({
      reports,
      storage,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Community reports fetch failed:', message);
    res.status(500).json({ reports: [], error: 'Failed to fetch community reports' });
  }
}

export async function postCommunityReport(req: Request, res: Response): Promise<void> {
  try {
    const result = await createCommunityReport(req.body || {});

    if ('error' in result && result.error) {
      res.status(400).json({ error: String(result.error) });
      return;
    }

    const success = result as { report: Record<string, unknown>; storage: string };
    res.status(201).json({ report: success.report, storage: success.storage });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Community report create failed:', message);
    res.status(500).json({ error: 'Failed to submit community report' });
  }
}

function buildImagePublicUrl(req: Request, imageId: string): string {
  // Use the configured canonical origin so returned URLs never embed an
  // attacker-controlled Host header.
  return `${config.publicApiOrigin}/api/community-reports/images/${imageId}`;
}

export async function postCommunityReportImage(req: Request, res: Response): Promise<void> {
  try {
    const result = await createCommunityReportImage(req.body || {});
    if ('error' in result && result.error) {
      res.status(400).json({ error: String(result.error) });
      return;
    }

    const success = result as { id: string; byteSize: number; storage: string };
    res.status(201).json({
      id: success.id,
      url: buildImagePublicUrl(req, success.id),
      byteSize: success.byteSize,
      storage: success.storage,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Community report image upload failed:', message);
    res.status(500).json({ error: 'Failed to upload report image' });
  }
}

export async function getCommunityReportImage(req: Request, res: Response): Promise<void> {
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
    const message = error instanceof Error ? error.message : String(error);
    console.error('Community report image fetch failed:', message);
    res.status(500).json({ error: 'Failed to load report image' });
  }
}
