import { API, DEFAULT_LOCATION, QUICK_LOCATIONS } from './js/config.js';
import { AppError, detectLocation, fetchDashboard, searchCities } from './js/api.js';
import { readCache, readUnit, saveCache, saveUnit } from './js/storage.js';
import { renderChart } from './js/charts.js';
import * as view from './js/view.js';

const $ = id => document.getElementById(id);
const state = {
  bundle: null, unit: readUnit(), metric: 'both', cached: false,
  requestId: 0, searchId: 0, geoId: 0,
  controller: null, searchController: null, searchResults: [],
  retryLocation: DEFAULT_LOCATION, rateLimitUntil: 0,
};

function render() {
  if (!state.bundle) return;
  view.renderBundle(state.bundle, state.unit, state.cached);
  renderChart(state.bundle.weather, state.unit, state.metric);
}

function rateLimitMessage() {
  const remaining = Math.ceil((state.rateLimitUntil - Date.now()) / 1000);
  return remaining > 0 ? `Dịch vụ đang giới hạn lượt gọi. Vui lòng thử lại sau khoảng ${remaining} giây.` : '';
}

function rememberRateLimit(error) {
  if (error?.code === 'RATE_LIMIT') state.rateLimitUntil = Math.max(state.rateLimitUntil, error.retryAfter || Date.now() + 60000);
}

function cancelSearch() {
  state.searchId += 1;
  state.searchController?.abort();
  view.searchFeedback();
  view.closeResults();
}

/** Cancellation plus a monotonically increasing id prevents stale-city races. */
async function loadLocation(location) {
  state.geoId += 1;
  cancelSearch();
  const requestId = ++state.requestId;
  state.controller?.abort();
  state.retryLocation = location;
  const limit = rateLimitMessage();
  if (limit) { view.setLoading(false); view.showNotice('warning', limit, true); return; }
  if (!navigator.onLine) {
    view.setLoading(false);
    view.showNotice('warning', state.bundle
      ? `Bạn đang ngoại tuyến. Đang giữ dữ liệu của ${state.bundle.location.name}; chưa tải được ${location.name}.`
      : 'Bạn đang ngoại tuyến và chưa có dữ liệu đã lưu. Kết nối mạng rồi bấm Thử lại.', true);
    if (state.bundle) { state.cached = true; view.updateDataStatus(state.bundle, true); }
    return;
  }
  const controller = new AbortController();
  state.controller = controller;
  view.setLoading(true);
  view.showNotice('info', `Đang tải thời tiết và không khí tại ${location.name}…`);
  try {
    const bundle = await fetchDashboard(location, controller.signal);
    if (requestId !== state.requestId) return;
    state.bundle = bundle;
    state.cached = false;
    const saved = saveCache(bundle);
    rememberRateLimit(bundle.airError);
    render();
    const missingAqi = !bundle.air || bundle.air.aqi === null;
    if (bundle.airError || missingAqi) view.showNotice('warning', `Thời tiết đã tải. ${bundle.airError?.message ?? 'AQI chưa có dữ liệu cho vị trí này.'}`, true);
    else if (!saved) view.showNotice('info', 'Dữ liệu đã tải. Trình duyệt không cho lưu dữ liệu để xem lại khi mất mạng.');
    else view.showNotice('info', '');
  } catch (error) {
    if (requestId !== state.requestId || error.name === 'AbortError') return;
    rememberRateLimit(error);
    const suffix = state.bundle ? ` Đang giữ dữ liệu của ${state.bundle.location.name}.` : '';
    view.showNotice('error', (error instanceof AppError ? error.message : 'Chưa tải được dữ liệu. Vui lòng thử lại.') + suffix, true);
    if (state.bundle) { state.cached = true; view.updateDataStatus(state.bundle, true); }
  } finally {
    if (requestId === state.requestId) { state.controller = null; view.setLoading(false); }
  }
}

async function handleSearch(event) {
  event.preventDefault();
  cancelSearch();
  const query = $('city-input').value.trim();
  if (query.length < 2 || query.length > 100) {
    view.searchFeedback('Nhập tên thành phố từ 2 đến 100 ký tự.');
    $('city-input').focus();
    return;
  }
  if (!navigator.onLine) { view.searchFeedback('Bạn đang ngoại tuyến. Kết nối mạng để tìm thành phố.'); return; }
  const limit = rateLimitMessage();
  if (limit) { view.searchFeedback(limit); return; }
  const searchId = ++state.searchId;
  state.searchController = new AbortController();
  view.searchFeedback('Đang tìm thành phố…', true);
  try {
    const locations = await searchCities(query, state.searchController.signal);
    if (searchId !== state.searchId) return;
    view.searchFeedback();
    state.searchResults = locations;
    if (locations.length === 1) await loadLocation(locations[0]);
    else {
      view.renderSearchResults(locations);
      view.searchFeedback(`Tìm thấy ${locations.length} địa điểm. Chọn trong danh sách bên dưới.`, true);
      $('search-button').disabled = false;
    }
  } catch (error) {
    if (searchId !== state.searchId || error.name === 'AbortError') return;
    rememberRateLimit(error);
    view.searchFeedback(error.message);
  }
}

