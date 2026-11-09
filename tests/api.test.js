import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { AppError, detectLocation, fetchDashboard, fetchJSON, searchCities } from '../js/api.js';
import { airFixture, location, weatherFixture } from './fixtures.js';

const originalFetch = globalThis.fetch;
const originalSecure = Object.getOwnPropertyDescriptor(globalThis, 'isSecureContext');
const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalSecure) Object.defineProperty(globalThis, 'isSecureContext', originalSecure); else delete globalThis.isSecureContext;
  if (originalNavigator) Object.defineProperty(globalThis, 'navigator', originalNavigator); else delete globalThis.navigator;
});
const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), { status, headers });

test('HTTP 429 retains Retry-After for caller backoff', async () => {
  globalThis.fetch = async () => json({}, 429, { 'Retry-After': '45' });
  await assert.rejects(fetchJSON('https://example.test'), error => error.code === 'RATE_LIMIT' && error.retryAfter > Date.now() + 44000);
});
test('HTTP access failure and server failure give explicit messages', async () => {
  for (const [status, code] of [[403, 'ACCESS'], [503, 'HTTP']]) {
    globalThis.fetch = async () => json({}, status);
    await assert.rejects(fetchJSON('https://example.test'), error => error.code === code);
  }
});
test('invalid JSON and API error objects are rejected', async () => {
  globalThis.fetch = async () => new Response('<html>upstream error</html>');
  await assert.rejects(fetchJSON('https://example.test'), error => error.code === 'INVALID_DATA');
  globalThis.fetch = async () => json({ error: true, reason: 'bad parameter' });
  await assert.rejects(fetchJSON('https://example.test'), error => error.code === 'INVALID_DATA');
});
test('network failure is not confused with invalid city', async () => {
  globalThis.fetch = async () => { throw new TypeError('Failed to fetch'); };
  await assert.rejects(fetchJSON('https://example.test'), error => error.code === 'NETWORK');
});
test('request timeout aborts fetch and provides a recoverable error', async () => {
  globalThis.fetch = (_, { signal }) => new Promise((resolve, reject) => {
    signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
  });
  await assert.rejects(fetchJSON('https://example.test', { timeout: 10 }), error => error.code === 'TIMEOUT');
});
test('caller cancellation stays AbortError instead of a user-facing error', async () => {
  const controller = new AbortController();
  globalThis.fetch = (_, { signal }) => new Promise((resolve, reject) => {
    signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
  });
  const pending = fetchJSON('https://example.test', { signal: controller.signal });
  controller.abort();
  await assert.rejects(pending, error => error.name === 'AbortError');
});
test('city search encodes query and rejects nonexistent cities', async () => {
  let request;
  globalThis.fetch = async url => { request = new URL(url); return json({}); };
  await assert.rejects(searchCities('  city & city  '), error => error.code === 'NOT_FOUND');
  assert.equal(request.searchParams.get('name'), 'city & city');
  await assert.rejects(searchCities('a'), error => error.code === 'SEARCH');
});
test('weather and AQI are initiated concurrently using Promise.all', async () => {
  const pending = [];
  globalThis.fetch = url => new Promise(resolve => pending.push({ url: new URL(url), resolve }));
  const result = fetchDashboard(location);
  assert.equal(pending.length, 2, 'Both requests must start before either resolves');
  pending[0].resolve(json(weatherFixture()));
  pending[1].resolve(json(airFixture()));
  const bundle = await result;
  assert.equal(bundle.weather.hourly.length, 24);
  assert.equal(bundle.air.aqi, 68);
  assert.equal(bundle.airError, null);
});
test('AQI outage preserves the successful weather response', async () => {
  globalThis.fetch = async url => new URL(url).hostname.startsWith('air-') ? json({}, 503) : json(weatherFixture());
  const bundle = await fetchDashboard(location);
  assert.equal(bundle.weather.daily.length, 7);
  assert.equal(bundle.air, null);
  assert.ok(bundle.airError instanceof AppError);
});
test('malformed weather is a failure even if HTTP was successful', async () => {
  globalThis.fetch = async () => json({});
  await assert.rejects(fetchDashboard(location), error => error.code === 'INVALID_DATA');
});
test('geolocation denial explains how to continue with city search', async () => {
  Object.defineProperty(globalThis, 'isSecureContext', { configurable: true, value: true });
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { geolocation: { getCurrentPosition(success, failure) { failure({ code: 1 }); } } } });
  await assert.rejects(detectLocation(), error => error.code === 'GEOLOCATION' && error.message.includes('tên thành phố'));
});
test('geolocation requires a secure context', async () => {
  Object.defineProperty(globalThis, 'isSecureContext', { configurable: true, value: false });
  await assert.rejects(detectLocation(), error => error.code === 'GEO_SECURE');
});
