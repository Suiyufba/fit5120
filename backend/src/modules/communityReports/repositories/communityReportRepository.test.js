import test from 'node:test';
import assert from 'node:assert/strict';

import {
  COMMUNITY_REPORT_TTL_MS,
  createCommunityReport,
  listCommunityReports,
  purgeExpiredCommunityReports,
} from './communityReportRepository.js';

// These tests exercise the in-memory fallback path (no DATABASE_URL).
// They assume getPgPool() returns null under NODE_ENV=test.

function validPayload(overrides = {}) {
  return {
    title: 'Test hazard',
    description: 'Test description long enough',
    locationName: 'Test location',
    hazardType: 'trail',
    severity: 'moderate',
    reporterName: 'Test reporter',
    latitude: -37.8,
    longitude: 144.95,
    ...overrides,
  };
}

test('TTL constant is 24 hours', () => {
  assert.equal(COMMUNITY_REPORT_TTL_MS, 24 * 60 * 60 * 1000);
});

test('listCommunityReports excludes reports older than 24 hours', async () => {
  const created = await createCommunityReport(validPayload({ title: 'Fresh report' }));
  assert.equal(created.storage, 'memory');
  assert.ok(created.report, 'expected fresh report to be created');

  // Directly age the freshly-created report by rewriting its reportedAt to 25h ago.
  const record = created.report;
  record.reportedAt = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();

  const { reports } = await listCommunityReports(50);
  const still = reports.find((item) => item.id === record.id);
  assert.equal(still, undefined, 'aged report should not appear in list');
});

test('purgeExpiredCommunityReports removes aged in-memory entries', async () => {
  const fresh = await createCommunityReport(validPayload({ title: 'Fresh item' }));
  const stale = await createCommunityReport(validPayload({ title: 'Stale item' }));
  stale.report.reportedAt = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  const { removed, storage } = await purgeExpiredCommunityReports();
  assert.equal(storage, 'memory');
  assert.ok(removed >= 1, `expected at least one report removed, got ${removed}`);

  const { reports } = await listCommunityReports(50);
  assert.ok(
    reports.some((item) => item.id === fresh.report.id),
    'fresh report should survive purge'
  );
  assert.ok(
    !reports.some((item) => item.id === stale.report.id),
    'stale report should be purged'
  );
});
