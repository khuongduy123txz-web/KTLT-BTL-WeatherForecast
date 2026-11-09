import { API } from './config.js';
import { normalizeAir, normalizeWeather, validLocation } from './model.js';

export class AppError extends Error {
  constructor(code, message, retryAfter = null) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.retryAfter = retryAfter;
  }
}

/** Shared HTTP boundary: status checks, JSON errors, timeout and caller cancellation. */
export async function fetchJSON(url, { signal, timeout = API.timeout } = {}) {
  const controller = new AbortController();
  let timedOut = false;
  const cancel = () => controller.abort();
  if (signal?.aborted) controller.abort();
  else signal?.addEventListener('abort', cancel, { once: true });
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeout);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
    if (!response.ok) {
      if (response.status === 429) {
        const header = response.headers.get('Retry-After');
        const seconds = header === null ? NaN : Number(header);
        const retryAfter = Number.isFinite(seconds) ? Date.now() + Math.max(1, seconds) * 1000
          : Number.isFinite(Date.parse(header)) ? Date.parse(header) : Date.now() + 60000;
        throw new AppError('RATE_LIMIT', 'Dịch vụ đang giới hạn lượt gọi. Vui lòng chờ trước khi thử lại.', retryAfter);
      }
      if ([401, 403].includes(response.status)) throw new AppError('ACCESS', 'Dịch vụ từ chối truy cập. Hãy kiểm tra cấu hình hoặc thử lại sau.');
      throw new AppError('HTTP', `Dịch vụ chưa thể trả dữ liệu (HTTP ${response.status}). Vui lòng thử lại.`);
    }
    let data;
    try { data = await response.json(); }
    catch { throw new AppError('INVALID_DATA', 'Phản hồi từ dịch vụ không phải JSON hợp lệ.'); }
    if (!data || typeof data !== 'object' || Array.isArray(data) || data.error) {
      throw new AppError('INVALID_DATA', 'Dịch vụ trả về dữ liệu không hợp lệ.');
    }
    return data;
  } catch (error) {
    if (signal?.aborted) throw new DOMException('Request cancelled', 'AbortError');
    if (timedOut) throw new AppError('TIMEOUT', 'Kết nối quá thời gian chờ. Hãy thử lại khi mạng ổn định.');
    if (error instanceof AppError) throw error;
    throw new AppError('NETWORK', 'Không kết nối được dịch vụ. Hãy kiểm tra mạng và thử lại.');
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', cancel);
  }
}

function endpoint(base, parameters) {
  const url = new URL(base);
  url.search = new URLSearchParams(parameters).toString();
  return url;
}

export async function searchCities(query, signal) {
  const name = query.trim();
  if (name.length < 2 || name.length > 100) throw new AppError('SEARCH', 'Nhập tên thành phố từ 2 đến 100 ký tự.');
  const data = await fetchJSON(endpoint(API.geocoding, { name, count: 6, language: 'vi', format: 'json' }), { signal });
  const locations = (Array.isArray(data.results) ? data.results : []).map(place => ({
    name: place.name, country: place.country ?? '', admin1: place.admin1 ?? '',
    latitude: place.latitude, longitude: place.longitude,
  })).filter(validLocation);
  if (!locations.length) throw new AppError('NOT_FOUND', 'Không tìm thấy thành phố. Thử tên khác hoặc tên không dấu, ví dụ Hanoi.');
  return locations;
}

/** Weather and AQI start together. AQI failure is non-fatal to weather. */
export async function fetchDashboard(location, signal) {
  if (!validLocation(location)) throw new AppError('LOCATION', 'Tọa độ địa điểm không hợp lệ.');
  const common = { latitude: location.latitude, longitude: location.longitude, timezone: 'auto', timeformat: 'unixtime' };
  const weatherURL = endpoint(API.weather, {
    ...common,
    current: 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m',
    hourly: 'temperature_2m,relative_humidity_2m',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max',
    wind_speed_unit: 'kmh', temperature_unit: 'celsius', forecast_days: 7,
  });
  const airURL = endpoint(API.air, { ...common, hourly: 'us_aqi,pm2_5,pm10', forecast_days: 2 });
  const [rawWeather, airResult] = await Promise.all([
    fetchJSON(weatherURL, { signal }),
    fetchJSON(airURL, { signal }).then(data => ({ data, error: null })).catch(error => {
      if (error.name === 'AbortError') throw error;
      return { data: null, error };
    }),
  ]);
  let weather;
  try { weather = normalizeWeather(rawWeather); }
  catch { throw new AppError('INVALID_DATA', 'Dữ liệu thời tiết bị thiếu hoặc sai cấu trúc. Vui lòng thử lại.'); }
  let air = null;
  let airError = airResult.error;
  if (airResult.data) {
    try { air = normalizeAir(airResult.data, weather.current.time); }
    catch { airError = new AppError('AIR_DATA', 'Dữ liệu không khí chưa có cho giờ hiện tại.'); }
  }
  return { location, weather, air, airError, fetchedAt: Date.now() };
}

/** Request location only after the user presses the location button. */
export function detectLocation() {
  return new Promise((resolve, reject) => {
    if (!globalThis.isSecureContext) return reject(new AppError('GEO_SECURE', 'Định vị cần HTTPS hoặc localhost. Bạn vẫn có thể tìm theo tên thành phố.'));
    if (!navigator.geolocation) return reject(new AppError('GEO_UNAVAILABLE', 'Trình duyệt không hỗ trợ định vị. Hãy tìm theo tên thành phố.'));
    navigator.geolocation.getCurrentPosition(position => resolve({
      name: 'Vị trí của bạn', country: '', admin1: '',
      latitude: position.coords.latitude, longitude: position.coords.longitude,
    }), error => {
      const messages = {
        1: 'Bạn chưa cho phép định vị. Hãy cấp quyền trong trình duyệt hoặc tìm theo tên thành phố.',
        2: 'Chưa xác định được vị trí. Hãy bật dịch vụ vị trí hoặc tìm tên thành phố.',
        3: 'Định vị quá thời gian chờ. Hãy thử lại hoặc tìm tên thành phố.',
      };
      reject(new AppError('GEOLOCATION', messages[error.code] ?? messages[2]));
    }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 });
  });
}
