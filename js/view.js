import { aqiCategory, isNumber, localTime, temperature, weatherAppearance, windDirection } from './model.js';

const $ = id => document.getElementById(id);
const text = (id, value) => { $(id).textContent = value; };
const number = (value, digits = 0) => isNumber(value)
  ? new Intl.NumberFormat('vi-VN', { maximumFractionDigits: digits }).format(value) : '—';
const temp = (value, unit) => isNumber(value) ? `${number(temperature(value, unit))}°${unit}` : '—';

function element(tag, className, content) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (content !== undefined) node.textContent = content;
  return node;
}

function icon(source, className) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('aria-hidden', 'true');
  if (className) svg.setAttribute('class', className);
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttribute('href', source);
  svg.append(use);
  return svg;
}

export function setLoading(loading) {
  $('dashboard').setAttribute('aria-busy', String(loading));
  $('dashboard').classList.toggle('is-loading', loading);
  $('refresh-button').disabled = loading;
}

export function showNotice(type, message, retry = false) {
  $('notice').hidden = !message;
  $('notice').dataset.type = type;
  text('notice-text', message ?? '');
  $('retry-button').hidden = !retry;
}

export function searchFeedback(message = '', searching = false) {
  text('search-feedback', message);
  $('search-feedback').classList.toggle('searching', searching);
  $('city-input').setAttribute('aria-invalid', String(Boolean(message && !searching)));
  $('search-button').disabled = searching;
}

export function closeResults() {
  $('search-results').hidden = true;
  $('search-results').replaceChildren();
}

export function renderSearchResults(locations) {
  const results = $('search-results');
  results.replaceChildren(element('p', '', 'Chọn đúng thành phố và quốc gia'));
  const list = element('ul');
  locations.forEach((location, index) => {
    const button = element('button', '', location.name);
    button.type = 'button';
    button.dataset.result = String(index);
    button.append(element('span', '', [location.admin1, location.country].filter(Boolean).join(' · ')));
    const item = element('li');
    item.append(button);
    list.append(item);
  });
  results.append(list);
  results.hidden = false;
}

export function renderQuickCities(locations) {
  $('quick-cities').replaceChildren(...locations.map((location, index) => {
    const button = element('button', 'city-link', location.name);
    button.type = 'button';
    button.dataset.city = String(index);
    return button;
  }));
}

export function updateUnitButtons(unit) {
  document.querySelectorAll('[data-unit]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.unit === unit)));
}

export function updateClock(timezone) {
  text('city-clock', `${localTime(Date.now() / 1000, timezone, { hour: '2-digit', minute: '2-digit' })} · Giờ địa phương`);
}

export function updateDataStatus(bundle, cached) {
  const time = new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', timeZone: bundle.weather.timezone }).format(bundle.fetchedAt);
  text('data-status', `${cached ? 'Bản đã lưu' : 'Đã tải'} lúc ${time} · ${bundle.location.name}`);
  document.querySelector('.status-dot').classList.toggle('connected', !cached && navigator.onLine);
}

function renderAir(air, error, timezone) {
  const category = aqiCategory(air?.aqi);
  const available = isNumber(air?.aqi) && air.aqi >= 0;
  const fraction = available ? Math.min(air.aqi, 500) / 500 : 0;
  document.querySelector('.air-card').style.setProperty('--aqi-color', category.color);
  text('aqi-number', number(air?.aqi, 1));
  text('aqi-category', category.label);
  text('pm25', number(air?.pm25, 1));
  text('pm10', number(air?.pm10, 1));
  text('aqi-gauge-title', available ? `US AQI ${number(air.aqi, 1)}, ${category.label}. Thang 0 đến 500.` : 'Chưa có chỉ số AQI');
  $('aqi-arc').style.strokeDasharray = `${fraction * 100} 100`;
  const angle = Math.PI * (1 - fraction);
  $('aqi-marker').setAttribute('cx', String(120 + 92 * Math.cos(angle)));
  $('aqi-marker').setAttribute('cy', String(120 - 92 * Math.sin(angle)));
  $('aqi-marker').style.display = available ? '' : 'none';
  text('air-note', error?.message ?? (air
    ? `Giờ dữ liệu ${localTime(air.time, timezone, { hour: '2-digit', minute: '2-digit' })} · Mô hình CAMS qua Open-Meteo.`
    : 'Chưa có dữ liệu không khí cho vị trí này.'));
}

function renderForecast(weather, unit) {
  const today = localTime(weather.current.time, weather.timezone, { year: 'numeric', month: '2-digit', day: '2-digit' });
  const cards = weather.daily.map(day => {
    const appearance = weatherAppearance(day.code);
    const sameDay = localTime(day.time, weather.timezone, { year: 'numeric', month: '2-digit', day: '2-digit' }) === today;
    const card = element('article', `forecast-card${sameDay ? ' today' : ''}`);
    card.append(element('h3', '', sameDay ? 'Hôm nay' : localTime(day.time, weather.timezone, { weekday: 'long' })),
      element('p', 'forecast-date', localTime(day.time, weather.timezone, { day: '2-digit', month: '2-digit' })),
      icon(`assets/weather.svg#${appearance.kind}`, 'forecast-icon'),
      element('p', 'forecast-condition', appearance.description));
    const temperatures = element('p', 'forecast-temperatures');
    temperatures.setAttribute('aria-label', `Cao nhất ${temp(day.high, unit)}, thấp nhất ${temp(day.low, unit)}`);
    temperatures.append(element('strong', '', `${number(temperature(day.high, unit))}°`), element('span', '', `${number(temperature(day.low, unit))}°`));
    const rain = element('p', 'forecast-rain');
    rain.setAttribute('aria-label', `Xác suất mưa cao nhất ${number(day.rain)} phần trăm`);
    rain.append(icon('assets/ui-icons.svg#drop'), element('span', '', `${number(day.rain)}%`));
    card.append(temperatures, rain);
    return card;
  });
  $('forecast-rail').replaceChildren(...cards);
  text('forecast-heading', `Dự báo ${weather.daily.length} ngày`);
}

function renderHourlyTable(weather, unit) {
  text('table-temperature-unit', `Nhiệt độ (°${unit})`);
  text('hourly-caption', `Nhiệt độ và độ ẩm theo múi giờ ${weather.timezone}`);
  $('hourly-table-body').replaceChildren(...weather.hourly.map(hour => {
    const row = element('tr');
    row.append(element('th', '', localTime(hour.time, weather.timezone, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })),
      element('td', '', number(temperature(hour.temperature, unit), 1)), element('td', '', number(hour.humidity)));
    row.firstChild.scope = 'row';
    return row;
  }));
}

