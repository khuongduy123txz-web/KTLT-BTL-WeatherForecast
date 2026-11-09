import { API } from './config.js';
import { validLocation, isNumber } from './model.js';

const CACHE_KEY = 'weather-air:cache:v1';
const UNIT_KEY = 'weather-air:unit:v1';

export function saveCache(bundle) {
  try {
    // Do not serialize Error instances; restore a simple message for partial AQI failures.
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ...bundle, airError: bundle.airError ? { message: bundle.airError.message } : null }));
    return true;
  } catch { return false; } // Private browsing or full storage must not break the dashboard.
}

export function readCache(now = Date.now()) {
  try {
    const bundle = JSON.parse(localStorage.getItem(CACHE_KEY));
    if (!validLocation(bundle?.location) || !isNumber(bundle.fetchedAt)
        || bundle.fetchedAt > now + 60000 || now - bundle.fetchedAt > API.maxCacheAge
        || !isNumber(bundle.weather?.current?.time) || !Array.isArray(bundle.weather?.hourly)
        || bundle.weather.hourly.length !== 24 || !Array.isArray(bundle.weather?.daily)
        || bundle.weather.daily.length < 5 || typeof bundle.weather.timezone !== 'string') return null;
    new Intl.DateTimeFormat('vi-VN', { timeZone: bundle.weather.timezone }).format();
    if (!bundle.weather.hourly.every(hour => hour && isNumber(hour.time))
        || !bundle.weather.daily.every(day => day && isNumber(day.time))) return null;
    return bundle;
  } catch { return null; }
}

export function readUnit() {
  try { return localStorage.getItem(UNIT_KEY) === 'F' ? 'F' : 'C'; }
  catch { return 'C'; }
}

export function saveUnit(unit) {
  try { localStorage.setItem(UNIT_KEY, unit); } catch { /* Session preference still works. */ }
}
