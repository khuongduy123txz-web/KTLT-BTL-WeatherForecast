/** Pure data functions: no DOM or network, so edge cases can be tested in Node. */
export const isNumber = value => typeof value === 'number' && Number.isFinite(value);
export const toFahrenheit = celsius => isNumber(celsius) ? celsius * 9 / 5 + 32 : null;
export const temperature = (celsius, unit) => unit === 'F' ? toFahrenheit(celsius) : celsius;

export function validLocation(location) {
  return Boolean(location && typeof location.name === 'string' && location.name.trim()
    && isNumber(location.latitude) && Math.abs(location.latitude) <= 90
    && isNumber(location.longitude) && Math.abs(location.longitude) <= 180);
}

const descriptions = {
  0: 'Trời quang', 1: 'Ít mây', 2: 'Mây rải rác', 3: 'Nhiều mây',
  45: 'Sương mù', 48: 'Sương mù đóng băng',
  51: 'Mưa phùn nhẹ', 53: 'Mưa phùn', 55: 'Mưa phùn dày',
  56: 'Mưa phùn băng nhẹ', 57: 'Mưa phùn băng',
  61: 'Mưa nhẹ', 63: 'Mưa vừa', 65: 'Mưa to', 66: 'Mưa băng nhẹ', 67: 'Mưa băng to',
  71: 'Tuyết nhẹ', 73: 'Tuyết rơi', 75: 'Tuyết dày', 77: 'Tuyết hạt',
  80: 'Mưa rào nhẹ', 81: 'Mưa rào', 82: 'Mưa rào to',
  85: 'Mưa tuyết nhẹ', 86: 'Mưa tuyết to',
  95: 'Dông', 96: 'Dông kèm mưa đá', 97: 'Dông mạnh', 99: 'Dông kèm mưa đá to',
};

/** Night styling has priority; the icon still expresses rain, snow or storms. */
export function weatherAppearance(code, isDay = 1) {
  let kind = 'cloud';
  if ([0, 1].includes(code)) kind = isDay === 0 ? 'moon' : 'sun';
  else if (code === 2) kind = isDay === 0 ? 'moon-cloud' : 'sun-cloud';
  else if ([45, 48].includes(code)) kind = 'fog';
  else if ([71, 73, 75, 77, 85, 86].includes(code)) kind = 'snow';
  else if ([95, 96, 97, 99].includes(code)) kind = 'storm';
  else if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) kind = 'rain';
  const theme = isDay === 0 ? 'night' : kind === 'sun' || kind === 'sun-cloud' ? 'sunny'
    : kind === 'snow' ? 'snowy' : kind === 'rain' || kind === 'storm' ? 'rainy' : 'cloudy';
  return { kind, theme, description: descriptions[code] ?? 'Chưa xác định điều kiện' };
}

/** US AQI thresholds; null is unavailable, never misrepresented as zero/good. */
export function aqiCategory(value) {
  if (!isNumber(value) || value < 0) return { label: 'Chưa có dữ liệu', color: '#687384', level: 'unknown' };
  if (value <= 50) return { label: 'Tốt', color: '#16845b', level: 'good' };
  if (value <= 100) return { label: 'Trung bình', color: '#946800', level: 'moderate' };
  if (value <= 150) return { label: 'Kém với nhóm nhạy cảm', color: '#b85114', level: 'sensitive' };
  if (value <= 200) return { label: 'Không lành mạnh', color: '#c02e3d', level: 'unhealthy' };
  if (value <= 300) return { label: 'Rất không lành mạnh', color: '#89424e', level: 'very-unhealthy' };
  return { label: 'Nguy hại', color: '#7e2536', level: 'hazardous' };
}

export function localTime(epoch, timezone, options = {}) {
  if (!isNumber(epoch)) return '—';
  return new Intl.DateTimeFormat('vi-VN', { timeZone: timezone, ...options }).format(epoch * 1000);
}

export function windDirection(degrees) {
  if (!isNumber(degrees)) return '—';
  return ['Bắc', 'Đông Bắc', 'Đông', 'Đông Nam', 'Nam', 'Tây Nam', 'Tây', 'Tây Bắc'][Math.round(degrees / 45) % 8];
}

/** Keep the upcoming 24 actual hourly instants, independent of the viewer's timezone. */
export function next24Hours(hourly, referenceTime) {
  if (!Array.isArray(hourly?.time)) throw new Error('INVALID_HOURLY');
  const start = hourly.time.findIndex(time => isNumber(time) && time >= referenceTime);
  if (start < 0) throw new Error('INVALID_HOURLY');
  const hours = hourly.time.slice(start, start + 24).map((time, index) => ({
    time,
    temperature: isNumber(hourly.temperature_2m?.[start + index]) ? hourly.temperature_2m[start + index] : null,
    humidity: isNumber(hourly.relative_humidity_2m?.[start + index]) ? hourly.relative_humidity_2m[start + index] : null,
  }));
  if (hours.length !== 24 || hours.some(hour => !isNumber(hour.time))) throw new Error('INVALID_HOURLY');
  return hours;
}

export function normalizeWeather(raw) {
  if (!raw?.current || !isNumber(raw.current.time) || typeof raw.timezone !== 'string' || !raw.timezone
      || !Array.isArray(raw.daily?.time)
      || raw.daily.time.length < 5 || !raw.daily.time.every(isNumber)) throw new Error('INVALID_WEATHER');
  // Validate API timezone once; Intl then formats every location without hard-coded UTC offsets.
  new Intl.DateTimeFormat('vi-VN', { timeZone: raw.timezone }).format();
  const daily = raw.daily;
  return {
    timezone: raw.timezone,
    current: raw.current,
    hourly: next24Hours(raw.hourly, raw.current.time),
    daily: daily.time.slice(0, 7).map((time, index) => ({
      time,
      code: daily.weather_code?.[index],
      high: daily.temperature_2m_max?.[index] ?? null,
      low: daily.temperature_2m_min?.[index] ?? null,
      rain: daily.precipitation_probability_max?.[index] ?? null,
      sunrise: daily.sunrise?.[index] ?? null,
      sunset: daily.sunset?.[index] ?? null,
    })),
  };
}

/** AQI is hourly model data: select the last available hour, never a future reading. */
export function normalizeAir(raw, referenceTime) {
  if (!Array.isArray(raw?.hourly?.time)) throw new Error('INVALID_AIR');
  let index = -1;
  raw.hourly.time.forEach((time, i) => { if (isNumber(time) && time <= referenceTime) index = i; });
  if (index < 0 || referenceTime - raw.hourly.time[index] > 3 * 3600) throw new Error('INVALID_AIR');
  const read = name => isNumber(raw.hourly[name]?.[index]) && raw.hourly[name][index] >= 0 ? raw.hourly[name][index] : null;
  return { time: raw.hourly.time[index], aqi: read('us_aqi'), pm25: read('pm2_5'), pm10: read('pm10') };
}