async function handleGeolocation() {
  const geoId = ++state.geoId;
  $('location-button').disabled = true;
  view.showNotice('info', 'Đang xác định vị trí. Cho phép quyền vị trí trong trình duyệt khi được hỏi.');
  try {
    const location = await detectLocation();
    if (geoId === state.geoId) await loadLocation(location);
  } catch (error) {
    if (geoId === state.geoId) view.showNotice('warning', error.message);
  } finally { $('location-button').disabled = false; }
}

$('search-form').addEventListener('submit', handleSearch);
$('city-input').addEventListener('input', cancelSearch);
$('search-results').addEventListener('click', event => {
  const button = event.target.closest('button[data-result]');
  const location = button && state.searchResults[Number(button.dataset.result)];
  if (location) { loadLocation(location); $('city-input').focus(); }
});
$('search-form').addEventListener('keydown', event => {
  if (event.key === 'Escape') { cancelSearch(); $('city-input').focus(); }
  if (event.key === 'ArrowDown' && event.target === $('city-input') && !$('search-results').hidden) {
    event.preventDefault(); $('search-results').querySelector('button')?.focus();
  }
});
document.addEventListener('click', event => { if (!$('search-form').contains(event.target)) view.closeResults(); });
$('quick-cities').addEventListener('click', event => {
  const button = event.target.closest('[data-city]');
  if (button) loadLocation(QUICK_LOCATIONS[Number(button.dataset.city)]);
});
$('location-button').addEventListener('click', handleGeolocation);
$('refresh-button').addEventListener('click', () => loadLocation(state.bundle?.location ?? DEFAULT_LOCATION));
$('retry-button').addEventListener('click', () => loadLocation(state.retryLocation));

document.querySelectorAll('[data-unit]').forEach(button => button.addEventListener('click', () => {
  state.unit = button.dataset.unit;
  saveUnit(state.unit);
  view.updateUnitButtons(state.unit);
  render(); // Unit conversion is local; it does not spend another API request.
}));
document.querySelectorAll('[data-metric]').forEach(button => button.addEventListener('click', () => {
  state.metric = button.dataset.metric;
  document.querySelectorAll('[data-metric]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
  if (state.bundle) renderChart(state.bundle.weather, state.unit, state.metric);
}));

function scrollForecast(direction) {
  const rail = $('forecast-rail');
  rail.scrollBy({ left: direction * rail.clientWidth * .75, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
}
$('forecast-prev').addEventListener('click', () => scrollForecast(-1));
$('forecast-next').addEventListener('click', () => scrollForecast(1));
$('forecast-rail').addEventListener('keydown', event => {
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); scrollForecast(event.key === 'ArrowLeft' ? -1 : 1); }
});
document.querySelectorAll('.nav-link').forEach(link => link.addEventListener('click', () => {
  document.querySelectorAll('.nav-link').forEach(item => item.classList.toggle('active', item === link));
}));

window.addEventListener('offline', () => {
  state.requestId += 1;
  state.controller?.abort();
  state.controller = null;
  state.geoId += 1;
  cancelSearch();
  view.setLoading(false);
  state.cached = true;
  view.showNotice('warning', state.bundle ? `Bạn đang ngoại tuyến. Dữ liệu của ${state.bundle.location.name} được giữ lại, chưa cập nhật mới.`
    : 'Bạn đang ngoại tuyến. Kết nối mạng để tải dữ liệu.', true);
  if (state.bundle) view.updateDataStatus(state.bundle, true);
});
window.addEventListener('online', () => loadLocation(state.retryLocation));

// Timers run only while the page is open. No background service or hidden API polling.
setInterval(() => {
  if (!document.hidden && navigator.onLine && !state.controller && state.bundle) loadLocation(state.bundle.location);
}, API.refreshInterval);
setInterval(() => { if (!document.hidden && state.bundle) view.updateClock(state.bundle.weather.timezone); }, 60000);

view.renderQuickCities(QUICK_LOCATIONS);
view.updateUnitButtons(state.unit);
const cached = readCache();
if (cached) { state.bundle = cached; state.cached = true; state.retryLocation = cached.location; render(); }
loadLocation(cached?.location ?? DEFAULT_LOCATION);
