import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readCache, readUnit, saveCache } from '../js/storage.js';
import { normalizeWeather } from '../js/model.js';
import { location, weatherFixture } from './fixtures.js';

const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
afterEach(() => { if (original) Object.defineProperty(globalThis, 'localStorage', original); else delete globalThis.localStorage; });
function storage(value = null) {
  const map = new Map();
  if (value !== null) map.set('weather-air:cache:v1', value);
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: key => map.get(key) ?? null, setItem: (key, data) => map.set(key, data) } });
}
const bundle = () => ({ location, weather: normalizeWeather(weatherFixture()), air: null, airError: null, fetchedAt: Date.now() });
test('valid cache survives serialization and old cache expires', () => {
  storage();
  const data = bundle();
  assert.equal(saveCache(data), true);
  assert.equal(readCache().location.name, location.name);
  assert.equal(readCache(Date.now() + 25 * 3600000), null);
});
test('corrupt JSON and malformed cache are ignored safely', () => {
  storage('{broken'); assert.equal(readCache(), null);
  storage(JSON.stringify({ location })); assert.equal(readCache(), null);
  const data = bundle(); data.weather.hourly[0] = null;
  storage(JSON.stringify(data)); assert.equal(readCache(), null);
});
test('blocked browser storage does not crash loading or unit controls', () => {
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('Denied'); } });
  assert.equal(readCache(), null);
  assert.equal(readUnit(), 'C');
  assert.equal(saveCache(bundle()), false);
});