export function renderBundle(bundle, unit, cached = false) {
  const { weather, location, air, airError } = bundle;
  const { current } = weather;
  const appearance = weatherAppearance(current.weather_code, current.is_day);
  const root = document.documentElement;
  ['sunny', 'rainy', 'night', 'snowy', 'cloudy'].forEach(theme => root.classList.toggle(`theme-${theme}`, theme === appearance.theme));
  root.dataset.weather = appearance.theme;
  text('local-date', localTime(current.time, weather.timezone, { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }));
  text('current-heading', location.name);
  text('location-subtitle', [location.admin1 !== location.name ? location.admin1 : '', location.country].filter(Boolean).join(' · ') || 'Theo tọa độ thiết bị của bạn');
  text('weather-tag', current.is_day === 0 ? 'Ban đêm' : 'Ban ngày');
  text('current-temperature', number(temperature(current.temperature_2m, unit)));
  text('current-unit', `°${unit}`);
  text('weather-description', appearance.description);
  text('feels-like', temp(current.apparent_temperature, unit));
  $('current-icon').querySelector('use').setAttribute('href', `assets/weather.svg#${appearance.kind}`);
  $('current-icon').setAttribute('aria-label', appearance.description);
  text('humidity', number(current.relative_humidity_2m));
  text('wind-speed', number(current.wind_speed_10m, 1));
  text('wind-direction', `Hướng ${windDirection(current.wind_direction_10m)}`);
  text('pressure', number(current.surface_pressure));
  const firstDay = weather.daily[0];
  text('sunrise', localTime(firstDay.sunrise, weather.timezone, { hour: '2-digit', minute: '2-digit' }));
  text('sunset', localTime(firstDay.sunset, weather.timezone, { hour: '2-digit', minute: '2-digit' }));
  text('high-low', `Cao ${temp(firstDay.high, unit)} / Thấp ${temp(firstDay.low, unit)}`);
  text('temperature-legend', `Nhiệt độ (°${unit})`);
  text('chart-timezone', weather.timezone);
  const firstHour = weather.hourly[0].time;
  const lastHour = weather.hourly.at(-1).time;
  const format = { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' };
  text('hourly-range', `${localTime(firstHour, weather.timezone, format)} → ${localTime(lastHour, weather.timezone, format)}`);
  renderAir(air, airError, weather.timezone);
  renderForecast(weather, unit);
  renderHourlyTable(weather, unit);
  updateUnitButtons(unit);
  updateClock(weather.timezone);
  updateDataStatus(bundle, cached);
}
