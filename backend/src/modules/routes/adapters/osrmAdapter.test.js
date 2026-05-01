import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchOsrmRoutes } from './osrmAdapter.js';

const samplePoints = [
  { lat: -37.022341, lng: 144.593712 },
  { lat: -37.017629, lng: 144.47465 },
];

const samplePayload = {
  routes: [
    {
      distance: 1000,
      duration: 900,
      geometry: {
        coordinates: [
          [144.593712, -37.022341],
          [144.47465, -37.017629],
        ],
      },
    },
  ],
};

function makeResponse(status, payload) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return payload;
    },
  };
}

test('fetchOsrmRoutes retries transient 502 on same profile', async () => {
  const originalFetch = global.fetch;
  const calls = [];
  let count = 0;

  global.fetch = async (url) => {
    calls.push(String(url));
    count += 1;
    if (count === 1) return makeResponse(502, { error: 'bad gateway' });
    return makeResponse(200, samplePayload);
  };

  try {
    const routes = await fetchOsrmRoutes(samplePoints, { alternatives: true });
    assert.equal(routes.length, 1);
    assert.equal(routes[0].travelProfile, 'foot');
    assert.equal(calls.length, 2);
    assert.match(calls[0], /\/route\/v1\/foot\//);
    assert.match(calls[1], /\/route\/v1\/foot\//);
  } finally {
    global.fetch = originalFetch;
  }
});

test('fetchOsrmRoutes falls back to secondary profile when primary keeps failing', async () => {
  const originalFetch = global.fetch;
  const calls = [];

  global.fetch = async (url) => {
    const text = String(url);
    calls.push(text);
    if (text.includes('/route/v1/foot/')) {
      return makeResponse(502, { error: 'bad gateway' });
    }
    if (text.includes('/route/v1/walking/')) {
      return makeResponse(200, samplePayload);
    }
    return makeResponse(500, { error: 'unexpected profile' });
  };

  try {
    const routes = await fetchOsrmRoutes(samplePoints, { alternatives: true });
    assert.equal(routes.length, 1);
    assert.equal(routes[0].travelProfile, 'walking');
    const footCalls = calls.filter((url) => url.includes('/route/v1/foot/')).length;
    const walkingCalls = calls.filter((url) => url.includes('/route/v1/walking/')).length;
    assert.equal(footCalls, 2);
    assert.equal(walkingCalls, 1);
  } finally {
    global.fetch = originalFetch;
  }
});
