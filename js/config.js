/** Public, keyless endpoints. Never put a private API key in browser code. */
export const API = Object.freeze({
  weather: 'https://api.open-meteo.com/v1/forecast',
  air: 'https://air-quality-api.open-meteo.com/v1/air-quality',
  geocoding: 'https://geocoding-api.open-meteo.com/v1/search',
  timeout: 12000,
  refreshInterval: 10 * 60 * 1000,
  maxCacheAge: 24 * 60 * 60 * 1000,
});

export const DEFAULT_LOCATION = Object.freeze({
  name: 'Hà Nội', country: 'Việt Nam', admin1: 'Hà Nội',
  latitude: 21.0285, longitude: 105.8542,
});

export const QUICK_LOCATIONS = Object.freeze([
  DEFAULT_LOCATION,
  { name: 'TP. Hồ Chí Minh', country: 'Việt Nam', admin1: '', latitude: 10.8231, longitude: 106.6297 },
  { name: 'Đà Nẵng', country: 'Việt Nam', admin1: '', latitude: 16.0544, longitude: 108.2022 },
]);
