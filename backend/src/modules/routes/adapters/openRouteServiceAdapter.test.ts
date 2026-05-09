import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchOpenRouteServiceRoutes } from './openRouteServiceAdapter.js';

const samplePoints = [
  { lat: -37.022341, lng: 144.593712 },
  { lat: -37.017629, lng: 144.47465 },
];

const samplePayload = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        summary: {
          distance: 1000,
          duration: 900,
        },
      },
      geometry: {
        type: 'LineString',
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

test('fetchOpenRouteServiceRoutes posts foot-hiking directions with authorization', async () => {
  const originalFetch = global.fetch;
  const calls = [];

  global.fetch = async (url, options) => {
    calls.push({ url: String(url), options });
    return makeResponse(200, samplePayload);
  };

  try {
    const routes = await fetchOpenRouteServiceRoutes(samplePoints, { alternatives: true });
    assert.equal(routes.length, 1);
    assert.equal(routes[0].travelProfile, 'foot-hiking');
    assert.equal(calls.length, 1);
    assert.match(calls[0].url, /\/v2\/directions\/foot-hiking\/geojson$/);
    assert.equal(calls[0].options.method, 'POST');
    assert.equal(calls[0].options.headers.Authorization, '');
    assert.deepEqual(JSON.parse(calls[0].options.body).coordinates, [
      [144.593712, -37.022341],
      [144.47465, -37.017629],
    ]);
    const body = JSON.parse(calls[0].options.body);
    assert.equal(body.alternative_routes.target_count, 3);
    assert.deepEqual(body.radiuses, [1000, 1000]);
  } finally {
    global.fetch = originalFetch;
  }
});

test('fetchOpenRouteServiceRoutes retries transient 502 on same profile', async () => {
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
    const routes = await fetchOpenRouteServiceRoutes(samplePoints, { alternatives: true });
    assert.equal(routes.length, 1);
    assert.equal(routes[0].travelProfile, 'foot-hiking');
    assert.equal(calls.length, 2);
    assert.match(calls[0], /\/v2\/directions\/foot-hiking\/geojson$/);
    assert.match(calls[1], /\/v2\/directions\/foot-hiking\/geojson$/);
  } finally {
    global.fetch = originalFetch;
  }
});

test('fetchOpenRouteServiceRoutes falls back to walking profile when hiking keeps failing', async () => {
  const originalFetch = global.fetch;
  const calls = [];

  global.fetch = async (url) => {
    const text = String(url);
    calls.push(text);
    if (text.includes('/v2/directions/foot-hiking/')) {
      return makeResponse(502, { error: 'bad gateway' });
    }
    if (text.includes('/v2/directions/foot-walking/')) {
      return makeResponse(200, samplePayload);
    }
    return makeResponse(500, { error: 'unexpected profile' });
  };

  try {
    const routes = await fetchOpenRouteServiceRoutes(samplePoints, { alternatives: true });
    assert.equal(routes.length, 1);
    assert.equal(routes[0].travelProfile, 'foot-walking');
    const hikingCalls = calls.filter((url) => url.includes('/v2/directions/foot-hiking/')).length;
    const walkingCalls = calls.filter((url) => url.includes('/v2/directions/foot-walking/')).length;
    assert.equal(hikingCalls, 2);
    assert.equal(walkingCalls, 1);
  } finally {
    global.fetch = originalFetch;
  }
});
